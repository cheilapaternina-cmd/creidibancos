import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * SimulatorView — vista de la ruta `/simulador`.
 *
 * Dos bloques independientes:
 *
 *  1. El SIMULADOR: producto, monto y plazo → cuota mensual, coste total y
 *     tabla de amortización (resumen anual o detalle mes a mes).
 *  2. El FILTRO del catálogo: búsqueda por nombre y por rango de monto.
 *
 * La vista no calcula nada: todas las cifras llegan ya formateadas en el
 * `SimulationDTO`. Tampoco decide si un monto es válido: pinta los errores por
 * campo que le pasa el controlador, tal como los produjo el dominio.
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
   *   catalog: Array<Object>,
   *   form: { productId: string, amount: string, termInMonths: string },
   *   bounds: { minAmount: number, maxAmount: number|null, maxTermMonths: number, amountRangeLabel: string }|null,
   *   simulation: Object|null,
   *   errors: Record<string,string>,
   *   schedule: { open: boolean, mode: 'yearly'|'monthly' },
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
  template({
    catalog,
    form,
    bounds,
    simulation,
    errors,
    schedule,
    products,
    ranges,
    query,
    selectedRangeIndex,
    matched,
    total,
    isFiltered,
  }) {
    return html`
      <div class="page">
        ${raw(this.#navbar.render({ activePath: ROUTES.SIMULATOR }))}

        <main class="page__main container container--7xl section">
          <h1 class="section__title section__title--page">Simulador de Crédito</h1>
          <p class="section__subtitle">
            Calcula tu cuota mensual y consulta cuánto pagarías en total
          </p>

          ${raw(this.#simulatorForm({ catalog, form, bounds, errors }))}
          ${raw(this.#simulationResult({ simulation }))}
          ${raw(this.#amortization({ simulation, schedule }))}

          <hr class="sim-divider" />

          <h2 class="section__title section__title--sub">Catálogo de productos</h2>
          <p class="section__subtitle">
            Busca y filtra los productos disponibles según tus necesidades
          </p>

          ${raw(this.#filters({ ranges, query, selectedRangeIndex }))}

          ${raw(
            this.#alert.render({
              variant: 'info',
              icon: 'ℹ️',
              message:
                'El catálogo es <strong>estático</strong>. Los cálculos, la búsqueda y los ' +
                'filtros se resuelven en el navegador.',
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

  /* ---------------------------- Simulador ---------------------------- */

  /**
   * @param {{ catalog: Array<Object>, form: Object, bounds: Object|null, errors: Record<string,string> }} props
   * @returns {string}
   */
  #simulatorForm({ catalog, form, bounds, errors }) {
    const amountError = errors.amount ?? '';
    const termError = errors.termInMonths ?? '';
    const productError = errors.productId ?? '';

    return html`
      <form class="panel panel--simulator" data-simulator novalidate>
        <h2 class="panel__title">🧮 Simula tu crédito</h2>
        <p class="panel__hint">
          ${bounds
            ? `Monto disponible: ${bounds.amountRangeLabel} · Plazo máximo: ${bounds.maxTermMonths} meses`
            : 'Elige un producto para empezar'}
        </p>

        <div class="grid-form">
          <div class="field">
            <label class="label label--block" for="sim-product">Producto de crédito</label>
            <select
              id="sim-product"
              name="productId"
              class="control control--select ${productError ? 'is-invalid' : ''}"
            >
              ${raw(
                catalog
                  .map(
                    (product) => html`
                      <option
                        value="${product.id}"
                        ${raw(String(product.id) === String(form.productId) ? 'selected' : '')}
                      >${product.icon} ${product.name} — ${product.annualRateLabel} E.A.</option>
                    `,
                  )
                  .join(''),
              )}
            </select>
            <span class="field__error" id="sim-product-error" role="alert">${productError}</span>
          </div>

          <div class="field">
            <label class="label label--block" for="sim-amount">Monto a solicitar (COP)</label>
            <input
              id="sim-amount"
              name="amount"
              type="number"
              inputmode="numeric"
              class="control ${amountError ? 'is-invalid' : ''}"
              value="${form.amount}"
              ${raw(bounds ? `min="${bounds.minAmount}"` : '')}
              ${raw(bounds && bounds.maxAmount !== null ? `max="${bounds.maxAmount}"` : '')}
              step="100000"
              autocomplete="off"
              ${raw(amountError ? 'aria-invalid="true" aria-describedby="sim-amount-error"' : '')}
            />
            <span class="field__error" id="sim-amount-error" role="alert">${amountError}</span>
          </div>

          <div class="field">
            <label class="label label--block" for="sim-term">Plazo (meses)</label>
            <input
              id="sim-term"
              name="termInMonths"
              type="number"
              inputmode="numeric"
              class="control ${termError ? 'is-invalid' : ''}"
              value="${form.termInMonths}"
              min="1"
              ${raw(bounds ? `max="${bounds.maxTermMonths}"` : '')}
              step="1"
              autocomplete="off"
              ${raw(termError ? 'aria-invalid="true" aria-describedby="sim-term-error"' : '')}
            />
            <span class="field__error" id="sim-term-error" role="alert">${termError}</span>
          </div>
        </div>

        <div class="filters__actions">
          <button type="submit" class="btn btn--primary">🧮 Calcular cuota</button>
          <button type="button" class="btn btn--outline" data-action="reset-simulation">
            Reiniciar
          </button>
        </div>
      </form>
    `;
  }

  /**
   * @param {{ simulation: Object|null }} props
   * @returns {string}
   */
  #simulationResult({ simulation }) {
    if (!simulation) {
      return this.#alert.render({
        variant: 'empty',
        icon: '🧮',
        message: 'Completa el monto y el plazo para ver tu cuota.',
      });
    }

    return html`
      <section class="sim-result ${simulation.themeClass}" aria-live="polite">
        <header class="sim-result__header">
          <span class="sim-result__icon" aria-hidden="true">${simulation.productIcon}</span>
          <div>
            <h2 class="sim-result__title">${simulation.productName}</h2>
            <p class="sim-result__meta">
              ${simulation.amountLabel} a ${simulation.termLabel} ·
              ${simulation.annualRateLabel} (${simulation.monthlyRateLabel})
            </p>
          </div>
        </header>

        <div class="sim-result__grid">
          ${raw(this.#metric('Cuota mensual', simulation.installmentLabel, true))}
          ${raw(this.#metric('Total en intereses', simulation.totalInterestLabel))}
          ${raw(this.#metric('Total a pagar', simulation.totalPaidLabel))}
          ${raw(this.#metric('Coste del crédito', simulation.interestRatioLabel))}
        </div>

        ${raw(
          simulation.hasResidualAdjustment
            ? html`<p class="sim-result__note">
                La última cuota es de <strong>${simulation.finalInstallmentLabel}</strong>: absorbe
                el ajuste por redondeo al peso de las ${simulation.termInMonths} cuotas.
              </p>`
            : '',
        )}
      </section>
    `;
  }

  /**
   * @param {string} label
   * @param {string} value
   * @param {boolean} [highlight]
   * @returns {string}
   */
  #metric(label, value, highlight = false) {
    return html`
      <div class="sim-metric ${highlight ? 'sim-metric--highlight' : ''}">
        <span class="sim-metric__label">${label}</span>
        <span class="sim-metric__value">${value}</span>
      </div>
    `;
  }

  /**
   * Tabla de amortización. Va plegada por defecto y arranca en resumen anual:
   * un crédito de vivienda a 240 meses son 240 filas que nadie quiere de golpe.
   *
   * @param {{ simulation: Object|null, schedule: { open: boolean, mode: string } }} props
   * @returns {string}
   */
  #amortization({ simulation, schedule }) {
    if (!simulation) return '';

    const rowCount = simulation.schedule.length;

    return html`
      <section class="sim-schedule">
        <div class="sim-schedule__bar">
          <button type="button" class="btn btn--outline" data-action="toggle-schedule"
                  aria-expanded="${schedule.open ? 'true' : 'false'}"
                  aria-controls="sim-schedule-table">
            ${schedule.open ? '▲ Ocultar' : '▼ Ver'} tabla de amortización (${rowCount} cuotas)
          </button>

          ${raw(
            schedule.open
              ? html`
                  <div class="sim-schedule__modes" role="group" aria-label="Nivel de detalle">
                    <button type="button"
                            class="btn btn--system ${schedule.mode === 'yearly' ? 'is-active' : ''}"
                            data-action="schedule-mode" data-mode="yearly"
                            aria-pressed="${schedule.mode === 'yearly' ? 'true' : 'false'}">
                      Resumen anual
                    </button>
                    <button type="button"
                            class="btn btn--system ${schedule.mode === 'monthly' ? 'is-active' : ''}"
                            data-action="schedule-mode" data-mode="monthly"
                            aria-pressed="${schedule.mode === 'monthly' ? 'true' : 'false'}">
                      Detalle mensual
                    </button>
                  </div>
                `
              : '',
          )}
        </div>

        ${raw(
          schedule.open
            ? html`<div class="sim-schedule__scroll" id="sim-schedule-table">
                ${raw(
                  schedule.mode === 'monthly'
                    ? this.#monthlyTable(simulation)
                    : this.#yearlyTable(simulation),
                )}
              </div>`
            : '',
        )}
      </section>
    `;
  }

  /**
   * @param {Object} simulation
   * @returns {string}
   */
  #yearlyTable(simulation) {
    return html`
      <table class="sim-table">
        <caption class="sim-table__caption">
          Resumen por año — ${simulation.productName}
        </caption>
        <thead>
          <tr>
            <th scope="col">Año</th>
            <th scope="col">Cuotas</th>
            <th scope="col">Pagado</th>
            <th scope="col">Intereses</th>
            <th scope="col">Capital</th>
            <th scope="col">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${raw(
            simulation.yearlySummary
              .map(
                (block) => html`
                  <tr>
                    <th scope="row">${block.year}</th>
                    <td>${block.rangeLabel}</td>
                    <td>${block.paidLabel}</td>
                    <td>${block.interestLabel}</td>
                    <td>${block.principalLabel}</td>
                    <td>${block.remainingBalanceLabel}</td>
                  </tr>
                `,
              )
              .join(''),
          )}
        </tbody>
      </table>
    `;
  }

  /**
   * @param {Object} simulation
   * @returns {string}
   */
  #monthlyTable(simulation) {
    return html`
      <table class="sim-table">
        <caption class="sim-table__caption">
          Detalle mes a mes — ${simulation.productName}
        </caption>
        <thead>
          <tr>
            <th scope="col">Cuota</th>
            <th scope="col">Pago</th>
            <th scope="col">Intereses</th>
            <th scope="col">Capital</th>
            <th scope="col">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${raw(
            simulation.schedule
              .map(
                (row) => html`
                  <tr>
                    <th scope="row">${row.number}</th>
                    <td>${row.paymentLabel}</td>
                    <td>${row.interestLabel}</td>
                    <td>${row.principalLabel}</td>
                    <td>${row.remainingBalanceLabel}</td>
                  </tr>
                `,
              )
              .join(''),
          )}
        </tbody>
      </table>
    `;
  }

  /* ------------------------------ Filtro ------------------------------ */

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

  /* ---------------------------- Ciclo de vida ---------------------------- */

  /**
   * Traduce eventos del DOM a intenciones del controlador. La vista nunca
   * procesa los datos: los lee del formulario y los pasa tal cual.
   *
   * @param {HTMLElement} root
   * @param {Object} handlers
   */
  afterRender(root, handlers = {}) {
    super.afterRender(root, handlers);

    this.#bindSimulator(handlers);
    this.#bindFilters(handlers);
    this.#restoreFocus(handlers.focusField);
  }

  /** @param {Object} handlers */
  #bindSimulator(handlers) {
    const form = this.query('[data-simulator]');
    if (!form) return;

    this.on(form, 'submit', (event) => {
      event.preventDefault();
      handlers.onSimulate?.(this.#readSimulation(form), null);
    });

    const product = form.querySelector('select[name="productId"]');
    this.on(product, 'change', (event) => handlers.onProductChange?.(event.target.value));

    for (const name of ['amount', 'termInMonths']) {
      const field = form.querySelector(`[name="${name}"]`);
      this.on(field, 'input', () => handlers.onSimulate?.(this.#readSimulation(form), name));
    }

    const reset = form.querySelector('[data-action="reset-simulation"]');
    this.on(reset, 'click', () => handlers.onResetSimulation?.());

    const toggle = this.query('[data-action="toggle-schedule"]');
    this.on(toggle, 'click', () => handlers.onToggleSchedule?.());

    for (const button of this.queryAll('[data-action="schedule-mode"]')) {
      this.on(button, 'click', () => handlers.onScheduleMode?.(button.dataset.mode));
    }
  }

  /** @param {Object} handlers */
  #bindFilters(handlers) {
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
  }

  /**
   * Tras un re-render completo el foco se pierde. El controlador indica qué
   * campo estaba activo y aquí se restaura con el cursor al final del texto.
   *
   * @param {string|null|undefined} focusField
   */
  #restoreFocus(focusField) {
    if (!focusField) return;

    const field = this.query(`[name="${focusField}"]`);
    if (!field) return;

    field.focus();
    if (typeof field.setSelectionRange === 'function' && field.type === 'text') {
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {{ amount: string, termInMonths: string }}
   */
  #readSimulation(form) {
    const data = new FormData(form);
    return {
      amount: String(data.get('amount') ?? ''),
      termInMonths: String(data.get('termInMonths') ?? ''),
    };
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
