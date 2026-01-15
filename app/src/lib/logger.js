const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR

export const logger = {
  error: (msg, data) => currentLevel >= LOG_LEVELS.ERROR && console.error(`[ERROR] ${msg}`, data),
  warn: (msg, data) => currentLevel >= LOG_LEVELS.WARN && console.warn(`[WARN] ${msg}`, data),
  info: (msg, data) => currentLevel >= LOG_LEVELS.INFO && console.log(`[INFO] ${msg}`, data),
  debug: (msg, data) => currentLevel >= LOG_LEVELS.DEBUG && console.log(`[DEBUG] ${msg}`, data)
}
