import type { ChallengeScenario } from './types';
import { createDefaultDevice } from '../core/models/Device';
import type { NetrionProjectData, SerializedConnection } from '../storage/ProjectSchema';

export const challengesList: ChallengeScenario[] = [
  {
    id: 'ch-01-gateway',
    title: 'CHALLENGE 01: The Unreachable Remote Server',
    category: 'Default Gateway',
    difficulty: 'Beginner',
    briefing:
      'PC-01 cannot ping Server-01 (10.0.0.50) located across Router-01. Investigate PC-01 IP configuration, terminal, and routing.',
    hint: 'A host requires a Default Gateway configured to send packets to any IP address outside its local subnet.',
    objectives: [
      'Open PC-01 terminal or properties',
      'Verify why PC-01 cannot reach 10.0.0.50',
      'Configure PC-01 Default Gateway to Router-01 (192.168.1.1)',
      'Confirm ping 10.0.0.50 succeeds',
    ],
    explanationWhenCompleted:
      'Excellent troubleshooting! When PC-01 calculates that 10.0.0.50 is not on its local subnet (192.168.1.0/24), it must consult its Default Gateway. Without 192.168.1.1 configured as the next-hop L2 router, PC-01 drops the packet immediately.',
    initialTopology: (): NetrionProjectData => {
      const pc1 = createDefaultDevice('pc', 120, 240, 'PC-01');
      pc1.interfaces[0].ip = '192.168.1.10';
      pc1.interfaces[0].netmask = '255.255.255.0';
      pc1.interfaces[0].gateway = null; // PROBLEM: Gateway missing!

      const rtr = createDefaultDevice('router', 380, 240, 'Router-01');
      rtr.interfaces[0].name = 'Fa0/0';
      rtr.interfaces[0].ip = '192.168.1.1';
      rtr.interfaces[0].netmask = '255.255.255.0';

      rtr.interfaces[1].name = 'Fa0/1';
      rtr.interfaces[1].ip = '10.0.0.1';
      rtr.interfaces[1].netmask = '255.255.255.0';

      const srv = createDefaultDevice('server', 640, 240, 'Server-01');
      srv.interfaces[0].ip = '10.0.0.50';
      srv.interfaces[0].netmask = '255.255.255.0';
      srv.interfaces[0].gateway = '10.0.0.1';

      const conn1: SerializedConnection = {
        id: 'conn_pc_rtr',
        sourceDeviceId: pc1.id,
        sourceInterfaceId: pc1.interfaces[0].id,
        targetDeviceId: rtr.id,
        targetInterfaceId: rtr.interfaces[0].id,
        type: 'copper',
        status: 'up',
        bandwidthMbps: 100,
        latencyMs: 15,
      };
      pc1.interfaces[0].connectedToConnectionId = conn1.id;
      rtr.interfaces[0].connectedToConnectionId = conn1.id;

      const conn2: SerializedConnection = {
        id: 'conn_rtr_srv',
        sourceDeviceId: rtr.id,
        sourceInterfaceId: rtr.interfaces[1].id,
        targetDeviceId: srv.id,
        targetInterfaceId: srv.interfaces[0].id,
        type: 'copper',
        status: 'up',
        bandwidthMbps: 100,
        latencyMs: 15,
      };
      rtr.interfaces[1].connectedToConnectionId = conn2.id;
      srv.interfaces[0].connectedToConnectionId = conn2.id;

      return {
        formatVersion: '1.0.0',
        generator: 'Netrion Simulator',
        id: 'challenge_01_gw',
        name: 'Challenge 01 - Default Gateway',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Challenge 01 troubleshooting scenario',
        devices: [pc1, rtr, srv],
        connections: [conn1, conn2],
        viewport: { panX: 0, panY: 0, zoom: 1 },
        simulationSettings: { speed: 1, isPaused: false },
      };
    },
    checkSuccess: (_engine, project) => {
      const pc = project.devices.find((d) => d.name === 'PC-01');
      if (!pc) return false;
      return pc.interfaces[0]?.gateway === '192.168.1.1';
    },
  },

  {
    id: 'ch-02-subnet',
    title: 'CHALLENGE 02: The Subnet Mask Divergence',
    category: 'Layer 3 IP & Subnet',
    difficulty: 'Intermediate',
    briefing:
      'PC-01 (192.168.1.10) and PC-02 (192.168.1.20) are plugged into the same switch, but ping fails. Discover the addressing mistake.',
    hint: 'Examine the Subnet Mask on both PCs. If their netmasks divide the address space differently, one PC will consider the other off-subnet.',
    objectives: [
      'Inspect PC-01 and PC-02 IP properties',
      'Notice that PC-02 has subnet mask 255.255.255.240 (/28)',
      'Change PC-02 subnet mask to 255.255.255.0 (/24)',
      'Confirm ping 192.168.1.20 from PC-01 works',
    ],
    explanationWhenCompleted:
      'Well done! With mask 255.255.255.240 (/28), 192.168.1.10 and 192.168.1.20 fall into two completely separate subnets (192.168.1.0/28 vs 192.168.1.16/28). Normalizing both to 255.255.255.0 (/24) allowed direct Layer 2 communication over the switch.',
    initialTopology: (): NetrionProjectData => {
      const pc1 = createDefaultDevice('pc', 150, 240, 'PC-01');
      pc1.interfaces[0].ip = '192.168.1.10';
      pc1.interfaces[0].netmask = '255.255.255.0';

      const sw = createDefaultDevice('switch', 380, 240, 'Switch-01');

      const pc2 = createDefaultDevice('pc', 610, 240, 'PC-02');
      pc2.interfaces[0].ip = '192.168.1.20';
      pc2.interfaces[0].netmask = '255.255.255.240'; // PROBLEM: Mask mismatch!

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

      return {
        formatVersion: '1.0.0',
        generator: 'Netrion Simulator',
        id: 'challenge_02_mask',
        name: 'Challenge 02 - Subnet Mask',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Challenge 02 troubleshooting scenario',
        devices: [pc1, sw, pc2],
        connections: [conn1, conn2],
        viewport: { panX: 0, panY: 0, zoom: 1 },
        simulationSettings: { speed: 1, isPaused: false },
      };
    },
    checkSuccess: (_engine, project) => {
      const pc2 = project.devices.find((d) => d.name === 'PC-02');
      if (!pc2) return false;
      return pc2.interfaces[0]?.netmask === '255.255.255.0';
    },
  },

  {
    id: 'ch-03-cable',
    title: 'CHALLENGE 03: The Severed Link (Layer 1)',
    category: 'Layer 1 Physical',
    difficulty: 'Beginner',
    briefing:
      'PC-01 cannot communicate with Server-01. The IP configurations look perfect. Check the physical layer connectivity.',
    hint: 'Check the connection cables between Switch-01 and Server-01. Is there an active cable link connected to a live port?',
    objectives: [
      'Inspect the network canvas connections',
      'Notice that the link to Server-01 is DOWN (severed)',
      'Select the broken link in Inspector and set LINK STATE to UP (or reconnect a cable)',
      'Verify ping 192.168.1.100 succeeds from PC-01',
    ],
    explanationWhenCompleted:
      'Great job! Layer 1 (Physical) is always the first layer to verify in the OSI model. Regardless of correct IP addressing and ARP logic, if the physical transmission medium is down or disconnected, no frames can travel across the wire.',
    initialTopology: (): NetrionProjectData => {
      const pc1 = createDefaultDevice('pc', 160, 240, 'PC-01');
      pc1.interfaces[0].ip = '192.168.1.10';
      pc1.interfaces[0].netmask = '255.255.255.0';

      const sw = createDefaultDevice('switch', 380, 240, 'Switch-01');

      const srv = createDefaultDevice('server', 600, 240, 'Server-01');
      srv.interfaces[0].ip = '192.168.1.100';
      srv.interfaces[0].netmask = '255.255.255.0';

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
        id: 'conn_sw_srv',
        sourceDeviceId: sw.id,
        sourceInterfaceId: sw.interfaces[1].id,
        targetDeviceId: srv.id,
        targetInterfaceId: srv.interfaces[0].id,
        type: 'copper',
        status: 'down', // PROBLEM: Physical link DOWN!
        bandwidthMbps: 100,
        latencyMs: 10,
      };
      sw.interfaces[1].connectedToConnectionId = conn2.id;
      srv.interfaces[0].connectedToConnectionId = conn2.id;

      return {
        formatVersion: '1.0.0',
        generator: 'Netrion Simulator',
        id: 'challenge_03_l1',
        name: 'Challenge 03 - Physical Link',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Challenge 03 troubleshooting scenario',
        devices: [pc1, sw, srv],
        connections: [conn1, conn2],
        viewport: { panX: 0, panY: 0, zoom: 1 },
        simulationSettings: { speed: 1, isPaused: false },
      };
    },
    checkSuccess: (_engine, project) => {
      const conn = project.connections.find((c) => c.id === 'conn_sw_srv');
      return Boolean(conn && conn.status === 'up');
    },
  },
];
