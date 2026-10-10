/**
 * Lightweight structured logger for tests and helpers.
 *
 *   import { logger } from '@utils/logger';
 *   logger.info('test:start', { suite: 'markets' });
 *
 * Honours LOG_LEVEL env var (trace|debug|info|warn|error). Default: info.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const ENABLED_LEVEL: LogLevel = (() => {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  if (raw in LEVEL_ORDER) return raw;
  return 'info';
})();

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[ENABLED_LEVEL];
}

function emit(level: LogLevel, event: string, fields?: Record<string, unknown>): void {
  if (!shouldEmit(level)) return;
  const line = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(fields ?? {}),
  };
  const serialized = JSON.stringify(line);
  if (level === 'error') {
    process.stderr.write(serialized + '\n');
    return;
  }
  process.stdout.write(serialized + '\n');
}

export const logger = Object.freeze({
  trace: (event: string, fields?: Record<string, unknown>) => emit('trace', event, fields),
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),
  child(scope: string) {
    const prefix = `${scope}:`;
    return {
      trace: (event: string, fields?: Record<string, unknown>) =>
        emit('trace', `${prefix}${event}`, fields),
      debug: (event: string, fields?: Record<string, unknown>) =>
        emit('debug', `${prefix}${event}`, fields),
      info: (event: string, fields?: Record<string, unknown>) =>
        emit('info', `${prefix}${event}`, fields),
      warn: (event: string, fields?: Record<string, unknown>) =>
        emit('warn', `${prefix}${event}`, fields),
      error: (event: string, fields?: Record<string, unknown>) =>
        emit('error', `${prefix}${event}`, fields),
    };
  },
});
