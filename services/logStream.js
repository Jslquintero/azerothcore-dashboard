const docker = require('./docker');

class LogStreamManager {
  constructor() {
    this._active = null; // child process
    this._serviceName = null;
  }

  start(serviceName, onData, onError) {
    this.stop();
    this._serviceName = serviceName;
    this._active = docker.streamLogs(serviceName, onData, onError);
    return this._active;
  }

  stop() {
    if (this._active) {
      this._active.kill();
      this._active = null;
      this._serviceName = null;
    }
  }

  getActiveService() {
    return this._serviceName;
  }
}

module.exports = new LogStreamManager();
