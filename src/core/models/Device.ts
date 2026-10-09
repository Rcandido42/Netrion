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
  customName?: string,
  modelId?: string
): SerializedDevice {
  const count = deviceCounter++;
  const id = `dev_${type}_${Date.now()}_${count}`;
  const pad = count.toString().padStart(2, '0');

  let name = customName;
  let resolvedModel = '';

  // Determine model label and default name if not provided
  switch (type) {
    case 'switch': {
      if (modelId === '2960') {
        name = name || `Switch-2960-${pad}`;
        resolvedModel = 'CISCO CATALYST 2960-24TT (LAYER 2)';
      } else if (modelId === '2950') {
        name = name || `Switch-2950-${pad}`;
        resolvedModel = 'CISCO CATALYST 2950-8T (LAYER 2 COMPACT)';
      } else {
        name = name || `Switch-${pad}`;
        resolvedModel = 'GENERIC BENCHTOP SWITCH (4 PORTS)';
      }
      break;
    }
    case 'switch-l3': {
      name = name || `SwitchL3-${pad}`;
      resolvedModel = 'CISCO CATALYST 3650-24PS (LAYER 3 MULTILAYER)';
      break;
    }
    case 'router': {
      if (modelId === '2911') {
        name = name || `Router-2911-${pad}`;
        resolvedModel = 'CISCO 2911 INTEGRATED SERVICES ROUTER (ISR)';
      } else if (modelId === '1941') {
        name = name || `Router-1941-${pad}`;
        resolvedModel = 'CISCO 1941 COMPACT ISR';
      } else if (modelId === '2811') {
        name = name || `Router-2811-${pad}`;
        resolvedModel = 'CISCO 2811 ENTERPRISE FASTETHERNET ROUTER';
      } else {
        name = name || `Router-${pad}`;
        resolvedModel = 'GENERIC ROUTED GATEWAY';
      }
      break;
    }
    case 'pc': {
      name = name || `PC-${pad}`;
      resolvedModel = 'WORKSTATION DESKTOP PC (1GbE)';
      break;
    }
    case 'laptop': {
      name = name || `Laptop-${pad}`;
      resolvedModel = 'CORPORATE MOBILE LAPTOP (1GbE + 802.11ac)';
      break;
    }
    case 'server': {
      name = name || `Server-${pad}`;
      resolvedModel = 'ENTERPRISE RACK SERVER (DUAL GbE • HTTP/DNS)';
      break;
    }
    case 'printer': {
      name = name || `Printer-${pad}`;
      resolvedModel = 'WORKGROUP NETWORK LASER PRINTER';
      break;
    }
    case 'firewall': {
      if (modelId === 'asa') {
        name = name || `ASA5506-${pad}`;
        resolvedModel = 'CISCO ASA 5506-X NEXT-GEN FIREWALL';
      } else {
        name = name || `Firewall-${pad}`;
        resolvedModel = 'HARDWARE PACKET-FILTERING FIREWALL';
      }
      break;
    }
    case 'access-point': {
      if (modelId === 'home') {
        name = name || `HomeRouter-${pad}`;
        resolvedModel = 'WIRELESS HOME ROUTER & SWITCH (WRT-300N)';
      } else {
        name = name || `AP-${pad}`;
        resolvedModel = 'CISCO AIRONET 2800 SERIES DUAL-BAND AP';
      }
      break;
    }
    case 'cloud': {
      if (modelId === 'modem') {
        name = name || `Modem-${pad}`;
        resolvedModel = 'BROADBAND DSL/CABLE TERMINATION MODEM';
      } else {
        name = name || `Internet-${pad}`;
        resolvedModel = 'WAN MULTI-ACCESS CLOUD / ISP BACKBONE';
      }
      break;
    }
  }

  const interfaces: SerializedInterface[] = [];

  switch (type) {
    case 'pc':
    case 'laptop':
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
      if (modelId === 'rack') {
        interfaces.push({
          id: `${id}_if1`,
          name: 'eth1',
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
    case 'switch': {
      if (modelId === '2960') {
        // 24 FastEthernet + 2 Gigabit
        for (let p = 1; p <= 24; p++) {
          interfaces.push({
            id: `${id}_fa${p}`,
            name: `Fa0/${p}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
        for (let g = 1; g <= 2; g++) {
          interfaces.push({
            id: `${id}_gi${g}`,
            name: `Gi0/${g}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
      } else if (modelId === '2950') {
        // 8 FastEthernet
        for (let p = 1; p <= 8; p++) {
          interfaces.push({
            id: `${id}_fa${p}`,
            name: `Fa0/${p}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
      } else {
        // Generic 4-port switch
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
      }
      break;
    }
    case 'switch-l3': {
      const portCount = modelId === '3650' ? 24 : 8;
      for (let p = 1; p <= portCount; p++) {
        interfaces.push({
          id: `${id}_g${p}`,
          name: modelId === '3650' ? `Gi1/0/${p}` : `Gi0/${p}`,
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
      if (modelId === '2911') {
        // 3 GigabitEthernet ports
        for (let g = 0; g <= 2; g++) {
          interfaces.push({
            id: `${id}_gi${g}`,
            name: `Gi0/${g}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
      } else if (modelId === '1941') {
        // 2 GigabitEthernet ports
        for (let g = 0; g <= 1; g++) {
          interfaces.push({
            id: `${id}_gi${g}`,
            name: `Gi0/${g}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
      } else {
        // Standard / 2811: 2 FastEthernet ports
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
      }
      break;
    }
    case 'firewall': {
      const isAsa = modelId === 'asa';
      interfaces.push(
        {
          id: `${id}_wan`,
          name: isAsa ? 'Outside (WAN)' : 'WAN',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        },
        {
          id: `${id}_lan`,
          name: isAsa ? 'Inside (LAN)' : 'LAN',
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
      if (modelId === 'home') {
        interfaces.push({
          id: `${id}_wan`,
          name: 'Internet',
          mac: generateMacAddress(),
          ip: null,
          netmask: null,
          gateway: null,
          status: 'up',
          connectedToConnectionId: null,
        });
        for (let l = 1; l <= 4; l++) {
          interfaces.push({
            id: `${id}_lan${l}`,
            name: `LAN${l}`,
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          });
        }
      } else {
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
      }
      break;
    }
    case 'cloud': {
      if (modelId === 'modem') {
        interfaces.push(
          {
            id: `${id}_wan`,
            name: 'Internet',
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          },
          {
            id: `${id}_lan`,
            name: 'Ethernet',
            mac: generateMacAddress(),
            ip: null,
            netmask: null,
            gateway: null,
            status: 'up',
            connectedToConnectionId: null,
          }
        );
      } else {
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
      }
      break;
    }
  }

  const isSwitchingDevice = type === 'switch' || type === 'switch-l3' || type === 'access-point';

  return {
    id,
    name,
    type,
    model: resolvedModel,
    x,
    y,
    interfaces,
    arpTable: [],
    routingTable: [],
    macTable: isSwitchingDevice ? [] : undefined,
  };
}
