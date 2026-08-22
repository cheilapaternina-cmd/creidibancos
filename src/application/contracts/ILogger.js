import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * ILogger — PUERTO DE SALIDA.
 *
 * Registro técnico. Los casos de uso registran sin conocer `console`,
 * un servicio remoto ni el nivel configurado.
 *
 * Capa: APLICACIÓN (puerto).
 */
export const ILogger = defineContract('ILogger', ['debug', 'info', 'warn', 'error']);
