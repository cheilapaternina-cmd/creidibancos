import { IController } from '../contracts/IController.js';
import { assertImplements } from '../../domain/contracts/Contract.js';

/**
 * DocumentTitleController — DECORADOR de `IController`.
 *
 * Añade "poner el título del documento" a cualquier controlador sin modificarlo
 * (Principio Abierto/Cerrado) y sin que el controlador decorado sepa que está
 * decorado (Liskov: cumple el mismo contrato).
 *
 * Capa: PRESENTACIÓN (decorador).
 */
export class DocumentTitleController extends IController {
  /** @type {IController} */
  #inner;
  #title;

  /**
   * @param {{ controller: IController, title: string }} deps
   */
  constructor({ controller, title }) {
    super();
    assertImplements(controller, IController);
    this.#inner = controller;
    this.#title = title;
  }

  /**
   * @param {Object} context
   * @returns {Promise<void>}
   */
  async handle(context) {
    document.title = this.#title;
    return this.#inner.handle(context);
  }

  /** Delegación pura. */
  dispose() {
    this.#inner.dispose();
  }
}
