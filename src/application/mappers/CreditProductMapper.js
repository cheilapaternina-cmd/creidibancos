import { assertImplements } from '../../domain/contracts/Contract.js';
import { IMoneyFormatter } from '../../domain/contracts/IMoneyFormatter.js';
import { freezeProductDTO } from '../dto/CreditProductDTO.js';

/**
 * CreditProductMapper — traductor ENTIDAD → DTO.
 *
 * Recibe el formateador por inyección (puerto `IMoneyFormatter`), nunca lo
 * instancia: Principio de Inversión de Dependencias.
 *
 * Capa: APLICACIÓN (mapper).
 */
export class CreditProductMapper {
  /** @type {IMoneyFormatter} */
  #moneyFormatter;

  /**
   * @param {{ moneyFormatter: IMoneyFormatter }} deps
   */
  constructor({ moneyFormatter }) {
    assertImplements(moneyFormatter, IMoneyFormatter);
    this.#moneyFormatter = moneyFormatter;
  }

  /**
   * @param {import('../../domain/entities/CreditProduct.js').CreditProduct} product
   * @returns {Readonly<import('../dto/CreditProductDTO.js').CreditProductDTO>}
   */
  toDTO(product) {
    const minLabel = this.#moneyFormatter.format(product.minAmount);
    const maxLabel = product.maxAmount
      ? this.#moneyFormatter.format(product.maxAmount)
      : 'Sin límite';

    return freezeProductDTO({
      id: product.id,
      name: product.name,
      description: product.description,
      requirements: product.requirements,
      icon: product.theme.icon,
      themeClass: product.theme.cssClass,
      annualRate: product.interestRate.annualPercentage,
      annualRateLabel: `${product.interestRate.annualPercentage}%`,
      maxTermMonths: product.maxTerm.months,
      maxTermLabel: `${product.maxTerm.months} meses`,
      minAmountLabel: minLabel,
      maxAmountLabel: maxLabel,
      amountRangeLabel: `${minLabel} – ${maxLabel}`,
    });
  }

  /**
   * @param {Array<import('../../domain/entities/CreditProduct.js').CreditProduct>} products
   * @returns {Array<Readonly<import('../dto/CreditProductDTO.js').CreditProductDTO>>}
   */
  toDTOList(products) {
    return products.map((product) => this.toDTO(product));
  }
}
