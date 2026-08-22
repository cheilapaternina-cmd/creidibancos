import { DomainError } from '../errors/DomainError.js';

/**
 * Money — VALUE OBJECT inmutable.
 *
 * Representa un importe monetario en centavos-enteros de la moneda indicada
 * (COP no usa decimales en la práctica, por eso se almacena el entero).
 * Ser un value object evita el "primitive obsession" de pasar `number` sueltos
 * y concentra las reglas aritméticas y de comparación.
 *
 * Capa: DOMINIO. Inmutable, sin dependencias.
 */
export class Money {
  /** @type {number} */
  #amount;
  /** @type {string} */
  #currency;

  /**
   * @param {number} amount
   * @param {string} [currency]
   */
  constructor(amount, currency = 'COP') {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new DomainError('El importe debe ser un número finito.', {
        code: 'INVALID_MONEY_AMOUNT',
        details: { amount },
      });
    }
    if (amount < 0) {
      throw new DomainError('El importe no puede ser negativo.', {
        code: 'NEGATIVE_MONEY_AMOUNT',
        details: { amount },
      });
    }

    this.#amount = Math.round(amount);
    this.#currency = currency;
    Object.freeze(this);
  }

  /**
   * Constructor semántico.
   * @param {number} amount
   * @param {string} [currency]
   * @returns {Money}
   */
  static of(amount, currency = 'COP') {
    return new Money(amount, currency);
  }

  /** @returns {Money} */
  static zero(currency = 'COP') {
    return new Money(0, currency);
  }

  /** @returns {number} */
  get amount() {
    return this.#amount;
  }

  /** @returns {string} */
  get currency() {
    return this.#currency;
  }

  /**
   * @param {Money} other
   * @returns {boolean}
   */
  equals(other) {
    return (
      other instanceof Money &&
      other.amount === this.#amount &&
      other.currency === this.#currency
    );
  }

  /**
   * @param {Money} other
   * @returns {boolean}
   */
  isGreaterThan(other) {
    this.#assertSameCurrency(other);
    return this.#amount > other.amount;
  }

  /**
   * @param {Money} other
   * @returns {boolean}
   */
  isLessThan(other) {
    this.#assertSameCurrency(other);
    return this.#amount < other.amount;
  }

  /**
   * @param {Money} min
   * @param {Money} max
   * @returns {boolean}
   */
  isBetween(min, max) {
    return !this.isLessThan(min) && !this.isGreaterThan(max);
  }

  /**
   * @param {Money} other
   * @returns {Money}
   */
  add(other) {
    this.#assertSameCurrency(other);
    return new Money(this.#amount + other.amount, this.#currency);
  }

  /**
   * @param {number} factor
   * @returns {Money}
   */
  multiply(factor) {
    return new Money(this.#amount * factor, this.#currency);
  }

  /** @returns {number} */
  valueOf() {
    return this.#amount;
  }

  /** @returns {string} */
  toString() {
    return `${this.#amount} ${this.#currency}`;
  }

  /** @returns {{ amount: number, currency: string }} */
  toJSON() {
    return { amount: this.#amount, currency: this.#currency };
  }

  /** @param {Money} other */
  #assertSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new DomainError('Se esperaba un Money para comparar.', {
        code: 'INVALID_MONEY_OPERAND',
      });
    }
    if (other.currency !== this.#currency) {
      throw new DomainError(
        `No se pueden operar monedas distintas: ${this.#currency} vs ${other.currency}.`,
        { code: 'CURRENCY_MISMATCH' },
      );
    }
  }
}
