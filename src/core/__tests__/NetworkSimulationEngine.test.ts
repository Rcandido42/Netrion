import { describe, it, expect } from 'vitest';
import { NetworkSimulationEngine } from '../engine/NetworkSimulationEngine';
import { createDefaultDevice } from '../models/Device';
import { isSameSubnet } from '../protocols/IPv4';
import type { SerializedConnection } from '../../storage/ProjectSchema';

describe('NetworkSimulationEngine Core Stack', () => {
  it('correctly calculates IPv4 subnet matches', () => {
    expect(isSameSubnet('192.168.1.10', '192.168.1.20', '255.255.255.0')).toBe(true);
    expect(isSameSubnet('192.168.1.10', '192.168.2.10', '255.255.255.0')).toBe(false);
    expect(isSameSubnet('10.0.0.1', '10.0.128.5', '255.255.0.0')).toBe(true);
    expect(isSameSubnet('10.0.0.1', '10.1.0.1', '255.255.0.0')).toBe(false);
  });

  it('fails ping gracefully if interface has no IP configured', () => {
    const pc1 = createDefaultDevice('pc', 0, 0);
    const engine = new NetworkSimulationEngine([pc1], []);
    const res = engine.ping(pc1.id, '192.168.1.1');
    expect(res.success).toBe(false);
    expect(res.message).toContain('no IP configuration');
  });

  it('fails ping to external subnet if no default gateway is configured', () => {
    const pc1 = createDefaultDevice('pc', 0, 0);
    pc1.interfaces[0].ip = '192.168.1.10';
    pc1.interfaces[0].netmask = '255.255.255.0';
    pc1.interfaces[0].gateway = null;
    pc1.interfaces[0].connectedToConnectionId = 'conn_1';

    const conn: SerializedConnection = {
      id: 'conn_1',
      sourceDeviceId: pc1.id,
      sourceInterfaceId: pc1.interfaces[0].id,
      targetDeviceId: 'target_id',
      targetInterfaceId: 'target_if',
      type: 'copper',
      status: 'up',
      bandwidthMbps: 100,
      latencyMs: 10,
    };

    const engine = new NetworkSimulationEngine([pc1], [conn]);
    const res = engine.ping(pc1.id, '8.8.8.8');
    expect(res.success).toBe(false);
    expect(res.message).toContain('No default gateway configured');
  });

  it('simulates end-to-end ARP resolution and ICMP Echo between two PCs directly connected', () => {
    const pc1 = createDefaultDevice('pc', 0, 0, 'PC-01');
    pc1.interfaces[0].ip = '192.168.1.10';
    pc1.interfaces[0].netmask = '255.255.255.0';

    const pc2 = createDefaultDevice('pc', 200, 0, 'PC-02');
    pc2.interfaces[0].ip = '192.168.1.20';
    pc2.interfaces[0].netmask = '255.255.255.0';

    const conn: SerializedConnection = {
      id: 'conn_pc1_pc2',
      sourceDeviceId: pc1.id,
      sourceInterfaceId: pc1.interfaces[0].id,
      targetDeviceId: pc2.id,
      targetInterfaceId: pc2.interfaces[0].id,
      type: 'copper',
      status: 'up',
      bandwidthMbps: 100,
      latencyMs: 10,
    };

    pc1.interfaces[0].connectedToConnectionId = conn.id;
    pc2.interfaces[0].connectedToConnectionId = conn.id;

    const engine = new NetworkSimulationEngine([pc1, pc2], [conn]);
    const events: string[] = [];
    engine.subscribe((evt) => events.push(evt.type));

    // 1. PC1 pings PC2
    const res = engine.ping(pc1.id, '192.168.1.20');
    expect(res.success).toBe(true);

    // Initial in-flight frame is the ARP Request
    expect(engine.getInFlightFrames().length).toBe(1);
    expect(engine.getInFlightFrames()[0].frame.etherType).toBe('ARP');

    // 2. Advance time: ARP Request reaches PC2
    engine.tick(20);

    // PC2 processed ARP Request and emitted ARP Reply back to PC1
    expect(events).toContain('ARP_REQUEST');
    expect(events).toContain('ARP_REPLY');

    // 3. Advance time: ARP Reply reaches PC1
    engine.tick(20);

    // Verify PC1 has learned PC2's MAC in its ARP table
    const updatedPC1 = engine.getDevices().find((d) => d.id === pc1.id);
    expect(updatedPC1?.arpTable.some((e) => e.ip === '192.168.1.20')).toBe(true);

    // 4. Now PC1 pings again with MAC in cache
    const ping2 = engine.ping(pc1.id, '192.168.1.20');
    expect(ping2.success).toBe(true);

    // In-flight frame is now IPv4 / ICMP
    expect(engine.getInFlightFrames()[0].frame.etherType).toBe('IPv4');

    // Advance time: ICMP Echo Request arrives at PC2
    engine.tick(20);
    expect(events).toContain('ICMP_ECHO_REQ');

    // Advance time: ICMP Echo Reply arrives back at PC1
    engine.tick(20);
    expect(events).toContain('ICMP_ECHO_REP');
  });

  it('simulates switch CAM table learning and frame flooding', () => {
    const pc1 = createDefaultDevice('pc', 0, 0, 'PC-01');
    pc1.interfaces[0].ip = '10.0.0.1';
    pc1.interfaces[0].netmask = '255.0.0.0';

    const pc2 = createDefaultDevice('pc', 400, 0, 'PC-02');
    pc2.interfaces[0].ip = '10.0.0.2';
    pc2.interfaces[0].netmask = '255.0.0.0';

    const sw = createDefaultDevice('switch', 200, 100, 'SW-01');

    const conn1: SerializedConnection = {
      id: 'conn_pc1_sw',
      sourceDeviceId: pc1.id,
      sourceInterfaceId: pc1.interfaces[0].id,
      targetDeviceId: sw.id,
      targetInterfaceId: sw.interfaces[0].id,
      type: 'copper',
      status: 'up',
      bandwidthMbps: 100,
      latencyMs: 10,
    };
    pc1.interfaces[0].connectedToConnectionId = conn1.id;
    sw.interfaces[0].connectedToConnectionId = conn1.id;

    const conn2: SerializedConnection = {
      id: 'conn_pc2_sw',
      sourceDeviceId: pc2.id,
      sourceInterfaceId: pc2.interfaces[0].id,
      targetDeviceId: sw.id,
      targetInterfaceId: sw.interfaces[1].id,
      type: 'copper',
      status: 'up',
      bandwidthMbps: 100,
      latencyMs: 10,
    };
    pc2.interfaces[0].connectedToConnectionId = conn2.id;
    sw.interfaces[1].connectedToConnectionId = conn2.id;

    const engine = new NetworkSimulationEngine([pc1, pc2, sw], [conn1, conn2]);
    const events: string[] = [];
    engine.subscribe((evt) => events.push(evt.type));

    // PC1 initiates ping
    engine.ping(pc1.id, '10.0.0.2');

    // Tick: ARP Request arrives at Switch port 0
    engine.tick(20);

    // Switch should have learned PC1's MAC in its CAM table
    const updatedSw = engine.getDevices().find((d) => d.id === sw.id);
    expect(updatedSw?.macTable?.some((entry) => entry.mac === pc1.interfaces[0].mac)).toBe(true);
    expect(events).toContain('MAC_LEARNED');
  });
});
