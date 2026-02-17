// ── DOM refs ─────────────────────────────────────────────────────────────────
const $cards       = document.getElementById('serviceCards');
const $playerNum   = document.getElementById('playerNum');
const $uptimeText  = document.getElementById('uptimeText');
const $btnStartAll = document.getElementById('btnStartAll');
const $btnStopAll  = document.getElementById('btnStopAll');
const $autoRestart = document.getElementById('autoRestartToggle');
const $consoleOut  = document.getElementById('consoleOutput');
const $consoleForm = document.getElementById('consoleForm');
const $consoleCmd  = document.getElementById('consoleCmd');
const $logSelect   = document.getElementById('logServiceSelect');
const $logOutput   = document.getElementById('logOutput');
const $btnStopLogs = document.getElementById('btnStopLogs');
const $btnClearLogs= document.getElementById('btnClearLogs');
const $realmList     = document.getElementById('realmList');
const $realmStatus   = document.getElementById('realmStatus');
const $configSections = document.getElementById('configSections');
const $configStatus  = document.getElementById('configStatus');
const $btnSaveConfig = document.getElementById('btnSaveConfig');
const $btnRefreshConfig = document.getElementById('btnRefreshConfig');

const MAX_LOG_LINES = 500;
const FRIENDLY_NAMES = {
  'ac-database':    'Database',
  'ac-worldserver': 'Worldserver',
  'ac-authserver':  'Authserver',
};

// Track which services are in a transitional (loading) state
const pendingActions = new Set();

// ── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'realm') loadRealmlist();
    if (tab.dataset.tab === 'config') loadConfig();
    if (tab.dataset.tab === 'settings') loadSettings();
  });
});

// ── Service cards ────────────────────────────────────────────────────────────
function renderCards(statuses) {
  $cards.innerHTML = statuses.map(svc => {
    const isPending = pendingActions.has(svc.name);
    const isRunning = svc.state === 'running';
    const isExited  = svc.state === 'exited' || svc.state === 'not found';
    const friendly  = FRIENDLY_NAMES[svc.name] || svc.name;

    // Determine visual state
    let stateClass, dotClass, statusLabel;
    if (isPending) {
      stateClass  = 'state-starting';
      dotClass    = 'starting';
      statusLabel = 'Working...';
    } else if (isRunning) {
      stateClass  = 'state-running';
      dotClass    = 'running';
      statusLabel = 'Running';
    } else if (svc.state === 'not found') {
      stateClass  = '';
      dotClass    = 'not-found';
      statusLabel = 'Not Created';
    } else {
      stateClass  = 'state-exited';
      dotClass    = 'exited';
      statusLabel = 'Stopped';
    }

    // Spinner or dot
    const indicator = isPending
      ? `<span class="spinner"></span>`
      : `<span class="status-dot ${dotClass}"></span>`;

    // Button disabled states
    const startDisabled  = (isRunning || isPending) ? 'disabled' : '';
    const stopDisabled   = (isExited  || isPending) ? 'disabled' : '';
    const restartDisabled = isPending ? 'disabled' : '';

    return `
      <div class="service-card ${stateClass}">
        <div class="card-header">
          <span class="service-name">${friendly}</span>
          <div class="status-indicator">
            ${indicator}
            <span class="status-text ${dotClass}">${statusLabel}</span>
          </div>
        </div>
        <div class="card-status">${svc.status || ''}</div>
        <div class="card-actions">
          <button class="btn btn-start btn-sm" data-action="start" data-service="${svc.name}" ${startDisabled}>Start</button>
          <button class="btn btn-stop btn-sm" data-action="stop" data-service="${svc.name}" ${stopDisabled}>Stop</button>
          <button class="btn btn-secondary btn-sm" data-action="restart" data-service="${svc.name}" ${restartDisabled}>Restart</button>
        </div>
      </div>`;
  }).join('');
}

// ── Event delegation for service card buttons ────────────────────────────────
$cards.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;

  const action = btn.dataset.action;
  const name = btn.dataset.service;

  // Set pending state and re-render
  pendingActions.add(name);
  if (lastStatuses.length) renderCards(lastStatuses);

  const label = action.charAt(0).toUpperCase() + action.slice(1);
  appendConsole(`> ${label}ing ${name}...\n`);

  try {
    if (action === 'start') await window.api.startService(name);
    else if (action === 'stop') await window.api.stopService(name);
    else if (action === 'restart') await window.api.restartService(name);
    appendConsole(`> ${name} ${action} complete.\n`);
  } catch (err) {
    appendConsole(`Error: ${err.message}\n`);
  } finally {
    pendingActions.delete(name);
    // Force a fresh status fetch
    try {
      const statuses = await window.api.getStatuses();
      lastStatuses = statuses;
      renderCards(statuses);
    } catch {}
  }
});

// ── Toolbar ──────────────────────────────────────────────────────────────────
$btnStartAll.addEventListener('click', async () => {
  appendConsole('> Starting all services...\n');
  ['ac-database', 'ac-worldserver', 'ac-authserver'].forEach(s => pendingActions.add(s));
  if (lastStatuses.length) renderCards(lastStatuses);
  try {
    await window.api.startAll();
    appendConsole('> All services started.\n');
  } catch (e) { appendConsole(`Error: ${e.message}\n`); }
  finally {
    pendingActions.clear();
    try {
      const statuses = await window.api.getStatuses();
      lastStatuses = statuses;
      renderCards(statuses);
    } catch {}
  }
});

$btnStopAll.addEventListener('click', async () => {
  appendConsole('> Stopping all services...\n');
  ['ac-database', 'ac-worldserver', 'ac-authserver'].forEach(s => pendingActions.add(s));
  if (lastStatuses.length) renderCards(lastStatuses);
  try {
    await window.api.stopAll();
    appendConsole('> All services stopped.\n');
  } catch (e) { appendConsole(`Error: ${e.message}\n`); }
  finally {
    pendingActions.clear();
    try {
      const statuses = await window.api.getStatuses();
      lastStatuses = statuses;
      renderCards(statuses);
    } catch {}
  }
});

// ── Auto-restart toggle ──────────────────────────────────────────────────────
(async () => {
  $autoRestart.checked = await window.api.getAutoRestart();
})();

$autoRestart.addEventListener('change', () => {
  window.api.setAutoRestart($autoRestart.checked);
});

// ── Console ──────────────────────────────────────────────────────────────────
function appendConsole(text) {
  $consoleOut.textContent += text;
  const lines = $consoleOut.textContent.split('\n');
  if (lines.length > MAX_LOG_LINES) {
    $consoleOut.textContent = lines.slice(-MAX_LOG_LINES).join('\n');
  }
  $consoleOut.scrollTop = $consoleOut.scrollHeight;
}

$consoleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cmd = $consoleCmd.value.trim();
  if (!cmd) return;

  appendConsole(`> ${cmd}\n`);
  $consoleCmd.value = '';

  const result = await window.api.soapCommand(cmd);
  if (result.success) {
    appendConsole(result.message + '\n');
  } else {
    appendConsole(`Error: ${result.message}\n`);
  }
});

// ── Log viewer ───────────────────────────────────────────────────────────────
let logLineCount = 0;

$logSelect.addEventListener('change', () => {
  const svc = $logSelect.value;
  $logOutput.textContent = '';
  logLineCount = 0;
  if (svc) {
    window.api.startLogs(svc);
  } else {
    window.api.stopLogs();
  }
});

$btnStopLogs.addEventListener('click', () => {
  window.api.stopLogs();
  $logSelect.value = '';
});

$btnClearLogs.addEventListener('click', () => {
  $logOutput.textContent = '';
  logLineCount = 0;
});

window.api.onLogData((data) => {
  $logOutput.textContent += data;
  logLineCount += data.split('\n').length - 1;
  if (logLineCount > MAX_LOG_LINES) {
    const lines = $logOutput.textContent.split('\n');
    $logOutput.textContent = lines.slice(-MAX_LOG_LINES).join('\n');
    logLineCount = MAX_LOG_LINES;
  }
  $logOutput.scrollTop = $logOutput.scrollHeight;
});

window.api.onLogError((err) => {
  $logOutput.textContent += `[ERROR] ${err}\n`;
});

// ── Realm settings ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadRealmlist() {
  $realmStatus.textContent = '';
  $realmStatus.className = 'realm-status';

  try {
    const realms = await window.api.getRealmlist();
    if (!realms || realms.length === 0) {
      $realmList.innerHTML = '<p style="color:var(--text-muted)">No realms found. Is the database running?</p>';
      return;
    }

    $realmList.innerHTML = realms.map(r => `
      <div class="realm-card" data-realm-id="${r.id}">
        <div class="realm-id">Realm ID: ${r.id}</div>
        <div class="realm-fields">
          <div class="realm-field">
            <label>Realm Name</label>
            <input type="text" data-field="name" value="${escapeHtml(r.name)}">
          </div>
          <div class="realm-field">
            <label>Address (Public IP / Domain)</label>
            <input type="text" data-field="address" value="${escapeHtml(r.address)}">
          </div>
          <div class="realm-field">
            <label>Local Address</label>
            <input type="text" data-field="localAddress" value="${escapeHtml(r.localAddress)}">
          </div>
          <div class="realm-field">
            <label>Local Subnet Mask</label>
            <input type="text" data-field="localSubnetMask" value="${escapeHtml(r.localSubnetMask)}">
          </div>
          <div class="realm-field">
            <label>Port</label>
            <input type="number" data-field="port" value="${r.port}">
          </div>
        </div>
        <div class="realm-actions">
          <button class="btn btn-primary btn-sm" data-realm-action="save" data-realm-id="${r.id}">Save</button>
          <button class="btn btn-secondary btn-sm" data-realm-action="reset">Reset</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    $realmList.innerHTML = '';
    $realmStatus.textContent = 'Failed to load realms: ' + err.message;
    $realmStatus.className = 'realm-status error';
  }
}

async function saveRealm(id) {
  const card = document.querySelector(`.realm-card[data-realm-id="${id}"]`);
  if (!card) return;

  const fields = {};
  card.querySelectorAll('input[data-field]').forEach(input => {
    const key = input.dataset.field;
    fields[key] = key === 'port' ? parseInt(input.value, 10) : input.value;
  });

  try {
    await window.api.updateRealm(id, fields);
    $realmStatus.textContent = 'Realm updated successfully. Restart the server for changes to take effect.';
    $realmStatus.className = 'realm-status success';
  } catch (err) {
    $realmStatus.textContent = 'Failed to save: ' + err.message;
    $realmStatus.className = 'realm-status error';
  }
}

// Event delegation for realm buttons
$realmList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-realm-action]');
  if (!btn) return;

  if (btn.dataset.realmAction === 'save') {
    await saveRealm(parseInt(btn.dataset.realmId, 10));
  } else if (btn.dataset.realmAction === 'reset') {
    await loadRealmlist();
  }
});

// ── Config editor ────────────────────────────────────────────────────────────
async function loadConfig() {
  $configStatus.textContent = '';
  $configStatus.className = 'realm-status';

  try {
    const data = await window.api.parseCompose();
    renderConfig(data.sections);
  } catch (err) {
    $configSections.innerHTML = '';
    $configStatus.textContent = 'Failed to load config: ' + err.message;
    $configStatus.className = 'realm-status error';
  }
}

function renderConfig(sections) {
  $configSections.innerHTML = sections.map(section => {
    const varsHtml = section.vars.map(v => {
      let controlHtml;

      if (v.type === 'toggle') {
        const checked = v.value === '1' ? 'checked' : '';
        controlHtml = `
          <input type="checkbox" class="config-toggle" data-config-key="${v.key}" ${checked}>
          <span class="config-toggle-label">${v.value === '1' ? 'ON' : 'OFF'}</span>
        `;
      } else if (v.type === 'number') {
        controlHtml = `
          <input type="number" class="config-input" data-config-key="${v.key}" value="${escapeHtml(v.value)}">
        `;
      } else {
        controlHtml = `
          <input type="text" class="config-input wide" data-config-key="${v.key}" value="${escapeHtml(v.value)}">
        `;
      }

      const hintHtml = v.hint ? `<span class="config-hint">(${escapeHtml(v.hint)})</span>` : '';

      return `
        <div class="config-row">
          <span class="config-key">${v.key}</span>
          <div class="config-control">
            ${controlHtml}
            ${hintHtml}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="config-section">
        <div class="config-section-header">${escapeHtml(section.name)}</div>
        <div class="config-vars">${varsHtml}</div>
      </div>`;
  }).join('');
}

// Update toggle label when checkbox changes
$configSections.addEventListener('change', (e) => {
  if (e.target.classList.contains('config-toggle')) {
    const label = e.target.nextElementSibling;
    if (label && label.classList.contains('config-toggle-label')) {
      label.textContent = e.target.checked ? 'ON' : 'OFF';
    }
  }
});

// Collect all values from the config form
function collectConfigValues() {
  const updates = {};

  $configSections.querySelectorAll('[data-config-key]').forEach(el => {
    const key = el.dataset.configKey;
    if (el.type === 'checkbox') {
      updates[key] = el.checked ? '1' : '0';
    } else {
      updates[key] = el.value;
    }
  });

  return updates;
}

$btnSaveConfig.addEventListener('click', async () => {
  const updates = collectConfigValues();
  try {
    await window.api.saveCompose(updates);
    $configStatus.textContent = 'Configuration saved. Restart the worldserver for changes to take effect.';
    $configStatus.className = 'realm-status success';
  } catch (err) {
    $configStatus.textContent = 'Failed to save: ' + err.message;
    $configStatus.className = 'realm-status error';
  }
});

$btnRefreshConfig.addEventListener('click', () => {
  loadConfig();
});

// ── Monitor events ───────────────────────────────────────────────────────────
let lastStatuses = [];

window.api.onStatus((statuses) => {
  lastStatuses = statuses;
  renderCards(statuses);
});

window.api.onServerInfo((info) => {
  $playerNum.textContent = info.players;
  $uptimeText.textContent = info.uptime;
});

window.api.onCrash((svc) => {
  const friendly = FRIENDLY_NAMES[svc.name] || svc.name;
  appendConsole(`[CRASH] ${friendly} has stopped unexpectedly!\n`);
});

window.api.onRecovery((svc) => {
  const friendly = FRIENDLY_NAMES[svc.name] || svc.name;
  appendConsole(`[RECOVERY] ${friendly} is running again.\n`);
});

// ── Settings tab ────────────────────────────────────────────────────────────
const $settingsStatus = document.getElementById('settingsStatus');

async function loadSettings() {
  const s = await window.api.getSettings();
  document.getElementById('settAcProjectRoot').value = s.acProjectRoot || '';
  document.getElementById('settSoapHost').value = s.soapHost || '127.0.0.1';
  document.getElementById('settSoapPort').value = s.soapPort || '7878';
  document.getElementById('settSoapUser').value = s.soapUser || 'soap';
  document.getElementById('settSoapPass').value = s.soapPass || 'soap';
  document.getElementById('settDbHost').value = s.dbHost || '127.0.0.1';
  document.getElementById('settDbPort').value = s.dbPort || '3306';
  document.getElementById('settDbUser').value = s.dbUser || 'root';
  document.getElementById('settDbPass').value = s.dbPass || 'password';
}

document.getElementById('settBtnBrowse').addEventListener('click', async () => {
  const result = await window.api.browseFolder();
  if (result) {
    document.getElementById('settAcProjectRoot').value = result;
  }
});

document.getElementById('btnSaveSettings').addEventListener('click', async () => {
  const newSettings = {
    acProjectRoot: document.getElementById('settAcProjectRoot').value.trim(),
    soapHost: document.getElementById('settSoapHost').value.trim(),
    soapPort: document.getElementById('settSoapPort').value.trim(),
    soapUser: document.getElementById('settSoapUser').value.trim(),
    soapPass: document.getElementById('settSoapPass').value,
    dbHost: document.getElementById('settDbHost').value.trim(),
    dbPort: document.getElementById('settDbPort').value.trim(),
    dbUser: document.getElementById('settDbUser').value.trim(),
    dbPass: document.getElementById('settDbPass').value,
  };

  if (!newSettings.acProjectRoot) {
    $settingsStatus.textContent = 'Project root is required.';
    $settingsStatus.className = 'realm-status error';
    return;
  }

  try {
    await window.api.saveSettings(newSettings);
    $settingsStatus.textContent = 'Settings saved successfully.';
    $settingsStatus.className = 'realm-status success';
  } catch (err) {
    $settingsStatus.textContent = 'Failed to save: ' + err.message;
    $settingsStatus.className = 'realm-status error';
  }
});

// ── Initial load ─────────────────────────────────────────────────────────────
(async () => {
  try {
    const statuses = await window.api.getStatuses();
    lastStatuses = statuses;
    renderCards(statuses);
  } catch {
    $cards.innerHTML = '<p style="color:var(--red)">Failed to fetch service statuses.</p>';
  }
})();
