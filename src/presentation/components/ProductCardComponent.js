import { html, raw, classNames } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * ProductCardComponent — tarjeta de producto de crédito.
 *
 * Dos variantes, exactamente como el original:
 *
 *  - `full` (Catálogo, `/`): cabecera grande, muestra requisitos y dos
 *    botones ("Ver detalles" → /simulador, "Solicitar" → /solicitar).
 *  - `compact` (Simulador, `/simulador`): cabecera reducida, sin requisitos y
 *    un solo botón ("Solicitar").
 *
 * Recibe un `CreditProductDTO` — nunca la entidad — por lo que no puede
 * ejecutar reglas de negocio desde la vista.
 *
 * Capa: PRESENTACIÓN (componente).
 */
export class ProductCardComponent {
  #urlBuilder;

  /** @param {{ urlBuilder: import('../shared/UrlBuilder.js').UrlBuilder }} deps */
  constructor({ urlBuilder }) {
    this.#urlBuilder = urlBuilder;
  }

  /**
   * @param {{
   *   product: import('../../application/dto/CreditProductDTO.js').CreditProductDTO,
   *   variant?: 'full'|'compact'
   * }} props
   * @returns {string}
   */
  render({ product, variant = 'full' }) {
    const isCompact = variant === 'compact';

    return html`
      <article
        class="${classNames('product-card', isCompact && 'product-card--compact', product.themeClass)}"
        data-product-id="${product.id}"
      >
        <div class="product-card__header">
          <span class="product-card__icon" aria-hidden="true">${product.icon}</span>
          <div>
            <h3 class="product-card__name">${product.name}</h3>
            <span class="product-card__term">Hasta ${product.maxTermMonths} meses</span>
          </div>
        </div>

        <div class="product-card__body">
          <p class="product-card__desc">${product.description}</p>

          <div class="product-card__metrics">
            <div>
              <p class="metric__label">Tasa anual</p>
              <p class="metric__value">${product.annualRateLabel}</p>
            </div>
            <div class="metric--right">
              <p class="metric__label">Plazo máx.</p>
              <p class="metric__value metric__value--sm">${product.maxTermLabel}</p>
            </div>
          </div>

          <div class="badge-amount">💰 ${product.amountRangeLabel}</div>

          ${raw(isCompact ? '' : this.#requirements(product))}
        </div>

        <div class="product-card__footer">
          ${raw(isCompact ? '' : this.#detailsButton())}
          <a
            class="btn btn--primary btn--card"
            href="${this.#urlBuilder.href(ROUTES.APPLICATION)}"
            data-link
          >Solicitar</a>
        </div>
      </article>
    `;
  }

  /**
   * @param {Object} product
   * @returns {string}
   */
  #requirements(product) {
    return html`
      <p class="product-card__requirements">
        <strong>Requisitos:</strong> ${product.requirements}
      </p>
    `;
  }

  /** @returns {string} */
  #detailsButton() {
    return html`
      <a
        class="btn btn--outline-brand btn--card"
        href="${this.#urlBuilder.href(ROUTES.SIMULATOR)}"
        data-link
      >Ver detalles</a>
    `;
  }
}
