import { IAmountRangeProvider } from '../../domain/contracts/IAmountRangeProvider.js';
import { AmountRange } from '../../domain/valueobjects/AmountRange.js';
import { STATIC_AMOUNT_RANGES } from './datasources/StaticCreditProductDataSource.js';

/**
 * StaticAmountRangeProvider — ADAPTADOR de `IAmountRangeProvider`.
 *
 * Convierte los rangos crudos del datasource en value objects `AmountRange`.
 *
 * Capa: INFRAESTRUCTURA (adaptador de persistencia).
 */
export class StaticAmountRangeProvider extends IAmountRangeProvider {
  /** @type {AmountRange[]} */
  #ranges;

  /** @param {{ dataSource?: Array<{label:string,min:number,max:number|null}> }} [deps] */
  constructor({ dataSource = STATIC_AMOUNT_RANGES } = {}) {
    super();
    this.#ranges = dataSource.map((raw) => AmountRange.of(raw.min, raw.max, raw.label));
  }

  /** @returns {Promise<AmountRange[]>} */
  async all() {
    return [...this.#ranges];
  }

  /**
   * @param {number|string} index
   * @returns {Promise<AmountRange|null>}
   */
  async byIndex(index) {
    const position = Number(index);
    if (!Number.isInteger(position)) return null;
    return this.#ranges[position] ?? null;
  }
}
