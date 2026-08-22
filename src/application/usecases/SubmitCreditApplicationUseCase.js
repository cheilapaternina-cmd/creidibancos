import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditApplicationRepository } from '../../domain/contracts/ICreditApplicationRepository.js';
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { IClock } from '../../domain/contracts/IClock.js';
import { ILogger } from '../contracts/ILogger.js';
import { CreditApplication } from '../../domain/entities/CreditApplication.js';
import { CreditApplicationPolicy } from '../../domain/services/CreditApplicationPolicy.js';
import { CreditApplicationMapper } from '../mappers/CreditApplicationMapper.js';
import { ProductSearchCriteria } from '../../domain/criteria/ProductSearchCriteria.js';
import { Result } from '../shared/Result.js';

/**
 * SubmitCreditApplicationUseCase — CASO DE USO (command).
 *
 * Orquesta el alta de una solicitud de crédito:
 *   1. Traduce la entrada cruda del formulario a value objects.
 *   2. Construye la entidad `CreditApplication`.
 *   3. Aplica la política de dominio contra el producto elegido.
 *   4. Radica (`submit()`) y persiste vía repositorio.
 *   5. Devuelve un `Result` con el radicado y la cuota estimada.
 *
 * No conoce el DOM, ni el formulario, ni cómo se persiste. Solo puertos.
 *
 * Capa: APLICACIÓN.
 */
export class SubmitCreditApplicationUseCase extends IUseCase {
  /** @type {ICreditApplicationRepository} */
  #applicationRepository;
  /** @type {ICreditProductRepository} */
  #productRepository;
  /** @type {IClock} */
  #clock;
  /** @type {ILogger} */
  #logger;

  /**
   * @param {{
   *   applicationRepository: ICreditApplicationRepository,
   *   productRepository: ICreditProductRepository,
   *   clock: IClock,
   *   logger: ILogger
   * }} deps
   */
  constructor({ applicationRepository, productRepository, clock, logger }) {
    super();
    assertImplements(applicationRepository, ICreditApplicationRepository);
    assertImplements(productRepository, ICreditProductRepository);
    assertImplements(clock, IClock);
    assertImplements(logger, ILogger);

    this.#applicationRepository = applicationRepository;
    this.#productRepository = productRepository;
    this.#clock = clock;
    this.#logger = logger;
  }

  /**
   * @param {Object} rawForm Datos planos del formulario de solicitud.
   * @returns {Promise<Result>} Result<{ reference: string, status: string, affordability: Object }>
   */
  async execute(rawForm = {}) {
    try {
      const { applicant, requestedCredit, employmentInfo } =
        CreditApplicationMapper.toValueObjects(rawForm);

      const application = new CreditApplication({
        id: this.#applicationRepository.nextIdentity(),
        applicant,
        requestedCredit,
        employmentInfo,
        createdAt: this.#clock.now(),
      });

      const product = await this.#findProductByName(requestedCredit.productName);
      CreditApplicationPolicy.assertAdmissible(application, product);

      const affordability = product
        ? CreditApplicationPolicy.assessAffordability(application, product)
        : null;

      application.submit();
      await this.#applicationRepository.save(application);

      this.#logger.info('Solicitud radicada', {
        reference: application.referenceNumber,
        product: requestedCredit.productName,
      });

      return Result.ok({
        reference: application.referenceNumber,
        status: application.status,
        applicantFirstName: applicant.firstName,
        affordability,
      });
    } catch (err) {
      this.#logger.warn('Solicitud rechazada en validación', { message: err?.message });
      return Result.fromError(err);
    }
  }

  /**
   * @param {string} name
   * @returns {Promise<import('../../domain/entities/CreditProduct.js').CreditProduct|null>}
   */
  async #findProductByName(name) {
    const matches = await this.#productRepository.findByCriteria(
      new ProductSearchCriteria({ query: name }),
    );
    return matches.find((product) => product.name === name) ?? matches[0] ?? null;
  }
}
