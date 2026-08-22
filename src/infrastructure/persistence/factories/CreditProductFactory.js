import { CreditProduct } from '../../../domain/entities/CreditProduct.js';
import { Money } from '../../../domain/valueobjects/Money.js';
import { InterestRate } from '../../../domain/valueobjects/InterestRate.js';
import { Term } from '../../../domain/valueobjects/Term.js';
import { AmountRange } from '../../../domain/valueobjects/AmountRange.js';
import { ProductTheme } from '../../../domain/valueobjects/ProductTheme.js';

/**
 * CreditProductFactory — ANTICORRUPTION LAYER.
 *
 * Convierte el registro crudo del datasource (claves en español, números
 * planos) en la entidad de dominio con sus value objects. Aísla al dominio del
 * formato del proveedor de datos: si mañana la API devuelve `min_amount` en
 * lugar de `montoMin`, solo cambia este archivo.
 *
 * Capa: INFRAESTRUCTURA (factory / mapper de persistencia).
 */
export class CreditProductFactory {
  /**
   * @param {{
   *   id: number|string, nombre: string, descripcion: string,
   *   montoMin: number, montoMax: number, tasa: number, plazo: number,
   *   requisitos: string, icon: string, palette: string
   * }} raw
   * @returns {CreditProduct}
   */
  static fromRaw(raw) {
    return new CreditProduct({
      id: raw.id,
      name: raw.nombre,
      description: raw.descripcion,
      amountRange: new AmountRange(
        Money.of(raw.montoMin),
        raw.montoMax === null || raw.montoMax === undefined ? null : Money.of(raw.montoMax),
      ),
      interestRate: InterestRate.ofAnnualPercentage(raw.tasa),
      maxTerm: Term.ofMonths(raw.plazo),
      requirements: raw.requisitos,
      theme: ProductTheme.of(raw.icon, raw.palette),
    });
  }

  /**
   * @param {Array<Object>} rawList
   * @returns {CreditProduct[]}
   */
  static fromRawList(rawList) {
    return rawList.map((raw) => CreditProductFactory.fromRaw(raw));
  }
}
