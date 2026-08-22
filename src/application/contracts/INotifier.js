import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * INotifier — PUERTO DE SALIDA.
 *
 * Aviso al usuario del resultado de una operación. La implementación por
 * defecto pinta toasts en el DOM; podría ser un `alert()`, un banner o un
 * canal push sin tocar los casos de uso ni los controladores.
 *
 * Capa: APLICACIÓN (puerto).
 */
export const INotifier = defineContract('INotifier', ['success', 'error', 'info']);
