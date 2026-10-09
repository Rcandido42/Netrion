import { generateMacAddress } from './NetworkInterface';
import type { SerializedDevice, SerializedInterface } from '../../storage/ProjectSchema';

export type DeviceType =
  | 'pc'
  | 'laptop'
  | 'server'
  | 'printer'
  | 'switch'
  | 'switch-l3'
  | 'router'
  | 'firewall'
  | 'access-point'
  | 'cloud';

let deviceCounter = 1;

export function resetDeviceCounter(val = 1): void {
  deviceCounter = val;
}

export function createDefaultDevice(
  type: DeviceType,
  x: number,
  y: number,
  customName?: string
): SerializedDevice {
  const count = deviceCounter++;
  const id = `dev_${type}_${Date.now()}_${count}`;

  let name = customName;
  if (!name) {
    const pad = count.toString().padStart(2, '0');
    switch (type) {
      case 'pc':
        name = `PC-${pad}`;
        break;
      case 'laptop':
        name = `Laptop-${pad}`;
        break;
      case 'server':
        name = `Server-${pad}`;
        break;
      case 'printer':
        name = `Printer-${pad}`;
        break;
      case 'switch':
        name = `Switch-${pad}`;
        break;
      case 'switch-l3':
        name = `SwitchL3-${pad}`;
        break;
      case 'router':
        name = `Router-${pad}`;
        break;
      case 'firewall':
        name = `Firewall-${pad}`;
        break;
      case 'access-point':
        name = `AP-${pad}`;
        break;
      case 'cloud':
        name = `Internet-${pad}`;
        break;
    }
  }

  const interfaces: SerializedInterface[] = [];

  switch (type) {
    case 'pc':
    case 'laptop':
    case 'server':
    case 'printer': {
      interfaces.push({
        id: `${id}_if0`,
        name: 'eth0',
        mac: generateMacAddress(),
        ip: null,
        netmask: null,
        gateway: null,
        status: 'up',
        connectedToConnectionId: null,
      });
      break;
    }
    case 'switch': {
      for (let p = 1; p <= 4; p++) {
        interfaces.push({
          id: `${id}_p${p}`,
          name: `port${p}`,
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        });
      }
      break;
    }
    case 'switch-l3': {
      for (let p = 1; p <= 8; p++) {
        interfaces.push({
          id: `${id}_g${p}`,
          name: `Gi0/${p}`,
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        });
      }
      break;
    }
    case 'router': {
      interfaces.push(
        {
          id: `${id}_fa0`,
          name: 'Fa0/0',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_fa1`,
          name: 'Fa0/1',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        }
      );
      break;
    }
    case 'firewall': {
      interfaces.push(
        {
          id: `${id}_wan`,
          name: 'WAN',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_lan`,
          name: 'LAN',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_dmz`,
          name: 'DMZ',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        }
      );
      break;
    }
    case 'access-point': {
      interfaces.push(
        {
          id: `${id}_eth`,
          name: 'eth0 (Uplink)',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_wlan`,
          name: 'wlan0',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        }
      );
      break;
    }
    case 'cloud': {
      interfaces.push(
        {
          id: `${id}_wan0`,
          name: 'WAN-1',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_wan1`,
          name: 'WAN-2',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        }
      );
      break;
    }
  }

  const isSwitchingDevice = type === 'switch' || type === 'switch-l3' || type === 'access-point';

  return {
    id,
    name,
    type,
    x,
    y,
    interfaces,
    arpTable: [],
    routingTable: [],
    macTable: isSwitchingDevice ? [] : undefined,
  };
}
