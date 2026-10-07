/**
 * NetworkInterface model representing a physical or logical network adapter.
 * Pure TypeScript model decoupled from UI.
 */

export interface NetworkInterfaceProps {
  id: string;
  name: string; // e.g. 'eth0', 'Fa0/0', 'Port 1'
  mac: string;
  ip?: string | null;
  netmask?: string | null;
  gateway?: string | null;
  status?: 'up' | 'down';
  connectedToConnectionId?: string | null;
}

export class NetworkInterface {
  public readonly id: string;
  public name: string;
  public mac: string;
  public ip: string | null;
  public netmask: string | null;
  public gateway: string | null;
  public status: 'up' | 'down';
  public connectedToConnectionId: string | null;

  constructor(props: NetworkInterfaceProps) {
    this.id = props.id;
    this.name = props.name;
    this.mac = props.mac;
    this.ip = props.ip || null;
    this.netmask = props.netmask || null;
    this.gateway = props.gateway || null;
    this.status = props.status || 'up';
    this.connectedToConnectionId = props.connectedToConnectionId || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.ip && this.netmask);
  }

  public isConnected(): boolean {
    return Boolean(this.connectedToConnectionId && this.status === 'up');
  }

  public toJSON(): NetworkInterfaceProps {
    return {
      id: this.id,
      name: this.name,
      mac: this.mac,
      ip: this.ip,
      netmask: this.netmask,
      gateway: this.gateway,
      status: this.status,
      connectedToConnectionId: this.connectedToConnectionId,
    };
  }
}

/**
 * Generates an IEEE 802 MAC address with a deterministic vendor prefix (00:60:2F for Netrion).
 */
export function generateMacAddress(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  return `00:60:2F:${hex()}:${hex()}:${hex()}`;
}
