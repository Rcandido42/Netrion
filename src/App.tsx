import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectManager } from './storage/ProjectManager';
import type { NetrionProjectData } from './storage/ProjectSchema';
import { MenuBar } from './ui/shell/MenuBar';
import { ActionToolbar } from './ui/shell/ActionToolbar';
import { StatusBar } from './ui/shell/StatusBar';
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

  // Action handlers
  const handleNewProject = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm('Discard unsaved changes and create a new project?');
      if (!confirmDiscard) return;
    }
    const fresh = projectManagerRef.current.newProject();
    setProject({ ...fresh });
    setIsDirty(false);
    showNotification('New project created');
  }, [isDirty, showNotification]);

  const handleOpenProject = useCallback(async () => {
    try {
      const result = await projectManagerRef.current.openProject();
      if (result) {
        setProject({ ...result.project });
        setIsDirty(false);
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
        showNotification(`Topology imported: ${imported.name}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to import JSON: ${errorMsg}`);
      }
    };
    input.click();
  }, [showNotification]);

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
      // Don't intercept shortcuts when typing in an input or textarea
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveProject, handleOpenProject, handleNewProject]);

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
        onSelectTool={(t) => setActiveTool(t)}
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
          {/* Canvas workspace - Scaffolding for Phase 2 */}
          <div
            className="netrion-canvas-placeholder"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-canvas)',
              backgroundImage: 'radial-gradient(var(--border-subtle) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.05em',
            }}
          >
            [NETWORK WORKSPACE CANVAS • PHASE 1 SHELL ACTIVE]
          </div>

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
                NETRION SIMULATION ENGINE INITIALIZED [DESCRETE EVENT MODEL]
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Ready. Select a tool or device to build network topology.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Telemetry Status Bar */}
      <StatusBar
        isPaused={isPaused}
        simulationTick={simulationTick}
        simulationSpeed={simulationSpeed}
        deviceCount={project.devices.length}
        connectionCount={project.connections.length}
        activePacketCount={0}
        selectedDeviceSummary={null}
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
