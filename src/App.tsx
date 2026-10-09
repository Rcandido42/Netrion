import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectManager } from './storage/ProjectManager';
import type { SerializedDevice, SerializedConnection, NetrionProjectData } from './storage/ProjectSchema';
import { createDefaultDevice, type DeviceType } from './core/models/Device';
import {
  NetworkSimulationEngine,
  type SimulationEvent,
  type InFlightFrame,
} from './core/engine/NetworkSimulationEngine';
import type { EthernetFrame } from './core/protocols/Ethernet';
import type { ChallengeScenario } from './challenges/types';
import { MenuBar } from './ui/shell/MenuBar';
import { ActionToolbar, type ToolbarTool } from './ui/shell/ActionToolbar';
import { StatusBar } from './ui/shell/StatusBar';
import { NetworkCanvas } from './ui/canvas/NetworkCanvas';
import { InspectorPanel } from './ui/panels/InspectorPanel';
import { BottomConsole } from './ui/panels/BottomConsole';
import { SimulationPanel, type UserPduRecord } from './ui/panels/SimulationPanel';
import { ShortcutsDialog } from './ui/dialogs/ShortcutsDialog';
import { AboutDialog } from './ui/dialogs/AboutDialog';
import { ChallengeDialog } from './ui/dialogs/ChallengeDialog';
import { DeviceModal } from './ui/dialogs/DeviceModal';
import { PduModal } from './ui/dialogs/PduModal';
import './App.css';

export function App() {
  const projectManagerRef = useRef<ProjectManager>(new ProjectManager());
  const [project, setProject] = useState<NetrionProjectData>(() => projectManagerRef.current.getProject());
  const [isDirty, setIsDirty] = useState<boolean>(() => projectManagerRef.current.getIsDirty());

  // Simulation Engine reference & state
  const engineRef = useRef<NetworkSimulationEngine>(
    new NetworkSimulationEngine(project.devices, project.connections)
  );
  const [inFlightFrames, setInFlightFrames] = useState<InFlightFrame[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [inspectedFrame, setInspectedFrame] = useState<EthernetFrame | null>(null);

  // Cisco Packet Tracer Simulation vs Realtime Mode
  const [simMode, setSimMode] = useState<'realtime' | 'simulation'>('realtime');
  const [userPdus, setUserPdus] = useState<UserPduRecord[]>([]);

  // Simulation loop controls
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [simulationTick, setSimulationTick] = useState<number>(0);

  // Active Tool state (including all devices & Simple PDU)
  const [activeTool, setActiveTool] = useState<ToolbarTool>('select');

  // Selections
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectingSource, setConnectingSource] = useState<{ deviceId: string; interfaceId: string } | null>(null);
  const [pduSourceDeviceId, setPduSourceDeviceId] = useState<string | null>(null);

  // Modals (Cisco Device Window & OSI PDU Window)
  const [modalDeviceId, setModalDeviceId] = useState<string | null>(null);
  const [inspectedPduEvent, setInspectedPduEvent] = useState<SimulationEvent | null>(null);

  // Viewport states
  const [zoom, setZoom] = useState<number>(1);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [statusNotification, setStatusNotification] = useState<string | null>('Netrion Simulator Ready');

  // Challenge Subsystem
  const [activeChallenge, setActiveChallenge] = useState<ChallengeScenario | null>(null);
  const [isChallengeCompleted, setIsChallengeCompleted] = useState<boolean>(false);
  const [showChallenges, setShowChallenges] = useState<boolean>(false);

  // Dialogs
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  const showNotification = useCallback((msg: string) => {
    setStatusNotification(msg);
    const timer = setTimeout(() => {
      setStatusNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Sync engine topology whenever project changes
  useEffect(() => {
    engineRef.current.updateTopology(project.devices, project.connections);
  }, [project.devices, project.connections]);

  // Subscribe to engine events and track PDU status
  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe((evt) => {
      setEvents((prev) => [...prev.slice(-200), evt]);

      if (evt.type === 'FRAME_TRANSMIT' && evt.details) {
        const frame = engineRef.current.getInFlightFrames().find((f) => f.frame.id === evt.details?.frameId)?.frame;
        if (frame) setInspectedFrame(frame);
      }

      if (evt.type === 'ICMP_ECHO_REP') {
        setUserPdus((prev) =>
          prev.map((p, idx) => (idx === prev.length - 1 ? { ...p, status: 'Successful' } : p))
        );
      } else if (evt.type === 'FRAME_DROPPED') {
        setUserPdus((prev) =>
          prev.map((p, idx) => (idx === prev.length - 1 ? { ...p, status: 'Failed' } : p))
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Main Simulation Loop (Tick)
  useEffect(() => {
    if (isPaused && simMode === 'realtime') return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (currentTime: number) => {
      const deltaMs = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;

      // In simulation mode, only auto-advance if not paused
      if (!isPaused) {
        engineRef.current.tick(deltaMs, simulationSpeed);
        setInFlightFrames([...engineRef.current.getInFlightFrames()]);
        setSimulationTick((t) => t + 1);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, simulationSpeed, simMode]);

  // Challenge Goal Evaluation
  useEffect(() => {
    if (activeChallenge && !isChallengeCompleted) {
      const passed = activeChallenge.checkSuccess(engineRef.current, project);
      if (passed) {
        setIsChallengeCompleted(true);
        showNotification(`${activeChallenge.title} - COMPLETED!`);
        setShowChallenges(true);
      }
    }
  }, [activeChallenge, isChallengeCompleted, project, showNotification]);

  const syncProjectChanges = useCallback((updated: Partial<NetrionProjectData>) => {
    const next = projectManagerRef.current.updateProjectData(updated);
    setProject({ ...next });
    setIsDirty(true);
  }, []);

  // Device Selection & Simple PDU Envelope Tool Flow
  const handleSelectDevice = useCallback(
    (deviceId: string | null) => {
      if (!deviceId) {
        setSelectedDeviceId(null);
        setPduSourceDeviceId(null);
        return;
      }

      // If user is using Cisco Simple PDU Tool (✉️)
      if (activeTool === 'add-pdu') {
        if (!pduSourceDeviceId) {
          // Step 1: Clicked source device
          setPduSourceDeviceId(deviceId);
          setSelectedDeviceId(deviceId);
          const dev = project.devices.find((d) => d.id === deviceId);
          showNotification(`PDU Source: ${dev?.name || deviceId}. Click destination device.`);
          return;
        }

        // Step 2: Clicked destination device
        if (pduSourceDeviceId === deviceId) {
          setPduSourceDeviceId(null);
          showNotification('Simple PDU cancelled (cannot ping self)');
          setActiveTool('select');
          return;
        }

        const srcDev = project.devices.find((d) => d.id === pduSourceDeviceId);
        const tgtDev = project.devices.find((d) => d.id === deviceId);

        if (!srcDev || !tgtDev) return;

        const targetIp = tgtDev.interfaces[0]?.ip;
        if (!targetIp) {
          showNotification(`Cannot ping ${tgtDev.name}: No IP configured on target interface!`);
          setPduSourceDeviceId(null);
          setActiveTool('select');
          return;
        }

        // Send PDU Ping
        const result = engineRef.current.ping(srcDev.id, targetIp);

        const newPduRecord: UserPduRecord = {
          id: `pdu_${Date.now()}`,
          sourceName: srcDev.name,
          destinationName: tgtDev.name,
          status: result.success ? 'In Progress' : 'Failed',
          type: 'ICMP',
          time: new Date().toLocaleTimeString(),
        };

        setUserPdus((prev) => [...prev, newPduRecord]);
        showNotification(`PDU dispatched: ${srcDev.name} ➔ ${tgtDev.name} (${targetIp})`);

        setPduSourceDeviceId(null);
        setActiveTool('select');
        return;
      }

      // Normal selection
      setSelectedDeviceId(deviceId);
      setSelectedConnectionId(null);
    },
    [activeTool, pduSourceDeviceId, project.devices, showNotification]
  );

  // Project IO Actions
  const handleNewProject = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm('Discard unsaved changes and create a new project?');
      if (!confirmDiscard) return;
    }
    const fresh = projectManagerRef.current.newProject();
    setProject({ ...fresh });
    setIsDirty(false);
    setSelectedDeviceId(null);
    setSelectedConnectionId(null);
    setActiveChallenge(null);
    setIsChallengeCompleted(false);
    showNotification('New project created');
  }, [isDirty, showNotification]);

  const handleOpenProject = useCallback(async () => {
    try {
      const result = await projectManagerRef.current.openProject();
      if (result) {
        setProject({ ...result.project });
        setIsDirty(false);
        setSelectedDeviceId(null);
        setSelectedConnectionId(null);
        setActiveChallenge(null);
        setIsChallengeCompleted(false);
        showNotification(`Project loaded: ${result.project.name}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to open project: ${errorMsg}`);
    }
  }, [showNotification]);

  const handleSaveProject = useCallback(async (forceSaveAs = false) => {
    try {
      const result = await projectManagerRef.current.saveProject(forceSaveAs);
      if (result && result.success) {
        setIsDirty(false);
        showNotification(result.filePath ? `Saved to ${result.filePath}` : 'Project file downloaded');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save project: ${errorMsg}`);
    }
  }, [showNotification]);

  const handleExportProject = useCallback(() => {
    projectManagerRef.current.exportJSON();
    showNotification('Network topology exported as JSON');
  }, [showNotification]);

  const handleImportProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.netrion';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = await projectManagerRef.current.importJSON(text);
        setProject({ ...imported });
        setIsDirty(false);
        setSelectedDeviceId(null);
        setSelectedConnectionId(null);
        showNotification(`Topology imported: ${imported.name}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to import JSON: ${errorMsg}`);
      }
    };
    input.click();
  }, [showNotification]);

  // Topology Manipulation
  const handleAddDevice = useCallback((type: DeviceType, x: number, y: number, modelId?: string) => {
    const newDevice = createDefaultDevice(type, x, y, undefined, modelId);
    const updatedDevices = [...project.devices, newDevice];
    syncProjectChanges({ devices: updatedDevices });
    setSelectedDeviceId(newDevice.id);
    setSelectedConnectionId(null);
    setActiveTool('select');
    showNotification(`Added ${newDevice.name} to workspace`);
  }, [project.devices, syncProjectChanges, showNotification]);

  const handleMoveDevice = useCallback((deviceId: string, x: number, y: number) => {
    const updatedDevices = project.devices.map((d) => (d.id === deviceId ? { ...d, x, y } : d));
    syncProjectChanges({ devices: updatedDevices });
  }, [project.devices, syncProjectChanges]);

  const handleUpdateDevice = useCallback((updated: SerializedDevice) => {
    const updatedDevices = project.devices.map((d) => (d.id === updated.id ? updated : d));
    syncProjectChanges({ devices: updatedDevices });
  }, [project.devices, syncProjectChanges]);

  const handleDeleteDevice = useCallback((deviceId: string) => {
    const dev = project.devices.find((d) => d.id === deviceId);
    if (!dev) return;

    const remainingDevices = project.devices.filter((d) => d.id !== deviceId);
    const remainingConnections = project.connections.filter(
      (c) => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId
    );

    const cleanedDevices = remainingDevices.map((d) => ({
      ...d,
      interfaces: d.interfaces.map((i) =>
        remainingConnections.some((c) => c.id === i.connectedToConnectionId)
          ? i
          : { ...i, connectedToConnectionId: null }
      ),
    }));

    syncProjectChanges({ devices: cleanedDevices, connections: remainingConnections });
    setSelectedDeviceId(null);
    if (modalDeviceId === deviceId) setModalDeviceId(null);
    showNotification(`Deleted ${dev.name}`);
  }, [project.devices, project.connections, syncProjectChanges, modalDeviceId, showNotification]);

  // Connections Manipulation
  const handleUpdateConnection = useCallback((updated: SerializedConnection) => {
    const updatedConns = project.connections.map((c) => (c.id === updated.id ? updated : c));
    syncProjectChanges({ connections: updatedConns });
  }, [project.connections, syncProjectChanges]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    const remainingConns = project.connections.filter((c) => c.id !== connectionId);
    const updatedDevices = project.devices.map((d) => ({
      ...d,
      interfaces: d.interfaces.map((i) =>
        i.connectedToConnectionId === connectionId ? { ...i, connectedToConnectionId: null } : i
      ),
    }));

    syncProjectChanges({ devices: updatedDevices, connections: remainingConns });
    setSelectedConnectionId(null);
    showNotification('Cable connection removed');
  }, [project.connections, project.devices, syncProjectChanges, showNotification]);

  // Cable Connection Flow (Port click)
  const handlePortClick = useCallback((deviceId: string, interfaceId: string) => {
    if (!connectingSource) {
      setConnectingSource({ deviceId, interfaceId });
      setActiveTool('cable');
      showNotification(`Cable plugged into ${deviceId}. Click target port to complete link.`);
      return;
    }

    if (connectingSource.deviceId === deviceId && connectingSource.interfaceId === interfaceId) {
      setConnectingSource(null);
      setActiveTool('select');
      showNotification('Cable link cancelled');
      return;
    }

    if (connectingSource.deviceId === deviceId) {
      showNotification('Cannot link two ports on the same physical unit');
      return;
    }

    const connId = `conn_${Date.now()}`;
    const newConn: SerializedConnection = {
      id: connId,
      sourceDeviceId: connectingSource.deviceId,
      sourceInterfaceId: connectingSource.interfaceId,
      targetDeviceId: deviceId,
      targetInterfaceId: interfaceId,
      type: 'copper',
      status: 'up',
      bandwidthMbps: 100,
      latencyMs: 15,
    };

    const updatedDevices = project.devices.map((d) => {
      if (d.id === connectingSource.deviceId) {
        return {
          ...d,
          interfaces: d.interfaces.map((i) =>
            i.id === connectingSource.interfaceId ? { ...i, connectedToConnectionId: connId } : i
          ),
        };
      }
      if (d.id === deviceId) {
        return {
          ...d,
          interfaces: d.interfaces.map((i) =>
            i.id === interfaceId ? { ...i, connectedToConnectionId: connId } : i
          ),
        };
      }
      return d;
    });

    const updatedConns = [...project.connections, newConn];
    syncProjectChanges({ devices: updatedDevices, connections: updatedConns });

    setConnectingSource(null);
    setActiveTool('select');
    setSelectedConnectionId(connId);
    showNotification('Physical link established (100 Mbps)');
  }, [connectingSource, project.devices, project.connections, syncProjectChanges, showNotification]);

  // Challenge Activation
  const handleSelectChallenge = useCallback((scenario: ChallengeScenario) => {
    const topology = scenario.initialTopology();
    setProject({ ...topology });
    projectManagerRef.current.updateProjectData(topology);
    setActiveChallenge(scenario);
    setIsChallengeCompleted(false);
    setSelectedDeviceId(topology.devices[0]?.id || null);
    setSelectedConnectionId(null);
    setIsDirty(false);
    showNotification(`Loaded ${scenario.title}`);
  }, [showNotification]);

  // Menu Actions
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'new-project':
        handleNewProject();
        break;
      case 'open-project':
        handleOpenProject();
        break;
      case 'save-project':
        handleSaveProject(false);
        break;
      case 'save-project-as':
        handleSaveProject(true);
        break;
      case 'export-project':
        handleExportProject();
        break;
      case 'import-project':
        handleImportProject();
        break;
      case 'delete-selected':
        if (selectedDeviceId) handleDeleteDevice(selectedDeviceId);
        else if (selectedConnectionId) handleDeleteConnection(selectedConnectionId);
        break;
      case 'toggle-simulation':
        setIsPaused((p) => !p);
        break;
      case 'step-simulation':
        engineRef.current.tick(25, simulationSpeed);
        setInFlightFrames([...engineRef.current.getInFlightFrames()]);
        setSimulationTick((t) => t + 1);
        break;
      case 'reset-simulation':
        setSimulationTick(0);
        showNotification('Simulation clock and queues reset');
        break;
      case 'speed:0.5':
        setSimulationSpeed(0.5);
        break;
      case 'speed:1':
        setSimulationSpeed(1);
        break;
      case 'speed:2':
        setSimulationSpeed(2);
        break;
      case 'challenge:list':
        setShowChallenges(true);
        break;
      case 'challenge:reset':
        if (activeChallenge) handleSelectChallenge(activeChallenge);
        else setShowChallenges(true);
        break;
      case 'zoom-in':
        setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
        break;
      case 'zoom-out':
        setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)));
        break;
      case 'zoom-reset':
        setZoom(1);
        break;
      case 'toggle-console':
        setIsConsoleOpen((c) => !c);
        break;
      case 'app-reload':
        if (typeof window !== 'undefined' && window.netrionDesktop?.reloadApp) {
          window.netrionDesktop.reloadApp();
        } else {
          window.location.reload();
        }
        break;
      case 'help-shortcuts':
        setShowShortcuts(true);
        break;
      case 'help-about':
        setShowAbout(true);
        break;
      default:
        console.warn('Unhandled menu action:', action);
    }
  }, [
    handleNewProject,
    handleOpenProject,
    handleSaveProject,
    handleExportProject,
    handleImportProject,
    handleDeleteDevice,
    handleDeleteConnection,
    selectedDeviceId,
    selectedConnectionId,
    simulationSpeed,
    showNotification,
    activeChallenge,
    handleSelectChallenge,
  ]);

  // Electron IPC bridge subscription
  useEffect(() => {
    if (window.netrionDesktop?.onMenuAction) {
      const unsubscribe = window.netrionDesktop.onMenuAction((action) => {
        handleMenuAction(action);
      });
      return () => unsubscribe();
    }
  }, [handleMenuAction]);

  // Electron live-reload notification subscription
  useEffect(() => {
    if (window.netrionDesktop?.onReloaded) {
      const unsubscribe = window.netrionDesktop.onReloaded((result) => {
        const sourceLabel =
          result?.type === 'dev'
            ? 'Vite Dev Server (HMR Ativo)'
            : result?.type === 'workspace'
            ? 'Build Live do Workspace'
            : 'Pacote Local';
        showNotification(`Aplicação atualizada: ${sourceLabel}`);
      });
      return () => unsubscribe();
    }
  }, [showNotification]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject(e.shiftKey);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewProject();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.netrionDesktop?.reloadApp) {
          window.netrionDesktop.reloadApp();
        } else {
          window.location.reload();
        }
      } else if (e.key.toLowerCase() === 'p') {
        // Cisco Packet Tracer shortcut P: Simple PDU tool
        setActiveTool('add-pdu');
        showNotification('Simple PDU tool active. Click source device.');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDeviceId) {
          e.preventDefault();
          handleDeleteDevice(selectedDeviceId);
        } else if (selectedConnectionId) {
          e.preventDefault();
          handleDeleteConnection(selectedConnectionId);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === 'F8') {
        e.preventDefault();
        engineRef.current.tick(25, simulationSpeed);
        setInFlightFrames([...engineRef.current.getInFlightFrames()]);
        setSimulationTick((t) => t + 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setSimulationTick(0);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsConsoleOpen((c) => !c);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setConnectingSource(null);
        setPduSourceDeviceId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSaveProject,
    handleOpenProject,
    handleNewProject,
    handleDeleteDevice,
    handleDeleteConnection,
    selectedDeviceId,
    selectedConnectionId,
    simulationSpeed,
    showNotification,
  ]);

  const selectedDevice = project.devices.find((d) => d.id === selectedDeviceId) || null;
  const modalDevice = project.devices.find((d) => d.id === modalDeviceId) || null;
  const selectedConnection = project.connections.find((c) => c.id === selectedConnectionId) || null;

  const selectedSummary = selectedDevice
    ? `${selectedDevice.name} [${selectedDevice.type.toUpperCase()}] ${
        selectedDevice.interfaces[0]?.ip ? `(${selectedDevice.interfaces[0].ip})` : ''
      }`
    : selectedConnection
    ? `LINK: ${selectedConnection.id} [${selectedConnection.status.toUpperCase()}]`
    : null;

  return (
    <div className="netrion-app">
      {/* Native Desktop / App MenuBar */}
      <MenuBar
        projectName={project.name}
        isDirty={isDirty}
        onAction={handleMenuAction}
      />

      {/* Quick Tool & Simulation Toolbar */}
      <ActionToolbar
        isPaused={isPaused}
        simulationSpeed={simulationSpeed}
        simMode={simMode}
        activeTool={activeTool}
        isConsoleOpen={isConsoleOpen}
        onTogglePlay={() => setIsPaused((p) => !p)}
        onStep={() => {
          engineRef.current.tick(25, simulationSpeed);
          setInFlightFrames([...engineRef.current.getInFlightFrames()]);
          setSimulationTick((t) => t + 1);
        }}
        onReset={() => {
          setSimulationTick(0);
          showNotification('Simulation clock reset');
        }}
        onChangeSpeed={(s) => setSimulationSpeed(s)}
        onToggleSimMode={(m) => {
          setSimMode(m);
          showNotification(`Switched to ${m.toUpperCase()} mode`);
        }}
        onSelectTool={(t) => {
          setActiveTool(t);
          if (t !== 'cable') setConnectingSource(null);
          if (t !== 'add-pdu') setPduSourceDeviceId(null);
        }}
        onReloadApp={() => {
          if (typeof window !== 'undefined' && window.netrionDesktop?.reloadApp) {
            window.netrionDesktop.reloadApp();
          } else {
            window.location.reload();
          }
        }}
        onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
        onZoomReset={() => setZoom(1)}
        onToggleConsole={() => setIsConsoleOpen((c) => !c)}
        onQuickSave={() => handleSaveProject(false)}
        onQuickOpen={handleOpenProject}
      />

      {/* Primary Workspace Area */}
      <main className="netrion-workspace">
        <div className="netrion-center-area">
          {/* Interactive Network Canvas with In-Flight Packets */}
          <NetworkCanvas
            devices={project.devices}
            connections={project.connections}
            inFlightFrames={inFlightFrames}
            selectedDeviceId={selectedDeviceId}
            selectedConnectionId={selectedConnectionId}
            pduSourceDeviceId={pduSourceDeviceId}
            activeTool={activeTool}
            zoom={zoom}
            connectingSource={connectingSource}
            onSelectDevice={handleSelectDevice}
            onOpenDeviceModal={(id) => setModalDeviceId(id)}
            onSelectConnection={(id) => {
              setSelectedConnectionId(id);
              if (id) setSelectedDeviceId(null);
            }}
            onSelectFrame={(frame) => {
              setInspectedFrame(frame);
              setIsConsoleOpen(true);
            }}
            onMoveDevice={handleMoveDevice}
            onAddDevice={handleAddDevice}
            onPortClick={handlePortClick}
          />

          {/* Bottom Panel: Switches between Cisco Packet Tracer Simulation Mode and Terminal/Event Bus */}
          {isConsoleOpen && (
            simMode === 'simulation' ? (
              <SimulationPanel
                isPaused={isPaused}
                events={events}
                userPdus={userPdus}
                onTogglePlay={() => setIsPaused((p) => !p)}
                onStep={() => {
                  engineRef.current.tick(25, simulationSpeed);
                  setInFlightFrames([...engineRef.current.getInFlightFrames()]);
                  setSimulationTick((t) => t + 1);
                }}
                onReset={() => {
                  setSimulationTick(0);
                  showNotification('Simulation reset');
                }}
                onSelectEvent={(evt) => setInspectedPduEvent(evt)}
                onClearEvents={() => setEvents([])}
              />
            ) : (
              <BottomConsole
                isOpen={isConsoleOpen}
                selectedDevice={selectedDevice}
                engine={engineRef.current}
                events={events}
                inspectedFrame={inspectedFrame}
                onToggleOpen={() => setIsConsoleOpen((c) => !c)}
                onClearEvents={() => setEvents([])}
              />
            )
          )}
        </div>

        {/* Right Inspector Panel */}
        <InspectorPanel
          selectedDevice={selectedDevice}
          selectedConnection={selectedConnection}
          devices={project.devices}
          onUpdateDevice={handleUpdateDevice}
          onDeleteDevice={handleDeleteDevice}
          onUpdateConnection={handleUpdateConnection}
          onDeleteConnection={handleDeleteConnection}
        />
      </main>

      {/* Telemetry Status Bar */}
      <StatusBar
        isPaused={isPaused}
        simulationTick={simulationTick}
        simulationSpeed={simulationSpeed}
        deviceCount={project.devices.length}
        connectionCount={project.connections.length}
        activePacketCount={inFlightFrames.length}
        selectedDeviceSummary={selectedSummary}
        zoom={zoom}
        statusNotification={statusNotification}
      />

      {/* Cisco Packet Tracer Modals */}
      <DeviceModal
        device={modalDevice}
        engine={engineRef.current}
        onClose={() => setModalDeviceId(null)}
        onUpdateDevice={handleUpdateDevice}
      />

      <PduModal
        event={inspectedPduEvent}
        onClose={() => setInspectedPduEvent(null)}
      />

      <ShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ChallengeDialog
        isOpen={showChallenges}
        activeChallengeId={activeChallenge?.id || null}
        isCompleted={isChallengeCompleted}
        onClose={() => setShowChallenges(false)}
        onSelectChallenge={handleSelectChallenge}
      />
    </div>
  );
}

export default App;
