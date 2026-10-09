const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const http = require('http');

let mainWindow = null;

function checkDevServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173', (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(350, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function getWorkspaceDistPath() {
  const candidatePaths = [
    // 1. Direct workspace location on current system
    'C:/Users/deepc/Desktop/projetos programação/Netrion/dist/index.html',
    'c:/Users/deepc/Desktop/projetos programação/Netrion/dist/index.html',
    // 2. Relative to project root if running from source
    path.join(__dirname, '../dist/index.html'),
    // 3. User environment variable
    process.env.NETRION_WORKSPACE_DIST,
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function loadAppTarget(win) {
  if (!win) return { type: 'none' };
  
  // 1. Vite dev server priority (instant HMR)
  const isDevRunning = await checkDevServer();
  if (isDevRunning) {
    console.log('[Netrion] Connected to Vite Dev Server (http://localhost:5173)');
    await win.loadURL('http://localhost:5173');
    return { type: 'dev', source: 'http://localhost:5173' };
  }

  // 2. Live workspace build priority
  const workspaceDist = getWorkspaceDistPath();
  if (workspaceDist && fs.existsSync(workspaceDist)) {
    console.log('[Netrion] Loaded from live workspace build:', workspaceDist);
    await win.loadFile(workspaceDist);
    return { type: 'workspace', source: workspaceDist };
  }

  // 3. Packaged bundle fallback
  const fallback = path.join(__dirname, '../dist/index.html');
  console.log('[Netrion] Loaded from packaged bundle:', fallback);
  await win.loadFile(fallback);
  return { type: 'packaged', source: fallback };
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/netrion-logo.png');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: 'Netrion - Network Engineering & Cybersecurity Simulator',
    backgroundColor: '#f8fafc',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  buildApplicationMenu();

  loadAppTarget(mainWindow).catch((err) => {
    console.error('[Netrion] Failed to load smart target, fallback to local dist:', err);
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:action', 'new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:action', 'open-project'),
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:action', 'save-project'),
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:action', 'save-project-as'),
        },
        { type: 'separator' },
        {
          label: 'Export Topology (JSON)...',
          click: () => mainWindow?.webContents.send('menu:action', 'export-project'),
        },
        {
          label: 'Import Topology (JSON)...',
          click: () => mainWindow?.webContents.send('menu:action', 'import-project'),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:action', 'undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.send('menu:action', 'redo'),
        },
        { type: 'separator' },
        {
          label: 'Delete Selected',
          accelerator: 'Delete',
          click: () => mainWindow?.webContents.send('menu:action', 'delete-selected'),
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => mainWindow?.webContents.send('menu:action', 'select-all'),
        },
      ],
    },
    {
      label: 'Simulation',
      submenu: [
        {
          label: 'Play / Pause',
          accelerator: 'Space',
          click: () => mainWindow?.webContents.send('menu:action', 'toggle-simulation'),
        },
        {
          label: 'Single Step Tick',
          accelerator: 'F8',
          click: () => mainWindow?.webContents.send('menu:action', 'step-simulation'),
        },
        {
          label: 'Reset Simulation Clock & Buffers',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.send('menu:action', 'reset-simulation'),
        },
        { type: 'separator' },
        {
          label: 'Speed: 0.5x (Slow)',
          click: () => mainWindow?.webContents.send('menu:action', 'speed:0.5'),
        },
        {
          label: 'Speed: 1x (Normal)',
          click: () => mainWindow?.webContents.send('menu:action', 'speed:1'),
        },
        {
          label: 'Speed: 2x (Fast)',
          click: () => mainWindow?.webContents.send('menu:action', 'speed:2'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload Application',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              loadAppTarget(mainWindow).catch(() => mainWindow?.webContents.reloadIgnoringCache());
            }
          },
        },
        {
          label: 'Hard Reload (Clear Cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              loadAppTarget(mainWindow).catch(() => mainWindow?.webContents.reloadIgnoringCache());
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow?.webContents.send('menu:action', 'zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow?.webContents.send('menu:action', 'zoom-out'),
        },
        {
          label: 'Reset Zoom (100%)',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.send('menu:action', 'zoom-reset'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Bottom Console',
          accelerator: 'CmdOrCtrl+`',
          click: () => mainWindow?.webContents.send('menu:action', 'toggle-console'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => mainWindow?.webContents.send('menu:action', 'help-shortcuts'),
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/Rcandido42/Netrion'),
        },
        { type: 'separator' },
        {
          label: 'About Netrion...',
          click: () => mainWindow?.webContents.send('menu:action', 'help-about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for native file dialogs and disk access
ipcMain.handle('dialog:openProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Netrion Project',
    filters: [
      { name: 'Netrion Project (*.netrion)', extensions: ['netrion'] },
      { name: 'JSON Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('dialog:saveProject', async (_event, { filePath, content, defaultName }) => {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Netrion Project',
      defaultPath: defaultName || 'network.netrion',
      filters: [
        { name: 'Netrion Project (*.netrion)', extensions: ['netrion'] },
        { name: 'JSON Files (*.json)', extensions: ['json'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }
    targetPath = result.filePath;
  }

  fs.writeFileSync(targetPath, content, 'utf-8');
  return { filePath: targetPath, success: true };
});

ipcMain.handle('app:info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    isDesktop: true,
  };
});

ipcMain.on('app:reload', async () => {
  if (mainWindow) {
    try {
      const result = await loadAppTarget(mainWindow);
      if (mainWindow.webContents) {
        mainWindow.webContents.send('app:reloaded', result);
      }
    } catch {
      mainWindow.webContents.reloadIgnoringCache();
    }
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
