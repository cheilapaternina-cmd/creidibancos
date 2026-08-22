/**
 * Html — utilidades de plantilla para las vistas.
 *
 * `html` es una etiqueta de template literal que ESCAPA por defecto todos los
 * valores interpolados. Esto elimina la clase entera de bugs XSS al pintar
 * datos que vienen de un formulario o de una API.
 *
 * Para insertar marcado ya construido (por ejemplo, la lista de tarjetas) se
 * usa `raw()`, que marca explícitamente el string como seguro. Hacerlo
 * explícito obliga a pensar antes de confiar en un fragmento.
 *
 * Capa: PRESENTACIÓN (shared).
 */

const SAFE = Symbol('html-safe');

/**
 * Marca un string como HTML ya seguro (no se escapará).
 * @param {string} value
 * @returns {{ [SAFE]: true, toString(): string }}
 */
export function raw(value) {
  return {
    [SAFE]: true,
    toString() {
      return String(value ?? '');
    },
  };
}

/**
 * Escapa los caracteres con significado en HTML.
 * @param {any} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Etiqueta de template literal con escapado automático.
 *
 * Reglas de interpolación:
 *  - `raw(...)`      → se inserta tal cual
 *  - array           → se une sin separador (cada elemento sigue estas reglas)
 *  - null/undefined  → cadena vacía
 *  - false           → cadena vacía (permite `${cond && html`...`}`)
 *  - resto           → escapado
 *
 * @param {string[]} strings
 * @param {...any} values
 * @returns {string}
 */
export function html(strings, ...values) {
  let out = strings[0];

  for (let i = 0; i < values.length; i += 1) {
    out += interpolate(values[i]) + strings[i + 1];
  }

  return out;
}

/**
 * @param {any} value
 * @returns {string}
 */
function interpolate(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value === true) return '';
  if (Array.isArray(value)) return value.map(interpolate).join('');
  if (typeof value === 'object' && value[SAFE]) return value.toString();
  return escapeHtml(value);
}

/**
 * Une clases condicionales: classNames('btn', isPrimary && 'btn--primary').
 * @param {...(string|false|null|undefined)} parts
 * @returns {string}
 */
export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
