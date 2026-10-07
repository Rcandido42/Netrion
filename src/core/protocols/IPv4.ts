/**
 * IPv4 Protocol and Bitwise Subnet Utilities.
 * Pure TypeScript logic decoupled from UI.
 */

export interface IPv4Packet {
  type: 'IPv4';
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: 'ICMP';
  payload: any;
}

export function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

export function isValidIpv4(ip: string): boolean {
  try {
    ipToNumber(ip);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if two IP addresses reside on the same logical IP subnet given a subnet mask.
 */
export function isSameSubnet(ipA: string, ipB: string, netmask: string): boolean {
  if (!isValidIpv4(ipA) || !isValidIpv4(ipB) || !isValidIpv4(netmask)) {
    return false;
  }
  const numA = ipToNumber(ipA);
  const numB = ipToNumber(ipB);
  const mask = ipToNumber(netmask);

  return (numA & mask) === (numB & mask);
}
