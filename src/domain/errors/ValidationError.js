import { DomainError } from './DomainError.js';

/**
 * ValidationError
 * Agrupa violaciones de invariantes de entidades o de reglas de validación
 * de entrada. Transporta un mapa `campo -> mensaje` para que la capa de
 * presentación lo pinte sin volver a interpretar reglas de negocio.
 *
 * Capa: DOMINIO.
 */
export class ValidationError extends DomainError {
  /**
   * @param {Record<string, string>} fieldErrors
   * @param {string} [message]
   */
  constructor(fieldErrors = {}, message = 'La información suministrada no es válida.') {
    super(message, { code: 'VALIDATION_ERROR', details: { fieldErrors } });
    /** @type {Readonly<Record<string, string>>} */
    this.fieldErrors = Object.freeze({ ...fieldErrors });
  }

  /** @returns {boolean} */
  get isEmpty() {
    return Object.keys(this.fieldErrors).length === 0;
  }

  /** @returns {string[]} */
  get fields() {
    return Object.keys(this.fieldErrors);
  }
}
