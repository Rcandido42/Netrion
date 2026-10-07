import { generateMacAddress } from './NetworkInterface';
import type { SerializedDevice, SerializedInterface } from '../../storage/ProjectSchema';

export type DeviceType = 'pc' | 'switch' | 'router' | 'server';

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
    switch (type) {
      case 'pc':
        name = `PC-${count.toString().padStart(2, '0')}`;
        break;
      case 'switch':
        name = `Switch-${count.toString().padStart(2, '0')}`;
        break;
      case 'router':
        name = `Router-${count.toString().padStart(2, '0')}`;
        break;
      case 'server':
        name = `Server-${count.toString().padStart(2, '0')}`;
        break;
    }
  }

  const interfaces: SerializedInterface[] = [];

  switch (type) {
    case 'pc':
    case 'server': {
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
      // 4 L2 ports
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
    case 'router': {
      // 2 L3 interfaces
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
  }

  return {
    id,
    name,
    type,
    x,
    y,
    interfaces,
    arpTable: [],
    routingTable: [],
    macTable: type === 'switch' ? [] : undefined,
  };
}
