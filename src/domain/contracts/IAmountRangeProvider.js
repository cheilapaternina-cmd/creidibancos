import { defineContract } from './Contract.js';

/**
 * IAmountRangeProvider — PUERTO DE SALIDA.
 *
 * Provee los rangos de monto ofrecidos como filtro en el simulador.
 * Son datos de referencia: hoy estáticos, mañana configurables por backoffice.
 *
 * Contrato:
 *  - all(): Promise<AmountRange[]>
 *  - byIndex(index): Promise<AmountRange|null>
 *
 * Capa: DOMINIO (puerto).
 */
export const IAmountRangeProvider = defineContract('IAmountRangeProvider', [
  'all',
  'byIndex',
]);
