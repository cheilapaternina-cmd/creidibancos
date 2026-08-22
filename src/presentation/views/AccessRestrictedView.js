import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';

/**
 * AccessRestrictedView — pantalla de sistema "Access Restricted".
 *
 * Presente en el bundle del sitio original: se muestra cuando el usuario
 * autenticado no está registrado en la aplicación. Se reproduce aquí para
 * cubrir todas las vistas del sitio, y queda disponible para cuando se
 * conecte un proveedor de autenticación real.
 *
 * Capa: PRESENTACIÓN (vista).
 */
export class AccessRestrictedView extends BaseView {
  /**
   * @returns {string}
   */
  template() {
    return html`
      <div class="access-page">
        <div class="access-card">
          <div class="access-card__icon">${raw(AccessRestrictedView.#warningIcon())}</div>

          <h1 class="access-card__title">Access Restricted</h1>
          <p class="access-card__text">
            You are not registered to use this application. Please contact the app administrator
            to request access.
          </p>

          <div class="access-card__help">
            <p>If you believe this is an error, you can:</p>
            <ul>
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /** @returns {string} Icono de advertencia idéntico al SVG inline original. */
  static #warningIcon() {
    return `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    `;
  }
}
