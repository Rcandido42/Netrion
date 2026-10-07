const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: 'Netrion - Network Engineering & Cybersecurity Simulator',
    backgroundColor: '#0a0d12',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl);
    // Do not auto-open devtools to keep clean desktop look; shortcut Ctrl+Shift+I is available
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  buildApplicationMenu();

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
