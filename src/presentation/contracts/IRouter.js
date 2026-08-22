import { defineContract } from '../../domain/contracts/Contract.js';

/**
 * IRouter — PUERTO de enrutamiento (driving port).
 *
 * La presentación declara qué necesita de un router; la infraestructura elige
 * la técnica (History API, hash, memoria para tests).
 *
 * Contrato:
 *  - register(path, controller): void
 *  - setFallback(controller): void
 *  - start(): Promise<void>
 *  - navigate(path, options?): Promise<void>
 *  - currentPath(): string
 *
 * Capa: PRESENTACIÓN (puerto).
 */
export const IRouter = defineContract('IRouter', [
  'register',
  'setFallback',
  'start',
  'navigate',
  'currentPath',
]);
