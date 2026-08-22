import { html, raw, classNames } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * NavbarComponent — componente de presentación puro (stateless).
 *
 * Réplica de la barra superior del sitio original:
 *  - Marca "CreditSmart" con "Smart" en esmeralda + "by FinTech Solutions".
 *  - Tres enlaces: Catálogo · Simulador · Solicitar.
 *  - El enlace de la ruta activa se resalta (fondo azul suave).
 *  - "Solicitar" se pinta como CTA sólido cuando NO es la ruta activa.
 *
 * Es una función de (activePath) → HTML: sin estado, sin efectos.
 *
 * Capa: PRESENTACIÓN (componente).
 */
export class NavbarComponent {
  #urlBuilder;

  /** @param {{ urlBuilder: import('../shared/UrlBuilder.js').UrlBuilder }} deps */
  constructor({ urlBuilder }) {
    this.#urlBuilder = urlBuilder;
  }

  /**
   * @param {{ activePath: string }} props
   * @returns {string}
   */
  render({ activePath }) {
    const items = [
      { path: ROUTES.CATALOG, label: 'Catálogo', cta: false },
      { path: ROUTES.SIMULATOR, label: 'Simulador', cta: false },
      { path: ROUTES.APPLICATION, label: 'Solicitar', cta: true },
    ];

    return html`
      <nav class="navbar">
        <div class="navbar__inner container container--7xl">
          <div class="brand">
            <span class="brand__name">Credit<span class="brand__name-accent">Smart</span></span>
            <span class="brand__tagline">by FinTech Solutions</span>
          </div>
          <div class="navbar__links">
            ${raw(items.map((item) => this.#link(item, activePath)).join(''))}
          </div>
        </div>
      </nav>
    `;
  }

  /**
   * @param {{ path: string, label: string, cta: boolean }} item
   * @param {string} activePath
   * @returns {string}
   */
  #link(item, activePath) {
    const isActive = item.path === activePath;
    const cssClass = classNames(
      'navlink',
      isActive && 'navlink--active',
      !isActive && item.cta && 'navlink--cta',
    );

    return html`
      <a
        class="${cssClass}"
        href="${this.#urlBuilder.href(item.path)}"
        data-link
        ${raw(isActive ? 'aria-current="page"' : '')}
      >${item.label}</a>
    `;
  }
}
