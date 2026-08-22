import { ILogger } from '../../application/contracts/ILogger.js';

/** Niveles ordenados por severidad. */
const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });

/**
 * ConsoleLogger — ADAPTADOR de `ILogger` sobre la consola del navegador.
 *
 * Filtra por nivel mínimo, de modo que en producción se puede subir a `warn`
 * desde la configuración sin tocar los casos de uso.
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
export class ConsoleLogger extends ILogger {
  #minLevel;
  #prefix;

  /**
   * @param {{ level?: keyof typeof LEVELS, prefix?: string }} [options]
   */
  constructor({ level = 'info', prefix = 'CreditSmart' } = {}) {
    super();
    this.#minLevel = LEVELS[level] ?? LEVELS.info;
    this.#prefix = prefix;
  }

  /** @param {string} message @param {Object} [context] */
  debug(message, context) {
    this.#write('debug', 'log', message, context);
  }

  /** @param {string} message @param {Object} [context] */
  info(message, context) {
    this.#write('info', 'info', message, context);
  }

  /** @param {string} message @param {Object} [context] */
  warn(message, context) {
    this.#write('warn', 'warn', message, context);
  }

  /** @param {string} message @param {Object} [context] */
  error(message, context) {
    this.#write('error', 'error', message, context);
  }

  /**
   * @param {keyof typeof LEVELS} level
   * @param {'log'|'info'|'warn'|'error'} method
   * @param {string} message
   * @param {Object} [context]
   */
  #write(level, method, message, context) {
    if (LEVELS[level] < this.#minLevel) return;
    const label = `[${this.#prefix}] ${message}`;
    if (context === undefined) console[method](label);
    else console[method](label, context);
  }
}
