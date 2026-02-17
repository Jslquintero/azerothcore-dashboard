const { EventEmitter } = require('events');
const docker = require('./docker');
const soap = require('./soap');

class Monitor extends EventEmitter {
  constructor() {
    super();
    this._interval = null;
    this._autoRestart = false;
    this._lastStatuses = [];
    this._pollMs = 5000;
  }

  start() {
    if (this._interval) return;
    this._poll();
    this._interval = setInterval(() => this._poll(), this._pollMs);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  setAutoRestart(enabled) {
    this._autoRestart = enabled;
  }

  getAutoRestart() {
    return this._autoRestart;
  }

  async _poll() {
    try {
      const statuses = await docker.getServiceStatuses();
      const prev = this._lastStatuses;

      for (const svc of statuses) {
        const old = prev.find(s => s.name === svc.name);

        // Detect crash: was running, now exited
        if (old && old.state === 'running' && svc.state === 'exited') {
          this.emit('crash', svc);
          if (this._autoRestart) {
            try {
              await docker.startService(svc.name);
              this.emit('auto-restart', svc);
            } catch (err) {
              this.emit('restart-failed', { service: svc, error: err.message });
            }
          }
        }

        // Detect recovery: was not running, now running
        if (old && old.state !== 'running' && svc.state === 'running') {
          this.emit('recovery', svc);
        }
      }

      this._lastStatuses = statuses;
      this.emit('status', statuses);

      // Also fetch server info if worldserver is running
      const ws = statuses.find(s => s.name === 'ac-worldserver');
      if (ws && ws.state === 'running') {
        const info = await soap.getServerInfo();
        if (info) this.emit('server-info', info);
      }
    } catch (err) {
      this.emit('error', err.message);
    }
  }
}

module.exports = new Monitor();
