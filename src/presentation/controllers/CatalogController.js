import { BaseController } from './BaseController.js';

/**
 * CatalogController — controlador de la ruta `/`.
 *
 * Invoca `ListCreditProductsUseCase` y entrega los DTOs a `CatalogView`.
 * Si el caso de uso falla, notifica y pinta el catálogo vacío en lugar de
 * dejar la pantalla en blanco.
 *
 * Capa: PRESENTACIÓN (controlador).
 */
export class CatalogController extends BaseController {
  #listProducts;
  #notifier;

  /**
   * @param {{
   *   view: import('../views/CatalogView.js').CatalogView,
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer,
   *   listCreditProductsUseCase: import('../../application/usecases/ListCreditProductsUseCase.js').ListCreditProductsUseCase,
   *   notifier: import('../../application/contracts/INotifier.js').INotifier
   * }} deps
   */
  constructor({ view, renderer, listCreditProductsUseCase, notifier }) {
    super({ view, renderer });
    this.#listProducts = listCreditProductsUseCase;
    this.#notifier = notifier;
  }

  /**
   * @returns {Promise<void>}
   */
  async handle() {
    const result = await this.#listProducts.execute();

    if (result.isFailure) {
      this.#notifier.error(result.error, 'No se pudo cargar el catálogo');
      this.present({ products: [] });
      return;
    }

    this.present({ products: result.value.products });
  }
}
