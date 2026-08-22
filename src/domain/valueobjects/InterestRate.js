import { DomainError } from '../errors/DomainError.js';

/**
 * InterestRate — VALUE OBJECT inmutable.
 *
 * Tasa efectiva ANUAL expresada en porcentaje (ej. 18.5 = 18,5 % E.A.).
 * Expone la conversión a tasa mensual equivalente, que es la regla de negocio
 * financiera que no debe duplicarse en la UI.
 *
 * Capa: DOMINIO.
 */
export class InterestRate {
  /** @type {number} */
  #annualPercentage;

  /** @param {number} annualPercentage */
  constructor(annualPercentage) {
    if (typeof annualPercentage !== 'number' || !Number.isFinite(annualPercentage)) {
      throw new DomainError('La tasa debe ser un número finito.', {
        code: 'INVALID_RATE',
        details: { annualPercentage },
      });
    }
    if (annualPercentage < 0 || annualPercentage > 100) {
      throw new DomainError('La tasa anual debe estar entre 0 y 100 %.', {
        code: 'RATE_OUT_OF_BOUNDS',
        details: { annualPercentage },
      });
    }

    this.#annualPercentage = annualPercentage;
    Object.freeze(this);
  }

  /** @param {number} value */
  static ofAnnualPercentage(value) {
    return new InterestRate(value);
  }

  /** @returns {number} Porcentaje anual, ej. 18.5 */
  get annualPercentage() {
    return this.#annualPercentage;
  }

  /** @returns {number} Fracción anual, ej. 0.185 */
  get annualFraction() {
    return this.#annualPercentage / 100;
  }

  /**
   * Tasa mensual equivalente a partir de la efectiva anual:
   * i_m = (1 + i_a)^(1/12) - 1
   * @returns {number}
   */
  get monthlyFraction() {
    return Math.pow(1 + this.annualFraction, 1 / 12) - 1;
  }

  /** @param {InterestRate} other */
  isLowerThan(other) {
    return this.#annualPercentage < other.annualPercentage;
  }

  /** @param {InterestRate} other */
  equals(other) {
    return other instanceof InterestRate && other.annualPercentage === this.#annualPercentage;
  }

  /** @returns {string} */
  toString() {
    return `${this.#annualPercentage}%`;
  }

  /** @returns {number} */
  toJSON() {
    return this.#annualPercentage;
  }
}
