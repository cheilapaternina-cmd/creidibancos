import { IRouter } from '../../presentation/contracts/IRouter.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { IController } from '../../presentation/contracts/IController.js';

/**
 * HistoryRouter — ADAPTADOR de `IRouter` sobre la History API.
 *
 * Reproduce el comportamiento del enrutado original (react-router en modo
 * browser): URLs limpias sin `#`, navegación sin recarga, botón atrás
 * funcional, scroll al inicio en cada ruta nueva y scroll al ancla si la URL
 * trae hash.
 *
 * Intercepta los clics en cualquier `<a data-link>` mediante delegación en
 * `document`, de modo que las vistas solo declaran enlaces normales — siguen
 * funcionando con "abrir en pestaña nueva" y con clic central.
 *
 * Capa: INFRAESTRUCTURA (adaptador de entrada).
 */
export class HistoryRouter extends IRouter {
  /** @type {Map<string, IController>} */
  #routes = new Map();
  /** @type {IController|null} */
  #fallback = null;
  /** @type {IController|null} */
  #active = null;
  /** @type {import('../../presentation/shared/UrlBuilder.js').UrlBuilder} */
  #urlBuilder;
  /** @type {import('../../application/contracts/ILogger.js').ILogger} */
  #logger;
  #started = false;

  /**
   * @param {{
   *   urlBuilder: import('../../presentation/shared/UrlBuilder.js').UrlBuilder,
   *   logger: import('../../application/contracts/ILogger.js').ILogger
   * }} deps
   */
  constructor({ urlBuilder, logger }) {
    super();
    this.#urlBuilder = urlBuilder;
    this.#logger = logger;
  }

  /**
   * @param {string} path Ruta de aplicación, ej. "/simulador".
   * @param {IController} controller
   * @returns {HistoryRouter} this (fluido)
   */
  register(path, controller) {
    assertImplements(controller, IController);
    this.#routes.set(HistoryRouter.#normalize(path), controller);
    return this;
  }

  /**
   * @param {IController} controller Controlador para rutas no registradas.
   * @returns {HistoryRouter}
   */
  setFallback(controller) {
    assertImplements(controller, IController);
    this.#fallback = controller;
    return this;
  }

  /**
   * Arranca el router: enlaza eventos y resuelve la URL actual.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.#started) return;
    this.#started = true;

    window.addEventListener('popstate', () => {
      this.#resolve(this.currentPath(), { restoreScroll: true });
    });

    document.addEventListener('click', (event) => this.#onDocumentClick(event));

    await this.#resolve(this.currentPath(), { restoreScroll: false });
  }

  /**
   * Navega a una ruta empujando una entrada al historial.
   * @param {string} path
   * @param {{ replace?: boolean }} [options]
   * @returns {Promise<void>}
   */
  async navigate(path, { replace = false } = {}) {
    const routePath = HistoryRouter.#normalize(path);
    const href = this.#urlBuilder.href(routePath);

    if (replace) window.history.replaceState({}, '', href);
    else window.history.pushState({}, '', href);

    await this.#resolve(routePath, { restoreScroll: false });
  }

  /**
   * @returns {string} Ruta de aplicación actual (sin el prefijo de despliegue).
   */
  currentPath() {
    return this.#urlBuilder.toRoutePath(window.location.pathname);
  }

  /**
   * @param {string} path
   * @param {{ restoreScroll: boolean }} options
   * @returns {Promise<void>}
   */
  async #resolve(path, { restoreScroll }) {
    const controller = this.#routes.get(path) ?? this.#fallback;

    if (!controller) {
      this.#logger.error('Ruta sin controlador y sin fallback', { path });
      return;
    }

    if (this.#active && this.#active !== controller) {
      this.#active.dispose();
    }
    this.#active = controller;

    try {
      await controller.handle({
        path,
        query: new URLSearchParams(window.location.search),
        hash: window.location.hash,
      });
      this.#logger.debug('Ruta resuelta', { path, controller: controller.constructor.name });
    } catch (err) {
      this.#logger.error('Fallo al resolver la ruta', { path, message: err?.message });
      throw err;
    }

    if (!restoreScroll) this.#applyHashScroll();
  }

  /**
   * Réplica del `ScrollToTop` original: si la URL trae hash, desplaza al
   * elemento correspondiente en lugar de ir al inicio.
   */
  #applyHashScroll() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* hash no decodificable: se usa tal cual */
    }

    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  /**
   * Delegación de clics sobre enlaces internos.
   * @param {MouseEvent} event
   */
  #onDocumentClick(event) {
    // Respeta abrir-en-nueva-pestaña, clic central y modificadores.
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = event.target instanceof Element ? event.target.closest('a[data-link]') : null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    const routePath = this.#urlBuilder.toRoutePath(url.pathname);

    if (routePath === this.currentPath() && url.hash === window.location.hash) return;

    this.navigate(routePath);
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  static #normalize(path) {
    let value = String(path ?? '/');
    if (!value.startsWith('/')) value = `/${value}`;
    if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
    return value;
  }
}
