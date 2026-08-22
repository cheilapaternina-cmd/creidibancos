import { Applicant } from '../../domain/valueobjects/Applicant.js';
import { RequestedCredit } from '../../domain/valueobjects/RequestedCredit.js';
import { EmploymentInfo } from '../../domain/valueobjects/EmploymentInfo.js';
import { ValidationError } from '../../domain/errors/ValidationError.js';

/**
 * CreditApplicationMapper — traductor ENTRADA CRUDA → VALUE OBJECTS.
 *
 * Recibe el objeto plano que viene del formulario y construye los value
 * objects del dominio. Acumula los errores de las TRES secciones en un único
 * `ValidationError`, para que el formulario pueda marcar todos los campos
 * fallidos en una sola pasada en vez de uno por intento.
 *
 * Capa: APLICACIÓN (mapper).
 */
export class CreditApplicationMapper {
  /**
   * @param {{
   *   fullName?: string, idNumber?: string, email?: string, phone?: string,
   *   productName?: string, amount?: string|number,
   *   termInMonths?: string|number, purpose?: string,
   *   companyName?: string, jobTitle?: string, monthlyIncome?: string|number
   * }} raw
   * @returns {{ applicant: Applicant, requestedCredit: RequestedCredit, employmentInfo: EmploymentInfo }}
   * @throws {ValidationError} Con todos los errores de campo acumulados.
   */
  static toValueObjects(raw = {}) {
    const errors = {};
    let applicant = null;
    let requestedCredit = null;
    let employmentInfo = null;

    try {
      applicant = new Applicant({
        fullName: raw.fullName,
        idNumber: raw.idNumber,
        email: raw.email,
        phone: raw.phone,
      });
    } catch (err) {
      CreditApplicationMapper.#collect(errors, err);
    }

    try {
      requestedCredit = new RequestedCredit({
        productName: raw.productName,
        amount: raw.amount,
        termInMonths: raw.termInMonths,
        purpose: raw.purpose,
      });
    } catch (err) {
      CreditApplicationMapper.#collect(errors, err);
    }

    try {
      employmentInfo = new EmploymentInfo({
        companyName: raw.companyName,
        jobTitle: raw.jobTitle,
        monthlyIncome: raw.monthlyIncome,
      });
    } catch (err) {
      CreditApplicationMapper.#collect(errors, err);
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'Hay campos obligatorios sin completar o inválidos.');
    }

    return { applicant, requestedCredit, employmentInfo };
  }

  /**
   * @param {Record<string,string>} target
   * @param {Error & { fieldErrors?: Record<string,string> }} err
   */
  static #collect(target, err) {
    if (err instanceof ValidationError) {
      Object.assign(target, err.fieldErrors);
      return;
    }
    // Un error no esperado no debe perderse silenciosamente.
    target._form = err?.message ?? 'Error al procesar el formulario.';
  }
}
