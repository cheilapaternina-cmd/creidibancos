import { IView } from '../contracts/IView.js';

/**
 * BaseView — implementación base de `IView` (patrón Template Method).
 *
 * Centraliza el ciclo de vida (render → afterRender → destroy) y la gestión de
 * listeners, de modo que las vistas concretas solo implementen `template()`.
 * Cada listener registrado con `on()` se elimina en `destroy()`: sin fugas al
 * cambiar de ruta.
 *
 * Capa: PRESENTACIÓN (vista base).
 */
export class BaseView extends IView {
  /** @type {Array<{ target: EventTarget, type: string, handler: Function, options?: Object }>} */
  #listeners = [];
  /** @type {HTMLElement|null} */
  #root = null;

  /**
   * Hook obligatorio en las subclases: devuelve el HTML de la vista.
   * @param {Object} viewModel
   * @returns {string}
   */
  template(viewModel) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} debe implementar template(viewModel).`);
  }

  /**
   * @param {Object} viewModel
   * @returns {string}
   */
  render(viewModel) {
    return this.template(viewModel);
  }

  /**
   * Se ejecuta después de insertar el HTML en el DOM.
   * Las subclases lo sobreescriben para enlazar eventos.
   *
   * @param {HTMLElement} root Contenedor donde se montó la vista.
   * @param {Object} [handlers] Callbacks provistos por el controlador.
   */
  afterRender(root, handlers = {}) { // eslint-disable-line no-unused-vars
    this.#root = root;
  }

  /**
   * Registra un listener con limpieza automática.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {Object} [options]
   */
  on(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    this.#listeners.push({ target, type, handler, options });
  }

  /**
   * @param {string} selector
   * @returns {HTMLElement|null}
   */
  query(selector) {
    return this.#root ? this.#root.querySelector(selector) : null;
  }

  /**
   * @param {string} selector
   * @returns {HTMLElement[]}
   */
  queryAll(selector) {
    return this.#root ? Array.from(this.#root.querySelectorAll(selector)) : [];
  }

  /** @returns {HTMLElement|null} */
  get root() {
    return this.#root;
  }

  /** @param {HTMLElement|null} element */
  set root(element) {
    this.#root = element;
  }

  /** Libera todos los listeners registrados. */
  destroy() {
    for (const { target, type, handler, options } of this.#listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.#listeners = [];
    this.#root = null;
  }
}
