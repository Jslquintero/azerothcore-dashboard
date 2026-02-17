const { execFile, spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = process.env.AC_PROJECT_ROOT;

const SERVICES = ['ac-database', 'ac-worldserver', 'ac-authserver'];

function dockerCompose(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'docker',
      ['compose', ...args],
      { cwd: PROJECT_ROOT, timeout: 120000, ...opts },
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
  const child = spawn('docker', ['compose', 'logs', '-f', '--tail', '100', serviceName], {
    cwd: PROJECT_ROOT,
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
};
