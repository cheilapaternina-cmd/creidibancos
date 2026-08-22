/**
 * ViewRenderer — servicio de montaje de vistas en el DOM.
 *
 * Único punto del proyecto que escribe `innerHTML`. Concentrar aquí el acceso
 * al DOM permite que controladores y vistas sean testeables con un doble de
 * este servicio, y replica el comportamiento del original de volver arriba al
 * cambiar de ruta (el componente `ScrollToTop`).
 *
 * Capa: PRESENTACIÓN (servicio de infraestructura de UI).
 */
export class ViewRenderer {
  /** @type {HTMLElement} */
  #root;
  /** @type {import('../contracts/IView.js').IView|null} */
  #currentView = null;

  /**
   * @param {{ root: HTMLElement }} deps
   */
  constructor({ root }) {
    if (!root) {
      throw new Error('ViewRenderer requiere un elemento raíz.');
    }
    this.#root = root;
  }

  /**
   * Desmonta la vista anterior, pinta la nueva y enlaza sus eventos.
   *
   * @param {import('../views/BaseView.js').BaseView} view
   * @param {Object} viewModel
   * @param {Object} [handlers]
   * @param {{ scrollToTop?: boolean }} [options]
   */
  mount(view, viewModel, handlers = {}, { scrollToTop = true } = {}) {
    if (this.#currentView && this.#currentView !== view) {
      this.#currentView.destroy();
    }

    this.#root.innerHTML = view.render(viewModel);
    view.root = this.#root;
    view.afterRender(this.#root, handlers);
    this.#currentView = view;

    if (scrollToTop) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }

  /**
   * Re-pinta la vista actual sin volver arriba (usado por filtros en vivo).
   *
   * @param {import('../views/BaseView.js').BaseView} view
   * @param {Object} viewModel
   * @param {Object} [handlers]
   */
  refresh(view, viewModel, handlers = {}) {
    view.destroy();
    this.mount(view, viewModel, handlers, { scrollToTop: false });
  }

  /** Libera la vista montada (cambio de ruta / cierre). */
  clear() {
    if (this.#currentView) {
      this.#currentView.destroy();
      this.#currentView = null;
    }
    this.#root.innerHTML = '';
  }

  /** @returns {HTMLElement} */
  get root() {
    return this.#root;
  }
}
