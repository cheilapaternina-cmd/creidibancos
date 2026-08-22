import { defineContract } from './Contract.js';

/**
 * ICreditApplicationRepository — PUERTO DE SALIDA (driven port).
 *
 * Persistencia de solicitudes de crédito. La implementación por defecto es
 * en memoria + localStorage; puede cambiarse por un adaptador HTTP sin tocar
 * ni el dominio ni los casos de uso.
 *
 * Contrato:
 *  - save(application): Promise<CreditApplication>
 *  - findById(id): Promise<CreditApplication|null>
 *  - findAll(): Promise<CreditApplication[]>
 *  - nextIdentity(): string
 *
 * Capa: DOMINIO (puerto).
 */
export const ICreditApplicationRepository = defineContract('ICreditApplicationRepository', [
  'save',
  'findById',
  'findAll',
  'nextIdentity',
]);
