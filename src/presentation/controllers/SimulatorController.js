import { BaseController } from './BaseController.js';

/**
 * SimulatorController — controlador de la ruta `/simulador`.
 *
 * La página tiene dos mitades independientes y este controlador guarda el
 * estado de UI de ambas:
 *
 *  1. El SIMULADOR: producto, monto y plazo → cuota, intereses y tabla de
 *     amortización, vía `SimulateCreditUseCase`.
 *  2. El FILTRO del catálogo: texto y rango de monto → tarjetas, vía
 *     `SearchCreditProductsUseCase`. No alimenta al simulador: son dos
 *     herramientas distintas sobre la misma página.
 *
 * El controlador no calcula cuotas ni valida límites: eso lo resuelve el
 * dominio y llega en el `Result` del caso de uso. Aquí solo se decide qué
 * pintar.
 *
 * Capa: PRESENTACIÓN (controlador).
 */
export class SimulatorController extends BaseController {
  #searchProducts;
  #listProducts;
  #simulateCredit;
  #getRanges;
  #amountRangeProvider;
  #notifier;

  /** Estado del filtro del catálogo. */
  #filter = { query: '', rangeIndex: 0 };

  /** Estado del formulario del simulador, en crudo (tal como se teclea). */
  #form = { productId: '', amount: '', termInMonths: '' };

  /** Estado de la tabla de amortización. */
  #schedule = { open: false, mode: 'yearly' };

  /** @type {Object|null} Última simulación válida (SimulationDTO). */
  #simulation = null;

  /** @type {Record<string,string>} Errores por campo devueltos por el dominio. */
  #errors = {};

  /** @type {string|null} Campo que tenía el foco antes del re-render. */
  #focusField = null;

  /** @type {Array<Object>} Catálogo completo en DTO: alimenta el `<select>`. */
  #catalog = [];

  /** @type {Array<{index:number,label:string}>} */
  #ranges = [];

  /**
   * @param {{
   *   view: import('../views/SimulatorView.js').SimulatorView,
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer,
   *   searchCreditProductsUseCase: import('../../application/usecases/SearchCreditProductsUseCase.js').SearchCreditProductsUseCase,
   *   listCreditProductsUseCase: import('../../application/usecases/ListCreditProductsUseCase.js').ListCreditProductsUseCase,
   *   simulateCreditUseCase: import('../../application/usecases/SimulateCreditUseCase.js').SimulateCreditUseCase,
   *   getAmountRangeFiltersUseCase: import('../../application/usecases/GetAmountRangeFiltersUseCase.js').GetAmountRangeFiltersUseCase,
   *   amountRangeProvider: import('../../domain/contracts/IAmountRangeProvider.js').IAmountRangeProvider,
   *   notifier: import('../../application/contracts/INotifier.js').INotifier
   * }} deps
   */
  constructor({
    view,
    renderer,
    searchCreditProductsUseCase,
    listCreditProductsUseCase,
    simulateCreditUseCase,
    getAmountRangeFiltersUseCase,
    amountRangeProvider,
    notifier,
  }) {
    super({ view, renderer });
    this.#searchProducts = searchCreditProductsUseCase;
    this.#listProducts = listCreditProductsUseCase;
    this.#simulateCredit = simulateCreditUseCase;
    this.#getRanges = getAmountRangeFiltersUseCase;
    this.#amountRangeProvider = amountRangeProvider;
    this.#notifier = notifier;
  }

  /**
   * Entrada a la ruta. Deja el simulador con una simulación ya hecha sobre el
   * primer producto: una pantalla que arranca vacía no enseña qué hace.
   *
   * @returns {Promise<void>}
   */
  async handle() {
    this.#filter = { query: '', rangeIndex: 0 };
    this.#schedule = { open: false, mode: 'yearly' };
    this.#simulation = null;
    this.#errors = {};
    this.#focusField = null;

    const [rangesResult, catalogResult] = await Promise.all([
      this.#getRanges.execute(),
      this.#listProducts.execute(),
    ]);

    this.#ranges = rangesResult.isSuccess ? rangesResult.value : [];
    this.#catalog = catalogResult.isSuccess ? catalogResult.value.products : [];

    this.#form = this.#defaultForm();
    await this.#runSimulation();

    await this.#render({ initial: true });
  }

  /* ----------------------------- Simulador ----------------------------- */

  /**
   * El usuario cambió monto o plazo.
   * @param {{ amount: string, termInMonths: string }} input
   */
  async onSimulate({ amount, termInMonths }, focusField = null) {
    this.#form = { ...this.#form, amount, termInMonths };
    this.#focusField = focusField;
    await this.#runSimulation();
    await this.#render({ initial: false });
  }

  /**
   * El usuario cambió de producto. El monto y el plazo se reencajan en los
   * límites del nuevo producto en vez de dejar al usuario con un error: el
   * cambio de producto es una exploración, no una equivocación.
   *
   * @param {string} productId
   */
  async onProductChange(productId) {
    const product = this.#catalog.find((item) => String(item.id) === String(productId));

    this.#form = product
      ? {
          productId: String(product.id),
          amount: String(SimulatorController.#clamp(
            Number(this.#form.amount),
            product.minAmount,
            product.maxAmount,
          )),
          termInMonths: String(Math.min(
            Number(this.#form.termInMonths) || 12,
            product.maxTermMonths,
          )),
        }
      : { ...this.#form, productId: String(productId) };

    this.#focusField = 'productId';
    await this.#runSimulation();
    await this.#render({ initial: false });
  }

  /** Despliega o pliega la tabla de amortización. */
  async onToggleSchedule() {
    this.#schedule = { ...this.#schedule, open: !this.#schedule.open };
    this.#focusField = null;
    await this.#render({ initial: false });
  }

  /**
   * Cambia entre el resumen anual y el detalle mes a mes.
   * @param {'yearly'|'monthly'} mode
   */
  async onScheduleMode(mode) {
    this.#schedule = { open: true, mode: mode === 'monthly' ? 'monthly' : 'yearly' };
    this.#focusField = null;
    await this.#render({ initial: false });
  }

  /** Devuelve el simulador a los valores de partida. */
  async onResetSimulation() {
    this.#form = this.#defaultForm();
    this.#schedule = { open: false, mode: 'yearly' };
    this.#focusField = null;
    await this.#runSimulation();
    await this.#render({ initial: false });
  }

  /* ------------------------------- Filtro ------------------------------- */

  /**
   * Aplica los filtros del catálogo.
   * @param {{ query: string, rangeIndex: number }} criteria
   */
  async onSearch({ query, rangeIndex }) {
    this.#filter = { query, rangeIndex };
    this.#focusField = 'query';
    await this.#render({ initial: false });
  }

  /** Restablece los filtros del catálogo ("Limpiar"). */
  async onClear() {
    this.#filter = { query: '', rangeIndex: 0 };
    this.#focusField = null;
    await this.#render({ initial: false });
  }

  /* ------------------------------ Interno ------------------------------ */

  /**
   * Ejecuta el caso de uso y guarda el resultado o los errores de campo.
   * Un fallo de validación NO borra la última simulación válida: el usuario
   * sigue viendo la cifra anterior mientras corrige el campo marcado.
   *
   * @returns {Promise<void>}
   */
  async #runSimulation() {
    const result = await this.#simulateCredit.execute(this.#form);

    if (result.isSuccess) {
      this.#simulation = result.value;
      this.#errors = {};
      return;
    }

    this.#errors = result.fieldErrors;

    // Un fallo sin campo señalado no es culpa del usuario: es un error técnico
    // y debe verse, no quedarse en silencio bajo un input.
    if (!result.hasFieldErrors) {
      this.#notifier.error(result.error, 'No se pudo simular el crédito');
    }
  }

  /**
   * @param {{ initial: boolean }} options
   * @returns {Promise<void>}
   */
  async #render({ initial }) {
    const amountRange = await this.#amountRangeProvider.byIndex(this.#filter.rangeIndex);
    const search = await this.#searchProducts.execute({
      query: this.#filter.query,
      amountRange,
    });

    if (search.isFailure) {
      this.#notifier.error(search.error, 'No se pudo aplicar el filtro');
      return;
    }

    const viewModel = {
      // Simulador
      catalog: this.#catalog,
      form: { ...this.#form },
      bounds: this.#bounds(),
      simulation: this.#simulation,
      errors: this.#errors,
      schedule: { ...this.#schedule },
      // Filtro del catálogo
      products: search.value.products,
      ranges: this.#ranges,
      query: this.#filter.query,
      selectedRangeIndex: this.#filter.rangeIndex,
      matched: search.value.matched,
      total: search.value.total,
      isFiltered: search.value.isFiltered,
    };

    const handlers = this.#handlers();

    if (initial) this.present(viewModel, handlers);
    else this.update(viewModel, handlers);
  }

  /**
   * Valores de arranque: primer producto del catálogo, su monto mínimo y un
   * plazo de 12 meses (o el máximo del producto, si admite menos).
   *
   * @returns {{ productId: string, amount: string, termInMonths: string }}
   */
  #defaultForm() {
    const first = this.#catalog[0];
    if (!first) return { productId: '', amount: '', termInMonths: '' };

    return {
      productId: String(first.id),
      amount: String(first.minAmount),
      termInMonths: String(Math.min(12, first.maxTermMonths)),
    };
  }

  /**
   * Límites del producto elegido, para que la vista pueda acotar los campos.
   * @returns {{ minAmount: number, maxAmount: number|null, maxTermMonths: number, amountRangeLabel: string }|null}
   */
  #bounds() {
    const product = this.#catalog.find(
      (item) => String(item.id) === String(this.#form.productId),
    );
    if (!product) return null;

    return {
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      maxTermMonths: product.maxTermMonths,
      amountRangeLabel: product.amountRangeLabel,
    };
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number|null} max
   * @returns {number}
   */
  static #clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (max !== null && value > max) return max;
    return value;
  }

  /** @returns {Object} Callbacks que la vista invoca ante eventos del DOM. */
  #handlers() {
    return {
      onSimulate: (input, focusField) => this.onSimulate(input, focusField),
      onProductChange: (productId) => this.onProductChange(productId),
      onToggleSchedule: () => this.onToggleSchedule(),
      onScheduleMode: (mode) => this.onScheduleMode(mode),
      onResetSimulation: () => this.onResetSimulation(),
      onSearch: (criteria) => this.onSearch(criteria),
      onClear: () => this.onClear(),
      focusField: this.#focusField,
    };
  }
}
