import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectManager } from './storage/ProjectManager';
import type { SerializedDevice, SerializedConnection, NetrionProjectData } from './storage/ProjectSchema';
import { createDefaultDevice, type DeviceType } from './core/models/Device';
import { MenuBar } from './ui/shell/MenuBar';
import { ActionToolbar } from './ui/shell/ActionToolbar';
import { StatusBar } from './ui/shell/StatusBar';
import { NetworkCanvas } from './ui/canvas/NetworkCanvas';
import { InspectorPanel } from './ui/panels/InspectorPanel';
import { ShortcutsDialog } from './ui/dialogs/ShortcutsDialog';
import { AboutDialog } from './ui/dialogs/AboutDialog';
import './App.css';

export function App() {
  const projectManagerRef = useRef<ProjectManager>(new ProjectManager());
  const [project, setProject] = useState<NetrionProjectData>(() => projectManagerRef.current.getProject());
  const [isDirty, setIsDirty] = useState<boolean>(() => projectManagerRef.current.getIsDirty());

  // Tool & Simulation states
  const [activeTool, setActiveTool] = useState<'select' | 'cable' | 'add-pc' | 'add-switch' | 'add-router' | 'add-server'>('select');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [simulationTick, setSimulationTick] = useState<number>(0);

  // Selection states
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Connecting cable state
  const [connectingSource, setConnectingSource] = useState<{ deviceId: string; interfaceId: string } | null>(null);

  // Viewport states
  const [zoom, setZoom] = useState<number>(1);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [statusNotification, setStatusNotification] = useState<string | null>('Project initialized');

  // Dialog states
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  const showNotification = useCallback((msg: string) => {
    setStatusNotification(msg);
    const timer = setTimeout(() => {
      setStatusNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const syncProjectChanges = useCallback((updated: Partial<NetrionProjectData>) => {
    const next = projectManagerRef.current.updateProjectData(updated);
    setProject({ ...next });
    setIsDirty(true);
  }, []);

  // Action handlers
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

  // Topology Manipulation Handlers
  const handleAddDevice = useCallback((type: DeviceType, x: number, y: number) => {
    const newDevice = createDefaultDevice(type, x, y);
    const updatedDevices = [...project.devices, newDevice];
    syncProjectChanges({ devices: updatedDevices });
    setSelectedDeviceId(newDevice.id);
    setSelectedConnectionId(null);
    setActiveTool('select');
    showNotification(`Added ${newDevice.name} to network`);
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

    // Remove device and all associated connections
    const remainingDevices = project.devices.filter((d) => d.id !== deviceId);
    const remainingConnections = project.connections.filter(
      (c) => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId
    );

    // Unlink interfaces in remaining devices
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
    showNotification(`Deleted ${dev.name}`);
  }, [project.devices, project.connections, syncProjectChanges, showNotification]);

  // Connection Manipulation Handlers
  const handleUpdateConnection = useCallback((updated: SerializedConnection) => {
    const updatedConns = project.connections.map((c) => (c.id === updated.id ? updated : c));
    syncProjectChanges({ connections: updatedConns });
  }, [project.connections, syncProjectChanges]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    const remainingConns = project.connections.filter((c) => c.id !== connectionId);

    // Unlink interfaces
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
      // First port clicked: set as source
      setConnectingSource({ deviceId, interfaceId });
      setActiveTool('cable');
      showNotification(`Link started from ${deviceId}. Click target port to connect.`);
      return;
    }

    // Second port clicked: complete link
    if (connectingSource.deviceId === deviceId && connectingSource.interfaceId === interfaceId) {
      // Clicked same port, cancel
      setConnectingSource(null);
      setActiveTool('select');
      showNotification('Cable connection cancelled');
      return;
    }

    if (connectingSource.deviceId === deviceId) {
      // Cannot connect device to itself
      showNotification('Cannot link two ports on the same device');
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
      latencyMs: 1,
    };

    // Update interfaces with connection ID
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
    showNotification('Cable link established (Link State: UP)');
  }, [connectingSource, project.devices, project.connections, syncProjectChanges, showNotification]);

  // Dispatch Menu Actions
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
        setSimulationTick((t) => t + 1);
        showNotification(`Stepped to tick ${simulationTick + 1}`);
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
    showNotification,
    simulationTick,
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
  ]);

  const selectedDevice = project.devices.find((d) => d.id === selectedDeviceId) || null;
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
        activeTool={activeTool}
        isConsoleOpen={isConsoleOpen}
        onTogglePlay={() => setIsPaused((p) => !p)}
        onStep={() => {
          setSimulationTick((t) => t + 1);
          showNotification(`Tick: ${simulationTick + 1}`);
        }}
        onReset={() => {
          setSimulationTick(0);
          showNotification('Simulation reset');
        }}
        onChangeSpeed={(s) => setSimulationSpeed(s)}
        onSelectTool={(t) => {
          setActiveTool(t);
          if (t !== 'cable') setConnectingSource(null);
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
          {/* Interactive Network Canvas */}
          <NetworkCanvas
            devices={project.devices}
            connections={project.connections}
            selectedDeviceId={selectedDeviceId}
            selectedConnectionId={selectedConnectionId}
            activeTool={activeTool}
            zoom={zoom}
            connectingSource={connectingSource}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              if (id) setSelectedConnectionId(null);
            }}
            onSelectConnection={(id) => {
              setSelectedConnectionId(id);
              if (id) setSelectedDeviceId(null);
            }}
            onMoveDevice={handleMoveDevice}
            onAddDevice={handleAddDevice}
            onPortClick={handlePortClick}
          />

          {/* Bottom Console Area */}
          {isConsoleOpen && (
            <div
              className="netrion-bottom-console-placeholder"
              style={{
                height: '180px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-panel)',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                overflowY: 'auto',
              }}
            >
              <div style={{ color: 'var(--color-link-up)', marginBottom: '4px' }}>
                NETRION SIMULATION ENGINE INITIALIZED [DISCRETE EVENT MODEL]
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {project.devices.length === 0
                  ? 'Select PC, Switch, Router or Server from toolbar to add devices to the canvas.'
                  : `Active topology: ${project.devices.length} devices, ${project.connections.length} connections. Select a host to open terminal in Phase 6.`}
              </div>
            </div>
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
        activePacketCount={0}
        selectedDeviceSummary={selectedSummary}
        zoom={zoom}
        statusNotification={statusNotification}
      />

      {/* Modals */}
      <ShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
