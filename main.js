const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Global error handlers for uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

// Trusted base directories for file I/O (populated from user dialog selections)
const allowedRoots = new Set();

function isPathSafe(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    if (!path.isAbsolute(resolved)) return false;
    const normalized = path.normalize(resolved);
    for (const root of allowedRoots) {
      const normalizedRoot = path.resolve(root);
      if (normalized === normalizedRoot || normalized.startsWith(normalizedRoot + path.sep)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'FM24 Tactical Suite',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.loadFile('index.html');

  // Set default zoom to 75% and lock visual zoom limits
  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.webContents.setZoomFactor(0.75);
    try {
      mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    } catch (e) {
      console.warn("Could not set visual zoom limits on webContents:", e);
    }
  });

  // Build application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-action', 'new-game')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-action', 'save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-action', 'save-as')
        },
        {
          label: 'Load Save...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-action', 'load')
        },
        { type: 'separator' },
        {
          label: 'Export Save...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-action', 'export-save')
        },
        {
          label: 'Import Save...',
          click: () => mainWindow.webContents.send('menu-action', 'import-save')
        },
        { type: 'separator' },
        {
          label: 'Import Squad HTML...',
          click: () => mainWindow.webContents.send('menu-action', 'import-squad')
        },
        {
          label: 'Import Staff HTML...',
          click: () => mainWindow.webContents.send('menu-action', 'import-staff')
        },
        {
          label: 'Import Market HTML...',
          click: () => mainWindow.webContents.send('menu-action', 'import-market')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About FM24 Tactical Suite',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About FM24 Tactical Suite',
              message: 'FM24 Tactical Suite v1.0.0',
              detail: 'Director of Football mode for Football Manager 2024.\n\nBuilt with Electron + Dexie.js.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ───

// File dialog: select a directory
ipcMain.handle('dialog:selectDirectory', async () => {
  try {
    if (!mainWindow) return { success: false, error: 'No active window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select FM24 Export Folder'
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: 'Cancelled' };
    }
    allowedRoots.add(path.resolve(result.filePaths[0]));
    return { success: true, data: result.filePaths[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File dialog: save file
ipcMain.handle('dialog:saveFile', async (event, options) => {
  try {
    if (!mainWindow) return { success: false, error: 'No active window' };
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || '',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }
    allowedRoots.add(path.dirname(path.resolve(result.filePath)));
    return { success: true, data: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File dialog: open file
ipcMain.handle('dialog:openFile', async (event, options) => {
  try {
    if (!mainWindow) return { success: false, error: 'No active window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Open File',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: 'Cancelled' };
    }
    allowedRoots.add(path.dirname(path.resolve(result.filePaths[0])));
    return { success: true, data: result.filePaths[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File system: read file
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    if (!isPathSafe(filePath)) {
      return { success: false, error: 'Access denied: path not in allowed directories' };
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File system: write file
ipcMain.handle('fs:writeFile', async (event, filePath, data) => {
  try {
    if (!isPathSafe(filePath)) {
      return { success: false, error: 'Access denied: path not in allowed directories' };
    }
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File system: watch directory for new files
const watchers = {};
ipcMain.handle('fs:watchDirectory', async (event, dirPath) => {
  try {
    // Clean up existing watcher for this path
    if (watchers[dirPath]) {
      watchers[dirPath].close();
    }
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist' };
    }
    const watcher = fs.watch(dirPath, (eventType, filename) => {
      if (eventType === 'rename' && filename) {
        const fullPath = path.join(dirPath, filename);
        if (filename.endsWith('.html') || filename.endsWith('.htm')) {
          setTimeout(() => {
            if (fs.existsSync(fullPath)) {
              mainWindow.webContents.send('fs:new-file', fullPath);
            }
          }, 500);
        }
      }
    });
    watchers[dirPath] = watcher;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs:unwatchDirectory', async (event, dirPath) => {
  try {
    if (watchers[dirPath]) {
      watchers[dirPath].close();
      delete watchers[dirPath];
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('app:getVersion', () => {
  try {
    return { success: true, data: app.getVersion() };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── App Lifecycle ───

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
