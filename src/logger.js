const levels = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = 'info') {
  const threshold = levels[level] ?? 20;
  function log(lvl, ...args) {
    if ((levels[lvl] ?? 20) < threshold) return;
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${lvl.toUpperCase()}`, ...args);
  }
  return {
    debug: (...a) => log('debug', ...a),
    info: (...a) => log('info', ...a),
    warn: (...a) => log('warn', ...a),
    error: (...a) => log('error', ...a),
  };
}
