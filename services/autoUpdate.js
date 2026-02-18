const { autoUpdater } = require('electron-updater');
const { Notification, nativeImage } = require('electron');
const path = require('path');

// Configure autoUpdater
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'azerothcore',
  repo: 'azerothcore-dashboard'
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let updateAvailable = false;
let updateDownloaded = false;

// Load icon for notifications
function loadIcon(name) {
  return nativeImage.createFromPath(path.join(__dirname, '..', 'assets', name));
}

// ── Event Handlers ─────────────────────────────────────────────────────────────
function setupEventHandlers(callbacks = {}) {
  // When an update is available
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    updateAvailable = true;
    updateDownloaded = false;

    if (callbacks.onUpdateAvailable) {
      callbacks.onUpdateAvailable(info);
    }

    // Show notification
    new Notification({
      title: 'Update Available',
      body: `Version ${info.version} is ready to download.`,
      icon: loadIcon('icon.png'),
    }).show();
  });

  // When update is not available
  autoUpdater.on('update-not-available', (info) => {
    console.log('No update available:', info);
    updateAvailable = false;

    if (callbacks.onUpdateNotAvailable) {
      callbacks.onUpdateNotAvailable(info);
    }
  });

  // When update has been downloaded
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    updateDownloaded = true;

    if (callbacks.onUpdateDownloaded) {
      callbacks.onUpdateDownloaded(info);
    }

    // Show notification with install option
    const notif = new Notification({
      title: 'Update Ready to Install',
      body: `Version ${info.version} has been downloaded. Click to install.`,
      icon: loadIcon('icon-green.png'),
    });

    notif.on('click', () => {
      installAndRestart();
    });

    notif.show();
  });

  // When there's an error
  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);

    if (callbacks.onError) {
      callbacks.onError(err);
    }

    // Only show notification for user-initiated checks
    if (callbacks.isUserInitiated) {
      new Notification({
        title: 'Update Error',
        body: err.message || 'Failed to check for updates.',
        icon: loadIcon('icon-red.png'),
      }).show();
    }
  });

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    console.log('Download progress:', progress);

    if (callbacks.onDownloadProgress) {
      callbacks.onDownloadProgress(progress);
    }
  });

  // Checking for update
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');

    if (callbacks.onChecking) {
      callbacks.onChecking();
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────
function checkForUpdates(userInitiated = false) {
  // Set up event handlers if not already done
  if (!autoUpdater.listenerCount('update-available')) {
    setupEventHandlers({ isUserInitiated: userInitiated });
  }
  return autoUpdater.checkForUpdates();
}

function downloadUpdate() {
  return autoUpdater.downloadUpdate();
}

function installAndRestart() {
  setImmediate(() => {
    autoUpdater.quitAndInstall();
  });
}

function getUpdateStatus() {
  return {
    updateAvailable,
    updateDownloaded,
  };
}

module.exports = {
  checkForUpdates,
  downloadUpdate,
  installAndRestart,
  getUpdateStatus,
  setupEventHandlers,
};
