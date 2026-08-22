import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { CreditSimulationService } from '../../domain/services/CreditSimulationService.js';
import { ValidationError } from '../../domain/errors/ValidationError.js';
import { Money } from '../../domain/valueobjects/Money.js';
import { Term } from '../../domain/valueobjects/Term.js';
import { SimulationMapper } from '../mappers/SimulationMapper.js';
import { Result } from '../shared/Result.js';

/**
 * SimulateCreditUseCase — CASO DE USO (query).
 *
 * "El sistema debe poder decirle a alguien cuánto pagaría por un crédito."
 *
 * Orquesta, no calcula: busca el producto, convierte la entrada cruda del
 * formulario en value objects, pide el plan al servicio de dominio y lo aplana
 * a DTO. La matemática vive entera en `CreditSimulationService`.
 *
 * Es una consulta: no muta nada y no escribe en el log.
 *
 * Capa: APLICACIÓN.
 */
export class SimulateCreditUseCase extends IUseCase {
  /** @type {ICreditProductRepository} */
  #repository;
  /** @type {SimulationMapper} */
  #mapper;

  /**
   * @param {{
   *   productRepository: ICreditProductRepository,
   *   simulationMapper: SimulationMapper
   * }} deps
   */
  constructor({ productRepository, simulationMapper }) {
    super();
    assertImplements(productRepository, ICreditProductRepository);
    this.#repository = productRepository;
    this.#mapper = simulationMapper;
  }

  /**
   * @param {{
   *   productId?: string|number,
   *   amount?: string|number,
   *   termInMonths?: string|number
   * }} [input] Tal como sale del formulario: los números pueden venir en texto.
   * @returns {Promise<Result>} Result<SimulationDTO>
   */
  async execute({ productId, amount, termInMonths } = {}) {
    try {
      const product = await this.#repository.findById(productId);

      if (!product) {
        throw new ValidationError(
          { productId: 'Selecciona un producto de crédito para simular.' },
          'No se encontró el producto a simular.',
        );
      }

      const { money, term } = SimulateCreditUseCase.#parse({ amount, termInMonths });
      const plan = CreditSimulationService.simulate(product, money, term);

      return Result.ok(this.#mapper.toDTO(plan, product));
    } catch (err) {
      return Result.fromError(err);
    }
  }

  /**
   * Convierte la entrada del formulario en value objects, acumulando TODOS los
   * fallos en un único `ValidationError`.
   *
   * Se acumulan en vez de lanzar en el primero para que el formulario pueda
   * marcar monto y plazo a la vez, en una sola pasada, igual que hace
   * `CreditApplicationMapper` con la solicitud completa.
   *
   * @param {{ amount?: string|number, termInMonths?: string|number }} raw
   * @returns {{ money: Money, term: Term }}
   * @throws {ValidationError}
   */
  static #parse({ amount, termInMonths }) {
    const errors = {};
    let money = null;
    let term = null;

    const amountNumber = Number(amount);
    if (amount === '' || amount === null || amount === undefined || !Number.isFinite(amountNumber)) {
      errors.amount = 'Indica cuánto dinero necesitas.';
    } else {
      try {
        money = Money.of(amountNumber);
      } catch (err) {
        errors.amount = err.message;
      }
    }

    const termNumber = Number(termInMonths);
    if (!Number.isInteger(termNumber) || termNumber <= 0) {
      errors.termInMonths = 'El plazo debe ser un número entero de meses mayor que cero.';
    } else {
      try {
        term = Term.ofMonths(termNumber);
      } catch (err) {
        errors.termInMonths = err.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'Revisa los datos de la simulación.');
    }

    return { money, term };
  }
}
