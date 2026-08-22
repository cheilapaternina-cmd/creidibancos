/**
 * Result — tipo de retorno explícito para casos de uso.
 *
 * Evita usar excepciones como flujo de control entre capas: el controlador
 * inspecciona `isSuccess` en lugar de envolver todo en try/catch, y los
 * errores de validación viajan como datos (`fieldErrors`) hasta la vista.
 *
 * Capa: APLICACIÓN (shared kernel).
 */
export class Result {
  #success;
  #value;
  #error;
  #fieldErrors;

  /**
   * @param {{ success: boolean, value?: any, error?: string, fieldErrors?: Record<string,string> }} props
   */
  constructor({ success, value = null, error = null, fieldErrors = {} }) {
    this.#success = Boolean(success);
    this.#value = value;
    this.#error = error;
    this.#fieldErrors = Object.freeze({ ...fieldErrors });
    Object.freeze(this);
  }

  /**
   * @param {any} value
   * @returns {Result}
   */
  static ok(value = null) {
    return new Result({ success: true, value });
  }

  /**
   * @param {string} error
   * @param {Record<string,string>} [fieldErrors]
   * @returns {Result}
   */
  static fail(error, fieldErrors = {}) {
    return new Result({ success: false, error, fieldErrors });
  }

  /**
   * Construye un Result a partir de un error de dominio.
   * @param {Error & { fieldErrors?: Record<string,string> }} err
   * @returns {Result}
   */
  static fromError(err) {
    return new Result({
      success: false,
      error: err?.message ?? 'Error inesperado.',
      fieldErrors: err?.fieldErrors ?? {},
    });
  }

  get isSuccess() { return this.#success; }
  get isFailure() { return !this.#success; }
  get value() { return this.#value; }
  get error() { return this.#error; }
  get fieldErrors() { return this.#fieldErrors; }

  /** @returns {boolean} */
  get hasFieldErrors() {
    return Object.keys(this.#fieldErrors).length > 0;
  }

  /**
   * Transforma el valor si hubo éxito (functor map).
   * @param {(value:any)=>any} fn
   * @returns {Result}
   */
  map(fn) {
    return this.#success ? Result.ok(fn(this.#value)) : this;
  }
}
