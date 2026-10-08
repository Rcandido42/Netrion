import type { SerializedDevice } from '../../storage/ProjectSchema';
import type { NetworkSimulationEngine } from '../engine/NetworkSimulationEngine';

export type IOSMode = 'USER' | 'PRIVILEGED' | 'CONFIG' | 'CONFIG_IF';

export class CiscoIOSEmulator {
  private device: SerializedDevice;
  private engine: NetworkSimulationEngine;
  private mode: IOSMode = 'USER';
  private currentInterfaceId: string | null = null;
  private onDeviceUpdate?: (updated: SerializedDevice) => void;

  constructor(
    device: SerializedDevice,
    engine: NetworkSimulationEngine,
    onDeviceUpdate?: (updated: SerializedDevice) => void
  ) {
    this.device = device;
    this.engine = engine;
    this.onDeviceUpdate = onDeviceUpdate;
  }

  public getPrompt(): string {
    const hostname = this.device.name;
    switch (this.mode) {
      case 'USER':
        return `${hostname}>`;
      case 'PRIVILEGED':
        return `${hostname}#`;
      case 'CONFIG':
        return `${hostname}(config)#`;
      case 'CONFIG_IF':
        const iface = this.device.interfaces.find((i) => i.id === this.currentInterfaceId);
        return `${hostname}(config-if${iface ? `-${iface.name}` : ''})#`;
    }
  }

  public execute(commandLine: string): string[] {
    const trimmed = commandLine.trim();
    if (!trimmed) return [];

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Global navigation commands
    if (cmd === 'exit') {
      return this.handleExit();
    }
    if (cmd === 'end') {
      this.mode = 'PRIVILEGED';
      this.currentInterfaceId = null;
      return [];
    }

    switch (this.mode) {
      case 'USER':
        return this.handleUserExec(cmd, args);
      case 'PRIVILEGED':
        return this.handlePrivilegedExec(cmd, args);
      case 'CONFIG':
        return this.handleConfig(cmd, args);
      case 'CONFIG_IF':
        return this.handleConfigIf(cmd, args);
    }
  }

  private handleExit(): string[] {
    switch (this.mode) {
      case 'USER':
        return ['% Connection closed by foreign host'];
      case 'PRIVILEGED':
        this.mode = 'USER';
        return [];
      case 'CONFIG':
        this.mode = 'PRIVILEGED';
        return [];
      case 'CONFIG_IF':
        this.mode = 'CONFIG';
        this.currentInterfaceId = null;
        return [];
    }
  }

  private handleUserExec(cmd: string, args: string[]): string[] {
    if (cmd === 'enable' || cmd === 'en') {
      this.mode = 'PRIVILEGED';
      return [];
    }
    if (cmd === 'ping') {
      return this.executePing(args);
    }
    if (cmd === 'help' || cmd === '?') {
      return [
        'Exec commands:',
        '  enable      Turn on privileged commands',
        '  exit        Exit from the EXEC',
        '  ping        Send echo messages',
        '  show        Show running system information',
      ];
    }
    return [`% Invalid input detected at '^' marker.`];
  }

  private handlePrivilegedExec(cmd: string, args: string[]): string[] {
    if (cmd === 'disable') {
      this.mode = 'USER';
      return [];
    }
    if (cmd === 'configure' || cmd === 'conf') {
      if (args[0] === 'terminal' || args[0] === 't' || args.length === 0) {
        this.mode = 'CONFIG';
        return ['Enter configuration commands, one per line. End with CNTL/Z or exit.'];
      }
    }
    if (cmd === 'show' || cmd === 'sh') {
      return this.handleShow(args);
    }
    if (cmd === 'ping') {
      return this.executePing(args);
    }
    return [`% Invalid input detected at '^' marker.`];
  }

  private handleConfig(cmd: string, args: string[]): string[] {
    if (cmd === 'hostname') {
      if (args.length > 0) {
        this.device.name = args[0];
        this.notifyUpdate();
        return [];
      }
      return ['% Incomplete command.'];
    }

    if (cmd === 'interface' || cmd === 'int') {
      if (args.length > 0) {
        const query = args.join(' ').toLowerCase();
        const found = this.device.interfaces.find(
          (i) => i.name.toLowerCase() === query || i.name.toLowerCase().replace('/', '') === query
        );
        if (found) {
          this.mode = 'CONFIG_IF';
          this.currentInterfaceId = found.id;
          return [];
        }
        return [`% Invalid interface type and number`];
      }
      return ['% Incomplete command.'];
    }

    return [`% Invalid input detected at '^' marker.`];
  }

  private handleConfigIf(cmd: string, args: string[]): string[] {
    const iface = this.device.interfaces.find((i) => i.id === this.currentInterfaceId);
    if (!iface) return ['% Error: Interface context lost.'];

    if (cmd === 'ip' && args[0] === 'address') {
      const ip = args[1];
      const mask = args[2];
      if (ip && mask) {
        iface.ip = ip;
        iface.netmask = mask;
        this.notifyUpdate();
        return [];
      }
      return ['% Incomplete command. Syntax: ip address <ip> <netmask>'];
    }

    if (cmd === 'no' && args[0] === 'shutdown') {
      iface.status = 'up';
      this.notifyUpdate();
      return [`%LINK-5-CHANGED: Interface ${iface.name}, changed state to up`, `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${iface.name}, changed state to up`];
    }

    if (cmd === 'shutdown') {
      iface.status = 'down';
      this.notifyUpdate();
      return [`%LINK-5-CHANGED: Interface ${iface.name}, changed state to administratively down`];
    }

    return [`% Invalid input detected at '^' marker.`];
  }

  private handleShow(args: string[]): string[] {
    const sub = args.join(' ').toLowerCase();

    if (sub.includes('ip int') || sub.includes('ip interface brief')) {
      const lines = [
        'Interface              IP-Address      OK? Method Status                Protocol',
      ];
      this.device.interfaces.forEach((i) => {
        const status = i.status === 'up' ? 'up                    up' : 'administratively down down';
        lines.push(
          `${i.name.padEnd(22)} ${(i.ip || 'unassigned').padEnd(15)} YES manual ${status}`
        );
      });
      return lines;
    }

    if (sub.includes('mac') || sub.includes('mac-address-table')) {
      const lines = [
        '          Mac Address Table',
        '-------------------------------------------',
        'Vlan    Mac Address       Type        Ports',
        '----    -----------       --------    -----',
      ];
      if (this.device.macTable && this.device.macTable.length > 0) {
        this.device.macTable.forEach((m) => {
          lines.push(`   1    ${m.mac}    DYNAMIC     ${m.portId}`);
        });
      } else {
        lines.push('Total Mac Addresses for this criterion: 0');
      }
      return lines;
    }

    if (sub.includes('ip route')) {
      const lines = [
        'Codes: C - connected, S - static',
        'Gateway of last resort is not set',
        '',
      ];
      this.device.interfaces.forEach((i) => {
        if (i.ip && i.netmask && i.status === 'up') {
          lines.push(`C    ${i.ip}/${i.netmask} is directly connected, ${i.name}`);
        }
      });
      return lines;
    }

    if (sub.includes('run') || sub.includes('running-config')) {
      return [
        'Building configuration...',
        'Current configuration : 1024 bytes',
        '!',
        `hostname ${this.device.name}`,
        '!',
        ...this.device.interfaces.flatMap((i) => [
          `interface ${i.name}`,
          i.ip ? ` ip address ${i.ip} ${i.netmask}` : ' no ip address',
          i.status === 'down' ? ' shutdown' : ' no shutdown',
          '!',
        ]),
        'end',
      ];
    }

    return [`% Invalid show command: "show ${sub}"`];
  }

  private executePing(args: string[]): string[] {
    if (args.length === 0) return ['% Incomplete command. Syntax: ping <ip_address>'];
    const target = args[0];
    const res = this.engine.ping(this.device.id, target);
    if (!res.success) {
      return [`Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`, '.....', `% ${res.message}`];
    }
    return [
      `Type escape sequence to abort.`,
      `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
      `!!!!!`,
      `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
    ];
  }

  private notifyUpdate(): void {
    if (this.onDeviceUpdate) {
      this.onDeviceUpdate({ ...this.device });
    }
  }
}
