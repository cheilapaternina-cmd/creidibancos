import { ValidationError } from '../errors/ValidationError.js';
import { CreditProduct } from '../entities/CreditProduct.js';
import { CreditApplication } from '../entities/CreditApplication.js';

/**
 * CreditApplicationPolicy — SERVICIO DE DOMINIO (stateless, puro).
 *
 * Reglas que involucran a MÁS de una entidad y por tanto no pertenecen a
 * ninguna en particular: coherencia entre la solicitud y el producto elegido.
 *
 * No tiene dependencias: es determinista y se puede testear sin mocks.
 *
 * Capa: DOMINIO (servicio).
 */
export class CreditApplicationPolicy {
  /**
   * Verifica que la solicitud sea admisible para el producto seleccionado.
   *
   * @param {CreditApplication} application
   * @param {CreditProduct|null} product Producto del catálogo, si se encontró.
   * @throws {ValidationError} con errores por campo del formulario.
   */
  static assertAdmissible(application, product) {
    if (!(application instanceof CreditApplication)) {
      throw new TypeError('assertAdmissible espera una CreditApplication.');
    }
    if (!product) {
      // Sin producto de referencia no hay reglas cruzadas que aplicar.
      return;
    }

    const errors = {};
    const requested = application.requestedCredit;

    if (!product.admitsAmount(requested.amount)) {
      const min = product.minAmount.amount.toLocaleString('es-CO');
      const max = product.maxAmount ? product.maxAmount.amount.toLocaleString('es-CO') : 'sin límite';
      errors.amount =
        `El monto debe estar entre $${min} y $${max} para ${product.name}.`;
    }

    if (!product.admitsTerm(requested.term)) {
      errors.termInMonths =
        `El plazo máximo para ${product.name} es de ${product.maxTerm.months} meses.`;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'La solicitud no cumple las condiciones del producto.');
    }
  }

  /**
   * ¿Los ingresos declarados soportan la cuota estimada del crédito?
   * Regla: la cuota no debe superar el 40 % del ingreso mensual.
   *
   * @param {CreditApplication} application
   * @param {CreditProduct} product
   * @returns {{ affordable: boolean, estimatedInstallment: number, ceiling: number }}
   */
  static assessAffordability(application, product) {
    const { amount, term } = application.requestedCredit;
    const monthlyRate = product.interestRate.monthlyFraction;
    const n = term.months;

    // Cuota fija (sistema francés): C = P * i / (1 - (1+i)^-n)
    const estimatedInstallment =
      monthlyRate === 0
        ? amount.amount / n
        : (amount.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

    const ceiling = application.employmentInfo.maxAffordableInstallment.amount;

    return {
      affordable: estimatedInstallment <= ceiling,
      estimatedInstallment: Math.round(estimatedInstallment),
      ceiling,
    };
  }
}
