import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { Result } from '../shared/Result.js';

/**
 * GetCreditProductNamesUseCase — CASO DE USO (query).
 *
 * Alimenta el `<select>` "Tipo de crédito" del formulario de solicitud.
 * Se deriva del catálogo real, de modo que agregar un producto no obliga a
 * mantener una lista duplicada en la vista (como sí ocurría en el original).
 *
 * Capa: APLICACIÓN.
 */
export class GetCreditProductNamesUseCase extends IUseCase {
  /** @type {ICreditProductRepository} */
  #repository;

  /** @param {{ productRepository: ICreditProductRepository }} deps */
  constructor({ productRepository }) {
    super();
    assertImplements(productRepository, ICreditProductRepository);
    this.#repository = productRepository;
  }

  /**
   * @returns {Promise<Result>} Result<string[]>
   */
  async execute() {
    try {
      const products = await this.#repository.findAll();
      return Result.ok(products.map((product) => product.name));
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
