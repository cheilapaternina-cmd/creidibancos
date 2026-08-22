import { BaseController } from './BaseController.js';

/**
 * NotFoundController — controlador de la ruta comodín `*`.
 *
 * Muestra la ruta solicitada, igual que el original (que imprimía
 * `location.pathname.substring(1)`).
 *
 * Capa: PRESENTACIÓN (controlador).
 */
export class NotFoundController extends BaseController {
  /**
   * @param {{
   *   view: import('../views/NotFoundView.js').NotFoundView,
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer
   * }} deps
   */
  constructor({ view, renderer }) {
    super({ view, renderer });
  }

  /**
   * @param {{ path: string }} context
   * @returns {Promise<void>}
   */
  async handle({ path = '/' } = {}) {
    this.present({ requestedPath: String(path).replace(/^\//, '') });
  }
}
