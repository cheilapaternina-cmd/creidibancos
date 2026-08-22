import { IClock } from '../../domain/contracts/IClock.js';

/**
 * SystemClock — ADAPTADOR de `IClock` sobre el reloj del sistema.
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
export class SystemClock extends IClock {
  /** @returns {Date} */
  now() {
    return new Date();
  }

  /** @returns {number} */
  timestamp() {
    return Date.now();
  }
}
