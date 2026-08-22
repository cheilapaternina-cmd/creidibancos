import { html, classNames } from '../shared/Html.js';

/**
 * FooterComponent — componente de presentación puro.
 *
 * Réplica del pie original. Tiene dos variantes, tal como el sitio:
 *  - `catalog`  → margen superior corto y segunda línea larga
 *                 ("© 2025 Todos los derechos reservados · Plataforma de
 *                  solicitudes de crédito en línea")
 *  - `compact`  → margen superior mayor y segunda línea corta
 *                 ("© 2025 Todos los derechos reservados")
 *
 * Capa: PRESENTACIÓN (componente).
 */
export class FooterComponent {
  static COMPANY = 'CreditSmart — FinTech Solutions S.A.S';
  static RIGHTS_SHORT = '© 2025 Todos los derechos reservados';
  static RIGHTS_LONG =
    '© 2025 Todos los derechos reservados · Plataforma de solicitudes de crédito en línea';

  /**
   * @param {{ variant?: 'catalog'|'compact' }} [props]
   * @returns {string}
   */
  render({ variant = 'compact' } = {}) {
    const isCatalog = variant === 'catalog';

    return html`
      <footer class="${classNames('footer', !isCatalog && 'footer--spaced')}">
        <p class="footer__brand">${FooterComponent.COMPANY}</p>
        <p>${isCatalog ? FooterComponent.RIGHTS_LONG : FooterComponent.RIGHTS_SHORT}</p>
      </footer>
    `;
  }
}
