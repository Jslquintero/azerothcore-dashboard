const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

const DEFAULTS = {
  acProjectRoot: '',
  soapHost: '127.0.0.1',
  soapPort: '7878',
  soapUser: 'soap',
  soapPass: 'soap',
  dbHost: '127.0.0.1',
  dbPort: '3306',
  dbUser: 'root',
  dbPass: 'password',
};

let _cache = null;

function load() {
  if (_cache) return _cache;

  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    _cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    _cache = null;
  }
  return _cache;
}

function save(settings) {
  const merged = { ...DEFAULTS, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  _cache = merged;

  // Push settings into process.env so services pick them up
  applyToEnv(merged);

  return merged;
}

function exists() {
  return fs.existsSync(SETTINGS_FILE);
}

function get(key) {
  const s = load();
  return s ? s[key] : DEFAULTS[key];
}

function getAll() {
  return load() || { ...DEFAULTS };
}

function applyToEnv(settings) {
  if (!settings) return;
  process.env.AC_PROJECT_ROOT = settings.acProjectRoot;
  process.env.SOAP_HOST = settings.soapHost;
  process.env.SOAP_PORT = settings.soapPort;
  process.env.SOAP_USER = settings.soapUser;
  process.env.SOAP_PASS = settings.soapPass;
  process.env.DB_HOST = settings.dbHost;
  process.env.DB_PORT = settings.dbPort;
  process.env.DB_USER = settings.dbUser;
  process.env.DB_PASS = settings.dbPass;
}

function init() {
  const s = load();
  if (s) applyToEnv(s);
  return !!s;
}

module.exports = { load, save, exists, get, getAll, init, DEFAULTS };
