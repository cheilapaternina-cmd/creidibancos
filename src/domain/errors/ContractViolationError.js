import { DomainError } from './DomainError.js';

/**
 * ContractViolationError
 * Se lanza cuando un adaptador registrado en el contenedor de dependencias
 * no cumple el contrato (puerto) que declara implementar.
 *
 * Es el mecanismo que sustituye la verificación estática de interfaces:
 * garantiza el Principio de Sustitución de Liskov en tiempo de arranque.
 *
 * Capa: DOMINIO.
 */
export class ContractViolationError extends DomainError {
  /**
   * @param {string} contractName
   * @param {string} implementationName
   * @param {string[]} missingMethods
   */
  constructor(contractName, implementationName, missingMethods) {
    super(
      `"${implementationName}" no cumple el contrato "${contractName}". ` +
        `Métodos faltantes: ${missingMethods.join(', ')}.`,
      {
        code: 'CONTRACT_VIOLATION',
        details: { contractName, implementationName, missingMethods },
      },
    );
  }
}
