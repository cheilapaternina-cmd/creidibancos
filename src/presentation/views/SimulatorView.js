import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * SimulatorView — vista de la ruta `/simulador`.
 *
 * Réplica de la página del simulador: panel de filtros (búsqueda por nombre +
 * rango de monto), aviso informativo, y grid de tarjetas compactas.
 *
 * A diferencia del original —donde los filtros eran decorativos— aquí los
 * botones "🔍 Buscar" y "Limpiar" están cableados a callbacks que el
 * controlador provee. La vista NO filtra: solo notifica la intención.
 *
 * Capa: PRESENTACIÓN (vista).
 */
export class SimulatorView extends BaseView {
  #navbar;
  #footer;
  #productCard;
  #alert;

  /**
   * @param {{
   *   navbar: import('../components/NavbarComponent.js').NavbarComponent,
   *   footer: import('../components/FooterComponent.js').FooterComponent,
   *   productCard: import('../components/ProductCardComponent.js').ProductCardComponent,
   *   alert: import('../components/AlertComponent.js').AlertComponent
   * }} deps
   */
  constructor({ navbar, footer, productCard, alert }) {
    super();
    this.#navbar = navbar;
    this.#footer = footer;
    this.#productCard = productCard;
    this.#alert = alert;
  }

  /**
   * @param {{
   *   products: Array<Object>,
   *   ranges: Array<{index:number,label:string}>,
   *   query: string,
   *   selectedRangeIndex: number,
   *   matched: number,
   *   total: number,
   *   isFiltered: boolean
   * }} viewModel
   * @returns {string}
   */
  template({ products, ranges, query, selectedRangeIndex, matched, total, isFiltered }) {
    return html`
      <div class="page">
        ${raw(this.#navbar.render({ activePath: ROUTES.SIMULATOR }))}

        <main class="page__main container container--7xl section">
          <h1 class="section__title section__title--page">Simulador de Crédito</h1>
          <p class="section__subtitle">
            Busca y filtra los productos disponibles según tus necesidades
          </p>

          ${raw(this.#filters({ ranges, query, selectedRangeIndex }))}

          ${raw(
            this.#alert.render({
              variant: 'info',
              icon: 'ℹ️',
              message:
                'Los datos del catálogo son <strong>estáticos</strong>. La búsqueda y los filtros se resuelven en el navegador.',
            }),
          )}

          ${raw(
            isFiltered
              ? html`<p class="results-count">
                  Mostrando <strong>${matched}</strong> de <strong>${total}</strong> productos
                </p>`
              : '',
          )}

          ${raw(
            products.length === 0
              ? this.#alert.render({
                  variant: 'empty',
                  icon: '🔎',
                  message: 'Ningún producto coincide con los filtros aplicados.',
                })
              : html`
                  <div class="grid-products" data-results>
                    ${raw(
                      products
                        .map((product) => this.#productCard.render({ product, variant: 'compact' }))
                        .join(''),
                    )}
                  </div>
                `,
          )}
        </main>

        ${raw(this.#footer.render({ variant: 'compact' }))}
      </div>
    `;
  }

  /**
   * @param {{ ranges: Array<{index:number,label:string}>, query: string, selectedRangeIndex: number }} props
   * @returns {string}
   */
  #filters({ ranges, query, selectedRangeIndex }) {
    return html`
      <form class="panel panel--filters" data-filters novalidate>
        <div class="filters__grid">
          <div>
            <label class="label label--block" for="filter-query">Buscar por nombre</label>
            <input
              id="filter-query"
              name="query"
              type="text"
              class="control"
              placeholder="Ej: Crédito Vehículo..."
              value="${query}"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="label label--block" for="filter-range">Filtrar por rango de monto</label>
            <select id="filter-range" name="rangeIndex" class="control control--select">
              ${raw(
                ranges
                  .map(
                    (range) => html`
                      <option
                        value="${range.index}"
                        ${raw(range.index === selectedRangeIndex ? 'selected' : '')}
                      >${range.label}</option>
                    `,
                  )
                  .join(''),
              )}
            </select>
          </div>
        </div>

        <div class="filters__actions">
          <button type="submit" class="btn btn--primary">🔍 Buscar</button>
          <button type="button" class="btn btn--outline" data-action="clear">Limpiar</button>
        </div>
      </form>
    `;
  }

  /**
   * Enlaza los filtros. La vista traduce eventos del DOM a intenciones del
   * controlador (`onSearch`, `onClear`) y nada más.
   *
   * @param {HTMLElement} root
   * @param {{ onSearch?: (criteria:{query:string,rangeIndex:number})=>void, onClear?: ()=>void }} handlers
   */
  afterRender(root, handlers = {}) {
    super.afterRender(root, handlers);

    const form = this.query('[data-filters]');
    if (!form) return;

    this.on(form, 'submit', (event) => {
      event.preventDefault();
      handlers.onSearch?.(this.#readCriteria(form));
    });

    // Búsqueda incremental: el usuario ve resultados sin pulsar "Buscar".
    const input = form.querySelector('input[name="query"]');
    this.on(input, 'input', () => handlers.onSearch?.(this.#readCriteria(form)));

    const select = form.querySelector('select[name="rangeIndex"]');
    this.on(select, 'change', () => handlers.onSearch?.(this.#readCriteria(form)));

    const clearButton = form.querySelector('[data-action="clear"]');
    this.on(clearButton, 'click', () => handlers.onClear?.());

    this.#restoreFocus(form, handlers.focusField);
  }

  /**
   * Tras un re-render completo el foco se pierde. El controlador indica qué
   * campo estaba activo y aquí se restaura con el cursor al final del texto.
   *
   * @param {HTMLFormElement} form
   * @param {string|null|undefined} focusField
   */
  #restoreFocus(form, focusField) {
    if (!focusField) return;

    const field = form.querySelector(`[name="${focusField}"]`);
    if (!field) return;

    field.focus();
    if (typeof field.setSelectionRange === 'function' && field.type === 'text') {
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {{ query: string, rangeIndex: number }}
   */
  #readCriteria(form) {
    const data = new FormData(form);
    return {
      query: String(data.get('query') ?? ''),
      rangeIndex: Number(data.get('rangeIndex') ?? 0),
    };
  }
}
