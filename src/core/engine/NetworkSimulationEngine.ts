import { BROADCAST_MAC, type EthernetFrame, createEthernetFrame } from '../protocols/Ethernet';
import type { ARPPacket } from '../protocols/ARP';
import { type IPv4Packet, isSameSubnet } from '../protocols/IPv4';
import { type ICMPPacket, createEchoRequest, createEchoReply } from '../protocols/ICMP';
import type { SerializedDevice, SerializedConnection } from '../../storage/ProjectSchema';

export interface InFlightFrame {
  id: string;
  connectionId: string;
  fromDeviceId: string;
  toDeviceId: string;
  fromInterfaceId: string;
  toInterfaceId: string;
  frame: EthernetFrame;
  progress: number; // 0.0 to 1.0
  latencyMs: number;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  type:
    | 'FRAME_TRANSMIT'
    | 'FRAME_ARRIVED'
    | 'FRAME_DROPPED'
    | 'ARP_REQUEST'
    | 'ARP_REPLY'
    | 'ICMP_ECHO_REQ'
    | 'ICMP_ECHO_REP'
    | 'MAC_LEARNED'
    | 'ROUTER_FORWARD';
  deviceId: string;
  description: string;
  details?: Record<string, any>;
}

export type SimulationEventListener = (event: SimulationEvent) => void;

export class NetworkSimulationEngine {
  private devices: Map<string, SerializedDevice> = new Map();
  private connections: Map<string, SerializedConnection> = new Map();
  private inFlightFrames: InFlightFrame[] = [];
  private eventListeners: Set<SimulationEventListener> = new Set();
  private pendingPings: Map<number, { startTime: number; fromDeviceId: string; targetIp: string }> = new Map();
  private pingSequence = 1;

  constructor(devices: SerializedDevice[] = [], connections: SerializedConnection[] = []) {
    this.updateTopology(devices, connections);
  }

  public updateTopology(devices: SerializedDevice[], connections: SerializedConnection[]): void {
    this.devices.clear();
    devices.forEach((d) => this.devices.set(d.id, JSON.parse(JSON.stringify(d))));

    this.connections.clear();
    connections.forEach((c) => this.connections.set(c.id, JSON.parse(JSON.stringify(c))));
  }

  public getDevices(): SerializedDevice[] {
    return Array.from(this.devices.values());
  }

  public getInFlightFrames(): InFlightFrame[] {
    return this.inFlightFrames;
  }

  public subscribe(listener: SimulationEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public emitEvent(
    type: SimulationEvent['type'],
    deviceId: string,
    description: string,
    details?: Record<string, any>
  ): void {
    const event: SimulationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type,
      deviceId,
      description,
      details,
    };
    this.eventListeners.forEach((l) => l(event));
  }

  /**
   * Advances the discrete simulation clock by deltaMs.
   */
  public tick(deltaMs: number, speed = 1): void {
    const remainingFrames: InFlightFrame[] = [];

    for (const flight of this.inFlightFrames) {
      // Calculate progress increment based on link latency
      const effectiveLatency = Math.max(flight.latencyMs, 20);
      const step = (deltaMs / effectiveLatency) * speed;
      flight.progress += step;

      if (flight.progress >= 1.0) {
        // Frame has reached the remote destination interface
        this.processFrameArrival(flight);
      } else {
        remainingFrames.push(flight);
      }
    }

    this.inFlightFrames = remainingFrames;
  }

  /**
   * Transmits a frame over the physical link connected to fromInterfaceId.
   */
  public transmitFrame(fromDeviceId: string, fromInterfaceId: string, frame: EthernetFrame): boolean {
    const dev = this.devices.get(fromDeviceId);
    if (!dev) return false;

    const iface = dev.interfaces.find((i) => i.id === fromInterfaceId);
    if (!iface || !iface.connectedToConnectionId || iface.status === 'down') {
      this.emitEvent('FRAME_DROPPED', fromDeviceId, `Interface ${iface?.name || 'unknown'} is down or disconnected`);
      return false;
    }

    const conn = this.connections.get(iface.connectedToConnectionId);
    if (!conn || conn.status === 'down') {
      this.emitEvent('FRAME_DROPPED', fromDeviceId, `Physical link ${iface.connectedToConnectionId} is DOWN`);
      return false;
    }

    // Determine target device and target interface
    const isSource = conn.sourceDeviceId === fromDeviceId && conn.sourceInterfaceId === fromInterfaceId;
    const toDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
    const toInterfaceId = isSource ? conn.targetInterfaceId : conn.sourceInterfaceId;

    const inFlight: InFlightFrame = {
      id: `flight_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      connectionId: conn.id,
      fromDeviceId,
      toDeviceId,
      fromInterfaceId,
      toInterfaceId,
      frame,
      progress: 0,
      latencyMs: conn.latencyMs || 50,
    };

    this.inFlightFrames.push(inFlight);

    this.emitEvent(
      'FRAME_TRANSMIT',
      fromDeviceId,
      `${dev.name} [${iface.name}] transmitted ${frame.etherType} frame to ${toDeviceId}`,
      { frameId: frame.id, etherType: frame.etherType, srcMac: frame.srcMac, dstMac: frame.dstMac }
    );

    return true;
  }

  /**
   * Processes reception of an Ethernet frame at a destination device interface.
   */
  private processFrameArrival(flight: InFlightFrame): void {
    const targetDev = this.devices.get(flight.toDeviceId);
    if (!targetDev) return;

    const targetIface = targetDev.interfaces.find((i) => i.id === flight.toInterfaceId);
    if (!targetIface || targetIface.status === 'down') return;

    const frame = flight.frame;

    this.emitEvent(
      'FRAME_ARRIVED',
      targetDev.id,
      `${targetDev.name} [${targetIface.name}] received ${frame.etherType} from ${frame.srcMac}`,
      { etherType: frame.etherType, dstMac: frame.dstMac }
    );

    // =========================================================
    // LAYER 2 SWITCH PROCESSING
    // =========================================================
    if (targetDev.type === 'switch') {
      // 1. Learn source MAC in switch CAM Table
      if (!targetDev.macTable) targetDev.macTable = [];
      const existingEntry = targetDev.macTable.find((e) => e.mac === frame.srcMac);
      if (existingEntry) {
        existingEntry.portId = targetIface.id;
        existingEntry.timestamp = Date.now();
      } else {
        targetDev.macTable.push({
          mac: frame.srcMac,
          portId: targetIface.id,
          timestamp: Date.now(),
        });
        this.emitEvent(
          'MAC_LEARNED',
          targetDev.id,
          `${targetDev.name} learned MAC ${frame.srcMac} on port ${targetIface.name}`
        );
      }

      // 2. Forwarding Decision
      if (frame.dstMac === BROADCAST_MAC) {
        // Flood to all active ports except incoming port
        this.floodSwitchFrame(targetDev, targetIface.id, frame);
      } else {
        // Unicast lookup
        const destEntry = targetDev.macTable.find((e) => e.mac === frame.dstMac);
        if (destEntry && destEntry.portId !== targetIface.id) {
          // Forward unicast to matched port
          this.transmitFrame(targetDev.id, destEntry.portId, frame);
        } else {
          // Destination unknown, flood to all other ports
          this.floodSwitchFrame(targetDev, targetIface.id, frame);
        }
      }
      return;
    }

    // =========================================================
    // LAYER 3 HOST / ROUTER PROCESSING
    // =========================================================
    // Filter frames: Accept only unicast to this interface MAC or L2 Broadcast
    if (frame.dstMac !== targetIface.mac && frame.dstMac !== BROADCAST_MAC) {
      // Frame addressed to different station, discarded by NIC
      return;
    }

    // Process ARP
    if (frame.etherType === 'ARP') {
      const arp = frame.payload as ARPPacket;

      // Learn sender in host ARP table
      let arpEntry = targetDev.arpTable.find((e) => e.ip === arp.senderIp);
      if (arpEntry) {
        arpEntry.mac = arp.senderMac;
        arpEntry.timestamp = Date.now();
      } else {
        targetDev.arpTable.push({
          ip: arp.senderIp,
          mac: arp.senderMac,
          timestamp: Date.now(),
        });
      }

      // If ARP Request asking for this interface's IP, send ARP Reply
      if (arp.operation === 'REQUEST' && arp.targetIp === targetIface.ip) {
        this.emitEvent(
          'ARP_REPLY',
          targetDev.id,
          `${targetDev.name} responding to ARP Request for ${targetIface.ip}`
        );

        const replyPacket: ARPPacket = {
          type: 'ARP',
          operation: 'REPLY',
          senderMac: targetIface.mac,
          senderIp: targetIface.ip,
          targetMac: arp.senderMac,
          targetIp: arp.senderIp,
        };

        const replyFrame = createEthernetFrame(
          targetIface.mac,
          arp.senderMac,
          'ARP',
          replyPacket
        );

        this.transmitFrame(targetDev.id, targetIface.id, replyFrame);
      }
      return;
    }

    // Process IPv4
    if (frame.etherType === 'IPv4') {
      const ip = frame.payload as IPv4Packet;

      // Check if datagram is addressed directly to this interface
      if (ip.dstIp === targetIface.ip) {
        // Handle ICMP
        if (ip.protocol === 'ICMP') {
          const icmp = ip.payload as ICMPPacket;

          if (icmp.type === 'ECHO_REQUEST') {
            this.emitEvent(
              'ICMP_ECHO_REQ',
              targetDev.id,
              `${targetDev.name} received ICMP Echo Request from ${ip.srcIp}`
            );

            // Generate Echo Reply
            const replyIcmp = createEchoReply(icmp);
            const replyIp: IPv4Packet = {
              type: 'IPv4',
              srcIp: targetIface.ip,
              dstIp: ip.srcIp,
              ttl: 64,
              protocol: 'ICMP',
              payload: replyIcmp,
            };

            // Resolve next hop MAC (Frame arrived from srcMac directly or gateway)
            const replyFrame = createEthernetFrame(
              targetIface.mac,
              frame.srcMac,
              'IPv4',
              replyIp
            );

            this.transmitFrame(targetDev.id, targetIface.id, replyFrame);
          } else if (icmp.type === 'ECHO_REPLY') {
            const pending = this.pendingPings.get(icmp.id);
            const rtt = pending ? Date.now() - pending.startTime : 1;
            this.pendingPings.delete(icmp.id);

            this.emitEvent(
              'ICMP_ECHO_REP',
              targetDev.id,
              `Reply from ${ip.srcIp}: bytes=32 time=${rtt}ms TTL=${ip.ttl}`,
              { srcIp: ip.srcIp, rtt, ttl: ip.ttl }
            );
          }
        }
        return;
      }

      // If device is a Router, forward packet
      if (targetDev.type === 'router') {
        this.forwardRoutedPacket(targetDev, targetIface, ip);
      }
    }
  }

  /**
   * Floods a frame out all connected ports of a switch except the incoming port.
   */
  private floodSwitchFrame(sw: SerializedDevice, incomingIfaceId: string, frame: EthernetFrame): void {
    for (const iface of sw.interfaces) {
      if (iface.id !== incomingIfaceId && iface.connectedToConnectionId && iface.status === 'up') {
        this.transmitFrame(sw.id, iface.id, frame);
      }
    }
  }

  /**
   * Router L3 forwarding logic: decr TTL, subnet lookup, ARP resolve next-hop, transmit.
   */
  private forwardRoutedPacket(
    router: SerializedDevice,
    incomingIface: SerializedDevice['interfaces'][0],
    ip: IPv4Packet
  ): void {
    // 1. Decrement TTL
    ip.ttl -= 1;
    if (ip.ttl <= 0) {
      this.emitEvent('FRAME_DROPPED', router.id, `TTL expired in transit for destination ${ip.dstIp}`);
      return;
    }

    // 2. Find outgoing interface
    // Look for directly connected subnet on router interfaces
    let outgoingIface = router.interfaces.find(
      (i) => i.id !== incomingIface.id && i.ip && i.netmask && isSameSubnet(ip.dstIp, i.ip, i.netmask)
    );

    // Or check static routing table
    let nextHopIp: string | null = null;
    if (!outgoingIface && router.routingTable) {
      const matchedRoute = router.routingTable.find((r) => isSameSubnet(ip.dstIp, r.destination, r.netmask));
      if (matchedRoute) {
        outgoingIface = router.interfaces.find((i) => i.id === matchedRoute.interfaceId);
        nextHopIp = matchedRoute.nextHop;
      }
    }

    if (!outgoingIface || !outgoingIface.connectedToConnectionId || outgoingIface.status === 'down') {
      this.emitEvent(
        'FRAME_DROPPED',
        router.id,
        `No route to host ${ip.dstIp} (Network unreachable)`
      );
      return;
    }

    const targetL3Ip = nextHopIp || ip.dstIp;

    // 3. Resolve destination L2 MAC
    let targetMac = router.arpTable.find((e) => e.ip === targetL3Ip)?.mac;

    if (!targetMac) {
      // Send ARP Request from outgoing interface to discover host
      const arpReq: ARPPacket = {
        type: 'ARP',
        operation: 'REQUEST',
        senderMac: outgoingIface.mac,
        senderIp: outgoingIface.ip || '0.0.0.0',
        targetMac: BROADCAST_MAC,
        targetIp: targetL3Ip,
      };

      const arpFrame = createEthernetFrame(
        outgoingIface.mac,
        BROADCAST_MAC,
        'ARP',
        arpReq
      );

      this.transmitFrame(router.id, outgoingIface.id, arpFrame);
      return;
    }

    // 4. Encapsulate and forward
    const forwardedFrame = createEthernetFrame(
      outgoingIface.mac,
      targetMac,
      'IPv4',
      ip
    );

    this.emitEvent(
      'ROUTER_FORWARD',
      router.id,
      `${router.name} routed packet to ${ip.dstIp} via [${outgoingIface.name}]`,
      { dstIp: ip.dstIp, outgoingIface: outgoingIface.name, nextHopMac: targetMac }
    );

    this.transmitFrame(router.id, outgoingIface.id, forwardedFrame);
  }

  /**
   * Initiates a Ping from a host device to targetIp.
   */
  public ping(fromDeviceId: string, targetIp: string): { success: boolean; message: string } {
    const dev = this.devices.get(fromDeviceId);
    if (!dev) return { success: false, message: 'Source device not found' };

    const iface = dev.interfaces[0];
    if (!iface || !iface.ip || !iface.netmask) {
      return { success: false, message: 'Source interface has no IP configuration' };
    }

    if (!iface.connectedToConnectionId || iface.status === 'down') {
      return { success: false, message: 'Cable is disconnected or interface is down' };
    }

    const isLocal = isSameSubnet(iface.ip, targetIp, iface.netmask);
    let targetL3Ip = targetIp;

    if (!isLocal) {
      // Remote subnet: must have gateway configured
      if (!iface.gateway) {
        return {
          success: false,
          message: 'Destination host unreachable: No default gateway configured on interface',
        };
      }
      targetL3Ip = iface.gateway;
    }

    // Check ARP cache
    const cachedMac = dev.arpTable.find((e) => e.ip === targetL3Ip)?.mac;

    const pingId = this.pingSequence++;
    this.pendingPings.set(pingId, {
      startTime: Date.now(),
      fromDeviceId,
      targetIp,
    });

    if (!cachedMac) {
      // Send ARP Request first
      this.emitEvent(
        'ARP_REQUEST',
        dev.id,
        `${dev.name} sending ARP Request: Who has ${targetL3Ip}? Tell ${iface.ip}`
      );

      const arpReq: ARPPacket = {
        type: 'ARP',
        operation: 'REQUEST',
        senderMac: iface.mac,
        senderIp: iface.ip,
        targetMac: BROADCAST_MAC,
        targetIp: targetL3Ip,
      };

      const arpFrame = createEthernetFrame(
        iface.mac,
        BROADCAST_MAC,
        'ARP',
        arpReq
      );

      this.transmitFrame(dev.id, iface.id, arpFrame);
      return { success: true, message: `Resolving ARP for ${targetL3Ip}...` };
    }

    // ARP known: construct ICMP Echo Request immediately
    const icmpReq = createEchoRequest(1, pingId);
    const ipPacket: IPv4Packet = {
      type: 'IPv4',
      srcIp: iface.ip,
      dstIp: targetIp,
      ttl: 64,
      protocol: 'ICMP',
      payload: icmpReq,
    };

    const frame = createEthernetFrame(
      iface.mac,
      cachedMac,
      'IPv4',
      ipPacket
    );

    this.transmitFrame(dev.id, iface.id, frame);
    return { success: true, message: `Pinging ${targetIp} with 32 bytes of data...` };
  }
}
