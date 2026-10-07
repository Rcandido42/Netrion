/**
 * Address Resolution Protocol (ARP) - RFC 826.
 * Manages ARP packets and local device ARP caches.
 */

export interface ARPPacket {
  type: 'ARP';
  operation: 'REQUEST' | 'REPLY';
  senderMac: string;
  senderIp: string;
  targetMac: string; // "FF:FF:FF:FF:FF:FF" for Request, destination unicast MAC for Reply
  targetIp: string;
}

export interface ARPCacheEntry {
  ip: string;
  mac: string;
  timestamp: number;
}

export class ARPCache {
  private entries: Map<string, ARPCacheEntry> = new Map();

  constructor(initialEntries?: ARPCacheEntry[]) {
    if (initialEntries) {
      initialEntries.forEach((e) => this.entries.set(e.ip, e));
    }
  }

  public lookup(ip: string): string | null {
    const entry = this.entries.get(ip);
    return entry ? entry.mac : null;
  }

  public learn(ip: string, mac: string): void {
    this.entries.set(ip, {
      ip,
      mac,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.entries.clear();
  }

  public toArray(): ARPCacheEntry[] {
    return Array.from(this.entries.values());
  }
}
