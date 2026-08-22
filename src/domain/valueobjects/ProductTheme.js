import { DomainError } from '../errors/DomainError.js';

/**
 * ProductTheme — VALUE OBJECT inmutable.
 *
 * Identidad visual de un producto (emoji + paleta). Se modela como value object
 * para que la vista no invente clases CSS: solo consume `cssClass`, que existe
 * declarada en `02-tokens.css` (.theme-blue, .theme-emerald, ...).
 *
 * Capa: DOMINIO.
 */

/**
 * Paletas admitidas — las cinco primeras reflejan los gradientes del diseño
 * original; `teal` se añadió para el sexto producto del catálogo.
 * Cada valor tiene su bloque `.theme-<paleta>` en `02-tokens.css`.
 */
export const THEME_PALETTES = Object.freeze([
  'blue',
  'emerald',
  'violet',
  'amber',
  'rose',
  'teal',
]);

export class ProductTheme {
  /** @type {string} */
  #icon;
  /** @type {string} */
  #palette;

  /**
   * @param {string} icon Emoji representativo.
   * @param {string} palette Una de THEME_PALETTES.
   */
  constructor(icon, palette) {
    if (typeof icon !== 'string' || icon.length === 0) {
      throw new DomainError('ProductTheme.icon es obligatorio.', { code: 'INVALID_THEME_ICON' });
    }
    if (!THEME_PALETTES.includes(palette)) {
      throw new DomainError(
        `Paleta "${palette}" no admitida. Válidas: ${THEME_PALETTES.join(', ')}.`,
        { code: 'INVALID_THEME_PALETTE', details: { palette } },
      );
    }

    this.#icon = icon;
    this.#palette = palette;
    Object.freeze(this);
  }

  /**
   * @param {string} icon
   * @param {string} palette
   * @returns {ProductTheme}
   */
  static of(icon, palette) {
    return new ProductTheme(icon, palette);
  }

  /** @returns {string} */
  get icon() {
    return this.#icon;
  }

  /** @returns {string} */
  get palette() {
    return this.#palette;
  }

  /** @returns {string} Clase CSS que activa las variables del tema. */
  get cssClass() {
    return `theme-${this.#palette}`;
  }

  /** @returns {{icon: string, palette: string}} */
  toJSON() {
    return { icon: this.#icon, palette: this.#palette };
  }
}
