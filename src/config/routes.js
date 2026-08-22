/**
 * routes.js — tabla de rutas de la aplicación.
 *
 * Mismas rutas que el sitio original:
 *   /            → Catálogo
 *   /simulador   → Simulador
 *   /solicitar   → Solicitar
 *   *            → 404
 *
 * Solo declara constantes y nombres de controlador (strings). No importa
 * componentes ni controladores, para que cualquier módulo de presentación
 * pueda leer las rutas sin crear dependencias circulares.
 *
 * Capa: CONFIGURACIÓN.
 */

/** @readonly */
export const ROUTES = Object.freeze({
  CATALOG: '/',
  SIMULATOR: '/simulador',
  APPLICATION: '/solicitar',
});

/**
 * Definición declarativa consumida por el bootstrap: cada ruta se asocia a la
 * clave con la que el contenedor resuelve su controlador.
 *
 * @readonly
 */
export const ROUTE_TABLE = Object.freeze([
  Object.freeze({ path: ROUTES.CATALOG, controller: 'catalogController', title: 'CreditSmart — Catálogo' }),
  Object.freeze({ path: ROUTES.SIMULATOR, controller: 'simulatorController', title: 'CreditSmart — Simulador' }),
  Object.freeze({ path: ROUTES.APPLICATION, controller: 'applicationController', title: 'CreditSmart — Solicitar' }),
]);

/** Controlador para rutas no registradas. */
export const FALLBACK_CONTROLLER = 'notFoundController';
