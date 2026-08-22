import { html, raw } from '../shared/Html.js';

/**
 * AlertComponent — banda informativa reutilizable.
 *
 * Capa: PRESENTACIÓN (componente).
 */
export class AlertComponent {
  /**
   * @param {{ variant?: 'info'|'empty', icon?: string, message: string }} props
   * @returns {string}
   */
  render({ variant = 'info', icon = 'ℹ️', message }) {
    return html`
      <div class="alert alert--${variant}" role="status">
        ${icon ? html`<span aria-hidden="true">${icon}</span>` : ''}
        <span>${raw(message)}</span>
      </div>
    `;
  }
}
