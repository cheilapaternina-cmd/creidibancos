import { IMoneyFormatter } from '../../domain/contracts/IMoneyFormatter.js';

/**
 * IntlMoneyFormatter — ADAPTADOR de `IMoneyFormatter`.
 *
 * Usa `Intl.NumberFormat` con locale es-CO y moneda COP sin decimales,
 * exactamente como el sitio original:
 *   new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP',
 *                                    maximumFractionDigits: 0 })
 *
 * Reutiliza una única instancia de `Intl.NumberFormat` (crearla es costoso y
 * se invoca dos veces por tarjeta de producto).
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
export class IntlMoneyFormatter extends IMoneyFormatter {
  #locale;
  #currency;
  /** @type {Intl.NumberFormat} */
  #formatter;
  /** @type {Intl.NumberFormat} */
  #compactFormatter;

  /**
   * @param {{ locale?: string, currency?: string }} [options]
   */
  constructor({ locale = 'es-CO', currency = 'COP' } = {}) {
    super();
    this.#locale = locale;
    this.#currency = currency;

    this.#formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });

    this.#compactFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }

  /** @returns {string} */
  get locale() {
    return this.#locale;
  }

  /** @returns {string} */
  get currency() {
    return this.#currency;
  }

  /**
   * @param {import('../../domain/valueobjects/Money.js').Money|number} money
   * @returns {string}
   */
  format(money) {
    return this.#formatter.format(IntlMoneyFormatter.#toNumber(money));
  }

  /**
   * @param {import('../../domain/valueobjects/Money.js').Money|number} money
   * @returns {string}
   */
  formatCompact(money) {
    return this.#compactFormatter.format(IntlMoneyFormatter.#toNumber(money));
  }

  /**
   * @param {any} money
   * @returns {number}
   */
  static #toNumber(money) {
    if (typeof money === 'number') return money;
    if (money && typeof money.amount === 'number') return money.amount;
    return Number(money) || 0;
  }
}
