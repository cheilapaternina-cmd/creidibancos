import { IIdGenerator } from '../../domain/contracts/IIdGenerator.js';

/**
 * CryptoIdGenerator — ADAPTADOR de `IIdGenerator`.
 *
 * Usa `crypto.randomUUID()` cuando está disponible (contexto seguro) y
 * degrada a `crypto.getRandomValues` y, en último caso, a un id basado en
 * tiempo + aleatorio. Nunca falla: generar una identidad no debe tumbar el
 * flujo de radicación.
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
export class CryptoIdGenerator extends IIdGenerator {
  /**
   * @param {string} [prefix]
   * @returns {string}
   */
  generate(prefix = 'id') {
    return `${prefix}_${this.#randomPart()}`;
  }

  /** @returns {string} */
  #randomPart() {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return cryptoApi.randomUUID().replace(/-/g, '');
    }

    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  }
}
