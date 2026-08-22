import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { ProductSearchCriteria } from '../../domain/criteria/ProductSearchCriteria.js';
import { AmountRange } from '../../domain/valueobjects/AmountRange.js';
import { CreditProductMapper } from '../mappers/CreditProductMapper.js';
import { Result } from '../shared/Result.js';

/**
 * SearchCreditProductsUseCase — CASO DE USO (query con filtros).
 *
 * Traduce la entrada primitiva del formulario del simulador a un
 * `ProductSearchCriteria` de dominio y delega el filtrado al repositorio.
 *
 * Capa: APLICACIÓN.
 */
export class SearchCreditProductsUseCase extends IUseCase {
  /** @type {ICreditProductRepository} */
  #repository;
  /** @type {CreditProductMapper} */
  #mapper;

  /**
   * @param {{ productRepository: ICreditProductRepository, productMapper: CreditProductMapper }} deps
   */
  constructor({ productRepository, productMapper }) {
    super();
    assertImplements(productRepository, ICreditProductRepository);
    this.#repository = productRepository;
    this.#mapper = productMapper;
  }

  /**
   * @param {{ query?: string, amountRange?: AmountRange|null }} [input]
   * @returns {Promise<Result>} Result<{ products: CreditProductDTO[], total: number, criteria: Object }>
   */
  async execute({ query = '', amountRange = null } = {}) {
    try {
      const criteria = new ProductSearchCriteria({ query, amountRange });
      const products = await this.#repository.findByCriteria(criteria);
      const total = await this.#repository.count();

      return Result.ok({
        products: this.#mapper.toDTOList(products),
        matched: products.length,
        total,
        criteria: criteria.toJSON(),
        isFiltered: !criteria.isEmpty,
      });
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
