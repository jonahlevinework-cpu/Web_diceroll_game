/**
 * Simple logging utility for the game server
 */

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private _log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  info(message: string, data?: any): void {
    this._log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this._log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this._log(LogLevel.ERROR, message, data);
  }

  debug(message: string, data?: any): void {
    if (this.level === LogLevel.DEBUG) {
      this._log(LogLevel.DEBUG, message, data);
    }
  }
}

export default new Logger();
