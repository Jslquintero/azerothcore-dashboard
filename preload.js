const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings / Setup
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  browseFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Docker controls
  getStatuses: () => ipcRenderer.invoke('docker:statuses'),
  startService: (name) => ipcRenderer.invoke('docker:start', name),
  stopService: (name) => ipcRenderer.invoke('docker:stop', name),
  restartService: (name) => ipcRenderer.invoke('docker:restart', name),
  startAll: () => ipcRenderer.invoke('docker:startAll'),
  stopAll: () => ipcRenderer.invoke('docker:stopAll'),

  // SOAP
  soapCommand: (cmd) => ipcRenderer.invoke('soap:command', cmd),
  getServerInfo: () => ipcRenderer.invoke('soap:serverInfo'),

  // Monitor
  setAutoRestart: (enabled) => ipcRenderer.invoke('monitor:setAutoRestart', enabled),
  getAutoRestart: () => ipcRenderer.invoke('monitor:getAutoRestart'),

  // Database / Realm
  getRealmlist: () => ipcRenderer.invoke('db:getRealmlist'),
  updateRealm: (id, fields) => ipcRenderer.invoke('db:updateRealm', id, fields),

  // Docker Compose override editor
  parseCompose: () => ipcRenderer.invoke('compose:parse'),
  saveCompose: (updates) => ipcRenderer.invoke('compose:save', updates),

  // Modules
  listModules: () => ipcRenderer.invoke('modules:list'),
  getModuleReadme: (dirName) => ipcRenderer.invoke('modules:readme', dirName),

  // Auto-update
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // Log streaming
  startLogs: (serviceName) => ipcRenderer.send('logs:start', serviceName),
  stopLogs: () => ipcRenderer.send('logs:stop'),

  // Event listeners from main process
  onStatus: (cb) => ipcRenderer.on('monitor:status', (_, data) => cb(data)),
  onServerInfo: (cb) => ipcRenderer.on('monitor:server-info', (_, data) => cb(data)),
  onCrash: (cb) => ipcRenderer.on('monitor:crash', (_, data) => cb(data)),
  onRecovery: (cb) => ipcRenderer.on('monitor:recovery', (_, data) => cb(data)),
  onLogData: (cb) => ipcRenderer.on('logs:data', (_, data) => cb(data)),
  onLogError: (cb) => ipcRenderer.on('logs:error', (_, data) => cb(data)),

  // Update events
  onUpdateChecking: (cb) => ipcRenderer.on('update:checking', () => cb()),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, data) => cb(data)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update:not-available', (_, data) => cb(data)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_, data) => cb(data)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, data) => cb(data)),
  onUpdateError: (cb) => ipcRenderer.on('update:error', (_, data) => cb(data)),
});
