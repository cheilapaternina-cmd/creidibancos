import { defineContract } from './Contract.js';

/**
 * IClock — PUERTO DE SALIDA (driven port).
 *
 * Aísla al dominio del reloj del sistema. Permite fechas deterministas en
 * pruebas (`FixedClock`) sin cambiar una línea de la lógica de negocio.
 *
 * Contrato:
 *  - now(): Date
 *  - timestamp(): number
 *
 * Capa: DOMINIO (puerto).
 */
export const IClock = defineContract('IClock', ['now', 'timestamp']);
