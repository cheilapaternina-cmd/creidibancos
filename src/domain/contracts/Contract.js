import { NotImplementedError } from '../errors/NotImplementedError.js';
import { ContractViolationError } from '../errors/ContractViolationError.js';

/**
 * Contract — fábrica de interfaces para JavaScript.
 *
 * JavaScript no tiene `interface`. Este helper genera una clase base abstracta
 * cuyos métodos lanzan `NotImplementedError`, más metadatos para verificar en
 * tiempo de arranque que un adaptador cumple el puerto declarado.
 *
 * Uso:
 *   export const IThing = defineContract('IThing', ['doWork', 'reset']);
 *   class RealThing extends IThing { doWork() { ... } reset() { ... } }
 *   assertImplements(new RealThing(), IThing);
 *
 * Capa: DOMINIO. Sin dependencias externas.
 */

/**
 * Crea una clase-contrato (interfaz) abstracta.
 *
 * @param {string} name Nombre del contrato (por convención `IAlgo`).
 * @param {string[]} methods Métodos que la implementación debe proveer.
 * @returns {Function} Clase base abstracta.
 */
export function defineContract(name, methods) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('defineContract requiere un nombre de contrato.');
  }
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new TypeError(`El contrato "${name}" debe declarar al menos un método.`);
  }

  const ContractBase = class {
    constructor() {
      if (new.target === ContractBase) {
        throw new NotImplementedError(name, 'constructor');
      }
    }
  };

  Object.defineProperty(ContractBase, 'name', { value: name });
  Object.defineProperty(ContractBase, 'contractName', { value: name });
  Object.defineProperty(ContractBase, 'contractMethods', {
    value: Object.freeze([...methods]),
  });

  for (const method of methods) {
    Object.defineProperty(ContractBase.prototype, method, {
      value: function abstractMethod() {
        throw new NotImplementedError(name, method);
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  return ContractBase;
}

/**
 * Verifica que un objeto implemente todos los métodos del contrato.
 * Se usa en el contenedor de dependencias para fallar en el arranque
 * en lugar de en tiempo de ejecución.
 *
 * @param {Object} instance
 * @param {Function} ContractClass Clase creada con `defineContract`.
 * @returns {Object} La misma instancia (permite encadenar).
 * @throws {ContractViolationError}
 */
export function assertImplements(instance, ContractClass) {
  const contractName = ContractClass.contractName ?? ContractClass.name;
  const required = ContractClass.contractMethods ?? [];
  const implName = instance?.constructor?.name ?? String(instance);

  const missing = required.filter((method) => {
    const fn = instance?.[method];
    if (typeof fn !== 'function') return true;
    // Un método heredado sin sobreescribir sigue siendo el abstracto del contrato.
    return fn === ContractClass.prototype[method];
  });

  if (missing.length > 0) {
    throw new ContractViolationError(contractName, implName, missing);
  }

  return instance;
}

/**
 * Comprobación no destructiva (útil en tests o ramas condicionales).
 *
 * @param {Object} instance
 * @param {Function} ContractClass
 * @returns {boolean}
 */
export function implementsContract(instance, ContractClass) {
  try {
    assertImplements(instance, ContractClass);
    return true;
  } catch {
    return false;
  }
}
