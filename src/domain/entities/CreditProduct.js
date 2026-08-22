import { DomainError } from '../errors/DomainError.js';
import { Money } from '../valueobjects/Money.js';
import { InterestRate } from '../valueobjects/InterestRate.js';
import { Term } from '../valueobjects/Term.js';
import { AmountRange } from '../valueobjects/AmountRange.js';
import { ProductTheme } from '../valueobjects/ProductTheme.js';

/**
 * CreditProduct — ENTIDAD del dominio (raíz de agregado del catálogo).
 *
 * Contiene los 5 productos del catálogo CreditSmart. Toda la lógica de
 * coincidencia (búsqueda por nombre, encaje de rango, admisión de un monto)
 * vive aquí y NO en la vista ni en el controlador: así el mismo comportamiento
 * sirve para cualquier interfaz futura.
 *
 * Capa: DOMINIO. Sin dependencias de framework.
 */
export class CreditProduct {
  #id;
  #name;
  #description;
  #amountRange;
  #interestRate;
  #maxTerm;
  #requirements;
  #theme;

  /**
   * @param {{
   *   id: number|string,
   *   name: string,
   *   description: string,
   *   amountRange: AmountRange,
   *   interestRate: InterestRate,
   *   maxTerm: Term,
   *   requirements: string,
   *   theme: ProductTheme
   * }} props
   */
  constructor({
    id,
    name,
    description,
    amountRange,
    interestRate,
    maxTerm,
    requirements,
    theme,
  }) {
    if (id === undefined || id === null || id === '') {
      throw new DomainError('CreditProduct.id es obligatorio.', { code: 'PRODUCT_ID_REQUIRED' });
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new DomainError('CreditProduct.name es obligatorio.', {
        code: 'PRODUCT_NAME_REQUIRED',
      });
    }
    if (!(amountRange instanceof AmountRange)) {
      throw new DomainError('CreditProduct.amountRange debe ser un AmountRange.', {
        code: 'PRODUCT_RANGE_INVALID',
      });
    }
    if (!(interestRate instanceof InterestRate)) {
      throw new DomainError('CreditProduct.interestRate debe ser un InterestRate.', {
        code: 'PRODUCT_RATE_INVALID',
      });
    }
    if (!(maxTerm instanceof Term)) {
      throw new DomainError('CreditProduct.maxTerm debe ser un Term.', {
        code: 'PRODUCT_TERM_INVALID',
      });
    }
    if (!(theme instanceof ProductTheme)) {
      throw new DomainError('CreditProduct.theme debe ser un ProductTheme.', {
        code: 'PRODUCT_THEME_INVALID',
      });
    }

    this.#id = id;
    this.#name = name.trim();
    this.#description = String(description ?? '').trim();
    this.#amountRange = amountRange;
    this.#interestRate = interestRate;
    this.#maxTerm = maxTerm;
    this.#requirements = String(requirements ?? '').trim();
    this.#theme = theme;

    Object.freeze(this);
  }

  /* ---------------- Getters ---------------- */

  get id() { return this.#id; }
  get name() { return this.#name; }
  get description() { return this.#description; }
  get amountRange() { return this.#amountRange; }
  get minAmount() { return this.#amountRange.min; }
  get maxAmount() { return this.#amountRange.max; }
  get interestRate() { return this.#interestRate; }
  get maxTerm() { return this.#maxTerm; }
  get requirements() { return this.#requirements; }
  get theme() { return this.#theme; }

  /* ---------------- Reglas de negocio ---------------- */

  /**
   * Coincidencia por texto libre (nombre + descripción), sin acentos ni caso.
   * @param {string} query
   * @returns {boolean}
   */
  matchesName(query) {
    const term = CreditProduct.normalize(query);
    if (term === '') return true;
    return (
      CreditProduct.normalize(this.#name).includes(term) ||
      CreditProduct.normalize(this.#description).includes(term)
    );
  }

  /**
   * ¿El rango ofertado por el producto intersecta el rango pedido?
   * @param {AmountRange} range
   * @returns {boolean}
   */
  matchesAmountRange(range) {
    if (!(range instanceof AmountRange)) return true;
    return this.#amountRange.overlaps(range);
  }

  /**
   * ¿El producto admite este importe?
   * @param {Money} amount
   * @returns {boolean}
   */
  admitsAmount(amount) {
    return this.#amountRange.contains(amount);
  }

  /**
   * ¿El producto admite este plazo?
   * @param {Term} term
   * @returns {boolean}
   */
  admitsTerm(term) {
    return term.fitsWithin(this.#maxTerm);
  }

  /**
   * @param {CreditProduct} other
   * @returns {boolean} Igualdad por identidad (entidad, no value object).
   */
  equals(other) {
    return other instanceof CreditProduct && String(other.id) === String(this.#id);
  }

  /**
   * Normaliza texto para búsquedas: minúsculas y sin diacríticos.
   * @param {string} value
   * @returns {string}
   */
  static normalize(value) {
    // Rango de marcas diacríticas combinantes U+0300–U+036F (construido con
    // escapes ASCII para evitar problemas de codificación del archivo).
    const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(COMBINING_MARKS, '')
      .trim();
  }

  /** @returns {Object} */
  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      description: this.#description,
      amountRange: this.#amountRange.toJSON(),
      interestRate: this.#interestRate.toJSON(),
      maxTermMonths: this.#maxTerm.months,
      requirements: this.#requirements,
      theme: this.#theme.toJSON(),
    };
  }
}
