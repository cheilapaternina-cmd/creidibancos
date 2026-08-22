import { defineContract } from './Contract.js';

/**
 * IMoneyFormatter — PUERTO DE SALIDA (driven port).
 *
 * El dominio necesita representar dinero como texto para el usuario, pero no
 * debe conocer `Intl`, locales ni el navegador. La infraestructura provee el
 * adaptador (`IntlMoneyFormatter`).
 *
 * Contrato:
 *  - format(money): string        → "$ 5.000.000"
 *  - formatCompact(money): string → "$ 5 M"
 *  - locale: string (getter)
 *
 * Capa: DOMINIO (puerto).
 */
export const IMoneyFormatter = defineContract('IMoneyFormatter', [
  'format',
  'formatCompact',
]);
