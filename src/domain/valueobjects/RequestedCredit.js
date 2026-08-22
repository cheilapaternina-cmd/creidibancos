import { ValidationError } from '../errors/ValidationError.js';
import { Money } from './Money.js';
import { Term } from './Term.js';

/**
 * RequestedCredit — VALUE OBJECT inmutable (Datos del Crédito).
 *
 * Corresponde a la sección "💰 Datos del Crédito" del formulario:
 * tipo de crédito, monto solicitado, plazo en meses y destino.
 *
 * Capa: DOMINIO.
 */
export class RequestedCredit {
  #productName;
  #amount;
  #term;
  #purpose;

  /**
   * @param {{
   *   productName: string,
   *   amount: number|Money,
   *   termInMonths: number|Term,
   *   purpose: string
   * }} props
   */
  constructor({ productName, amount, termInMonths, purpose }) {
    const errors = {};

    const type = String(productName ?? '').trim();
    if (type === '') errors.productName = 'Selecciona el tipo de crédito.';

    let money = null;
    if (amount instanceof Money) {
      money = amount;
    } else {
      const raw = Number(amount);
      if (String(amount ?? '').trim() === '' || !Number.isFinite(raw)) {
        errors.amount = 'El monto solicitado es obligatorio.';
      } else if (raw <= 0) {
        errors.amount = 'El monto solicitado debe ser mayor que cero.';
      } else {
        money = Money.of(raw);
      }
    }

    let term = null;
    if (termInMonths instanceof Term) {
      term = termInMonths;
    } else {
      const raw = Number(termInMonths);
      if (String(termInMonths ?? '').trim() === '' || !Number.isInteger(raw)) {
        errors.termInMonths = 'Selecciona el plazo en meses.';
      } else if (raw <= 0) {
        errors.termInMonths = 'El plazo debe ser mayor que cero.';
      } else {
        term = Term.ofMonths(raw);
      }
    }

    const destination = String(purpose ?? '').trim();
    if (destination === '') errors.purpose = 'Describe el destino del crédito.';
    else if (destination.length < 10)
      errors.purpose = 'Describe el destino con al menos 10 caracteres.';

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'Revisa los datos del crédito.');
    }

    this.#productName = type;
    this.#amount = money;
    this.#term = term;
    this.#purpose = destination;

    Object.freeze(this);
  }

  get productName() { return this.#productName; }
  get amount() { return this.#amount; }
  get term() { return this.#term; }
  get purpose() { return this.#purpose; }

  /** @returns {Object} */
  toJSON() {
    return {
      productName: this.#productName,
      amount: this.#amount.amount,
      termInMonths: this.#term.months,
      purpose: this.#purpose,
    };
  }
}
