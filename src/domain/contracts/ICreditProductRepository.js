import { defineContract } from './Contract.js';

/**
 * ICreditProductRepository — PUERTO DE SALIDA (driven port).
 *
 * El dominio declara CÓMO necesita consultar productos de crédito; la
 * infraestructura decide DE DÓNDE vienen (memoria, HTTP, IndexedDB...).
 * Invierte la dependencia: el núcleo no conoce ninguna fuente de datos.
 *
 * Contrato:
 *  - findAll(): Promise<CreditProduct[]>
 *  - findById(id): Promise<CreditProduct|null>
 *  - findByCriteria(criteria): Promise<CreditProduct[]>
 *  - count(): Promise<number>
 *
 * Capa: DOMINIO (puerto).
 */
export const ICreditProductRepository = defineContract('ICreditProductRepository', [
  'findAll',
  'findById',
  'findByCriteria',
  'count',
]);
