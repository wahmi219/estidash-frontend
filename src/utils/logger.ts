type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private formatMessage(level: LogLevel, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    // In production, suppress debug logs
    if (!this.isDevelopment && level === 'debug') return;

    const formattedMessage = this.formatMessage(level, message, context);
    
    // Server-side logging (Node.js) vs Client-side logging (Browser)
    const isServer = typeof window === 'undefined';

    if (isServer) {
        // Node.js logging
        if (data) {
            console.log(formattedMessage, JSON.stringify(data, null, 2));
        } else {
            console.log(formattedMessage);
        }
        return;
    }

    // Browser logging
    const styles = {
      info: 'color: #0ea5e9; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      debug: 'color: #737373; font-weight: bold;',
    };

    if (this.isDevelopment) {
      console.groupCollapsed(`%c${formattedMessage}`, styles[level]);
      if (data) {
        console.log('Data:', data);
      }
      // console.trace('Stack Trace'); // Optional: can be noisy
      console.groupEnd();
    } else {
      if (data) {
        console[level](formattedMessage, data);
      } else {
        console[level](formattedMessage);
      }
    }
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context);
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context);
  }
}

export const logger = new Logger();
