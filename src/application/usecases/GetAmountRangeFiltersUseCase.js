import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { IAmountRangeProvider } from '../../domain/contracts/IAmountRangeProvider.js';
import { Result } from '../shared/Result.js';

/**
 * GetAmountRangeFiltersUseCase — CASO DE USO (query).
 *
 * Devuelve las opciones del `<select>` "Filtrar por rango de monto"
 * del simulador, como pares { index, label }.
 *
 * Capa: APLICACIÓN.
 */
export class GetAmountRangeFiltersUseCase extends IUseCase {
  /** @type {IAmountRangeProvider} */
  #provider;

  /** @param {{ amountRangeProvider: IAmountRangeProvider }} deps */
  constructor({ amountRangeProvider }) {
    super();
    assertImplements(amountRangeProvider, IAmountRangeProvider);
    this.#provider = amountRangeProvider;
  }

  /**
   * @returns {Promise<Result>} Result<Array<{ index: number, label: string }>>
   */
  async execute() {
    try {
      const ranges = await this.#provider.all();
      return Result.ok(
        ranges.map((range, index) => ({ index, label: range.label })),
      );
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
