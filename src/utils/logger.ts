/**
 * Phase 11.12 K1 — environment-aware logging.
 *
 * THE DEFECT. The independent audit recorded 3,380+ console messages in a
 * single normal portal session, including API request/response lines and
 * full Redux action payloads. Two things combined to produce that:
 *
 *   1. `debug` was suppressed only when NODE_ENV === 'production'. Any
 *      other environment — a staging build, a preview deploy, a dev
 *      tunnel — got the full firehose.
 *   2. Every logger call forwarded its `data` argument to the console
 *      verbatim, so "log the action" and "dump the entire API response
 *      body into devtools" were the same operation.
 *
 * (2) is the part that actually matters. Permit and contractor payloads
 * carry contact details and business identifiers; a captured console log
 * is a copy of them sitting in a browser the operator may not control.
 *
 * THE RULE NOW.
 *
 *   • Level is resolved once, from an explicit NEXT_PUBLIC_LOG_LEVEL when
 *     set, otherwise from NODE_ENV with a QUIET default. Anything that is
 *     not development must opt IN to verbosity; it is never the fallback.
 *   • `data` is only ever rendered when payload logging is explicitly
 *     enabled, which outside development requires setting
 *     NEXT_PUBLIC_LOG_PAYLOADS=true by hand. At warn/error level the
 *     message still carries a redaction marker so a reader can tell
 *     something was withheld rather than assume there was nothing.
 *   • warn and error always emit. Silencing real failures to hit a log
 *     budget would trade one observability problem for a worse one.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const VALID_LEVELS: readonly string[] = ['debug', 'info', 'warn', 'error'];

function resolveMinLevel(): LogLevel {
  const explicit = process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase();
  if (explicit && VALID_LEVELS.includes(explicit)) return explicit as LogLevel;
  // Default by environment. Note the staging/preview case falls here and
  // lands on 'warn' — that is the whole point of the change.
  return process.env.NODE_ENV === 'development' ? 'debug' : 'warn';
}

function resolvePayloadLogging(minLevel: LogLevel): boolean {
  const explicit = process.env.NEXT_PUBLIC_LOG_PAYLOADS?.toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  // Payload dumps ride along with development's debug level and nowhere
  // else. A staging operator who genuinely needs them has to say so.
  return process.env.NODE_ENV === 'development' && minLevel === 'debug';
}

class Logger {
  private readonly minLevel: LogLevel;
  private readonly payloadsEnabled: boolean;
  private readonly isDevelopment: boolean;

  constructor() {
    this.minLevel = resolveMinLevel();
    this.payloadsEnabled = resolvePayloadLogging(this.minLevel);
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /** Exposed so callers can skip building an expensive payload that would
   *  only be discarded — `if (logger.payloadLoggingEnabled) { ... }`. */
  get payloadLoggingEnabled(): boolean {
    return this.payloadsEnabled;
  }

  private enabled(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string) {
    if (!this.enabled(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const hasData = data !== undefined && data !== null;
    const showData = hasData && this.payloadsEnabled;
    // Tell the reader something was withheld rather than let a bare
    // message imply there was no detail to begin with.
    const suffix = hasData && !showData ? ' [payload omitted]' : '';

    const isServer = typeof window === 'undefined';
    if (isServer) {
      if (showData) console.log(formattedMessage, JSON.stringify(data, null, 2));
      else console.log(formattedMessage + suffix);
      return;
    }

    const styles: Record<LogLevel, string> = {
      info: 'color: #0ea5e9; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      debug: 'color: #737373; font-weight: bold;',
    };

    // The collapsed group is a development affordance; elsewhere a single
    // flat line is both cheaper and easier to grep out of a bug report.
    if (this.isDevelopment && showData) {
      console.groupCollapsed(`%c${formattedMessage}`, styles[level]);
      console.log('Data:', data);
      console.groupEnd();
      return;
    }

    const emit = level === 'debug' ? console.log : console[level];
    if (showData) emit(formattedMessage, data);
    else emit(formattedMessage + suffix);
  }

  info(message: string, data?: unknown, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: unknown, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: unknown, context?: string) {
    this.log('error', message, data, context);
  }

  debug(message: string, data?: unknown, context?: string) {
    this.log('debug', message, data, context);
  }
}

export const logger = new Logger();
