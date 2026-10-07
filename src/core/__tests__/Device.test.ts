import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultDevice, resetDeviceCounter } from '../models/Device';
import { generateMacAddress, NetworkInterface } from '../models/NetworkInterface';

describe('Device and NetworkInterface models', () => {
  beforeEach(() => {
    resetDeviceCounter(1);
  });

  it('generates valid IEEE 802 MAC addresses', () => {
    const mac = generateMacAddress();
    expect(mac).toMatch(/^00:60:2F:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
  });

  it('initializes a PC device with 1 eth0 interface', () => {
    const pc = createDefaultDevice('pc', 100, 200);
    expect(pc.name).toBe('PC-01');
    expect(pc.type).toBe('pc');
    expect(pc.x).toBe(100);
    expect(pc.y).toBe(200);
    expect(pc.interfaces).toHaveLength(1);
    expect(pc.interfaces[0].name).toBe('eth0');
    expect(pc.interfaces[0].mac).toBeDefined();
  });

  it('initializes a Switch with 4 L2 ports and macTable', () => {
    const sw = createDefaultDevice('switch', 300, 300);
    expect(sw.name).toBe('Switch-01');
    expect(sw.type).toBe('switch');
    expect(sw.interfaces).toHaveLength(4);
    expect(sw.interfaces.map((i) => i.name)).toEqual(['port1', 'port2', 'port3', 'port4']);
    expect(sw.macTable).toEqual([]);
  });

  it('initializes a Router with 2 L3 FastEthernet interfaces', () => {
    const rtr = createDefaultDevice('router', 500, 200);
    expect(rtr.name).toBe('Router-01');
    expect(rtr.type).toBe('router');
    expect(rtr.interfaces).toHaveLength(2);
    expect(rtr.interfaces.map((i) => i.name)).toEqual(['Fa0/0', 'Fa0/1']);
  });

  it('handles NetworkInterface model state methods', () => {
    const iface = new NetworkInterface({
      id: 'test_1',
      name: 'eth0',
      mac: '00:60:2F:AA:BB:CC',
      ip: '192.168.1.10',
      netmask: '255.255.255.0',
    });

    expect(iface.isConfigured()).toBe(true);
    expect(iface.isConnected()).toBe(false);

    iface.connectedToConnectionId = 'conn_1';
    expect(iface.isConnected()).toBe(true);
  });
});
