import React from 'react';
import './StatusBar.css';

export interface StatusBarProps {
  isPaused: boolean;
  simulationTick: number;
  simulationSpeed: number;
  deviceCount: number;
  connectionCount: number;
  activePacketCount: number;
  selectedDeviceSummary: string | null;
  zoom: number;
  statusNotification: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isPaused,
  simulationTick,
  simulationSpeed,
  deviceCount,
  connectionCount,
  activePacketCount,
  selectedDeviceSummary,
  zoom,
  statusNotification,
}) => {
  return (
    <footer className="netrion-statusbar">
      <div className="statusbar-section left">
        <div className={`status-pill ${isPaused ? 'paused' : 'running'}`}>
          <span className="status-dot" />
          <span className="status-text">{isPaused ? 'SIMULATION PAUSED' : 'SIMULATION ACTIVE'}</span>
        </div>

        <span className="status-metric mono-numbers">
          TICK: <strong>{simulationTick}</strong> ({simulationSpeed}x)
        </span>

        <span className="status-separator">|</span>

        <span className="status-metric mono-numbers">
          NODES: <strong>{deviceCount}</strong>
        </span>
        <span className="status-metric mono-numbers">
          LINKS: <strong>{connectionCount}</strong>
        </span>
        <span className="status-metric mono-numbers">
          FRAMES: <strong>{activePacketCount}</strong>
        </span>
      </div>

      <div className="statusbar-section center">
        {statusNotification ? (
          <span className="status-notification">{statusNotification}</span>
        ) : selectedDeviceSummary ? (
          <span className="status-selection">{selectedDeviceSummary}</span>
        ) : (
          <span className="status-idle">READY</span>
        )}
      </div>

      <div className="statusbar-section right">
        <span className="status-metric mono-numbers">ZOOM: {Math.round(zoom * 100)}%</span>
        <span className="status-separator">|</span>
        <span className="runtime-tag">
          {typeof window !== 'undefined' && window.netrionDesktop ? 'ELECTRON RUNTIME' : 'WEB CLIENT'}
        </span>
      </div>
    </footer>
  );
};
