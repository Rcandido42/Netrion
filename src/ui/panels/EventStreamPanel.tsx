import React from 'react';
import type { SimulationEvent } from '../../core/engine/NetworkSimulationEngine';
import './EventStreamPanel.css';

export interface EventStreamPanelProps {
  events: SimulationEvent[];
  onClear: () => void;
}

export const EventStreamPanel: React.FC<EventStreamPanelProps> = ({ events, onClear }) => {
  return (
    <div className="netrion-event-stream">
      <div className="stream-header">
        <span className="stream-title mono-numbers">
          EVENT BUS LOGS ({events.length} CAPTURED)
        </span>
        <button type="button" className="stream-clear-btn" onClick={onClear}>
          Clear Logs
        </button>
      </div>

      <div className="stream-list">
        {events.length === 0 ? (
          <div className="stream-empty">No simulation events yet. Transmit packets or ping devices.</div>
        ) : (
          events.slice().reverse().map((evt) => (
            <div key={evt.id} className={`stream-item ${evt.type.toLowerCase()}`}>
              <span className="evt-time mono-numbers">
                {new Date(evt.timestamp).toISOString().substring(11, 23)}
              </span>
              <span className={`evt-badge ${evt.type}`}>
                {evt.type}
              </span>
              <span className="evt-desc">{evt.description}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
