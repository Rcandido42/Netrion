const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netrionDesktop', {
  isDesktop: true,
  openProjectFile: () => ipcRenderer.invoke('dialog:openProject'),
  saveProjectFile: (payload) => ipcRenderer.invoke('dialog:saveProject', payload),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  reloadApp: () => ipcRenderer.send('app:reload'),
  onReloaded: (callback) => {
    const handler = (_event, result) => callback(result);
    ipcRenderer.on('app:reloaded', handler);
    return () => ipcRenderer.removeListener('app:reloaded', handler);
  },
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
});
