/**
 * Netrion Project File Schema (.netrion)
 * Version: 1.0.0
 * Fully serialized network topology, interface states, and simulation configuration.
 */

export interface SerializedInterface {
  id: string;
  name: string; // e.g., 'eth0', 'FastEthernet0/1'
  mac: string;
  ip: string | null;
  netmask: string | null;
  gateway: string | null;
  status: 'up' | 'down';
  connectedToConnectionId: string | null;
}

export interface SerializedDevice {
  id: string;
  name: string;
  type:
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
  model?: string;
  x: number;
  y: number;
  interfaces: SerializedInterface[];
  arpTable: Array<{ ip: string; mac: string; timestamp: number }>;
  routingTable: Array<{
    destination: string;
    netmask: string;
    nextHop: string | null;
    interfaceId: string;
    metric: number;
  }>;
  macTable?: Array<{ mac: string; portId: string; timestamp: number }>;
}

export type DeviceType = SerializedDevice['type'];

export interface SerializedConnection {
  id: string;
  sourceDeviceId: string;
  sourceInterfaceId: string;
  targetDeviceId: string;
  targetInterfaceId: string;
  type: 'copper' | 'fiber' | 'serial';
  status: 'up' | 'down';
  bandwidthMbps: number;
  latencyMs: number;
}

export interface NetrionProjectData {
  formatVersion: '1.0.0';
  generator: 'Netrion Simulator';
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  devices: SerializedDevice[];
  connections: SerializedConnection[];
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  simulationSettings: {
    speed: number;
    isPaused: boolean;
  };
}

export function createDefaultProject(name = 'Untitled-Network'): NetrionProjectData {
  const now = new Date().toISOString();
  return {
    formatVersion: '1.0.0',
    generator: 'Netrion Simulator',
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    createdAt: now,
    updatedAt: now,
    description: 'Local computer networking topology',
    devices: [],
    connections: [],
    viewport: {
      panX: 0,
      panY: 0,
      zoom: 1,
    },
    simulationSettings: {
      speed: 1,
      isPaused: false,
    },
  };
}

export function validateProjectData(raw: unknown): NetrionProjectData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid project file: Content is not a valid JSON object');
  }

  const data = raw as Partial<NetrionProjectData>;

  if (data.formatVersion !== '1.0.0') {
    throw new Error(`Unsupported project format version: "${data.formatVersion}". Supported version: "1.0.0"`);
  }

  if (!Array.isArray(data.devices)) {
    throw new Error('Corrupted project file: "devices" array is missing or invalid');
  }

  if (!Array.isArray(data.connections)) {
    throw new Error('Corrupted project file: "connections" array is missing or invalid');
  }

  return {
    formatVersion: '1.0.0',
    generator: data.generator || 'Netrion Simulator',
    id: data.id || `proj_${Date.now()}`,
    name: data.name || 'Untitled-Network',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: data.description || '',
    devices: data.devices,
    connections: data.connections,
    viewport: data.viewport || { panX: 0, panY: 0, zoom: 1 },
    simulationSettings: data.simulationSettings || { speed: 1, isPaused: false },
  };
}
