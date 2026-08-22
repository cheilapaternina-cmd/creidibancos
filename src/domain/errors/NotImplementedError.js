import { DomainError } from './DomainError.js';

/**
 * NotImplementedError
 * Lanzado por los métodos de un contrato (interfaz) que no fueron
 * implementados por la clase concreta. Hace que las interfaces de JavaScript
 * fallen de forma explícita y temprana.
 *
 * Capa: DOMINIO.
 */
export class NotImplementedError extends DomainError {
  /**
   * @param {string} contractName Nombre del contrato/interfaz.
   * @param {string} methodName   Nombre del método no implementado.
   */
  constructor(contractName, methodName) {
    super(
      `${contractName}.${methodName}() debe ser implementado por la clase concreta.`,
      { code: 'NOT_IMPLEMENTED', details: { contractName, methodName } },
    );
  }
}
