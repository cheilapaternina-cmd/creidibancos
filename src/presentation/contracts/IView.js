import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * IView — CONTRATO de vista (la "V" de MVC).
 *
 * Una vista es una función pura de estado a HTML más un gancho opcional para
 * enlazar eventos tras el montaje. NO consulta repositorios, no decide
 * navegación y no contiene reglas de negocio: solo pinta lo que el controlador
 * le entrega.
 *
 * Contrato:
 *  - render(viewModel): string      HTML de la vista
 *  - afterRender(root, handlers): void  Enlace de eventos (opcional en efecto)
 *  - destroy(): void                Limpieza de listeners/timers
 *
 * Capa: PRESENTACIÓN (puerto).
 */
export const IView = defineContract('IView', ['render', 'afterRender', 'destroy']);
