const { contextBridge, ipcRenderer } = require('electron');

// Prevent keyboard zoom (Ctrl+/-/0) and Ctrl+scroll wheel zooming
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')) {
      e.preventDefault();
    }
  }, true);

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });
}


contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),

  // File system
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),

  // Directory watching
  watchDirectory: (dirPath) => ipcRenderer.invoke('fs:watchDirectory', dirPath),
  unwatchDirectory: (dirPath) => ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
  onNewExport: (callback) => {
    const handler = (event, filePath) => callback(filePath);
    ipcRenderer.on('fs:new-file', handler);
    return () => ipcRenderer.removeListener('fs:new-file', handler);
  },

  // Menu actions
  onMenuAction: (callback) => {
    const handler = (event, action) => callback(action);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion')
});
