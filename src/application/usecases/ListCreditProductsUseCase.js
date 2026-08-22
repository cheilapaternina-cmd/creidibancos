import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { CreditProductMapper } from '../mappers/CreditProductMapper.js';
import { Result } from '../shared/Result.js';

/**
 * ListCreditProductsUseCase — CASO DE USO (query).
 *
 * Devuelve el catálogo completo de productos como DTOs, listo para pintar en
 * la vista de Catálogo (`/`).
 *
 * Dependencias por inyección: repositorio (puerto) + mapper. No conoce el DOM
 * ni la fuente de datos.
 *
 * Capa: APLICACIÓN.
 */
export class ListCreditProductsUseCase extends IUseCase {
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
   * @returns {Promise<Result>} Result<{ products: CreditProductDTO[], total: number }>
   */
  async execute() {
    try {
      const products = await this.#repository.findAll();
      return Result.ok({
        products: this.#mapper.toDTOList(products),
        total: products.length,
      });
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
