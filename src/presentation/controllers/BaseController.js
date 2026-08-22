import { IController } from '../contracts/IController.js';

/**
 * BaseController — implementación base de `IController`.
 *
 * Aporta el ciclo de vida común (montar vista, refrescar, liberar) y deja a
 * las subclases una única responsabilidad: obtener datos vía casos de uso y
 * construir el viewModel.
 *
 * Regla de la arquitectura: un controlador NUNCA importa repositorios,
 * entidades ni value objects. Solo casos de uso, su vista y el renderer.
 *
 * Capa: PRESENTACIÓN (controlador base).
 */
export class BaseController extends IController {
  /** @type {import('../shared/ViewRenderer.js').ViewRenderer} */
  #renderer;
  /** @type {import('../views/BaseView.js').BaseView} */
  #view;

  /**
   * @param {{
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer,
   *   view: import('../views/BaseView.js').BaseView
   * }} deps
   */
  constructor({ renderer, view }) {
    super();
    this.#renderer = renderer;
    this.#view = view;
  }

  /** @returns {import('../views/BaseView.js').BaseView} */
  get view() {
    return this.#view;
  }

  /** @returns {import('../shared/ViewRenderer.js').ViewRenderer} */
  get renderer() {
    return this.#renderer;
  }

  /**
   * Punto de entrada invocado por el router.
   * @param {{ path: string, params?: Object, query?: URLSearchParams }} context
   * @returns {Promise<void>}
   */
  async handle(context) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} debe implementar handle(context).`);
  }

  /**
   * Monta la vista con scroll al inicio (navegación entre rutas).
   * @param {Object} viewModel
   * @param {Object} [handlers]
   */
  present(viewModel, handlers = {}) {
    this.#renderer.mount(this.#view, viewModel, handlers);
  }

  /**
   * Re-pinta sin mover el scroll (interacción dentro de la misma vista).
   * @param {Object} viewModel
   * @param {Object} [handlers]
   */
  update(viewModel, handlers = {}) {
    this.#renderer.refresh(this.#view, viewModel, handlers);
  }

  /** Libera la vista al salir de la ruta. */
  dispose() {
    this.#view.destroy();
  }
}
