export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

class StructuredLogger {
  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'production' && level === LogLevel.DEBUG) {
      return;
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };
    
    if (process.env.NODE_ENV !== 'production' || level === LogLevel.ERROR) {
       console[level === LogLevel.DEBUG ? 'log' : level](JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }
  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }
  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }
  error(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context);
  }
}

export const logger = new StructuredLogger();
