import { defineContract } from './Contract.js';

/**
 * IIdGenerator — PUERTO DE SALIDA (driven port).
 *
 * Genera identidades para nuevas entidades. Aísla al dominio de `crypto`
 * y permite ids secuenciales deterministas en pruebas.
 *
 * Contrato:
 *  - generate(prefix?): string
 *
 * Capa: DOMINIO (puerto).
 */
export const IIdGenerator = defineContract('IIdGenerator', ['generate']);
