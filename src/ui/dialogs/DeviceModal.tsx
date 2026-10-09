import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Power,
  Globe,
  Settings,
  Cpu,
  Monitor,
  Terminal,
  Printer,
  Server as ServerIcon,
} from 'lucide-react';
import type { SerializedDevice, DeviceType } from '../../storage/ProjectSchema';
import type { NetworkSimulationEngine } from '../../core/engine/NetworkSimulationEngine';
import { CiscoIOSEmulator } from '../../core/ios/CiscoIOS';
import './DeviceModal.css';

export interface DeviceModalProps {
  device: SerializedDevice | null;
  engine: NetworkSimulationEngine;
  onClose: () => void;
  onUpdateDevice: (updated: SerializedDevice) => void;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  device,
  engine,
  onClose,
  onUpdateDevice,
}) => {
  const [activeTab, setActiveTab] = useState<'physical' | 'config' | 'desktop' | 'cli'>('physical');
  const [desktopApp, setDesktopApp] = useState<'launcher' | 'ipconfig' | 'cmd' | 'browser' | 'services' | 'printer'>('launcher');

  // Physical Tab State
  const [isPoweredOn, setIsPoweredOn] = useState<boolean>(true);

  // Config Tab State
  const [selectedIfaceId, setSelectedIfaceId] = useState<string>('');

  // Server Services State
  const [httpServiceEnabled, setHttpServiceEnabled] = useState<boolean>(true);
  const [dnsServiceEnabled, setDnsServiceEnabled] = useState<boolean>(true);

  // Printer State
  const [printerLog, setPrinterLog] = useState<string>('Ready for print jobs (Paper: 250 sheets, Toner: 94%).');

  // Web Browser State (Desktop app)
  const [browserUrl, setBrowserUrl] = useState<string>('http://192.168.1.50');
  const [browserContent, setBrowserContent] = useState<string | null>(null);

  // CLI State
  const iosRef = useRef<CiscoIOSEmulator | null>(null);
  const [cliLines, setCliLines] = useState<string[]>([]);
  const [cliInput, setCliInput] = useState<string>('');
  const [cliPrompt, setCliPrompt] = useState<string>('Router>');
  const cliBottomRef = useRef<HTMLDivElement>(null);
  const cliInputRef = useRef<HTMLInputElement>(null);

  // Command Prompt (PC Desktop) state
  const [pcCmdLines, setPcCmdLines] = useState<string[]>([
    'Netrion OS Command Prompt [Version 1.0.0]',
    '(c) 2026 Netrion Corporation. All rights reserved.',
    '',
  ]);
  const [pcCmdInput, setPcCmdInput] = useState<string>('');
  const pcCmdBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (device) {
      setSelectedIfaceId(device.interfaces[0]?.id || '');
      const ios = new CiscoIOSEmulator(device, engine, onUpdateDevice);
      iosRef.current = ios;
      setCliPrompt(ios.getPrompt());
      setCliLines([
        `--- System Configuration Dialog ---`,
        `% IOS (tm) Software, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)`,
        `Press RETURN to get started!`,
        '',
      ]);
    }
  }, [device, engine, onUpdateDevice]);

  if (!device) return null;

  const currentIface = device.interfaces.find((i) => i.id === selectedIfaceId) || device.interfaces[0];

  const handlePowerToggle = () => {
    const nextPower = !isPoweredOn;
    setIsPoweredOn(nextPower);

    // If power turned off, all interfaces are brought administratively down
    const updated = {
      ...device,
      interfaces: device.interfaces.map((i) => ({
        ...i,
        status: (nextPower ? 'up' : 'down') as 'up' | 'down',
      })),
    };
    onUpdateDevice(updated);
  };

  const handleInterfaceChange = (field: 'ip' | 'netmask' | 'gateway' | 'mac' | 'status', value: string) => {
    if (!currentIface) return;
    const updated = {
      ...device,
      interfaces: device.interfaces.map((i) => {
        if (i.id !== currentIface.id) return i;
        return {
          ...i,
          [field]: field === 'status' ? (value as 'up' | 'down') : (value.trim() || null),
        };
      }),
    };
    onUpdateDevice(updated);
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iosRef.current) return;
    const prompt = iosRef.current.getPrompt();
    const result = iosRef.current.execute(cliInput);
    setCliLines((prev) => [...prev, `${prompt} ${cliInput}`, ...result]);
    setCliPrompt(iosRef.current.getPrompt());
    setCliInput('');
    setTimeout(() => {
      cliBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handlePcCmdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = pcCmdInput.trim();
    if (!input) return;

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const newLines = [`C:\\> ${input}`];

    if (cmd === 'ipconfig') {
      newLines.push(
        'Windows IP Configuration',
        '',
        `Ethernet adapter ${currentIface.name}:`,
        `   IPv4 Address. . . . . . . . . . . : ${currentIface.ip || '(Not Configured)'}`,
        `   Subnet Mask . . . . . . . . . . . : ${currentIface.netmask || '(Not Configured)'}`,
        `   Default Gateway . . . . . . . . . : ${currentIface.gateway || '(Not Configured)'}`
      );
    } else if (cmd === 'ping') {
      if (args.length === 0) {
        newLines.push('Usage: ping <destination_ip>');
      } else {
        const target = args[0];
        newLines.push(`Pinging ${target} with 32 bytes of data:`);
        const res = engine.ping(device.id, target);
        if (!res.success) {
          newLines.push(`Ping error: ${res.message}`);
        } else {
          newLines.push(
            `Reply from ${target}: bytes=32 time=1ms TTL=64`,
            `Reply from ${target}: bytes=32 time=1ms TTL=64`,
            `Ping statistics for ${target}:`,
            `    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss)`
          );
        }
      }
    } else if (cmd === 'cls' || cmd === 'clear') {
      setPcCmdLines([]);
      setPcCmdInput('');
      return;
    } else {
      newLines.push(`'${cmd}' is not recognized as an internal or external command.`);
    }

    setPcCmdLines((prev) => [...prev, ...newLines]);
    setPcCmdInput('');
    setTimeout(() => {
      pcCmdBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleBrowserGo = () => {
    // Attempt HTTP check
    const cleanUrl = browserUrl.replace(/^https?:\/\//, '').split('/')[0];
    const targetDev = engine.getDevices().find((d) => d.interfaces.some((i) => i.ip === cleanUrl));

    if (targetDev && (targetDev.type === 'server' || targetDev.name.toLowerCase().includes('server'))) {
      setBrowserContent(`
        <!DOCTYPE html>
        <html>
        <head><title>Netrion Web Server</title></head>
        <body style="font-family: sans-serif; padding: 20px; color: #f0f6fc;">
          <h1 style="color: #58a6ff;">Welcome to ${targetDev.name}!</h1>
          <p>This is the default index.html hosted on <strong>${cleanUrl}</strong>.</p>
          <hr style="border: 1px solid #30363d;" />
          <p style="color: #3fb950;">HTTP/1.1 200 OK • Connection: Keep-Alive</p>
        </body>
        </html>
      `);
    } else {
      setBrowserContent(`
        <div style="padding: 20px; color: #f85149; font-family: monospace;">
          <h3>Server Not Found</h3>
          <p>Host ${cleanUrl} could not be resolved or does not host an active HTTP service.</p>
        </div>
      `);
    }
  };

  const isHost = device.type === 'pc' || device.type === 'laptop' || device.type === 'server' || device.type === 'printer';
  const isNetworkDevice = !isHost;

  const getChassisModelName = (type: DeviceType): string => {
    switch (type) {
      case 'pc': return 'WORKSTATION DESKTOP PC (INTEL CORE / 1GbE)';
      case 'laptop': return 'ENTERPRISE MOBILE LAPTOP (802.11ac / 1GbE)';
      case 'server': return 'ENTERPRISE RACK SERVER 1U (XEON / DUAL GbE)';
      case 'printer': return 'NETWORK LASER PRINTER WORKGROUP (100BASE-TX)';
      case 'switch': return 'CISCO CATALYST 2960-24TT SWITCH (LAYER 2)';
      case 'switch-l3': return 'CISCO CATALYST 3650 MULTILAYER SWITCH (LAYER 3)';
      case 'router': return 'CISCO 2911 INTEGRATED SERVICES ROUTER (ISR)';
      case 'firewall': return 'CISCO ASA 5506-X NEXT-GEN FIREWALL APPLIANCE';
      case 'access-point': return 'CISCO AIRONET 2800 SERIES DUAL-BAND ACCESS POINT';
      case 'cloud': return 'WAN MULTI-ACCESS CLOUD / INTERNET GATEWAY';
      default: return 'GENERIC NETWORK EQUIPMENT';
    }
  };

  return (
    <div className="netrion-dialog-overlay" onClick={onClose}>
      <div className="netrion-device-window" onClick={(e) => e.stopPropagation()}>
        {/* Title Bar */}
        <div className="device-window-titlebar">
          <div className="window-title-left">
            <span className="device-brand-badge">{device.type.toUpperCase()}</span>
            <span className="device-window-name">{device.name}</span>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation (Physical, Config, Desktop, CLI) */}
        <div className="device-window-nav">
          <button
            type="button"
            className={`dev-nav-btn ${activeTab === 'physical' ? 'active' : ''}`}
            onClick={() => setActiveTab('physical')}
          >
            <Cpu size={13} />
            <span>Physical</span>
          </button>

          <button
            type="button"
            className={`dev-nav-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={13} />
            <span>Config</span>
          </button>

          {isHost && (
            <button
              type="button"
              className={`dev-nav-btn ${activeTab === 'desktop' ? 'active' : ''}`}
              onClick={() => setActiveTab('desktop')}
            >
              <Monitor size={13} />
              <span>Desktop</span>
            </button>
          )}

          {isNetworkDevice && (
            <button
              type="button"
              className={`dev-nav-btn ${activeTab === 'cli' ? 'active' : ''}`}
              onClick={() => setActiveTab('cli')}
            >
              <Terminal size={13} />
              <span>CLI</span>
            </button>
          )}
        </div>

        {/* Window Content */}
        <div className="device-window-body">
          {/* ================= PHYSICAL TAB ================= */}
          {activeTab === 'physical' && (
            <div className="physical-tab-view">
              <div className="hardware-chassis-panel">
                <div className="chassis-header">
                  <span className="chassis-model">
                    MODEL: {getChassisModelName(device.type)}
                  </span>
                  <div className="chassis-power-section">
                    <button
                      type="button"
                      className={`power-switch-btn ${isPoweredOn ? 'on' : 'off'}`}
                      onClick={handlePowerToggle}
                      title="Toggle Power Supply"
                    >
                      <Power size={13} />
                      <span>{isPoweredOn ? 'POWER ON' : 'POWER OFF'}</span>
                    </button>
                    <span className={`power-led ${isPoweredOn ? 'green' : 'off'}`} />
                  </div>
                </div>

                {/* Chassis Rear / Front Port Visual */}
                <div className="chassis-rack-face">
                  <div className="rack-slots-row">
                    {device.interfaces.map((iface) => {
                      const isConnected = Boolean(iface.connectedToConnectionId);
                      return (
                        <div key={iface.id} className="hardware-rj45-slot">
                          <div className="slot-leds">
                            <span className={`led-link ${isPoweredOn && isConnected ? 'link-up' : 'down'}`} />
                            <span className={`led-act ${isPoweredOn && isConnected ? 'act-active' : 'down'}`} />
                          </div>
                          <div className="rj45-connector-port">
                            <span className="connector-pin" />
                          </div>
                          <span className="slot-label mono-numbers">{iface.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="physical-specs-box">
                <div className="spec-item">
                  <span className="spec-label">CHASSIS STATUS:</span>
                  <span className="spec-val mono-numbers" style={{ color: isPoweredOn ? 'var(--color-link-up)' : 'var(--color-link-down)' }}>
                    {isPoweredOn ? 'OPERATIONAL (GREEN LED)' : 'POWER DISCONNECTED'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">TOTAL INTERFACES:</span>
                  <span className="spec-val mono-numbers">{device.interfaces.length}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">LINKED PORTS:</span>
                  <span className="spec-val mono-numbers">
                    {device.interfaces.filter((i) => i.connectedToConnectionId).length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= CONFIG TAB ================= */}
          {activeTab === 'config' && (
            <div className="config-tab-view">
              <div className="config-sidebar-interfaces">
                <span className="config-sidebar-title">INTERFACES</span>
                {device.interfaces.map((iface) => (
                  <button
                    key={iface.id}
                    type="button"
                    className={`config-iface-item ${selectedIfaceId === iface.id ? 'active' : ''}`}
                    onClick={() => setSelectedIfaceId(iface.id)}
                  >
                    <span className="iface-btn-name mono-numbers">{iface.name}</span>
                    <span className={`iface-btn-tag ${iface.status}`}>{iface.status}</span>
                  </button>
                ))}
              </div>

              {currentIface && (
                <div className="config-interface-form">
                  <div className="form-section-title">INTERFACE {currentIface.name} SETTINGS</div>

                  <div className="form-row">
                    <label>Port Status</label>
                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={currentIface.status === 'up'}
                        onChange={(e) => handleInterfaceChange('status', e.target.checked ? 'up' : 'down')}
                      />
                      <span>On (Link Enabled)</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <label>MAC Address</label>
                    <input
                      type="text"
                      className="form-input mono-numbers"
                      value={currentIface.mac}
                      onChange={(e) => handleInterfaceChange('mac', e.target.value)}
                    />
                  </div>

                  <div className="form-section-title" style={{ marginTop: '16px' }}>IP CONFIGURATION</div>

                  <div className="form-row">
                    <label>IPv4 Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.10"
                      className="form-input mono-numbers"
                      value={currentIface.ip || ''}
                      onChange={(e) => handleInterfaceChange('ip', e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Subnet Mask</label>
                    <input
                      type="text"
                      placeholder="255.255.255.0"
                      className="form-input mono-numbers"
                      value={currentIface.netmask || ''}
                      onChange={(e) => handleInterfaceChange('netmask', e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Default Gateway</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.1"
                      className="form-input mono-numbers"
                      value={currentIface.gateway || ''}
                      onChange={(e) => handleInterfaceChange('gateway', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= DESKTOP TAB (for PC/Server) ================= */}
          {activeTab === 'desktop' && isHost && (
            <div className="desktop-tab-view">
              {desktopApp === 'launcher' && (
                <div className="desktop-grid-launcher">
                  <button
                    type="button"
                    className="desktop-icon-tile"
                    onClick={() => setDesktopApp('ipconfig')}
                  >
                    <div className="tile-icon-box ip-icon">
                      <Settings size={22} />
                    </div>
                    <span className="tile-title">IP Configuration</span>
                  </button>

                  {device.type !== 'printer' && (
                    <button
                      type="button"
                      className="desktop-icon-tile"
                      onClick={() => setDesktopApp('cmd')}
                    >
                      <div className="tile-icon-box cmd-icon">
                        <Terminal size={22} />
                      </div>
                      <span className="tile-title">Command Prompt</span>
                    </button>
                  )}

                  {device.type !== 'printer' && (
                    <button
                      type="button"
                      className="desktop-icon-tile"
                      onClick={() => setDesktopApp('browser')}
                    >
                      <div className="tile-icon-box web-icon">
                        <Globe size={22} />
                      </div>
                      <span className="tile-title">Web Browser</span>
                    </button>
                  )}

                  {device.type === 'server' && (
                    <button
                      type="button"
                      className="desktop-icon-tile"
                      onClick={() => setDesktopApp('services')}
                    >
                      <div className="tile-icon-box server-icon">
                        <ServerIcon size={22} />
                      </div>
                      <span className="tile-title">Server Daemons</span>
                    </button>
                  )}

                  {device.type === 'printer' && (
                    <button
                      type="button"
                      className="desktop-icon-tile"
                      onClick={() => setDesktopApp('printer')}
                    >
                      <div className="tile-icon-box printer-icon">
                        <Printer size={22} />
                      </div>
                      <span className="tile-title">Printer Status</span>
                    </button>
                  )}
                </div>
              )}

              {desktopApp === 'ipconfig' && (
                <div className="desktop-app-container">
                  <div className="app-window-header">
                    <span>IP Configuration Utility</span>
                    <button type="button" className="app-back-btn" onClick={() => setDesktopApp('launcher')}>
                      Back to Desktop
                    </button>
                  </div>
                  <div className="app-content-box">
                    <div className="form-row">
                      <label>IPv4 Address</label>
                      <input
                        type="text"
                        className="form-input mono-numbers"
                        value={currentIface.ip || ''}
                        onChange={(e) => handleInterfaceChange('ip', e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <label>Subnet Mask</label>
                      <input
                        type="text"
                        className="form-input mono-numbers"
                        value={currentIface.netmask || ''}
                        onChange={(e) => handleInterfaceChange('netmask', e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <label>Default Gateway</label>
                      <input
                        type="text"
                        className="form-input mono-numbers"
                        value={currentIface.gateway || ''}
                        onChange={(e) => handleInterfaceChange('gateway', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {desktopApp === 'cmd' && (
                <div className="desktop-app-container">
                  <div className="app-window-header">
                    <span>Command Prompt (CMD)</span>
                    <button type="button" className="app-back-btn" onClick={() => setDesktopApp('launcher')}>
                      Back to Desktop
                    </button>
                  </div>
                  <div className="pc-cmd-box" onClick={() => cliInputRef.current?.focus()}>
                    {pcCmdLines.map((line, idx) => (
                      <div key={idx} className="cmd-line mono-numbers">
                        {line}
                      </div>
                    ))}
                    <form onSubmit={handlePcCmdSubmit} className="cmd-input-form">
                      <span className="cmd-prompt mono-numbers">C:\&gt;</span>
                      <input
                        ref={cliInputRef}
                        type="text"
                        className="cmd-input-field mono-numbers"
                        value={pcCmdInput}
                        onChange={(e) => setPcCmdInput(e.target.value)}
                        autoFocus
                      />
                    </form>
                    <div ref={pcCmdBottomRef} />
                  </div>
                </div>
              )}

              {desktopApp === 'browser' && (
                <div className="desktop-app-container">
                  <div className="app-window-header">
                    <span>Web Browser</span>
                    <button type="button" className="app-back-btn" onClick={() => setDesktopApp('launcher')}>
                      Back to Desktop
                    </button>
                  </div>
                  <div className="browser-address-bar">
                    <span className="browser-label">URL:</span>
                    <input
                      type="text"
                      className="browser-input mono-numbers"
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBrowserGo()}
                    />
                    <button type="button" className="browser-go-btn" onClick={handleBrowserGo}>
                      Go
                    </button>
                  </div>
                  <div className="browser-viewport">
                    {browserContent ? (
                      <div dangerouslySetInnerHTML={{ __html: browserContent }} />
                    ) : (
                      <div className="browser-blank">Enter an IP address (e.g. http://192.168.1.50) and press Go.</div>
                    )}
                  </div>
                </div>
              )}

              {desktopApp === 'services' && (
                <div className="desktop-app-container">
                  <div className="app-window-header">
                    <span>Server Daemon Services (HTTP & DNS)</span>
                    <button type="button" className="app-back-btn" onClick={() => setDesktopApp('launcher')}>
                      Back to Desktop
                    </button>
                  </div>
                  <div className="app-content-box">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', background: 'var(--bg-canvas)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>HTTP Web Server (Port 80)</span>
                          <button
                            type="button"
                            className={`power-switch-btn ${httpServiceEnabled ? 'on' : 'off'}`}
                            onClick={() => setHttpServiceEnabled(!httpServiceEnabled)}
                          >
                            <Power size={11} />
                            <span>{httpServiceEnabled ? 'RUNNING' : 'STOPPED'}</span>
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Hosts default index.html on port 80. Accessible via web browsers on connected PCs and Laptops.
                        </div>
                      </div>

                      <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', background: 'var(--bg-canvas)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>DNS Resolution Daemon (Port 53)</span>
                          <button
                            type="button"
                            className={`power-switch-btn ${dnsServiceEnabled ? 'on' : 'off'}`}
                            onClick={() => setDnsServiceEnabled(!dnsServiceEnabled)}
                          >
                            <Power size={11} />
                            <span>{dnsServiceEnabled ? 'RUNNING' : 'STOPPED'}</span>
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Resolves hostname and domain records for local area network clients.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {desktopApp === 'printer' && (
                <div className="desktop-app-container">
                  <div className="app-window-header">
                    <span>Network Printer Diagnostics & Spooler</span>
                    <button type="button" className="app-back-btn" onClick={() => setDesktopApp('launcher')}>
                      Back to Desktop
                    </button>
                  </div>
                  <div className="app-content-box">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        <div style={{ padding: 10, background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CONTROLLER STATUS</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-link-up)', marginTop: 4 }}>
                            ONLINE • READY
                          </div>
                        </div>
                        <div style={{ padding: 10, background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SUPPLIES STATUS</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                            94% TONER • TRAY 1 READY
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Print self-test diagnosis ticket to verify network controller
                        </span>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => {
                            setPrinterLog(`[${new Date().toLocaleTimeString()}] Diagnostic Test Page printed. IP: ${currentIface?.ip || 'Unset'} | MAC: ${currentIface?.mac || 'Unset'} | Gateway: ${currentIface?.gateway || 'None'}`);
                          }}
                        >
                          Print Test Page
                        </button>
                      </div>

                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-xs)', padding: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minHeight: 60 }}>
                        {printerLog}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= CLI TAB (Cisco IOS) ================= */}
          {activeTab === 'cli' && (
            <div className="cli-tab-view" onClick={() => cliInputRef.current?.focus()}>
              <div className="cisco-terminal-screen">
                {cliLines.map((line, idx) => (
                  <div key={idx} className="cisco-terminal-line mono-numbers">
                    {line}
                  </div>
                ))}
                <form onSubmit={handleCliSubmit} className="cisco-terminal-input-row">
                  <span className="cisco-prompt mono-numbers">
                    {cliPrompt}
                  </span>
                  <input
                    ref={cliInputRef}
                    type="text"
                    className="cisco-input-field mono-numbers"
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    autoFocus
                  />
                </form>
                <div ref={cliBottomRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
