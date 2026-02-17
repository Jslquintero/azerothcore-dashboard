require('dotenv').config();

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  Notification,
  nativeImage,
} = require('electron');
const path = require('path');
const docker = require('./services/docker');
const soap = require('./services/soap');
const monitor = require('./services/monitor');
const logStream = require('./services/logStream');
const database = require('./services/database');
const compose = require('./services/compose');

let tray = null;
let mainWindow = null;

// ── Icons ────────────────────────────────────────────────────────────────────
function loadIcon(name) {
  return nativeImage.createFromPath(path.join(__dirname, 'assets', name));
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: false,
    title: 'AzerothCore Dashboard',
    icon: loadIcon('icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // Hide instead of quit when closing window
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(loadIcon('icon.png'));
  tray.setToolTip('AzerothCore Dashboard');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: createWindow },
    { type: 'separator' },
    { label: 'Start All', click: () => docker.startAll() },
    { label: 'Stop All', click: () => docker.stopAll() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        logStream.stop();
        monitor.stop();
        database.close();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', createWindow);
}

// ── Tray icon color based on status ──────────────────────────────────────────
function updateTrayIcon(statuses) {
  if (!tray) return;
  const allRunning = statuses
    .filter(s => docker.SERVICES.includes(s.name))
    .every(s => s.state === 'running');
  const anyDown = statuses
    .filter(s => docker.SERVICES.includes(s.name))
    .some(s => s.state === 'exited');

  if (allRunning) {
    tray.setImage(loadIcon('icon-green.png'));
    tray.setToolTip('AzerothCore - All services running');
  } else if (anyDown) {
    tray.setImage(loadIcon('icon-red.png'));
    tray.setToolTip('AzerothCore - Service down!');
  } else {
    tray.setImage(loadIcon('icon.png'));
    tray.setToolTip('AzerothCore Dashboard');
  }
}

// ── Desktop notifications ────────────────────────────────────────────────────
function notifyCrash(svc) {
  new Notification({
    title: 'Service Crashed',
    body: `${svc.name} has stopped unexpectedly.`,
    icon: loadIcon('icon-red.png'),
  }).show();
}

function notifyRecovery(svc) {
  new Notification({
    title: 'Service Recovered',
    body: `${svc.name} is running again.`,
    icon: loadIcon('icon-green.png'),
  }).show();
}

function notifyAutoRestart(svc) {
  new Notification({
    title: 'Auto-Restart',
    body: `Restarting ${svc.name}...`,
    icon: loadIcon('icon.png'),
  }).show();
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
function registerIPC() {
  ipcMain.handle('docker:statuses', () => docker.getServiceStatuses());
  ipcMain.handle('docker:start', (_, name) => docker.startService(name));
  ipcMain.handle('docker:stop', (_, name) => docker.stopService(name));
  ipcMain.handle('docker:restart', (_, name) => docker.restartService(name));
  ipcMain.handle('docker:startAll', () => docker.startAll());
  ipcMain.handle('docker:stopAll', () => docker.stopAll());

  ipcMain.handle('soap:command', (_, cmd) => soap.executeCommand(cmd));
  ipcMain.handle('soap:serverInfo', () => soap.getServerInfo());

  ipcMain.handle('monitor:setAutoRestart', (_, enabled) => {
    monitor.setAutoRestart(enabled);
    return enabled;
  });
  ipcMain.handle('monitor:getAutoRestart', () => monitor.getAutoRestart());

  // Log streaming via IPC events
  ipcMain.on('logs:start', (event, serviceName) => {
    logStream.start(
      serviceName,
      (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('logs:data', data);
        }
      },
      (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('logs:error', err);
        }
      }
    );
  });

  ipcMain.on('logs:stop', () => {
    logStream.stop();
  });

  // Database / Realm settings
  ipcMain.handle('db:getRealmlist', () => database.getRealmlist());
  ipcMain.handle('db:updateRealm', (_, id, fields) => database.updateRealm(id, fields));

  // Docker Compose override editor
  ipcMain.handle('compose:parse', () => compose.parseOverride());
  ipcMain.handle('compose:save', (_, updates) => compose.saveOverride(updates));
}

// ── Monitor events → renderer ────────────────────────────────────────────────
function wireMonitor() {
  monitor.on('status', (statuses) => {
    updateTrayIcon(statuses);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:status', statuses);
    }
  });

  monitor.on('server-info', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:server-info', info);
    }
  });

  monitor.on('crash', (svc) => {
    notifyCrash(svc);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:crash', svc);
    }
  });

  monitor.on('recovery', (svc) => {
    notifyRecovery(svc);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:recovery', svc);
    }
  });

  monitor.on('auto-restart', (svc) => {
    notifyAutoRestart(svc);
  });
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  console.log('App ready, creating tray and window...');
  createTray();
  createWindow();
  registerIPC();
  wireMonitor();
  monitor.start();
  console.log('Initialization complete.');
}).catch(err => {
  console.error('Startup error:', err);
});

app.on('window-all-closed', (e) => {
  // Keep running in tray on all platforms
  e.preventDefault?.();
});

app.on('activate', () => {
  createWindow();
});
