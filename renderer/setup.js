const $error = document.getElementById('setupError');

// Browse button
document.getElementById('btnBrowse').addEventListener('click', async () => {
  const result = await window.api.browseFolder();
  if (result) {
    document.getElementById('acProjectRoot').value = result;
  }
});

// Load existing settings if re-configuring
(async () => {
  const settings = await window.api.getSettings();
  if (settings.acProjectRoot) document.getElementById('acProjectRoot').value = settings.acProjectRoot;
  if (settings.soapHost) document.getElementById('soapHost').value = settings.soapHost;
  if (settings.soapPort) document.getElementById('soapPort').value = settings.soapPort;
  if (settings.soapUser) document.getElementById('soapUser').value = settings.soapUser;
  if (settings.soapPass) document.getElementById('soapPass').value = settings.soapPass;
  if (settings.dbHost) document.getElementById('dbHost').value = settings.dbHost;
  if (settings.dbPort) document.getElementById('dbPort').value = settings.dbPort;
  if (settings.dbUser) document.getElementById('dbUser').value = settings.dbUser;
  if (settings.dbPass) document.getElementById('dbPass').value = settings.dbPass;
})();

// Save
document.getElementById('btnSave').addEventListener('click', async () => {
  const settings = {
    acProjectRoot: document.getElementById('acProjectRoot').value.trim(),
    soapHost: document.getElementById('soapHost').value.trim(),
    soapPort: document.getElementById('soapPort').value.trim(),
    soapUser: document.getElementById('soapUser').value.trim(),
    soapPass: document.getElementById('soapPass').value,
    dbHost: document.getElementById('dbHost').value.trim(),
    dbPort: document.getElementById('dbPort').value.trim(),
    dbUser: document.getElementById('dbUser').value.trim(),
    dbPass: document.getElementById('dbPass').value,
  };

  if (!settings.acProjectRoot) {
    $error.textContent = 'Please specify the AzerothCore project root.';
    return;
  }

  const result = await window.api.saveSettings(settings);
  if (result.error) {
    $error.textContent = result.error;
  }
  // Main process will handle the redirect to dashboard
});
