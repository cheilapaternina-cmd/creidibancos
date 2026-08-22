import { DomainError } from '../errors/DomainError.js';
import { Money } from './Money.js';

/**
 * AmountRange — VALUE OBJECT inmutable.
 *
 * Rango [min, max] de importes. Modela tanto el rango que ofrece un producto
 * (montoMin–montoMax) como el filtro que elige el usuario en el simulador.
 * `max` admite Infinity para el caso "Más de $100.000.000".
 *
 * Capa: DOMINIO.
 */
export class AmountRange {
  /** @type {Money} */
  #min;
  /** @type {Money|null} */
  #max;
  /** @type {string} */
  #label;

  /**
   * @param {Money} min
   * @param {Money|null} max `null` representa "sin límite superior".
   * @param {string} [label]
   */
  constructor(min, max, label = '') {
    if (!(min instanceof Money)) {
      throw new DomainError('AmountRange.min debe ser un Money.', { code: 'INVALID_RANGE_MIN' });
    }
    if (max !== null && !(max instanceof Money)) {
      throw new DomainError('AmountRange.max debe ser un Money o null.', {
        code: 'INVALID_RANGE_MAX',
      });
    }
    if (max !== null && max.isLessThan(min)) {
      throw new DomainError('El máximo del rango no puede ser menor que el mínimo.', {
        code: 'INVERTED_RANGE',
        details: { min: min.amount, max: max.amount },
      });
    }

    this.#min = min;
    this.#max = max;
    this.#label = label;
    Object.freeze(this);
  }

  /**
   * @param {number} min
   * @param {number|null} max `null` o `Infinity` → sin límite.
   * @param {string} [label]
   * @returns {AmountRange}
   */
  static of(min, max, label = '') {
    const upper = max === null || max === Infinity ? null : Money.of(max);
    return new AmountRange(Money.of(min), upper, label);
  }

  /** @returns {AmountRange} Rango que acepta cualquier importe. */
  static unbounded(label = 'Todos los montos') {
    return new AmountRange(Money.zero(), null, label);
  }

  /** @returns {Money} */
  get min() {
    return this.#min;
  }

  /** @returns {Money|null} */
  get max() {
    return this.#max;
  }

  /** @returns {string} */
  get label() {
    return this.#label;
  }

  /** @returns {boolean} */
  get isUnbounded() {
    return this.#max === null;
  }

  /**
   * ¿El importe cae dentro del rango?
   * @param {Money} money
   * @returns {boolean}
   */
  contains(money) {
    if (money.isLessThan(this.#min)) return false;
    if (this.#max === null) return true;
    return !money.isGreaterThan(this.#max);
  }

  /**
   * ¿Este rango se solapa con otro? Regla usada por el filtro del simulador:
   * un producto se muestra si su rango ofertado intersecta el rango pedido.
   * @param {AmountRange} other
   * @returns {boolean}
   */
  overlaps(other) {
    const thisMaxAmount = this.#max === null ? Infinity : this.#max.amount;
    const otherMaxAmount = other.max === null ? Infinity : other.max.amount;
    return this.#min.amount <= otherMaxAmount && other.min.amount <= thisMaxAmount;
  }

  /** @returns {string} */
  toString() {
    return this.#label || `${this.#min} – ${this.#max ?? '∞'}`;
  }

  /** @returns {{min: number, max: number|null, label: string}} */
  toJSON() {
    return {
      min: this.#min.amount,
      max: this.#max ? this.#max.amount : null,
      label: this.#label,
    };
  }
}
