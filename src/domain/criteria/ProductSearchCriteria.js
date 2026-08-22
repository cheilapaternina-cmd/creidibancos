import { AmountRange } from '../valueobjects/AmountRange.js';

/**
 * ProductSearchCriteria — VALUE OBJECT (patrón Specification/Criteria).
 *
 * Encapsula los filtros del simulador: texto libre + rango de monto.
 * Al ser un objeto de dominio, la misma especificación sirve para filtrar en
 * memoria hoy y para traducirse a un query HTTP mañana, sin cambiar el caso
 * de uso ni el controlador.
 *
 * Capa: DOMINIO.
 */
export class ProductSearchCriteria {
  #query;
  #amountRange;

  /**
   * @param {{ query?: string, amountRange?: AmountRange }} [props]
   */
  constructor({ query = '', amountRange = null } = {}) {
    this.#query = String(query ?? '').trim();
    this.#amountRange = amountRange instanceof AmountRange ? amountRange : null;
    Object.freeze(this);
  }

  /** @returns {ProductSearchCriteria} Criterio vacío (sin filtros). */
  static empty() {
    return new ProductSearchCriteria();
  }

  /** @returns {string} */
  get query() {
    return this.#query;
  }

  /** @returns {AmountRange|null} */
  get amountRange() {
    return this.#amountRange;
  }

  /** @returns {boolean} */
  get isEmpty() {
    return this.#query === '' && (this.#amountRange === null || this.#amountRange.isUnbounded);
  }

  /**
   * @param {string} query
   * @returns {ProductSearchCriteria} Nueva instancia (inmutabilidad).
   */
  withQuery(query) {
    return new ProductSearchCriteria({ query, amountRange: this.#amountRange });
  }

  /**
   * @param {AmountRange|null} amountRange
   * @returns {ProductSearchCriteria}
   */
  withAmountRange(amountRange) {
    return new ProductSearchCriteria({ query: this.#query, amountRange });
  }

  /**
   * Especificación: ¿el producto satisface el criterio?
   * @param {import('../entities/CreditProduct.js').CreditProduct} product
   * @returns {boolean}
   */
  isSatisfiedBy(product) {
    if (!product.matchesName(this.#query)) return false;
    if (this.#amountRange && !product.matchesAmountRange(this.#amountRange)) return false;
    return true;
  }

  /** @returns {Object} */
  toJSON() {
    return {
      query: this.#query,
      amountRange: this.#amountRange ? this.#amountRange.toJSON() : null,
    };
  }
}
