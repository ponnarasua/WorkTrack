/**
 * Frontend Logger Utility
 * Provides centralized logging with environment-aware behavior
 * In development: logs to console
 * In production: suppresses logs (can be extended to send to error tracking service)
 */

const isDevelopment = import.meta.env.DEV;

const logger = {
  /**
   * Log informational messages
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  info: (message, data) => {
    if (isDevelopment) {
      if (data !== undefined) {
        console.log(`[INFO] ${message}`, data);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
    // In production, could send to analytics service
  },

  /**
   * Log error messages
   * @param {string} message - The error message
   * @param {any} error - The error object or additional data
   */
  error: (message, error) => {
    if (isDevelopment) {
      if (error !== undefined) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
    // In production, send to error tracking service like Sentry
    // Example: Sentry.captureException(error);
  },

  /**
   * Log warning messages
   * @param {string} message - The warning message
   * @param {any} data - Optional data to log
   */
  warn: (message, data) => {
    if (isDevelopment) {
      if (data !== undefined) {
        console.warn(`[WARN] ${message}`, data);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
    // In production, could send to monitoring service
  },

  /**
   * Log debug messages (only in development)
   * @param {string} message - The debug message
   * @param {any} data - Optional data to log
   */
  debug: (message, data) => {
    if (isDevelopment) {
      if (data !== undefined) {
        console.debug(`[DEBUG] ${message}`, data);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }
};

export default logger;
