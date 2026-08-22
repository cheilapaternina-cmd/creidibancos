/**
 * CreditProductDTO — objeto de transferencia (frontera aplicación → presentación).
 *
 * Estructura plana y ya formateada. Su razón de existir: la vista NO recibe
 * entidades de dominio, así no puede invocar comportamiento del núcleo ni
 * quedar acoplada a `Money`, `Term` o `InterestRate`.
 *
 * @typedef {Object} CreditProductDTO
 * @property {string|number} id
 * @property {string} name              Ej. "Crédito Vehículo"
 * @property {string} description
 * @property {string} requirements
 * @property {string} icon              Emoji
 * @property {string} themeClass        Ej. "theme-emerald"
 * @property {number} annualRate        Ej. 14.2
 * @property {string} annualRateLabel   Ej. "14.2%"
 * @property {number} maxTermMonths     Ej. 84
 * @property {string} maxTermLabel      Ej. "84 meses"
 * @property {number} minAmount         Ej. 5000000 — crudo, para acotar inputs
 * @property {number|null} maxAmount    Ej. 120000000 — `null` si no hay tope
 * @property {string} minAmountLabel    Ej. "$ 5.000.000"
 * @property {string} maxAmountLabel    Ej. "$ 120.000.000"
 * @property {string} amountRangeLabel  Ej. "$ 5.000.000 – $ 120.000.000"
 *
 * Capa: APLICACIÓN (DTO).
 */

/**
 * Congela un DTO para que la presentación no lo mute por accidente.
 * @param {CreditProductDTO} dto
 * @returns {Readonly<CreditProductDTO>}
 */
export function freezeProductDTO(dto) {
  return Object.freeze(dto);
}
