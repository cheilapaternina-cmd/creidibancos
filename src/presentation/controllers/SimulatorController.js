import { BaseController } from './BaseController.js';

/**
 * SimulatorController — controlador de la ruta `/simulador`.
 *
 * Mantiene el estado de la interfaz (texto buscado + rango elegido), traduce
 * ese estado a la entrada del caso de uso `SearchCreditProductsUseCase` y
 * vuelve a pintar la vista con los resultados.
 *
 * El estado de UI vive aquí, no en la vista (que es sin estado) ni en el
 * dominio (que no conoce pantallas).
 *
 * Capa: PRESENTACIÓN (controlador).
 */
export class SimulatorController extends BaseController {
  #searchProducts;
  #getRanges;
  #amountRangeProvider;
  #notifier;

  /** @type {{ query: string, rangeIndex: number, focusField: string|null }} */
  #state = { query: '', rangeIndex: 0, focusField: null };

  /** @type {Array<{index:number,label:string}>} */
  #ranges = [];

  /**
   * @param {{
   *   view: import('../views/SimulatorView.js').SimulatorView,
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer,
   *   searchCreditProductsUseCase: import('../../application/usecases/SearchCreditProductsUseCase.js').SearchCreditProductsUseCase,
   *   getAmountRangeFiltersUseCase: import('../../application/usecases/GetAmountRangeFiltersUseCase.js').GetAmountRangeFiltersUseCase,
   *   amountRangeProvider: import('../../domain/contracts/IAmountRangeProvider.js').IAmountRangeProvider,
   *   notifier: import('../../application/contracts/INotifier.js').INotifier
   * }} deps
   */
  constructor({
    view,
    renderer,
    searchCreditProductsUseCase,
    getAmountRangeFiltersUseCase,
    amountRangeProvider,
    notifier,
  }) {
    super({ view, renderer });
    this.#searchProducts = searchCreditProductsUseCase;
    this.#getRanges = getAmountRangeFiltersUseCase;
    this.#amountRangeProvider = amountRangeProvider;
    this.#notifier = notifier;
  }

  /**
   * @returns {Promise<void>}
   */
  async handle() {
    this.#state = { query: '', rangeIndex: 0, focusField: null };

    const rangesResult = await this.#getRanges.execute();
    this.#ranges = rangesResult.isSuccess ? rangesResult.value : [];

    await this.#renderResults({ initial: true });
  }

  /**
   * Aplica los filtros que llegan de la vista.
   * @param {{ query: string, rangeIndex: number }} criteria
   */
  async onSearch({ query, rangeIndex }) {
    this.#state = { query, rangeIndex, focusField: 'query' };
    await this.#renderResults({ initial: false });
  }

  /** Restablece los filtros ("Limpiar"). */
  async onClear() {
    this.#state = { query: '', rangeIndex: 0, focusField: null };
    await this.#renderResults({ initial: false });
  }

  /**
   * @param {{ initial: boolean }} options
   * @returns {Promise<void>}
   */
  async #renderResults({ initial }) {
    const amountRange = await this.#amountRangeProvider.byIndex(this.#state.rangeIndex);
    const result = await this.#searchProducts.execute({
      query: this.#state.query,
      amountRange,
    });

    if (result.isFailure) {
      this.#notifier.error(result.error, 'No se pudo aplicar el filtro');
      return;
    }

    const viewModel = {
      products: result.value.products,
      ranges: this.#ranges,
      query: this.#state.query,
      selectedRangeIndex: this.#state.rangeIndex,
      matched: result.value.matched,
      total: result.value.total,
      isFiltered: result.value.isFiltered,
    };

    const handlers = this.#handlers();

    if (initial) this.present(viewModel, handlers);
    else this.update(viewModel, handlers);
  }

  /** @returns {Object} Callbacks que la vista invoca ante eventos del DOM. */
  #handlers() {
    return {
      onSearch: (criteria) => this.onSearch(criteria),
      onClear: () => this.onClear(),
      focusField: this.#state.focusField,
    };
  }
}
