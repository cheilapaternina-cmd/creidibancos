import { ValidationError } from '../errors/ValidationError.js';
import { CreditProduct } from '../entities/CreditProduct.js';
import { CreditApplication } from '../entities/CreditApplication.js';
import { CreditSimulationService } from './CreditSimulationService.js';

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

    const requested = application.requestedCredit;

    // Mismo diagnóstico que usa el simulador: si cambian los límites de un
    // producto, ambas rutas lo reflejan sin tocar dos sitios.
    const errors = CreditSimulationService.productFieldErrors(
      product,
      requested.amount,
      requested.term,
    );

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

    // La fórmula de la cuota vive en CreditSimulationService y solo ahí: aquí
    // se consume para que la solicitud y el simulador no puedan discrepar.
    const estimatedInstallment = CreditSimulationService.monthlyInstallmentAmount(
      amount.amount,
      product.interestRate.monthlyFraction,
      term.months,
    );

    const ceiling = application.employmentInfo.maxAffordableInstallment.amount;

    return {
      affordable: estimatedInstallment <= ceiling,
      estimatedInstallment: Math.round(estimatedInstallment),
      ceiling,
    };
  }
}
