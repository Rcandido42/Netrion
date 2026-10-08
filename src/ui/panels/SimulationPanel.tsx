import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  SlidersHorizontal,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { SimulationEvent } from '../../core/engine/NetworkSimulationEngine';
import './SimulationPanel.css';

export interface UserPduRecord {
  id: string;
  sourceName: string;
  destinationName: string;
  status: 'In Progress' | 'Successful' | 'Failed';
  type: string;
  time: string;
}

export interface SimulationPanelProps {
  isPaused: boolean;
  events: SimulationEvent[];
  userPdus: UserPduRecord[];
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onSelectEvent: (event: SimulationEvent) => void;
  onClearEvents: () => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  isPaused,
  events,
  userPdus,
  onTogglePlay,
  onStep,
  onReset,
  onSelectEvent,
  onClearEvents,
}) => {
  return (
    <div className="netrion-sim-panel">
      {/* Simulation Controls Bar (Packet Tracer Style) */}
      <div className="sim-controls-bar">
        <div className="sim-mode-indicator">
          <span className="sim-led-dot" />
          <span>SIMULATION MODE (DISCRETE EVENT CAPTURE)</span>
        </div>

        <div className="sim-playback-controls">
          <button
            type="button"
            className="sim-play-btn"
            onClick={onTogglePlay}
            title={isPaused ? 'Auto Capture / Play' : 'Pause Capture'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span>{isPaused ? 'Auto Capture / Play' : 'Pause'}</span>
          </button>

          <button
            type="button"
            className="sim-step-btn"
            onClick={onStep}
            title="Capture / Forward (Advance 1 Step)"
          >
            <SkipForward size={13} />
            <span>Capture / Forward</span>
          </button>

          <button
            type="button"
            className="sim-reset-btn"
            onClick={onReset}
            title="Reset Simulation"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        <div className="sim-filters-indicator">
          <SlidersHorizontal size={12} />
          <span>Filters: ICMP, ARP, IPv4</span>
          <button type="button" className="sim-clear-btn" onClick={onClearEvents}>
            Clear Event List
          </button>
        </div>
      </div>

      <div className="sim-panel-content">
        {/* Event List Table */}
        <div className="sim-event-list-section">
          <div className="section-title-bar">
            <span>EVENT LIST ({events.length} CAPTURED) — CLICK ROW FOR OSI 7-LAYERS ANALYSIS</span>
          </div>

          <div className="sim-table-scroll">
            <table className="sim-event-table mono-numbers">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Time</th>
                  <th style={{ width: '110px' }}>At Device</th>
                  <th style={{ width: '90px' }}>Type</th>
                  <th>Info (Click to inspect PDU)</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="sim-table-empty">
                      No simulation packets captured yet. Send a Simple PDU (✉️) or click Capture / Forward.
                    </td>
                  </tr>
                ) : (
                  events.slice().reverse().map((evt) => (
                    <tr
                      key={evt.id}
                      className="sim-event-row"
                      onClick={() => onSelectEvent(evt)}
                      title="Inspect PDU at this step"
                    >
                      <td>{new Date(evt.timestamp).toISOString().substring(14, 23)}</td>
                      <td>
                        <strong>{evt.deviceId}</strong>
                      </td>
                      <td>
                        <span className={`sim-type-badge ${evt.type}`}>{evt.type}</span>
                      </td>
                      <td className="sim-desc-cell">{evt.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Created PDU / Simulation Scenario Box (Bottom Right in Packet Tracer) */}
        <div className="user-pdu-scenario-box">
          <div className="section-title-bar">
            <Mail size={12} />
            <span>USER CREATED PACKET LIST (PDU SCENARIO)</span>
          </div>

          <div className="pdu-scenario-list mono-numbers">
            {userPdus.length === 0 ? (
              <div className="scenario-empty">
                Use the ✉️ Simple PDU tool: Click source host, then click destination host to test traffic.
              </div>
            ) : (
              userPdus.map((pdu) => (
                <div key={pdu.id} className="pdu-record-item">
                  <div className="record-status-col">
                    {pdu.status === 'Successful' ? (
                      <CheckCircle size={14} className="status-success" />
                    ) : pdu.status === 'Failed' ? (
                      <XCircle size={14} className="status-failed" />
                    ) : (
                      <Clock size={14} className="status-pending" />
                    )}
                    <span className={`pdu-status-text ${pdu.status.toLowerCase().replace(' ', '-')}`}>
                      {pdu.status}
                    </span>
                  </div>
                  <div className="record-details-col">
                    <span className="pdu-route">
                      {pdu.sourceName} &rarr; {pdu.destinationName}
                    </span>
                    <span className="pdu-meta">
                      Type: {pdu.type} | Time: {pdu.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
