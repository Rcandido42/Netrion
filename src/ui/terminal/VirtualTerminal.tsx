import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SerializedDevice } from '../../storage/ProjectSchema';
import type { NetworkSimulationEngine } from '../../core/engine/NetworkSimulationEngine';
import './VirtualTerminal.css';

export interface VirtualTerminalProps {
  device: SerializedDevice | null;
  engine: NetworkSimulationEngine;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
}

export const VirtualTerminal: React.FC<VirtualTerminalProps> = ({ device, engine }) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'info',
      text: 'Netrion Virtual Terminal Subsystem [Version 1.0.0]',
    },
    {
      id: 'init-2',
      type: 'info',
      text: 'Type "help" to view available networking diagnostic commands.',
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when lines update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = useCallback((text: string, type: TerminalLine['type'] = 'output') => {
    setLines((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        text,
      },
    ]);
  }, []);

  // Listen for engine events relevant to this device's terminal
  useEffect(() => {
    if (!device) return;

    const unsubscribe = engine.subscribe((evt) => {
      if (evt.deviceId === device.id) {
        if (evt.type === 'ICMP_ECHO_REP') {
          addLine(evt.description, 'success');
        } else if (evt.type === 'FRAME_DROPPED') {
          addLine(`[ERROR] ${evt.description}`, 'error');
        } else if (evt.type === 'ARP_REQUEST' || evt.type === 'ARP_REPLY') {
          addLine(`[ARP] ${evt.description}`, 'info');
        }
      }
    });

    return () => unsubscribe();
  }, [device, engine, addLine]);

  const handleCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Record command in history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Display user command line
    const promptPrefix = device ? `${device.name}>` : 'netrion>';
    addLine(`${promptPrefix} ${trimmed}`, 'input');

    const [cmd, ...args] = trimmed.split(/\s+/);
    const lowerCmd = cmd.toLowerCase();

    if (!device) {
      addLine('No device selected. Select a PC or Server on the canvas to execute commands.', 'error');
      return;
    }

    switch (lowerCmd) {
      case 'help':
        addLine('Available Network Commands:');
        addLine('  ping <ip>      - Send ICMP Echo Request to destination IP');
        addLine('  ipconfig       - Display active network interface configuration');
        addLine('  arp -a         - Display current ARP resolution cache table');
        addLine('  route print    - Display local IP routing table');
        addLine('  clear / cls    - Clear terminal screen buffer');
        addLine('  hostname       - Display device hostname');
        break;

      case 'clear':
      case 'cls':
        setLines([]);
        break;

      case 'hostname':
        addLine(device.name);
        break;

      case 'ipconfig':
      case 'ifconfig':
        addLine(`Netrion IP Configuration for ${device.name}:`);
        device.interfaces.forEach((iface) => {
          addLine(`  Interface ${iface.name}:`);
          addLine(`    Hardware Address (MAC) . . . : ${iface.mac}`);
          addLine(`    IPv4 Address . . . . . . . . : ${iface.ip || '(Not Configured)'}`);
          addLine(`    Subnet Mask  . . . . . . . . : ${iface.netmask || '(Not Configured)'}`);
          addLine(`    Default Gateway  . . . . . . : ${iface.gateway || '(Not Configured)'}`);
          addLine(`    Link State . . . . . . . . . : ${iface.connectedToConnectionId ? 'UP' : 'DISCONNECTED'}`);
        });
        break;

      case 'arp':
        if (args[0] === '-a' || args.length === 0) {
          addLine(`Interface: ${device.interfaces[0]?.ip || 'unassigned'} --- ARP Cache`);
          if (device.arpTable && device.arpTable.length > 0) {
            addLine('  Internet Address      Physical Address      Type');
            device.arpTable.forEach((entry) => {
              addLine(`  ${entry.ip.padEnd(20)}  ${entry.mac.padEnd(20)}  dynamic`);
            });
          } else {
            addLine('  No ARP entries found in cache table.');
          }
        } else {
          addLine('Usage: arp -a', 'error');
        }
        break;

      case 'route':
        if (args[0] === 'print' || args.length === 0) {
          addLine('IPv4 Route Table');
          addLine('===========================================================================');
          addLine('Network Destination        Netmask          Gateway/NextHop    Interface');
          if (device.routingTable && device.routingTable.length > 0) {
            device.routingTable.forEach((r) => {
              addLine(`  ${r.destination.padEnd(23)} ${r.netmask.padEnd(16)} ${(r.nextHop || 'On-link').padEnd(18)} ${r.interfaceId}`);
            });
          } else {
            device.interfaces.forEach((i) => {
              if (i.ip && i.netmask) {
                addLine(`  ${i.ip.padEnd(23)} ${i.netmask.padEnd(16)} ${'On-link'.padEnd(18)} ${i.name}`);
              }
              if (i.gateway) {
                addLine(`  ${'0.0.0.0'.padEnd(23)} ${'0.0.0.0'.padEnd(16)} ${i.gateway.padEnd(18)} ${i.name}`);
              }
            });
          }
        } else {
          addLine('Usage: route print', 'error');
        }
        break;

      case 'ping':
        if (args.length === 0) {
          addLine('Usage: ping <destination_ip>', 'error');
          return;
        }
        const targetIp = args[0];
        addLine(`Pinging ${targetIp} with 32 bytes of data:`);
        const result = engine.ping(device.id, targetIp);
        if (!result.success) {
          addLine(`Ping error: ${result.message}`, 'error');
        }
        break;

      default:
        addLine(`'${cmd}' is not recognized as an internal network command. Type "help" for command list.`, 'error');
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
      setInputVal('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal('');
        }
      }
    }
  };

  return (
    <div className="netrion-terminal-container" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-header-bar">
        <span className="terminal-device-badge">
          {device ? `HOST: ${device.name} [${device.interfaces[0]?.ip || 'NO IP'}]` : 'NO DEVICE SELECTED'}
        </span>
        <span className="terminal-help-hint mono-numbers">Commands: ping, ipconfig, arp -a, route print, clear</span>
      </div>

      <div className="terminal-output-area">
        {lines.map((line) => (
          <div key={line.id} className={`terminal-line ${line.type}`}>
            <span className="terminal-text">{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="terminal-input-row">
        <span className="terminal-prompt mono-numbers">{device ? `${device.name}>` : '$'}</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input-field mono-numbers"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
};
