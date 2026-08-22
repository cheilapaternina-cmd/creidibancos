import { DomainError } from '../errors/DomainError.js';
import { Money } from './Money.js';

/**
 * Installment — VALUE OBJECT inmutable.
 *
 * Una fila de la tabla de amortización: qué se paga en el mes `number`, cuánto
 * de eso es interés, cuánto abona a capital y qué saldo queda después.
 *
 * No tiene identidad: dos cuotas con los mismos importes en el mismo número de
 * período son la misma cuota. Por eso `equals()` compara por valor.
 *
 * La invariante que justifica la clase: `payment = interest + principal`. Si el
 * cálculo se desviara por un redondeo mal hecho, la construcción falla aquí y
 * no más adelante en la vista.
 *
 * Capa: DOMINIO.
 */
export class Installment {
  /** @type {number} */
  #number;
  /** @type {Money} */
  #payment;
  /** @type {Money} */
  #interest;
  /** @type {Money} */
  #principal;
  /** @type {Money} */
  #remainingBalance;

  /**
   * @param {{
   *   number: number,
   *   payment: Money,
   *   interest: Money,
   *   principal: Money,
   *   remainingBalance: Money
   * }} props
   */
  constructor({ number, payment, interest, principal, remainingBalance }) {
    if (!Number.isInteger(number) || number <= 0) {
      throw new DomainError('El número de cuota debe ser un entero mayor que cero.', {
        code: 'INVALID_INSTALLMENT_NUMBER',
        details: { number },
      });
    }

    const fields = { payment, interest, principal, remainingBalance };
    for (const [name, value] of Object.entries(fields)) {
      if (!(value instanceof Money)) {
        throw new DomainError(`Installment.${name} debe ser un Money.`, {
          code: 'INVALID_INSTALLMENT_AMOUNT',
          details: { field: name },
        });
      }
    }

    if (payment.amount !== interest.amount + principal.amount) {
      throw new DomainError('La cuota debe ser exactamente interés más capital.', {
        code: 'INSTALLMENT_NOT_BALANCED',
        details: {
          number,
          payment: payment.amount,
          interest: interest.amount,
          principal: principal.amount,
        },
      });
    }

    this.#number = number;
    this.#payment = payment;
    this.#interest = interest;
    this.#principal = principal;
    this.#remainingBalance = remainingBalance;

    Object.freeze(this);
  }

  /**
   * Constructor semántico.
   * @param {{
   *   number: number,
   *   payment: Money,
   *   interest: Money,
   *   principal: Money,
   *   remainingBalance: Money
   * }} props
   * @returns {Installment}
   */
  static of(props) {
    return new Installment(props);
  }

  /** @returns {number} Número de período, empezando en 1. */
  get number() {
    return this.#number;
  }

  /** @returns {Money} */
  get payment() {
    return this.#payment;
  }

  /** @returns {Money} */
  get interest() {
    return this.#interest;
  }

  /** @returns {Money} */
  get principal() {
    return this.#principal;
  }

  /** @returns {Money} Saldo pendiente tras pagar esta cuota. */
  get remainingBalance() {
    return this.#remainingBalance;
  }

  /** @returns {boolean} ¿Con esta cuota queda saldado el crédito? */
  get settlesDebt() {
    return this.#remainingBalance.amount === 0;
  }

  /**
   * @param {Installment} other
   * @returns {boolean}
   */
  equals(other) {
    return (
      other instanceof Installment &&
      other.number === this.#number &&
      other.payment.equals(this.#payment) &&
      other.interest.equals(this.#interest) &&
      other.principal.equals(this.#principal) &&
      other.remainingBalance.equals(this.#remainingBalance)
    );
  }

  /** @returns {string} */
  toString() {
    return `#${this.#number}: ${this.#payment} (interés ${this.#interest}, capital ${this.#principal})`;
  }

  /**
   * @returns {{
   *   number: number,
   *   payment: number,
   *   interest: number,
   *   principal: number,
   *   remainingBalance: number
   * }}
   */
  toJSON() {
    return {
      number: this.#number,
      payment: this.#payment.amount,
      interest: this.#interest.amount,
      principal: this.#principal.amount,
      remainingBalance: this.#remainingBalance.amount,
    };
  }
}
