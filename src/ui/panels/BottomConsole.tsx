import React, { useState } from 'react';
import { Terminal, Activity, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { SerializedDevice } from '../../storage/ProjectSchema';
import type { NetworkSimulationEngine, SimulationEvent } from '../../core/engine/NetworkSimulationEngine';
import type { EthernetFrame } from '../../core/protocols/Ethernet';
import { VirtualTerminal } from '../terminal/VirtualTerminal';
import { EventStreamPanel } from './EventStreamPanel';
import { PacketInspectorPanel } from './PacketInspectorPanel';
import './BottomConsole.css';

export interface BottomConsoleProps {
  isOpen: boolean;
  selectedDevice: SerializedDevice | null;
  engine: NetworkSimulationEngine;
  events: SimulationEvent[];
  inspectedFrame: EthernetFrame | null;
  onToggleOpen: () => void;
  onClearEvents: () => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  isOpen,
  selectedDevice,
  engine,
  events,
  inspectedFrame,
  onToggleOpen,
  onClearEvents,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'events' | 'inspector'>('terminal');

  return (
    <div className={`netrion-bottom-console ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="console-tab-header">
        <div className="tab-buttons-group">
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={13} />
            <span>Terminal</span>
            {selectedDevice && <span className="tab-pill mono-numbers">{selectedDevice.name}</span>}
          </button>

          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Activity size={13} />
            <span>Event Bus</span>
            {events.length > 0 && <span className="tab-pill mono-numbers">{events.length}</span>}
          </button>

          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
            onClick={() => setActiveTab('inspector')}
          >
            <Eye size={13} />
            <span>Packet Inspector</span>
            {inspectedFrame && <span className="tab-pill mono-numbers">{inspectedFrame.etherType}</span>}
          </button>
        </div>

        <button
          type="button"
          className="console-toggle-btn"
          onClick={onToggleOpen}
          title={isOpen ? 'Collapse Console (Ctrl+`)' : 'Expand Console (Ctrl+`)'}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {isOpen && (
        <div className="console-body">
          {activeTab === 'terminal' && (
            <VirtualTerminal device={selectedDevice} engine={engine} />
          )}

          {activeTab === 'events' && (
            <EventStreamPanel events={events} onClear={onClearEvents} />
          )}

          {activeTab === 'inspector' && (
            <PacketInspectorPanel lastFrame={inspectedFrame} />
          )}
        </div>
      )}
    </div>
  );
};
