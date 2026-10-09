import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Monitor,
  Laptop,
  Server,
  Printer,
  Network,
  Layers,
  Share2,
  Shield,
  Wifi,
  Cloud,
  Cable,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Terminal,
  Save,
  FolderOpen,
  Mail,
  RefreshCw,
} from 'lucide-react';
import type { DeviceType } from '../../core/models/Device';
import './ActionToolbar.css';

export type ToolbarTool = 'select' | 'cable' | 'add-pdu' | `add-${DeviceType}`;

export interface ActionToolbarProps {
  isPaused: boolean;
  simulationSpeed: number;
  simMode: 'realtime' | 'simulation';
  activeTool: ToolbarTool;
  isConsoleOpen: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleSimMode: (mode: 'realtime' | 'simulation') => void;
  onSelectTool: (tool: ToolbarTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleConsole: () => void;
  onQuickSave: () => void;
  onQuickOpen: () => void;
  onReloadApp?: () => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  isPaused,
  simulationSpeed,
  simMode,
  activeTool,
  isConsoleOpen,
  onTogglePlay,
  onStep,
  onReset,
  onChangeSpeed,
  onToggleSimMode,
  onSelectTool,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleConsole,
  onQuickSave,
  onQuickOpen,
  onReloadApp,
}) => {
  return (
    <div className="netrion-toolbar">
      {/* File Quick Actions */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Open Project (Ctrl+O)"
          onClick={onQuickOpen}
          aria-label="Open Project"
        >
          <FolderOpen size={13} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Save Project (Ctrl+S)"
          onClick={onQuickSave}
          aria-label="Save Project"
        >
          <Save size={13} />
        </button>
        {onReloadApp && (
          <button
            type="button"
            className="toolbar-btn reload-btn"
            title="Recarregar Aplicação (F5) - Atualiza código sem reinstalar"
            onClick={onReloadApp}
            aria-label="Recarregar Aplicação"
          >
            <RefreshCw size={13} />
            <span className="btn-label">Atualizar</span>
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Simulation Engine Controls */}
      <div className="toolbar-group simulation-group">
        <button
          type="button"
          className={`toolbar-btn play-btn ${!isPaused ? 'active' : ''}`}
          onClick={onTogglePlay}
          title={isPaused ? 'Resume Simulation (Space)' : 'Pause Simulation (Space)'}
          aria-label={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
          <span className="btn-label">{isPaused ? 'RESUME' : 'PAUSE'}</span>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onStep}
          title="Single Step Tick (F8)"
          aria-label="Step simulation"
        >
          <SkipForward size={13} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onReset}
          title="Reset Simulation State (Ctrl+R)"
          aria-label="Reset simulation"
        >
          <RotateCcw size={13} />
        </button>

        <div className="speed-selector">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              type="button"
              className={`speed-btn ${simulationSpeed === s ? 'active' : ''}`}
              onClick={() => onChangeSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Mode Switcher: Realtime vs Simulation */}
      <div className="toolbar-group">
        <div className="pt-mode-switch">
          <button
            type="button"
            className={`mode-btn ${simMode === 'realtime' ? 'active' : ''}`}
            onClick={() => onToggleSimMode('realtime')}
          >
            Realtime
          </button>
          <button
            type="button"
            className={`mode-btn ${simMode === 'simulation' ? 'active' : ''}`}
            onClick={() => onToggleSimMode('simulation')}
          >
            Simulation
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Network Construction Palette: Endpoints */}
      <div className="toolbar-group palette-group">
        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-pc' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-pc' ? 'select' : 'add-pc')}
          title="Add Desktop PC"
        >
          <Monitor size={13} />
          <span className="btn-label">PC</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-laptop' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-laptop' ? 'select' : 'add-laptop')}
          title="Add Laptop Workstation"
        >
          <Laptop size={13} />
          <span className="btn-label">Laptop</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-server' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-server' ? 'select' : 'add-server')}
          title="Add Enterprise Server"
        >
          <Server size={13} />
          <span className="btn-label">Server</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-printer' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-printer' ? 'select' : 'add-printer')}
          title="Add Network Printer"
        >
          <Printer size={13} />
          <span className="btn-label">Printer</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Network Construction Palette: Infrastructure */}
      <div className="toolbar-group palette-group">
        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-switch' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-switch' ? 'select' : 'add-switch')}
          title="Add L2 Switch"
        >
          <Network size={13} />
          <span className="btn-label">Switch</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-switch-l3' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-switch-l3' ? 'select' : 'add-switch-l3')}
          title="Add Multilayer Switch (L3 Core)"
        >
          <Layers size={13} />
          <span className="btn-label">L3 Switch</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-router' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-router' ? 'select' : 'add-router')}
          title="Add L3 Router"
        >
          <Share2 size={13} />
          <span className="btn-label">Router</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-firewall' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-firewall' ? 'select' : 'add-firewall')}
          title="Add Security Appliance / Firewall"
        >
          <Shield size={13} />
          <span className="btn-label">Firewall</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-access-point' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-access-point' ? 'select' : 'add-access-point')}
          title="Add Wireless Access Point"
        >
          <Wifi size={13} />
          <span className="btn-label">AP</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-cloud' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-cloud' ? 'select' : 'add-cloud')}
          title="Add Internet / WAN Cloud"
        >
          <Cloud size={13} />
          <span className="btn-label">Internet</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Connection & Diagnostics */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn tool-btn cable-tool ${activeTool === 'cable' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'cable' ? 'select' : 'cable')}
          title="Connect Devices with Cable"
        >
          <Cable size={13} />
          <span className="btn-label">Connect</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn pdu-tool ${activeTool === 'add-pdu' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-pdu' ? 'select' : 'add-pdu')}
          title="Add Simple PDU (Ping) [Shortcut: P]"
        >
          <Mail size={13} />
          <span className="btn-label">Simple PDU</span>
        </button>
      </div>

      {/* Viewport Zoom & Console Toggles */}
      <div className="toolbar-group toolbar-right">
        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomOut}
          title="Zoom Out (Ctrl+-)"
          aria-label="Zoom out"
        >
          <ZoomOut size={13} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomReset}
          title="Reset Zoom 100% (Ctrl+0)"
          aria-label="Reset zoom"
        >
          <Maximize2 size={13} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomIn}
          title="Zoom In (Ctrl++)"
          aria-label="Zoom in"
        >
          <ZoomIn size={13} />
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className={`toolbar-btn ${isConsoleOpen ? 'active' : ''}`}
          onClick={onToggleConsole}
          title="Toggle Console (Ctrl+`)"
          aria-label="Toggle console"
        >
          <Terminal size={13} />
          <span className="btn-label">Console</span>
        </button>
      </div>
    </div>
  );
};
