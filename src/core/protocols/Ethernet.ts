import type { ARPPacket } from './ARP';
import type { IPv4Packet } from './IPv4';

export const BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';

export type EtherType = 'ARP' | 'IPv4';

export interface EthernetFrame {
  id: string;
  srcMac: string;
  dstMac: string;
  etherType: EtherType;
  payload: ARPPacket | IPv4Packet;
}

export function createEthernetFrame(
  srcMac: string,
  dstMac: string,
  etherType: EtherType,
  payload: ARPPacket | IPv4Packet
): EthernetFrame {
  return {
    id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    srcMac,
    dstMac,
    etherType,
    payload,
  };
}
