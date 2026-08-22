import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { CreditProductFactory } from './factories/CreditProductFactory.js';
import { STATIC_CREDIT_PRODUCTS } from './datasources/StaticCreditProductDataSource.js';

/**
 * InMemoryCreditProductRepository — ADAPTADOR de `ICreditProductRepository`.
 *
 * Implementación en memoria sobre el catálogo estático. Cumple el puerto del
 * dominio, así que puede sustituirse por un `HttpCreditProductRepository` sin
 * modificar casos de uso, controladores ni vistas.
 *
 * Devuelve promesas incluso siendo sincrónico: mantiene la misma firma que un
 * adaptador remoto (Liskov).
 *
 * Capa: INFRAESTRUCTURA (adaptador de persistencia).
 */
export class InMemoryCreditProductRepository extends ICreditProductRepository {
  /** @type {import('../../domain/entities/CreditProduct.js').CreditProduct[]} */
  #products;

  /**
   * @param {{ dataSource?: Array<Object> }} [deps]
   */
  constructor({ dataSource = STATIC_CREDIT_PRODUCTS } = {}) {
    super();
    this.#products = CreditProductFactory.fromRawList(dataSource);
  }

  /**
   * @returns {Promise<import('../../domain/entities/CreditProduct.js').CreditProduct[]>}
   */
  async findAll() {
    return [...this.#products];
  }

  /**
   * @param {number|string} id
   * @returns {Promise<import('../../domain/entities/CreditProduct.js').CreditProduct|null>}
   */
  async findById(id) {
    return this.#products.find((product) => String(product.id) === String(id)) ?? null;
  }

  /**
   * @param {import('../../domain/criteria/ProductSearchCriteria.js').ProductSearchCriteria} criteria
   * @returns {Promise<import('../../domain/entities/CreditProduct.js').CreditProduct[]>}
   */
  async findByCriteria(criteria) {
    if (!criteria || typeof criteria.isSatisfiedBy !== 'function') {
      return [...this.#products];
    }
    return this.#products.filter((product) => criteria.isSatisfiedBy(product));
  }

  /** @returns {Promise<number>} */
  async count() {
    return this.#products.length;
  }
}
