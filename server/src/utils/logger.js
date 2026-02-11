/**
 * Simple logging utility for the game server
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
  }

  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  info(message, data) {
    this._log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data) {
    this._log(LOG_LEVELS.WARN, message, data);
  }

  error(message, data) {
    this._log(LOG_LEVELS.ERROR, message, data);
  }

  debug(message, data) {
    if (this.level === LOG_LEVELS.DEBUG) {
      this._log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export default new Logger();
