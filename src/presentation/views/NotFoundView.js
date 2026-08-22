import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';

/**
 * NotFoundView — vista de la ruta comodín `*` (404).
 *
 * Réplica de la pantalla 404 del original, incluida su paleta slate distinta
 * al resto del sitio, el código "404", la regla horizontal, el texto
 * "Page Not Found" y el botón "Go Home" con su icono SVG inline.
 *
 * Capa: PRESENTACIÓN (vista).
 */
export class NotFoundView extends BaseView {
  #urlBuilder;

  /** @param {{ urlBuilder: import('../shared/UrlBuilder.js').UrlBuilder }} deps */
  constructor({ urlBuilder }) {
    super();
    this.#urlBuilder = urlBuilder;
  }

  /**
   * @param {{ requestedPath: string }} viewModel
   * @returns {string}
   */
  template({ requestedPath }) {
    return html`
      <div class="sys-page">
        <div class="sys-page__inner">
          <div class="sys-block">
            <div>
              <h1 class="sys-code">404</h1>
              <div class="sys-rule"></div>
            </div>

            <div>
              <h2 class="sys-title">Page Not Found</h2>
              <p class="sys-text">
                The page
                <span class="sys-text__highlight">"${requestedPath}"</span>
                could not be found in this application.
              </p>
            </div>

            <div class="sys-actions">
              <a class="btn--system" href="${this.#urlBuilder.href('/')}" data-link>
                ${raw(NotFoundView.#homeIcon())}
                Go Home
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /** @returns {string} Icono "home" idéntico al SVG inline del original. */
  static #homeIcon() {
    return `
      <svg class="btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    `;
  }
}
