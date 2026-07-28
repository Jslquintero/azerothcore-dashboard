// ── DOM refs ─────────────────────────────────────────────────────────────────
const $cards       = document.getElementById('serviceCards');
const $playerNum   = document.getElementById('playerNum');
const $uptimeText  = document.getElementById('uptimeText');
const $btnStartAll = document.getElementById('btnStartAll');
const $btnStopAll  = document.getElementById('btnStopAll');
const $autoRestart = document.getElementById('autoRestartToggle');
const $themeSelect = document.getElementById('themeSelect');
const $musicToggle = document.getElementById('musicToggle');
const $musicVolume = document.getElementById('musicVolume');
const $consoleOut  = document.getElementById('consoleOutput');
const $consoleForm = document.getElementById('consoleForm');
const $consoleCmd  = document.getElementById('consoleCmd');
const $btnClearConsole = document.getElementById('btnClearConsole');
const $accountForm = document.getElementById('accountForm');
const $accountStatus = document.getElementById('accountStatus');
const $btnCreateAccount = document.getElementById('btnCreateAccount');
const $accountEditStatus = document.getElementById('accountEditStatus');
const $btnUpdateAccountPassword = document.getElementById('btnUpdateAccountPassword');
const $btnUpdateAccountGm = document.getElementById('btnUpdateAccountGm');
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

// Items tab DOM refs
const $itemsList        = document.getElementById('itemsList');
const $itemsSearchInput = document.getElementById('itemsSearchInput');
const $itemsSortSelect  = document.getElementById('itemsSortSelect');
const $itemsCountInfo   = document.getElementById('itemsCountInfo');
const $itemsPagination  = document.getElementById('itemsPagination');
const $itemsStatus      = document.getElementById('itemsStatus');
const $btnItemsSearch   = document.getElementById('btnItemsSearch');
const $btnItemsClear    = document.getElementById('btnItemsClear');
const $btnNewItem       = document.getElementById('btnNewItem');

// Modal refs
const $modalOverlay    = document.getElementById('itemModalOverlay');
const $modalTitle      = document.getElementById('itemModalTitle');
const $btnCloseModal   = document.getElementById('btnCloseModal');
const $btnModalCancel  = document.getElementById('btnModalCancel');
const $btnModalSave    = document.getElementById('btnModalSave');

const MAX_LOG_LINES = 500;
const FRIENDLY_NAMES = {
  'ac-database':    'Database',
  'ac-worldserver': 'Worldserver',
  'ac-authserver':  'Authserver',
};

// Track which services are in a transitional (loading) state
const pendingActions = new Set();
const themeMusic = {
  classic: '../assets/music/classic.mp3',
  tbc: '../assets/music/tbc.mp3',
  wrath: '../assets/music/wrath.mp3',
};
const themeAudio = new Audio();
themeAudio.loop = true;

// ── Expansion theme ─────────────────────────────────────────────────────────
function applyTheme(theme) {
  const safeTheme = ['classic', 'tbc', 'wrath'].includes(theme) ? theme : 'wrath';
  document.body.dataset.theme = safeTheme;
  localStorage.setItem('azerothcore-dashboard-theme', safeTheme);
  $themeSelect.value = safeTheme;
  updateThemeMusic();
}

applyTheme(localStorage.getItem('azerothcore-dashboard-theme') || 'classic');

$themeSelect.addEventListener('change', () => {
  applyTheme($themeSelect.value);
});

function updateThemeMusic() {
  const theme = document.body.dataset.theme || 'wrath';
  const nextSrc = themeMusic[theme];
  if (!nextSrc) return;

  if (!themeAudio.src.endsWith(nextSrc.replace('..', ''))) {
    themeAudio.src = nextSrc;
  }

  if ($musicToggle.checked) {
    themeAudio.play().catch(() => {
      $musicToggle.checked = false;
      localStorage.setItem('azerothcore-dashboard-music-enabled', '0');
    });
  }
}

function applyMusicSettings() {
  const savedEnabled = localStorage.getItem('azerothcore-dashboard-music-enabled');
  const enabled = savedEnabled === null ? true : savedEnabled === '1';
  const volume = parseInt(localStorage.getItem('azerothcore-dashboard-music-volume') || '35', 10);
  $musicToggle.checked = enabled;
  $musicVolume.value = String(Number.isFinite(volume) ? volume : 35);
  themeAudio.volume = parseInt($musicVolume.value, 10) / 100;
  updateThemeMusic();
}

$musicToggle.addEventListener('change', () => {
  localStorage.setItem('azerothcore-dashboard-music-enabled', $musicToggle.checked ? '1' : '0');
  if ($musicToggle.checked) {
    updateThemeMusic();
  } else {
    themeAudio.pause();
  }
});

$musicVolume.addEventListener('input', () => {
  themeAudio.volume = parseInt($musicVolume.value, 10) / 100;
  localStorage.setItem('azerothcore-dashboard-music-volume', $musicVolume.value);
});

applyMusicSettings();

// ── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'realm') loadRealmlist();
    if (tab.dataset.tab === 'config') loadConfig();
    if (tab.dataset.tab === 'database-items') loadItems();
    if (tab.dataset.tab === 'modules') loadModules();
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

function formatUptime(value) {
  const text = String(value || '').trim();
  if (!text || text === 'unknown' || text === 'offline' || text === 'error') return text || '--';
  if (/^\d+d\s+\d{2}:\d{2}:\d{2}$/.test(text) || /^\d{2}:\d{2}:\d{2}$/.test(text)) return text;

  const units = {
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  let total = 0;
  const unitPattern = /(\d+)\s*(day|hour|minute|second)\(s\)?/gi;
  let match;
  while ((match = unitPattern.exec(text))) {
    total += parseInt(match[1], 10) * units[match[2].toLowerCase()];
  }

  if (!total) return text;

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${clock}` : clock;
}

async function runConsoleCommand(cmd) {
  const normalizedCmd = cmd.trim().replace(/^\.+\s*/, '');
  if (!normalizedCmd) return;

  appendConsole(`> ${normalizedCmd}\n`);

  if (normalizedCmd.toLowerCase() === 'server info') {
    await printServerInfo();
    return;
  }

  const result = await window.api.soapCommand(normalizedCmd);
  if (result.success) {
    appendConsole((result.message || 'Command executed.') + '\n');
  } else {
    appendConsole(`Error: ${result.message}\n`);
  }
}

async function printServerInfo() {
  const info = await window.api.getServerInfo();
  if (!info) {
    appendConsole('Worldserver is not running.\n');
    return;
  }

  const source = info.source === 'docker' ? 'Docker fallback' : 'SOAP';
  const lines = [
    `Server uptime: ${formatUptime(info.uptime)}`,
    `Connected players: ${info.players}`,
  ];
  if (info.bots !== null && info.bots !== undefined) {
    lines.push(`Random bots online: ${info.bots}`);
  }
  lines.push(`Source: ${source}`);

  appendConsole(lines.join('\n') + '\n');
  $playerNum.textContent = info.players;
  $uptimeText.textContent = formatUptime(info.uptime);
}

$consoleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cmd = $consoleCmd.value.trim();
  if (!cmd) return;

  $consoleCmd.value = '';
  await runConsoleCommand(cmd);
});

document.querySelectorAll('[data-command]').forEach(btn => {
  btn.addEventListener('click', () => {
    runConsoleCommand(btn.dataset.command);
  });
});

$btnClearConsole.addEventListener('click', () => {
  $consoleOut.textContent = '';
});

$accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  $accountStatus.textContent = '';
  $accountStatus.className = 'realm-status';
  $btnCreateAccount.disabled = true;

  const payload = {
    username: document.getElementById('accountUsername').value.trim(),
    password: document.getElementById('accountPassword').value,
    gmLevel: parseInt(document.getElementById('accountGmLevel').value, 10),
    realmId: parseInt(document.getElementById('accountRealmId').value, 10),
  };

  try {
    const result = await window.api.createAccount(payload);
    if (!result.success) {
      $accountStatus.textContent = result.message;
      $accountStatus.className = 'realm-status error';
      appendConsole(`[ACCOUNT] Error: ${result.message}\n`);
      return;
    }

    $accountStatus.textContent = 'Account created successfully.';
    $accountStatus.className = 'realm-status success';
    document.getElementById('accountPassword').value = '';
    appendConsole(`[ACCOUNT] ${result.message || 'Account created successfully.'}\n`);
  } catch (err) {
    $accountStatus.textContent = 'Failed to create account: ' + err.message;
    $accountStatus.className = 'realm-status error';
  } finally {
    $btnCreateAccount.disabled = false;
  }
});

function getEditAccountPayload() {
  return {
    username: document.getElementById('editAccountUsername').value.trim(),
    password: document.getElementById('editAccountPassword').value,
    gmLevel: parseInt(document.getElementById('editAccountGmLevel').value, 10),
    realmId: parseInt(document.getElementById('editAccountRealmId').value, 10),
  };
}

function setAccountEditStatus(message, type = '') {
  $accountEditStatus.textContent = message;
  $accountEditStatus.className = type ? `realm-status ${type}` : 'realm-status';
}

$btnUpdateAccountPassword.addEventListener('click', async () => {
  const payload = getEditAccountPayload();
  setAccountEditStatus('');
  $btnUpdateAccountPassword.disabled = true;

  try {
    const result = await window.api.setAccountPassword(payload);
    if (!result.success) {
      setAccountEditStatus(result.message, 'error');
      appendConsole(`[ACCOUNT] Password update failed for ${payload.username}: ${result.message}\n`);
      return;
    }

    document.getElementById('editAccountPassword').value = '';
    setAccountEditStatus('Password updated successfully.', 'success');
    appendConsole(`[ACCOUNT] Password updated for ${payload.username}.\n`);
  } catch (err) {
    setAccountEditStatus('Failed to update password: ' + err.message, 'error');
  } finally {
    $btnUpdateAccountPassword.disabled = false;
  }
});

$btnUpdateAccountGm.addEventListener('click', async () => {
  const payload = getEditAccountPayload();
  setAccountEditStatus('');
  $btnUpdateAccountGm.disabled = true;

  try {
    const result = await window.api.setAccountGmLevel(payload);
    if (!result.success) {
      setAccountEditStatus(result.message, 'error');
      appendConsole(`[ACCOUNT] Privilege update failed for ${payload.username}: ${result.message}\n`);
      return;
    }

    setAccountEditStatus('Privileges updated successfully.', 'success');
    appendConsole(`[ACCOUNT] GM level set to ${payload.gmLevel} for ${payload.username} on realm ${payload.realmId}.\n`);
  } catch (err) {
    setAccountEditStatus('Failed to update privileges: ' + err.message, 'error');
  } finally {
    $btnUpdateAccountGm.disabled = false;
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

async function refreshServerInfo() {
  try {
    const info = await window.api.getServerInfo();
    if (!info) {
      $playerNum.textContent = '--';
      $uptimeText.textContent = 'offline';
      return;
    }

    $playerNum.textContent = info.players;
    $uptimeText.textContent = formatUptime(info.uptime);
  } catch {
    $playerNum.textContent = '--';
    $uptimeText.textContent = 'error';
  }
}

window.api.onStatus((statuses) => {
  lastStatuses = statuses;
  renderCards(statuses);

  const ws = statuses.find(s => s.name === 'ac-worldserver');
  if (!ws || ws.state !== 'running') {
    $playerNum.textContent = '--';
    $uptimeText.textContent = 'offline';
  }
});

window.api.onServerInfo((info) => {
  $playerNum.textContent = info.players;
  $uptimeText.textContent = formatUptime(info.uptime);
});

window.api.onCrash((svc) => {
  const friendly = FRIENDLY_NAMES[svc.name] || svc.name;
  appendConsole(`[CRASH] ${friendly} has stopped unexpectedly!\n`);
});

window.api.onRecovery((svc) => {
  const friendly = FRIENDLY_NAMES[svc.name] || svc.name;
  appendConsole(`[RECOVERY] ${friendly} is running again.\n`);
});

// ── Modules tab ─────────────────────────────────────────────────────────────
const $moduleList   = document.getElementById('moduleList');
const $moduleReadme = document.getElementById('moduleReadme');

async function loadModules() {
  $moduleList.innerHTML = '<p style="color:var(--text-muted);padding:10px">Loading...</p>';

  try {
    const modules = await window.api.listModules();
    if (!modules || modules.length === 0) {
      $moduleList.innerHTML = '<p style="color:var(--text-muted);padding:10px">No modules found.</p>';
      return;
    }

    $moduleList.innerHTML = modules.map(m =>
      `<button class="modules-sidebar-item" data-dir="${m.dirName}">${m.displayName}</button>`
    ).join('');
  } catch (err) {
    $moduleList.innerHTML = `<p style="color:var(--red);padding:10px">Failed to load modules: ${err.message}</p>`;
  }
}

$moduleList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.modules-sidebar-item');
  if (!btn) return;

  // Highlight active item
  $moduleList.querySelectorAll('.modules-sidebar-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const dirName = btn.dataset.dir;
  $moduleReadme.innerHTML = '<p class="panel-hint">Loading...</p>';

  try {
    const result = await window.api.getModuleReadme(dirName);
    if (result.html) {
      $moduleReadme.innerHTML = `<div class="markdown-body">${result.html}</div>`;
    } else {
      $moduleReadme.innerHTML = '<p class="panel-hint">No README found for this module.</p>';
    }
  } catch (err) {
    $moduleReadme.innerHTML = `<p style="color:var(--red)">Failed to load README: ${err.message}</p>`;
  }
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

// ── Database Items ───────────────────────────────────────────────────────────
// Items state
const itemsState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  search: '',
  sortBy: 'entry',
  sortOrder: 'ASC',
  loading: false,
  editingItem: null
};

// WoW Item Class names
const ITEM_CLASS_NAMES = {
  0: 'Consumable', 1: 'Container', 2: 'Weapon', 3: 'Gem', 4: 'Armor',
  5: 'Reagent', 6: 'Projectile', 7: 'Trade Goods', 8: 'Generic',
  9: 'Recipe', 10: 'Money', 11: 'Quiver', 12: 'Quest', 13: 'Key',
  14: 'Permanent', 15: 'Miscellaneous'
};

// WoW Inventory Type names
const INV_TYPE_NAMES = {
  0: 'Non-Equip', 1: 'Head', 2: 'Neck', 3: 'Shoulder', 5: 'Chest',
  6: 'Waist', 7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands',
  11: 'Finger', 12: 'Trinket', 13: 'One-Hand', 14: 'Shield',
  15: 'Ranged', 16: 'Back', 17: 'Two-Hand', 21: 'Main Hand', 22: 'Off Hand'
};

async function loadItems() {
  if (itemsState.loading) return;

  itemsState.loading = true;
  $itemsStatus.textContent = '';
  $itemsList.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center">Loading items...</p>';

  try {
    const result = await window.api.getItems({
      search: itemsState.search,
      page: itemsState.page,
      pageSize: itemsState.pageSize,
      sortBy: itemsState.sortBy,
      sortOrder: itemsState.sortOrder
    });

    itemsState.items = result.items;
    itemsState.total = result.total;
    itemsState.totalPages = result.totalPages;

    renderItemsList();
    renderPagination();
  } catch (err) {
    $itemsList.innerHTML = `<p style="color:var(--red);padding:20px;text-align:center">Failed to load items: ${err.message}</p>`;
    $itemsStatus.textContent = 'Failed to load items: ' + err.message;
    $itemsStatus.className = 'realm-status error';
  } finally {
    itemsState.loading = false;
  }
}

function renderItemsList() {
  if (!itemsState.items || itemsState.items.length === 0) {
    $itemsList.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center">No items found.</p>';
    $itemsCountInfo.textContent = 'Showing 0-0 of 0 items';
    return;
  }

  const start = (itemsState.page - 1) * itemsState.pageSize + 1;
  const end = Math.min(start + itemsState.items.length - 1, itemsState.total);
  $itemsCountInfo.textContent = `Showing ${start}-${end} of ${itemsState.total} items`;

  $itemsList.innerHTML = itemsState.items.map(item => {
    const qualityClass = `quality-${item.Quality}`;
    const className = ITEM_CLASS_NAMES[item.class] || item.class;
    const invType = INV_TYPE_NAMES[item.InventoryType] || item.InventoryType;

    // Use generic icon based on item class - fallback to question mark
    const genericIcons = {
      0: 'inv_misc_food_01',         // Consumable
      1: 'inv_misc_bag_08',          // Container
      2: 'inv_sword_04',             // Weapon
      3: 'inv_misc_gem_diamond_01',  // Gem
      4: 'inv_chest_cloth_01',       // Armor
      5: 'inv_fabric_wool_01',       // Reagent
      6: 'inv_ammo_arrow_01',        // Projectile
      7: 'inv_ore_iron_01',          // Trade Goods
      8: 'inv_misc_book_02',         // Generic
      9: 'inv_scroll_02',            // Recipe
      10: 'inv_misc_coin_01',        // Money
      11: 'inv_misc_quiver_01',      // Quiver
      12: 'inv_misc_note_01',        // Quest
      13: 'inv_misc_key_01',         // Key
      15: 'inv_misc_enggizmos_01'    // Miscellaneous
    };
    const iconName = genericIcons[item.class] || 'inv_misc_questionmark';
    const iconUrl = `https://wow.zamimg.com/images/wow/icons/small/${iconName}.jpg`;
    const fallbackIcon = 'https://wow.zamimg.com/images/wow/icons/small/inv_misc_questionmark.jpg';

    return `
      <div class="item-card" data-entry="${item.entry}">
        <div class="item-card-left">
          <img class="item-icon" src="${iconUrl}" alt="${escapeHtml(item.name)}" onerror="this.src='${fallbackIcon}'" loading="lazy">
          <div>
            <div class="item-entry-row">
              <span class="item-entry">#${item.entry}</span>
              <button class="item-link-btn" data-action="wowhead" data-entry="${item.entry}" title="Open in Wowhead" aria-label="Open item #${item.entry} in Wowhead">
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div class="item-name ${qualityClass}">${escapeHtml(item.name)}</div>
            <div class="item-meta">
              <span>Lv${item.ItemLevel || 0}</span>
              <span>${className}</span>
              <span>${invType}</span>
            </div>
          </div>
        </div>
        <div class="item-card-actions">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-entry="${item.entry}">Edit</button>
          <button class="btn btn-stop btn-sm" data-action="delete" data-entry="${item.entry}">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function renderPagination() {
  if (itemsState.totalPages <= 1) {
    $itemsPagination.innerHTML = '';
    return;
  }

  let html = `
    <button class="btn btn-secondary btn-sm" data-page="first" ${itemsState.page === 1 ? 'disabled' : ''}>&laquo; First</button>
    <button class="btn btn-secondary btn-sm" data-page="prev" ${itemsState.page === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>
    <span class="pagination-info">Page ${itemsState.page} of ${itemsState.totalPages}</span>
    <button class="btn btn-secondary btn-sm" data-page="next" ${itemsState.page === itemsState.totalPages ? 'disabled' : ''}>Next &rsaquo;</button>
    <button class="btn btn-secondary btn-sm" data-page="last" ${itemsState.page === itemsState.totalPages ? 'disabled' : ''}>Last &raquo;</button>
  `;

  $itemsPagination.innerHTML = html;
}

// Search handlers
$btnItemsSearch.addEventListener('click', () => {
  itemsState.search = $itemsSearchInput.value.trim();
  itemsState.page = 1;
  loadItems();
});

$btnItemsClear.addEventListener('click', () => {
  $itemsSearchInput.value = '';
  itemsState.search = '';
  itemsState.page = 1;
  loadItems();
});

$itemsSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    itemsState.search = $itemsSearchInput.value.trim();
    itemsState.page = 1;
    loadItems();
  }
});

// Sort handler
$itemsSortSelect.addEventListener('change', () => {
  const [sortBy, sortOrder] = $itemsSortSelect.value.split('-');
  itemsState.sortBy = sortBy;
  itemsState.sortOrder = sortOrder;
  loadItems();
});

// Pagination handler
$itemsPagination.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-page]');
  if (!btn || btn.disabled) return;

  const page = btn.dataset.page;
  if (page === 'first') itemsState.page = 1;
  else if (page === 'prev') itemsState.page = Math.max(1, itemsState.page - 1);
  else if (page === 'next') itemsState.page = Math.min(itemsState.totalPages, itemsState.page + 1);
  else if (page === 'last') itemsState.page = itemsState.totalPages;

  loadItems();
});

// Items list actions (edit/delete)
$itemsList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const entry = parseInt(btn.dataset.entry, 10);

  if (action === 'edit') {
    await openEditModal(entry);
  } else if (action === 'delete') {
    await deleteItem(entry);
  } else if (action === 'wowhead') {
    await window.api.openExternal(`https://www.wowhead.com/item=${entry}`);
  }
});

// New Item button
$btnNewItem.addEventListener('click', () => {
  openCreateModal();
});

// ── Modal Functions ──────────────────────────────────────────────────────────
function openCreateModal() {
  itemsState.editingItem = null;
  $modalTitle.textContent = 'Create New Item';
  clearModalForm();
  document.getElementById('itemEntry').disabled = false;
  $modalOverlay.style.display = 'flex';
}

async function openEditModal(entry) {
  itemsState.editingItem = null;
  $modalTitle.textContent = 'Loading...';
  $modalOverlay.style.display = 'flex';
  clearModalForm();

  try {
    const item = await window.api.getItemByEntry(entry);
    if (!item) {
      $itemsStatus.textContent = 'Item not found.';
      $itemsStatus.className = 'realm-status error';
      $modalOverlay.style.display = 'none';
      return;
    }

    itemsState.editingItem = item;
    $modalTitle.textContent = 'Edit Item';
    populateModalForm(item);
    document.getElementById('itemEntry').disabled = true;
  } catch (err) {
    $itemsStatus.textContent = 'Failed to load item: ' + err.message;
    $itemsStatus.className = 'realm-status error';
    $modalOverlay.style.display = 'none';
  }
}

// Icon preview update function
function updateIconPreview(iconName) {
  const preview = document.getElementById('itemIconPreview');
  const fallbackIcon = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';

  if (!iconName) {
    preview.src = fallbackIcon;
    return;
  }

  const iconUrl = `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
  preview.src = iconUrl;
  preview.onerror = function() {
    this.src = fallbackIcon;
  };
}

function clearModalForm() {
  document.getElementById('itemEditForm').reset();
  updateIconPreview('');
}

function populateModalForm(item) {
  document.getElementById('itemEntry').value = item.entry || '';
  document.getElementById('itemName').value = item.name || '';
  document.getElementById('itemDisplayId').value = item.displayid || '';
  document.getElementById('itemQuality').value = item.Quality || 0;

  // Icon field
  const iconName = item.icon || '';
  document.getElementById('itemIcon').value = iconName;
  updateIconPreview(iconName);

  document.getElementById('itemInventoryType').value = item.InventoryType || 0;
  document.getElementById('itemFlags').value = item.Flags || 0;
  document.getElementById('itemMaxCount').value = item.MaxCount || 1;
  document.getElementById('itemStackable').value = item.stackable || 1;
  document.getElementById('itemItemLevel').value = item.ItemLevel || '';
  document.getElementById('itemRequiredLevel').value = item.RequiredLevel || '';
  document.getElementById('itemClass').value = item.class || 0;
  document.getElementById('itemSubclass').value = item.subclass || 0;
  document.getElementById('itemBuyPrice').value = item.BuyPrice || '';
  document.getElementById('itemSellPrice').value = item.SellPrice || '';
  document.getElementById('itemDescription').value = item.Description || '';
  document.getElementById('itemScriptName').value = item.ScriptName || '';

  // Stats
  document.getElementById('itemStatsCount').value = item.StatsCount || 0;
  document.getElementById('itemBonding').value = item.bonding || 0;
  document.getElementById('itemStatType1').value = item.stat_type1 || 0;
  document.getElementById('itemStatValue1').value = item.stat_value1 || 0;
  document.getElementById('itemStatType2').value = item.stat_type2 || 0;
  document.getElementById('itemStatValue2').value = item.stat_value2 || 0;
  document.getElementById('itemStatType3').value = item.stat_type3 || 0;
  document.getElementById('itemStatValue3').value = item.stat_value3 || 0;
  document.getElementById('itemStatType4').value = item.stat_type4 || 0;
  document.getElementById('itemStatValue4').value = item.stat_value4 || 0;
  document.getElementById('itemStatType5').value = item.stat_type5 || 0;
  document.getElementById('itemStatValue5').value = item.stat_value5 || 0;
  document.getElementById('itemStatType6').value = item.stat_type6 || 0;
  document.getElementById('itemStatValue6').value = item.stat_value6 || 0;
  document.getElementById('itemStatType7').value = item.stat_type7 || 0;
  document.getElementById('itemStatValue7').value = item.stat_value7 || 0;
  document.getElementById('itemStatType8').value = item.stat_type8 || 0;
  document.getElementById('itemStatValue8').value = item.stat_value8 || 0;
  document.getElementById('itemStatType9').value = item.stat_type9 || 0;
  document.getElementById('itemStatValue9').value = item.stat_value9 || 0;
  document.getElementById('itemStatType10').value = item.stat_type10 || 0;
  document.getElementById('itemStatValue10').value = item.stat_value10 || 0;

  // Resistances
  document.getElementById('itemHolyRes').value = item.holy_res || 0;
  document.getElementById('itemFireRes').value = item.fire_res || 0;
  document.getElementById('itemNatureRes').value = item.nature_res || 0;
  document.getElementById('itemFrostRes').value = item.frost_res || 0;
  document.getElementById('itemShadowRes').value = item.shadow_res || 0;
  document.getElementById('itemArcaneRes').value = item.arcane_res || 0;

  // Armor & Damage
  document.getElementById('itemArmor').value = item.armor || 0;
  document.getElementById('itemMaxDurability').value = item.MaxDurability || 0;
  document.getElementById('itemDmgMin1').value = item.dmg_min1 || 0;
  document.getElementById('itemDmgMax1').value = item.dmg_max1 || 0;
  document.getElementById('itemDmgType1').value = item.dmg_type1 || 0;
  document.getElementById('itemDelay').value = item.delay || 0;
  document.getElementById('itemDmgMin2').value = item.dmg_min2 || 0;
  document.getElementById('itemDmgMax2').value = item.dmg_max2 || 0;
  document.getElementById('itemDmgType2').value = item.dmg_type2 || 0;
  document.getElementById('itemAmmoType').value = item.ammo_type || 0;

  // Material & Sheath
  document.getElementById('itemMaterial').value = item.Material || 0;
  document.getElementById('itemSheath').value = item.Sheath || 0;

  // Spells
  document.getElementById('itemSpellId1').value = item.spellid_1 || 0;
  document.getElementById('itemSpellTrigger1').value = item.spelltrigger_1 || 0;
  document.getElementById('itemSpellCharges1').value = item.spellcharges_1 || 0;
  document.getElementById('itemSpellId2').value = item.spellid_2 || 0;
  document.getElementById('itemSpellTrigger2').value = item.spelltrigger_2 || 0;
  document.getElementById('itemSpellCharges2').value = item.spellcharges_2 || 0;
  document.getElementById('itemSpellId3').value = item.spellid_3 || 0;
  document.getElementById('itemSpellTrigger3').value = item.spelltrigger_3 || 0;
  document.getElementById('itemSpellCharges3').value = item.spellcharges_3 || 0;
  document.getElementById('itemSpellId4').value = item.spellid_4 || 0;
  document.getElementById('itemSpellTrigger4').value = item.spelltrigger_4 || 0;
  document.getElementById('itemSpellCharges4').value = item.spellcharges_4 || 0;
  document.getElementById('itemSpellId5').value = item.spellid_5 || 0;
  document.getElementById('itemSpellTrigger5').value = item.spelltrigger_5 || 0;
  document.getElementById('itemSpellCharges5').value = item.spellcharges_5 || 0;

  // Container & Quest
  document.getElementById('itemContainerId').value = item.Container || 0;
  document.getElementById('itemStartQuest').value = item.startquest || 0;
  document.getElementById('itemLockId').value = item.lockid || 0;
  document.getElementById('itemItemSet').value = item.itemset || 0;
  document.getElementById('itemRandomProperty').value = item.RandomProperty || 0;
  document.getElementById('itemRandomSuffix').value = item.RandomSuffix || 0;
  document.getElementById('itemBagFamily').value = item.BagFamily || 0;
  document.getElementById('itemItemLimitCategory').value = item.ItemLimitCategoryId || 0;
  document.getElementById('itemHolidayId').value = item.HolidayId || 0;
  document.getElementById('itemDisenchantId').value = item.DisenchantID || 0;
  document.getElementById('itemFoodType').value = item.FoodType || 0;
  document.getElementById('itemMinMoneyLoot').value = item.minMoneyLoot || 0;
  document.getElementById('itemMaxMoneyLoot').value = item.maxMoneyLoot || 0;
  document.getElementById('itemDuration').value = item.Duration || 0;
  document.getElementById('itemRangedModRange').value = item.RangedModRange || 0;
  document.getElementById('itemZone').value = item.Zone || 0;
}

function getModalFormData() {
  return {
    entry: parseInt(document.getElementById('itemEntry').value, 10),
    name: document.getElementById('itemName').value.trim(),
    icon: document.getElementById('itemIcon').value.trim(),
    displayid: parseInt(document.getElementById('itemDisplayId').value, 10) || 0,
    Quality: parseInt(document.getElementById('itemQuality').value, 10),
    InventoryType: parseInt(document.getElementById('itemInventoryType').value, 10),
    Flags: parseInt(document.getElementById('itemFlags').value, 10) || 0,
    MaxCount: parseInt(document.getElementById('itemMaxCount').value, 10) || 1,
    stackable: parseInt(document.getElementById('itemStackable').value, 10) || 1,
    ItemLevel: parseInt(document.getElementById('itemItemLevel').value, 10) || 0,
    RequiredLevel: parseInt(document.getElementById('itemRequiredLevel').value, 10) || 0,
    class: parseInt(document.getElementById('itemClass').value, 10),
    subclass: parseInt(document.getElementById('itemSubclass').value, 10) || 0,
    BuyPrice: parseInt(document.getElementById('itemBuyPrice').value, 10) || 0,
    SellPrice: parseInt(document.getElementById('itemSellPrice').value, 10) || 0,
    Description: document.getElementById('itemDescription').value.trim(),
    ScriptName: document.getElementById('itemScriptName').value.trim(),
    // Stats
    StatsCount: parseInt(document.getElementById('itemStatsCount').value, 10) || 0,
    bonding: parseInt(document.getElementById('itemBonding').value, 10) || 0,
    stat_type1: parseInt(document.getElementById('itemStatType1').value, 10) || 0,
    stat_value1: parseInt(document.getElementById('itemStatValue1').value, 10) || 0,
    stat_type2: parseInt(document.getElementById('itemStatType2').value, 10) || 0,
    stat_value2: parseInt(document.getElementById('itemStatValue2').value, 10) || 0,
    stat_type3: parseInt(document.getElementById('itemStatType3').value, 10) || 0,
    stat_value3: parseInt(document.getElementById('itemStatValue3').value, 10) || 0,
    stat_type4: parseInt(document.getElementById('itemStatType4').value, 10) || 0,
    stat_value4: parseInt(document.getElementById('itemStatValue4').value, 10) || 0,
    stat_type5: parseInt(document.getElementById('itemStatType5').value, 10) || 0,
    stat_value5: parseInt(document.getElementById('itemStatValue5').value, 10) || 0,
    stat_type6: parseInt(document.getElementById('itemStatType6').value, 10) || 0,
    stat_value6: parseInt(document.getElementById('itemStatValue6').value, 10) || 0,
    stat_type7: parseInt(document.getElementById('itemStatType7').value, 10) || 0,
    stat_value7: parseInt(document.getElementById('itemStatValue7').value, 10) || 0,
    stat_type8: parseInt(document.getElementById('itemStatType8').value, 10) || 0,
    stat_value8: parseInt(document.getElementById('itemStatValue8').value, 10) || 0,
    stat_type9: parseInt(document.getElementById('itemStatType9').value, 10) || 0,
    stat_value9: parseInt(document.getElementById('itemStatValue9').value, 10) || 0,
    stat_type10: parseInt(document.getElementById('itemStatType10').value, 10) || 0,
    stat_value10: parseInt(document.getElementById('itemStatValue10').value, 10) || 0,
    // Resistances
    holy_res: parseInt(document.getElementById('itemHolyRes').value, 10) || 0,
    fire_res: parseInt(document.getElementById('itemFireRes').value, 10) || 0,
    nature_res: parseInt(document.getElementById('itemNatureRes').value, 10) || 0,
    frost_res: parseInt(document.getElementById('itemFrostRes').value, 10) || 0,
    shadow_res: parseInt(document.getElementById('itemShadowRes').value, 10) || 0,
    arcane_res: parseInt(document.getElementById('itemArcaneRes').value, 10) || 0,
    // Armor & Damage
    armor: parseInt(document.getElementById('itemArmor').value, 10) || 0,
    MaxDurability: parseInt(document.getElementById('itemMaxDurability').value, 10) || 0,
    dmg_min1: parseInt(document.getElementById('itemDmgMin1').value, 10) || 0,
    dmg_max1: parseInt(document.getElementById('itemDmgMax1').value, 10) || 0,
    dmg_type1: parseInt(document.getElementById('itemDmgType1').value, 10) || 0,
    delay: parseInt(document.getElementById('itemDelay').value, 10) || 0,
    dmg_min2: parseInt(document.getElementById('itemDmgMin2').value, 10) || 0,
    dmg_max2: parseInt(document.getElementById('itemDmgMax2').value, 10) || 0,
    dmg_type2: parseInt(document.getElementById('itemDmgType2').value, 10) || 0,
    ammo_type: parseInt(document.getElementById('itemAmmoType').value, 10) || 0,
    // Material & Sheath
    Material: parseInt(document.getElementById('itemMaterial').value, 10) || 0,
    Sheath: parseInt(document.getElementById('itemSheath').value, 10) || 0,
    // Spells
    spellid_1: parseInt(document.getElementById('itemSpellId1').value, 10) || 0,
    spelltrigger_1: parseInt(document.getElementById('itemSpellTrigger1').value, 10) || 0,
    spellcharges_1: parseInt(document.getElementById('itemSpellCharges1').value, 10) || 0,
    spellid_2: parseInt(document.getElementById('itemSpellId2').value, 10) || 0,
    spelltrigger_2: parseInt(document.getElementById('itemSpellTrigger2').value, 10) || 0,
    spellcharges_2: parseInt(document.getElementById('itemSpellCharges2').value, 10) || 0,
    spellid_3: parseInt(document.getElementById('itemSpellId3').value, 10) || 0,
    spelltrigger_3: parseInt(document.getElementById('itemSpellTrigger3').value, 10) || 0,
    spellcharges_3: parseInt(document.getElementById('itemSpellCharges3').value, 10) || 0,
    spellid_4: parseInt(document.getElementById('itemSpellId4').value, 10) || 0,
    spelltrigger_4: parseInt(document.getElementById('itemSpellTrigger4').value, 10) || 0,
    spellcharges_4: parseInt(document.getElementById('itemSpellCharges4').value, 10) || 0,
    spellid_5: parseInt(document.getElementById('itemSpellId5').value, 10) || 0,
    spelltrigger_5: parseInt(document.getElementById('itemSpellTrigger5').value, 10) || 0,
    spellcharges_5: parseInt(document.getElementById('itemSpellCharges5').value, 10) || 0,
    // Container & Quest
    Container: parseInt(document.getElementById('itemContainerId').value, 10) || 0,
    startquest: parseInt(document.getElementById('itemStartQuest').value, 10) || 0,
    lockid: parseInt(document.getElementById('itemLockId').value, 10) || 0,
    itemset: parseInt(document.getElementById('itemItemSet').value, 10) || 0,
    RandomProperty: parseInt(document.getElementById('itemRandomProperty').value, 10) || 0,
    RandomSuffix: parseInt(document.getElementById('itemRandomSuffix').value, 10) || 0,
    BagFamily: parseInt(document.getElementById('itemBagFamily').value, 10) || 0,
    ItemLimitCategoryId: parseInt(document.getElementById('itemItemLimitCategory').value, 10) || 0,
    HolidayId: parseInt(document.getElementById('itemHolidayId').value, 10) || 0,
    DisenchantID: parseInt(document.getElementById('itemDisenchantId').value, 10) || 0,
    FoodType: parseInt(document.getElementById('itemFoodType').value, 10) || 0,
    minMoneyLoot: parseInt(document.getElementById('itemMinMoneyLoot').value, 10) || 0,
    maxMoneyLoot: parseInt(document.getElementById('itemMaxMoneyLoot').value, 10) || 0,
    Duration: parseInt(document.getElementById('itemDuration').value, 10) || 0,
    RangedModRange: parseInt(document.getElementById('itemRangedModRange').value, 10) || 0,
    Zone: parseInt(document.getElementById('itemZone').value, 10) || 0
  };
}

// Icon input change handler - update preview in real-time
document.getElementById('itemIcon').addEventListener('input', (e) => {
  updateIconPreview(e.target.value.trim());
});

// Modal close handlers
$btnCloseModal.addEventListener('click', closeModal);
$btnModalCancel.addEventListener('click', closeModal);

function closeModal() {
  $modalOverlay.style.display = 'none';
  itemsState.editingItem = null;
}

// Close modal on overlay click
$modalOverlay.addEventListener('click', (e) => {
  if (e.target === $modalOverlay) {
    closeModal();
  }
});

// Save item handler
$btnModalSave.addEventListener('click', async () => {
  const formData = getModalFormData();

  // Basic validation
  if (!formData.name) {
    alert('Item name is required.');
    return;
  }
  if (isNaN(formData.entry)) {
    alert('Entry ID is required.');
    return;
  }

  try {
    if (itemsState.editingItem) {
      // Update existing item
      const { entry, ...fields } = formData;
      await window.api.updateItem(entry, fields);
      $itemsStatus.textContent = 'Item updated successfully.';
      $itemsStatus.className = 'realm-status success';
    } else {
      // Create new item
      await window.api.createItem(formData);
      $itemsStatus.textContent = 'Item created successfully.';
      $itemsStatus.className = 'realm-status success';
    }

    closeModal();
    loadItems();
  } catch (err) {
    alert('Failed to save item: ' + err.message);
  }
});

// Delete item handler
async function deleteItem(entry) {
  if (!confirm(`Are you sure you want to delete item #${entry}? This action cannot be undone.`)) {
    return;
  }

  try {
    await window.api.deleteItem(entry);
    $itemsStatus.textContent = 'Item deleted successfully.';
    $itemsStatus.className = 'realm-status success';
    loadItems();
  } catch (err) {
    alert('Failed to delete item: ' + err.message);
  }
}

// ── Initial load ─────────────────────────────────────────────────────────────
(async () => {
  // Display app version
  try {
    const version = await window.api.getAppVersion();
    document.getElementById('appVersion').textContent = 'v' + version;
  } catch {}

  try {
    const statuses = await window.api.getStatuses();
    lastStatuses = statuses;
    renderCards(statuses);
    const ws = statuses.find(s => s.name === 'ac-worldserver');
    if (ws && ws.state === 'running') {
      await refreshServerInfo();
    } else {
      $playerNum.textContent = '--';
      $uptimeText.textContent = 'offline';
    }
  } catch {
    $cards.innerHTML = '<p style="color:var(--red)">Failed to fetch service statuses.</p>';
  }
})();

// ── Auto-update ──────────────────────────────────────────────────────────────
const $updateBanner = document.getElementById('updateBanner');
const $updateText = document.getElementById('updateText');
const $updateProgress = document.getElementById('updateProgress');
const $progressFill = document.getElementById('progressFill');
const $progressText = document.getElementById('progressText');
const $btnInstallUpdate = document.getElementById('btnInstallUpdate');
const $btnDismissUpdate = document.getElementById('btnDismissUpdate');

let currentVersion = '--';

// Store current version for update messages
(async () => {
  try {
    currentVersion = await window.api.getAppVersion();
  } catch {}
})();

function showUpdateBanner(message, canInstall = false) {
  $updateText.textContent = message;
  $updateBanner.style.display = 'block';
  $btnInstallUpdate.style.display = canInstall ? 'inline-block' : 'none';
}

function hideUpdateBanner() {
  $updateBanner.style.display = 'none';
}

function showDownloadProgress(progress) {
  $updateProgress.style.display = 'block';
  const percent = Math.round(progress.percent);
  $progressFill.style.width = percent + '%';
  $progressText.textContent = `Downloading... ${percent}% (${Math.round(progress.transferred / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`;
}

function hideDownloadProgress() {
  $updateProgress.style.display = 'none';
}

// Update event listeners
window.api.onUpdateChecking(() => {
  console.log('Checking for updates...');
});

window.api.onUpdateAvailable((info) => {
  showUpdateBanner(`Update available: v${currentVersion} → v${info.version}`, false);
});

window.api.onUpdateNotAvailable(() => {
  console.log('No updates available');
});

window.api.onUpdateProgress((progress) => {
  showDownloadProgress(progress);
});

window.api.onUpdateDownloaded((info) => {
  hideDownloadProgress();
  showUpdateBanner(`v${info.version} ready to install! (currently v${currentVersion})`, true);
});

window.api.onUpdateError((err) => {
  console.error('Update error:', err);
  hideDownloadProgress();
  hideUpdateBanner();
});

// Install update button
$btnInstallUpdate.addEventListener('click', () => {
  window.api.installUpdate();
});

// Dismiss update button
$btnDismissUpdate.addEventListener('click', () => {
  hideUpdateBanner();
});
