import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Monitor,
  Network,
  Share2,
  Server,
  Cable,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Terminal,
  Save,
  FolderOpen,
} from 'lucide-react';
import './ActionToolbar.css';

export interface ActionToolbarProps {
  isPaused: boolean;
  simulationSpeed: number;
  activeTool: 'select' | 'cable' | 'add-pc' | 'add-switch' | 'add-router' | 'add-server';
  isConsoleOpen: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectTool: (tool: 'select' | 'cable' | 'add-pc' | 'add-switch' | 'add-router' | 'add-server') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleConsole: () => void;
  onQuickSave: () => void;
  onQuickOpen: () => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  isPaused,
  simulationSpeed,
  activeTool,
  isConsoleOpen,
  onTogglePlay,
  onStep,
  onReset,
  onChangeSpeed,
  onSelectTool,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleConsole,
  onQuickSave,
  onQuickOpen,
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
          <FolderOpen size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Save Project (Ctrl+S)"
          onClick={onQuickSave}
          aria-label="Save Project"
        >
          <Save size={14} />
        </button>
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
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span className="btn-label">{isPaused ? 'RESUME' : 'PAUSE'}</span>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onStep}
          title="Single Step Tick (F8)"
          aria-label="Step simulation"
        >
          <SkipForward size={14} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onReset}
          title="Reset Simulation State (Ctrl+R)"
          aria-label="Reset simulation"
        >
          <RotateCcw size={14} />
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

      {/* Network Construction Palette */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-pc' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-pc' ? 'select' : 'add-pc')}
          title="Add PC Device"
        >
          <Monitor size={14} />
          <span className="btn-label">PC</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-switch' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-switch' ? 'select' : 'add-switch')}
          title="Add Switch (L2)"
        >
          <Network size={14} />
          <span className="btn-label">Switch</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-router' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-router' ? 'select' : 'add-router')}
          title="Add Router (L3)"
        >
          <Share2 size={14} />
          <span className="btn-label">Router</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn ${activeTool === 'add-server' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'add-server' ? 'select' : 'add-server')}
          title="Add Server"
        >
          <Server size={14} />
          <span className="btn-label">Server</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn tool-btn cable-tool ${activeTool === 'cable' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'cable' ? 'select' : 'cable')}
          title="Connect Devices with Cable"
        >
          <Cable size={14} />
          <span className="btn-label">Connect</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Viewport Zoom & Console Toggles */}
      <div className="toolbar-group toolbar-right">
        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomOut}
          title="Zoom Out (Ctrl+-)"
          aria-label="Zoom out"
        >
          <ZoomOut size={14} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomReset}
          title="Reset Zoom 100% (Ctrl+0)"
          aria-label="Reset zoom"
        >
          <Maximize2 size={14} />
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onZoomIn}
          title="Zoom In (Ctrl++)"
          aria-label="Zoom in"
        >
          <ZoomIn size={14} />
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className={`toolbar-btn ${isConsoleOpen ? 'active' : ''}`}
          onClick={onToggleConsole}
          title="Toggle Terminal & Event Console (Ctrl+`)"
          aria-label="Toggle terminal and event console"
        >
          <Terminal size={14} />
          <span className="btn-label">Console</span>
        </button>
      </div>
    </div>
  );
};
