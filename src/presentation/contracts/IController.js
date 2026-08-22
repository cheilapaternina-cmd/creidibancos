import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * IController — CONTRATO de controlador (la "C" de MVC).
 *
 * Un controlador recibe una petición de ruta, invoca CASOS DE USO (nunca
 * repositorios ni entidades directamente) y entrega el resultado a su vista.
 *
 * Contrato:
 *  - handle(context): Promise<void>   context = { path, params, query }
 *  - dispose(): void                  Libera la vista al cambiar de ruta
 *
 * Capa: PRESENTACIÓN (puerto).
 */
export const IController = defineContract('IController', ['handle', 'dispose']);
