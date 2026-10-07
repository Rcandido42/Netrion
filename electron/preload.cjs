const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netrionDesktop', {
  isDesktop: true,
  openProjectFile: () => ipcRenderer.invoke('dialog:openProject'),
  saveProjectFile: (payload) => ipcRenderer.invoke('dialog:saveProject', payload),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
});
