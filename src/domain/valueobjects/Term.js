import { DomainError } from '../errors/DomainError.js';

/**
 * Term — VALUE OBJECT inmutable.
 *
 * Plazo expresado en meses. Encapsula la invariante "plazo positivo y entero"
 * y la conversión a años que usa la presentación.
 *
 * Capa: DOMINIO.
 */
export class Term {
  /** @type {number} */
  #months;

  /** @param {number} months */
  constructor(months) {
    if (!Number.isInteger(months) || months <= 0) {
      throw new DomainError('El plazo debe ser un número entero de meses mayor que cero.', {
        code: 'INVALID_TERM',
        details: { months },
      });
    }

    this.#months = months;
    Object.freeze(this);
  }

  /** @param {number} months */
  static ofMonths(months) {
    return new Term(months);
  }

  /** @returns {number} */
  get months() {
    return this.#months;
  }

  /** @returns {number} */
  get years() {
    return this.#months / 12;
  }

  /** @param {Term} other */
  isLongerThan(other) {
    return this.#months > other.months;
  }

  /** @param {Term} other */
  fitsWithin(other) {
    return this.#months <= other.months;
  }

  /** @param {Term} other */
  equals(other) {
    return other instanceof Term && other.months === this.#months;
  }

  /** @returns {string} */
  toString() {
    return `${this.#months} meses`;
  }

  /** @returns {number} */
  toJSON() {
    return this.#months;
  }
}
