import React, { useState, useRef } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import './ActionToolbar.css';

export type ToolbarTool = 'select' | 'cable' | 'add-pdu' | `add-${string}`;

export interface DeviceVariantDef {
  id: string;
  name: string;
  modelTag: string;
  description: string;
  icon: React.ReactNode;
}

export interface DeviceCategoryDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultTool: string;
  variants: DeviceVariantDef[];
}

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const handleMouseEnter = (catId: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDropdown(catId);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  const handleSelectVariant = (toolId: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDropdown(null);
    onSelectTool(toolId as ToolbarTool);
  };

  const categories: DeviceCategoryDef[] = [
    {
      id: 'routers',
      label: 'Routers',
      icon: <Share2 size={13} />,
      defaultTool: 'add-router:2911',
      variants: [
        {
          id: 'add-router:2911',
          name: 'Cisco 2911 ISR',
          modelTag: '3x Gi • Modular ISR',
          description: 'Modular router with 3 Gigabit Ethernet interfaces',
          icon: <Share2 size={14} />,
        },
        {
          id: 'add-router:1941',
          name: 'Cisco 1941 ISR',
          modelTag: '2x Gi • Branch ISR',
          description: 'Compact high-efficiency router with 2 Gigabit interfaces',
          icon: <Share2 size={14} />,
        },
        {
          id: 'add-router:2811',
          name: 'Cisco 2811 Router',
          modelTag: '2x FE • Enterprise',
          description: 'Classic enterprise router with 2 FastEthernet interfaces',
          icon: <Share2 size={14} />,
        },
        {
          id: 'add-router:generic',
          name: 'Generic Router Gateway',
          modelTag: '2x Ports • Routed',
          description: 'Standard dual-interface IP routing gateway',
          icon: <Share2 size={14} />,
        },
      ],
    },
    {
      id: 'switches',
      label: 'Switches',
      icon: <Network size={13} />,
      defaultTool: 'add-switch:2960',
      variants: [
        {
          id: 'add-switch:2960',
          name: 'Cisco Catalyst 2960-24TT',
          modelTag: '24 FE + 2 Gi • Layer 2',
          description: 'Standard enterprise access switch with 24 FE + 2 Gi uplinks',
          icon: <Network size={14} />,
        },
        {
          id: 'add-switch-l3:3650',
          name: 'Cisco Catalyst 3650-24PS',
          modelTag: '24 Gi • Layer 3 Multilayer',
          description: 'Core multilayer switch with IP routing & SVI support',
          icon: <Layers size={14} />,
        },
        {
          id: 'add-switch:2950',
          name: 'Cisco Catalyst 2950-8T',
          modelTag: '8 FE • Compact L2',
          description: 'Compact 8-port FastEthernet switch for smaller labs',
          icon: <Network size={14} />,
        },
        {
          id: 'add-switch:generic',
          name: 'Generic Bench Switch',
          modelTag: '4 Ports • Basic L2',
          description: 'Lightweight 4-port benchtop Ethernet switch',
          icon: <Network size={14} />,
        },
      ],
    },
    {
      id: 'endpoints',
      label: 'End Devices',
      icon: <Monitor size={13} />,
      defaultTool: 'add-pc:standard',
      variants: [
        {
          id: 'add-pc:standard',
          name: 'Desktop PC',
          modelTag: 'Workstation • 1GbE',
          description: 'Desktop workstation with CMD, IP Config and Web Browser',
          icon: <Monitor size={14} />,
        },
        {
          id: 'add-laptop:corporate',
          name: 'Laptop Workstation',
          modelTag: 'Mobile PC • 802.11ac',
          description: 'Corporate mobile laptop with Ethernet & WiFi adapter',
          icon: <Laptop size={14} />,
        },
        {
          id: 'add-server:rack',
          name: 'Enterprise Server',
          modelTag: 'Server 1U • HTTP/DNS',
          description: 'Rack server hosting Web (HTTP Port 80) and DNS daemons',
          icon: <Server size={14} />,
        },
        {
          id: 'add-printer:network',
          name: 'Network Laser Printer',
          modelTag: 'Printer • Spooler',
          description: 'Networked laser printer with diagnostics & test page',
          icon: <Printer size={14} />,
        },
      ],
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield size={13} />,
      defaultTool: 'add-firewall:asa',
      variants: [
        {
          id: 'add-firewall:asa',
          name: 'Cisco ASA 5506-X',
          modelTag: 'Outside/Inside/DMZ',
          description: 'Adaptive Security Appliance with dedicated security zones',
          icon: <Shield size={14} />,
        },
        {
          id: 'add-firewall:generic',
          name: 'Generic Hardware Firewall',
          modelTag: 'Packet Filtering',
          description: 'Stateful packet-inspection security appliance',
          icon: <Shield size={14} />,
        },
      ],
    },
    {
      id: 'wireless',
      label: 'Wireless',
      icon: <Wifi size={13} />,
      defaultTool: 'add-access-point:aironet',
      variants: [
        {
          id: 'add-access-point:aironet',
          name: 'Cisco Aironet 2800 AP',
          modelTag: 'Uplink + WLAN',
          description: 'Enterprise 802.11ac dual-band access point bridge',
          icon: <Wifi size={14} />,
        },
        {
          id: 'add-access-point:home',
          name: 'Wireless Home Router',
          modelTag: '1x WAN + 4x LAN',
          description: 'Integrated WiFi broadband router with 4-port switch',
          icon: <Wifi size={14} />,
        },
      ],
    },
    {
      id: 'cloud',
      label: 'WAN / Cloud',
      icon: <Cloud size={13} />,
      defaultTool: 'add-cloud:internet',
      variants: [
        {
          id: 'add-cloud:internet',
          name: 'Internet Cloud (ISP)',
          modelTag: 'Multi-WAN Backbone',
          description: 'Simulates multi-access external ISP core and Internet',
          icon: <Cloud size={14} />,
        },
        {
          id: 'add-cloud:modem',
          name: 'Broadband Modem',
          modelTag: 'DSL / Cable Edge',
          description: 'Broadband termination modem linking LAN to provider',
          icon: <Cloud size={14} />,
        },
      ],
    },
  ];
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

      {/* Network Construction Palette: Device Categories with Flyout Menus */}
      <div className="toolbar-group palette-group device-categories-palette">
        {categories.map((cat) => {
          const activeVariant = cat.variants.find((v) => v.id === activeTool);
          const isCatActive = !!activeVariant || activeTool === cat.defaultTool;
          const isOpen = openDropdown === cat.id;

          return (
            <div
              key={cat.id}
              className={`category-dropdown-wrapper ${isCatActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
              onMouseEnter={() => handleMouseEnter(cat.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`toolbar-btn tool-btn category-trigger-btn ${isCatActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTool(isCatActive ? 'select' : (cat.defaultTool as ToolbarTool));
                  setOpenDropdown(null);
                }}
                title={
                  activeVariant
                    ? `Selected: ${activeVariant.name} (Click to deselect, Hover for models)`
                    : `Add ${cat.label} (Hover to choose specific hardware model)`
                }
                aria-label={`Select ${cat.label} model`}
                aria-expanded={isOpen}
              >
                {activeVariant ? activeVariant.icon : cat.icon}
                <span className="btn-label">{cat.label}</span>
                <ChevronDown size={11} className={`category-chevron ${isOpen ? 'rotated' : ''}`} />
              </button>

              {isOpen && (
                <div
                  className="device-dropdown-menu"
                  role="menu"
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="dropdown-header">
                    <span className="dropdown-title">SELECT {cat.label.toUpperCase()}</span>
                    <span className="dropdown-count mono-numbers">{cat.variants.length} Models</span>
                  </div>
                  <div className="dropdown-list">
                    {cat.variants.map((variant) => {
                      const isSelected = activeTool === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          className={`dropdown-variant-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectVariant(variant.id)}
                          role="menuitem"
                        >
                          <div className="variant-icon-box">{variant.icon}</div>
                          <div className="variant-info">
                            <div className="variant-name-row">
                              <span className="variant-name">{variant.name}</span>
                              <span className="variant-badge mono-numbers">{variant.modelTag}</span>
                            </div>
                            <span className="variant-desc">{variant.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
