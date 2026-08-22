import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * IUseCase — CONTRATO de caso de uso (Command/Query único).
 *
 * Todos los casos de uso exponen una sola operación `execute(input)`.
 * Un único método por clase mantiene el Principio de Responsabilidad Única y
 * permite decorar cualquier caso de uso (logging, caché, métricas) sin
 * conocer su tipo concreto — Principio Abierto/Cerrado.
 *
 * Capa: APLICACIÓN (puerto de entrada / driving port).
 */
export const IUseCase = defineContract('IUseCase', ['execute']);
