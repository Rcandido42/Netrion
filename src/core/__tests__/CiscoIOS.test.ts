import { describe, it, expect } from 'vitest';
import { CiscoIOSEmulator } from '../ios/CiscoIOS';
import { createDefaultDevice } from '../models/Device';
import { NetworkSimulationEngine } from '../engine/NetworkSimulationEngine';

describe('CiscoIOSEmulator', () => {
  it('navigates through User, Privileged, Global Config, and Interface Config modes', () => {
    const router = createDefaultDevice('router', 0, 0, 'Router-01');
    const engine = new NetworkSimulationEngine([router], []);
    const ios = new CiscoIOSEmulator(router, engine);

    expect(ios.getPrompt()).toBe('Router-01>');

    // enable
    ios.execute('enable');
    expect(ios.getPrompt()).toBe('Router-01#');

    // configure terminal
    ios.execute('configure terminal');
    expect(ios.getPrompt()).toBe('Router-01(config)#');

    // hostname change
    ios.execute('hostname Edge-R1');
    expect(ios.getPrompt()).toBe('Edge-R1(config)#');

    // interface Fa0/0
    ios.execute('interface Fa0/0');
    expect(ios.getPrompt()).toBe('Edge-R1(config-if-Fa0/0)#');

    // ip address
    ios.execute('ip address 192.168.10.1 255.255.255.0');
    const iface = router.interfaces.find((i) => i.name === 'Fa0/0');
    expect(iface?.ip).toBe('192.168.10.1');
    expect(iface?.netmask).toBe('255.255.255.0');

    // exit back to config
    ios.execute('exit');
    expect(ios.getPrompt()).toBe('Edge-R1(config)#');

    // exit back to privileged
    ios.execute('exit');
    expect(ios.getPrompt()).toBe('Edge-R1#');

    // disable back to user
    ios.execute('disable');
    expect(ios.getPrompt()).toBe('Edge-R1>');
  });

  it('runs show commands correctly', () => {
    const router = createDefaultDevice('router', 0, 0, 'R1');
    router.interfaces[0].ip = '10.0.0.1';
    router.interfaces[0].netmask = '255.255.255.0';
    const engine = new NetworkSimulationEngine([router], []);
    const ios = new CiscoIOSEmulator(router, engine);

    ios.execute('enable');
    const output = ios.execute('show ip interface brief');
    expect(output[0]).toContain('Interface');
    expect(output.some((l) => l.includes('10.0.0.1'))).toBe(true);
  });
});
