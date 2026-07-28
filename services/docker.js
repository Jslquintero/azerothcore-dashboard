const { execFile, spawn } = require('child_process');

const SERVICES = ['ac-database', 'ac-worldserver', 'ac-authserver'];

function getProjectRoot() {
  return process.env.AC_PROJECT_ROOT || '';
}

function dockerCompose(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const cwd = getProjectRoot();
    if (!cwd) return reject(new Error('AC_PROJECT_ROOT is not set'));

    const child = execFile(
      'docker',
      ['compose', ...args],
      { cwd, timeout: 120000, ...opts },
      (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(stdout.trim());
      }
    );
  });
}

async function getServiceStatuses() {
  const raw = await dockerCompose(['ps', '--format', 'json', '-a']);
  if (!raw) return [];

  // docker compose ps --format json outputs one JSON object per line
  const lines = raw.split('\n').filter(Boolean);
  const containers = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  return SERVICES.map(name => {
    const c = containers.find(
      ct => ct.Service === name || ct.Name === name
    );
    if (!c) return { name, state: 'not found', status: '', health: '' };
    return {
      name,
      state: c.State || 'unknown',
      status: c.Status || '',
      health: c.Health || '',
    };
  });
}

function statusToUptime(status = '') {
  const match = String(status).match(/\bUp\s+(.+?)(?:\s+\(|$)/i);
  return match ? match[1].trim() : 'running';
}

function getLogs(serviceName, tail = 200) {
  return dockerCompose(['logs', '--tail', String(tail), serviceName]);
}

function parseWorldserverLogMetrics(logText = '') {
  const plain = String(logText).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  const playerMatches = [...plain.matchAll(/with\s+(\d+)\s+players?\s+online/i)];
  const botMatches = [...plain.matchAll(/Random\s+Bots\s+Stats:\s*(\d+)\s+online/i)];

  const latestPlayers = playerMatches.length
    ? parseInt(playerMatches[playerMatches.length - 1][1], 10)
    : null;
  const latestBots = botMatches.length
    ? parseInt(botMatches[botMatches.length - 1][1], 10)
    : null;

  return {
    players: latestPlayers,
    bots: latestBots,
  };
}

async function getWorldserverFallbackInfo(status) {
  const ws = status || (await getServiceStatuses()).find(s => s.name === 'ac-worldserver');
  if (!ws || ws.state !== 'running') return null;

  let logMetrics = { players: null, bots: null };
  try {
    logMetrics = parseWorldserverLogMetrics(await getLogs('ac-worldserver', 250));
  } catch {}

  return {
    raw: ws.status || '',
    uptime: statusToUptime(ws.status),
    players: logMetrics.players ?? 0,
    characters: 0,
    bots: logMetrics.bots,
    source: 'docker',
  };
}

async function startService(name) {
  return dockerCompose(['up', '-d', name]);
}

async function stopService(name) {
  return dockerCompose(['stop', name]);
}

async function restartService(name) {
  // Stop then recreate — handles both existing and removed containers
  await dockerCompose(['stop', name]).catch(() => {});
  return dockerCompose(['up', '-d', name]);
}

async function startAll() {
  return dockerCompose(['up', '-d', ...SERVICES]);
}

async function stopAll() {
  return dockerCompose(['stop', ...SERVICES]);
}

function streamLogs(serviceName, onData, onError) {
  const cwd = getProjectRoot();
  if (!cwd) {
    onError('AC_PROJECT_ROOT is not set');
    return null;
  }

  const child = spawn('docker', ['compose', 'logs', '-f', '--tail', '100', serviceName], {
    cwd,
  });

  child.stdout.on('data', chunk => onData(chunk.toString()));
  child.stderr.on('data', chunk => onData(chunk.toString()));
  child.on('error', err => onError(err.message));

  return child;
}

module.exports = {
  SERVICES,
  getServiceStatuses,
  startService,
  stopService,
  restartService,
  startAll,
  stopAll,
  streamLogs,
  getWorldserverFallbackInfo,
  parseWorldserverLogMetrics,
  statusToUptime,
};
