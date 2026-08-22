/**
 * SimulationDTO — objeto de transferencia (frontera aplicación → presentación).
 *
 * Resultado de una simulación, plano y ya formateado. Existe por la misma razón
 * que `CreditProductDTO`: la vista no recibe `AmortizationPlan` ni `Money`, así
 * no puede invocar comportamiento del núcleo ni volver a calcular nada por su
 * cuenta. Si la tabla necesita un total, viene calculado desde el dominio.
 *
 * Cada importe viaja dos veces: crudo (`installment`) para comparaciones y
 * gráficos, y etiquetado (`installmentLabel`) para pintar. La vista nunca
 * formatea dinero.
 *
 * @typedef {Object} ScheduleRowDTO
 * @property {number} number                  Nº de cuota, desde 1
 * @property {number} payment
 * @property {string} paymentLabel            Ej. "$ 357.000"
 * @property {number} interest
 * @property {string} interestLabel
 * @property {number} principal
 * @property {string} principalLabel
 * @property {number} remainingBalance
 * @property {string} remainingBalanceLabel
 *
 * @typedef {Object} ScheduleYearDTO
 * @property {number} year                    Bloque anual, desde 1
 * @property {number} fromInstallment
 * @property {number} toInstallment
 * @property {string} rangeLabel              Ej. "Cuotas 1–12"
 * @property {number} paid
 * @property {string} paidLabel
 * @property {number} interest
 * @property {string} interestLabel
 * @property {number} principal
 * @property {string} principalLabel
 * @property {number} remainingBalance
 * @property {string} remainingBalanceLabel
 *
 * @typedef {Object} SimulationDTO
 * @property {string|number} productId
 * @property {string} productName             Ej. "Crédito Vehículo"
 * @property {string} productIcon             Emoji
 * @property {string} themeClass              Ej. "theme-emerald"
 * @property {number} annualRate              Ej. 14.2
 * @property {string} annualRateLabel         Ej. "14.2% E.A."
 * @property {string} monthlyRateLabel        Ej. "1.11% mensual"
 * @property {number} amount
 * @property {string} amountLabel
 * @property {number} termInMonths
 * @property {string} termLabel               Ej. "36 meses (3 años)"
 * @property {number} installment             Cuota fija mensual
 * @property {string} installmentLabel
 * @property {number} finalInstallment        Última cuota, con el residuo
 * @property {string} finalInstallmentLabel
 * @property {boolean} hasResidualAdjustment  ¿La última cuota difiere?
 * @property {number} totalPaid
 * @property {string} totalPaidLabel
 * @property {number} totalInterest
 * @property {string} totalInterestLabel
 * @property {string} interestRatioLabel      Ej. "28.5% del capital"
 * @property {ScheduleRowDTO[]} schedule      Una fila por mes
 * @property {ScheduleYearDTO[]} yearlySummary
 *
 * Capa: APLICACIÓN (DTO).
 */

/**
 * Congela la simulación en profundidad: la tabla de amortización es el dato
 * más largo que cruza la frontera y una vista no debe poder reordenarla ni
 * recortarla por accidente.
 *
 * @param {SimulationDTO} dto
 * @returns {Readonly<SimulationDTO>}
 */
export function freezeSimulationDTO(dto) {
  dto.schedule.forEach(Object.freeze);
  dto.yearlySummary.forEach(Object.freeze);
  Object.freeze(dto.schedule);
  Object.freeze(dto.yearlySummary);
  return Object.freeze(dto);
}
