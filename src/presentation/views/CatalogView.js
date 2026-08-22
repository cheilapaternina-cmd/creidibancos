import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * CatalogView — vista de la ruta `/` (Catálogo).
 *
 * Réplica de la página principal:
 *   navbar · hero azul · "Nuestros Productos" · grid de 5 tarjetas · footer.
 *
 * Recibe todo por viewModel; no llama a repositorios ni casos de uso.
 *
 * Capa: PRESENTACIÓN (vista).
 */
export class CatalogView extends BaseView {
  #navbar;
  #footer;
  #productCard;
  #urlBuilder;

  /**
   * @param {{
   *   navbar: import('../components/NavbarComponent.js').NavbarComponent,
   *   footer: import('../components/FooterComponent.js').FooterComponent,
   *   productCard: import('../components/ProductCardComponent.js').ProductCardComponent,
   *   urlBuilder: import('../shared/UrlBuilder.js').UrlBuilder
   * }} deps
   */
  constructor({ navbar, footer, productCard, urlBuilder }) {
    super();
    this.#navbar = navbar;
    this.#footer = footer;
    this.#productCard = productCard;
    this.#urlBuilder = urlBuilder;
  }

  /**
   * @param {{ products: Array<Object> }} viewModel
   * @returns {string}
   */
  template({ products }) {
    return html`
      <div class="page">
        ${raw(this.#navbar.render({ activePath: ROUTES.CATALOG }))}

        ${raw(this.#hero())}

        <main class="page__main container container--7xl section section--catalog">
          <h2 class="section__title">Nuestros Productos</h2>
          <p class="section__subtitle">Elige el crédito que mejor se adapta a tus necesidades</p>

          <div class="grid-products">
            ${raw(
              products
                .map((product) => this.#productCard.render({ product, variant: 'full' }))
                .join(''),
            )}
          </div>
        </main>

        ${raw(this.#footer.render({ variant: 'catalog' }))}
      </div>
    `;
  }

  /** @returns {string} */
  #hero() {
    return html`
      <header class="hero">
        <div class="hero__inner">
          <h1 class="hero__title">
            Tu crédito ideal,<br />
            <span class="hero__title-accent">en un solo lugar</span>
          </h1>
          <p class="hero__subtitle">
            Consulta, simula y solicita créditos de forma rápida, segura y 100% en línea.
          </p>
          <div class="hero__actions">
            <a class="btn btn--accent" href="${this.#urlBuilder.href(ROUTES.SIMULATOR)}" data-link>
              Simular Crédito
            </a>
            <a
              class="btn btn--ghost-light"
              href="${this.#urlBuilder.href(ROUTES.APPLICATION)}"
              data-link
            >
              Solicitar Ahora
            </a>
          </div>
        </div>
      </header>
    `;
  }
}
