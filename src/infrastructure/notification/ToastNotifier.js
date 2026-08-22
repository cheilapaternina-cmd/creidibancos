import { INotifier } from '../../application/contracts/INotifier.js';

/**
 * ToastNotifier — ADAPTADOR de `INotifier` sobre el DOM.
 *
 * Pinta avisos temporales en el contenedor `#notifications`, que es una región
 * `aria-live="polite"`: los lectores de pantalla anuncian el resultado sin
 * robar el foco.
 *
 * Es el ÚNICO adaptador de notificación que toca el DOM; los casos de uso solo
 * ven el puerto.
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
export class ToastNotifier extends INotifier {
  /** @type {HTMLElement|null} */
  #container;
  #timeoutMs;

  /**
   * @param {{ container?: HTMLElement|null, timeoutMs?: number }} [options]
   */
  constructor({ container = document.getElementById('notifications'), timeoutMs = 6000 } = {}) {
    super();
    this.#container = container;
    this.#timeoutMs = timeoutMs;
  }

  /** @param {string} message @param {string} [title] */
  success(message, title = '¡Listo!') {
    this.#push('success', title, message);
  }

  /** @param {string} message @param {string} [title] */
  error(message, title = 'Revisa la información') {
    this.#push('error', title, message);
  }

  /** @param {string} message @param {string} [title] */
  info(message, title = '') {
    this.#push('info', title, message);
  }

  /**
   * @param {'success'|'error'|'info'} variant
   * @param {string} title
   * @param {string} message
   */
  #push(variant, title, message) {
    if (!this.#container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');

    if (title) {
      const heading = document.createElement('div');
      heading.className = 'toast__title';
      heading.textContent = title;
      toast.appendChild(heading);
    }

    const body = document.createElement('div');
    // textContent, nunca innerHTML: el mensaje puede contener datos del usuario.
    body.textContent = message;
    toast.appendChild(body);

    this.#container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, this.#timeoutMs);
  }
}
