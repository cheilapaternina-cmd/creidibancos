import { BaseController } from './BaseController.js';

/**
 * ApplicationController — controlador de la ruta `/solicitar`.
 *
 * Responsabilidades:
 *  - Cargar los nombres de producto para el `<select>` "Tipo de crédito".
 *  - Recibir los valores del formulario y delegar en
 *    `SubmitCreditApplicationUseCase`.
 *  - Traducir el `Result` a estado de vista: errores por campo o confirmación.
 *
 * No valida reglas de negocio: eso ocurre en los value objects y en la
 * política de dominio. Aquí solo se transporta el resultado.
 *
 * Capa: PRESENTACIÓN (controlador).
 */
export class ApplicationController extends BaseController {
  #submitApplication;
  #getProductNames;
  #notifier;

  /** @type {{ values: Record<string,string>, errors: Record<string,string> }} */
  #state = { values: {}, errors: {} };

  /** @type {string[]} */
  #productNames = [];

  /** @type {number[]} */
  #termOptions = [];

  /**
   * @param {{
   *   view: import('../views/ApplicationView.js').ApplicationView,
   *   renderer: import('../shared/ViewRenderer.js').ViewRenderer,
   *   submitCreditApplicationUseCase: import('../../application/usecases/SubmitCreditApplicationUseCase.js').SubmitCreditApplicationUseCase,
   *   getCreditProductNamesUseCase: import('../../application/usecases/GetCreditProductNamesUseCase.js').GetCreditProductNamesUseCase,
   *   notifier: import('../../application/contracts/INotifier.js').INotifier,
   *   termOptions: number[]
   * }} deps Los plazos llegan inyectados: el controlador no conoce el
   *   datasource (la presentación nunca importa infraestructura).
   */
  constructor({
    view,
    renderer,
    submitCreditApplicationUseCase,
    getCreditProductNamesUseCase,
    notifier,
    termOptions = [],
  }) {
    super({ view, renderer });
    this.#submitApplication = submitCreditApplicationUseCase;
    this.#getProductNames = getCreditProductNamesUseCase;
    this.#notifier = notifier;
    this.#termOptions = termOptions;
  }

  /**
   * @returns {Promise<void>}
   */
  async handle() {
    this.#state = { values: {}, errors: {} };

    const namesResult = await this.#getProductNames.execute();
    this.#productNames = namesResult.isSuccess ? namesResult.value : [];

    this.present(this.#viewModel(), this.#handlers());
  }

  /**
   * @param {Record<string,string>} values
   * @returns {Promise<void>}
   */
  async onSubmit(values) {
    const result = await this.#submitApplication.execute(values);

    if (result.isFailure) {
      this.#state = { values, errors: result.fieldErrors };
      this.update(this.#viewModel(), this.#handlers());
      this.#notifier.error(
        result.error ?? 'Revisa los campos marcados.',
        'No se pudo enviar la solicitud',
      );
      return;
    }

    const { reference, applicantFirstName, affordability } = result.value;

    this.#state = { values: {}, errors: {} };
    this.update(this.#viewModel(), this.#handlers());

    this.#notifier.success(
      `${applicantFirstName}, tu solicitud quedó radicada con el número ${reference}. ` +
        'Un asesor se comunicará contigo.',
      'Solicitud enviada',
    );

    if (affordability && !affordability.affordable) {
      this.#notifier.info(
        `La cuota estimada ($${affordability.estimatedInstallment.toLocaleString('es-CO')}) ` +
          'supera el 40 % de tus ingresos declarados. El estudio puede requerir codeudor.',
        'Aviso de capacidad de pago',
      );
    }
  }

  /** Limpia errores tras un reset del formulario. */
  onReset() {
    this.#state = { values: {}, errors: {} };
    this.update(this.#viewModel(), this.#handlers());
  }

  /** @returns {Object} */
  #viewModel() {
    return {
      productNames: this.#productNames,
      termOptions: this.#termOptions,
      values: this.#state.values,
      errors: this.#state.errors,
    };
  }

  /** @returns {Object} */
  #handlers() {
    return {
      onSubmit: (values) => this.onSubmit(values),
      onReset: () => this.onReset(),
    };
  }
}
