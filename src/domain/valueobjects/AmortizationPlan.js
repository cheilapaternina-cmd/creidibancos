import { DomainError } from '../errors/DomainError.js';
import { Money } from './Money.js';
import { Term } from './Term.js';
import { InterestRate } from './InterestRate.js';
import { Installment } from './Installment.js';

/**
 * AmortizationPlan — VALUE OBJECT inmutable.
 *
 * Resultado completo de simular un crédito: la cuota fija, lo que se termina
 * pagando, cuánto de eso es interés y la tabla de amortización mes a mes.
 *
 * Es un value object y no una entidad porque no tiene identidad ni ciclo de
 * vida: dos simulaciones con el mismo capital, tasa y plazo son la misma cosa.
 * No se persiste; se recalcula.
 *
 * Invariantes que verifica al construirse, y que son la razón de que esto sea
 * una clase y no un objeto plano:
 *
 *  - hay exactamente `term.months` cuotas, numeradas 1..n sin huecos;
 *  - la suma de los abonos a capital es igual al capital prestado;
 *  - la última cuota deja el saldo en cero;
 *  - `totalPaid = capital + totalInterest`.
 *
 * Capa: DOMINIO.
 */
export class AmortizationPlan {
  /** @type {Money} */
  #principal;
  /** @type {InterestRate} */
  #interestRate;
  /** @type {Term} */
  #term;
  /** @type {Money} */
  #installment;
  /** @type {Money} */
  #totalPaid;
  /** @type {Money} */
  #totalInterest;
  /** @type {Installment[]} */
  #schedule;

  /**
   * @param {{
   *   principal: Money,
   *   interestRate: InterestRate,
   *   term: Term,
   *   installment: Money,
   *   schedule: Installment[]
   * }} props
   */
  constructor({ principal, interestRate, term, installment, schedule }) {
    if (!(principal instanceof Money)) {
      throw new DomainError('AmortizationPlan.principal debe ser un Money.', {
        code: 'INVALID_PLAN_PRINCIPAL',
      });
    }
    if (!(interestRate instanceof InterestRate)) {
      throw new DomainError('AmortizationPlan.interestRate debe ser un InterestRate.', {
        code: 'INVALID_PLAN_RATE',
      });
    }
    if (!(term instanceof Term)) {
      throw new DomainError('AmortizationPlan.term debe ser un Term.', {
        code: 'INVALID_PLAN_TERM',
      });
    }
    if (!(installment instanceof Money)) {
      throw new DomainError('AmortizationPlan.installment debe ser un Money.', {
        code: 'INVALID_PLAN_INSTALLMENT',
      });
    }
    if (!Array.isArray(schedule) || schedule.some((row) => !(row instanceof Installment))) {
      throw new DomainError('AmortizationPlan.schedule debe ser una lista de Installment.', {
        code: 'INVALID_PLAN_SCHEDULE',
      });
    }

    // Copia defensiva ANTES de validar: nadie muta la lista entre la
    // comprobación y el almacenamiento.
    const rows = schedule.slice();

    if (rows.length !== term.months) {
      throw new DomainError('El plan debe tener una cuota por cada mes del plazo.', {
        code: 'PLAN_LENGTH_MISMATCH',
        details: { expected: term.months, received: rows.length },
      });
    }

    const outOfOrder = rows.findIndex((row, index) => row.number !== index + 1);
    if (outOfOrder !== -1) {
      throw new DomainError('Las cuotas del plan deben ir numeradas 1..n en orden.', {
        code: 'PLAN_OUT_OF_ORDER',
        details: { position: outOfOrder + 1, found: rows[outOfOrder].number },
      });
    }

    const repaidCapital = rows.reduce((sum, row) => sum + row.principal.amount, 0);
    if (repaidCapital !== principal.amount) {
      throw new DomainError('La suma de los abonos a capital no cuadra con el capital prestado.', {
        code: 'PLAN_CAPITAL_MISMATCH',
        details: { principal: principal.amount, repaidCapital },
      });
    }

    const lastRow = rows[rows.length - 1];
    if (!lastRow.settlesDebt) {
      throw new DomainError('La última cuota debe dejar el saldo en cero.', {
        code: 'PLAN_NOT_SETTLED',
        details: { remainingBalance: lastRow.remainingBalance.amount },
      });
    }

    const paid = rows.reduce((sum, row) => sum + row.payment.amount, 0);
    const interest = rows.reduce((sum, row) => sum + row.interest.amount, 0);

    this.#principal = principal;
    this.#interestRate = interestRate;
    this.#term = term;
    this.#installment = installment;
    this.#totalPaid = Money.of(paid, principal.currency);
    this.#totalInterest = Money.of(interest, principal.currency);
    this.#schedule = rows;

    Object.freeze(this.#schedule);
    Object.freeze(this);
  }

  /**
   * Constructor semántico.
   * @param {{
   *   principal: Money,
   *   interestRate: InterestRate,
   *   term: Term,
   *   installment: Money,
   *   schedule: Installment[]
   * }} props
   * @returns {AmortizationPlan}
   */
  static of(props) {
    return new AmortizationPlan(props);
  }

  /** @returns {Money} Capital prestado. */
  get principal() {
    return this.#principal;
  }

  /** @returns {InterestRate} */
  get interestRate() {
    return this.#interestRate;
  }

  /** @returns {Term} */
  get term() {
    return this.#term;
  }

  /**
   * @returns {Money} Cuota fija mensual, ya redondeada al peso. La última puede
   * diferir en unos pesos: absorbe el residuo del redondeo.
   */
  get installment() {
    return this.#installment;
  }

  /** @returns {Money} Suma de todas las cuotas. */
  get totalPaid() {
    return this.#totalPaid;
  }

  /** @returns {Money} Coste del crédito: `totalPaid - principal`. */
  get totalInterest() {
    return this.#totalInterest;
  }

  /** @returns {Money} Importe real de la última cuota, con el residuo incluido. */
  get finalInstallment() {
    return this.#schedule[this.#schedule.length - 1].payment;
  }

  /** @returns {Installment[]} Copia: mutarla no afecta al plan. */
  get schedule() {
    return this.#schedule.slice();
  }

  /**
   * @returns {number} Cuánto se paga de más por cada peso prestado. Ej. 0.285
   * significa que el crédito cuesta un 28,5 % del capital en intereses.
   */
  get interestRatio() {
    if (this.#principal.amount === 0) return 0;
    return this.#totalInterest.amount / this.#principal.amount;
  }

  /**
   * Resumen por año, para no pintar 240 filas de golpe en la tabla.
   * El último bloque puede tener menos de 12 cuotas si el plazo no es múltiplo
   * de 12.
   *
   * @returns {Array<{
   *   year: number,
   *   fromInstallment: number,
   *   toInstallment: number,
   *   paid: Money,
   *   interest: Money,
   *   principal: Money,
   *   remainingBalance: Money
   * }>}
   */
  yearlySummary() {
    const currency = this.#principal.currency;
    const years = [];

    for (let start = 0; start < this.#schedule.length; start += 12) {
      const block = this.#schedule.slice(start, start + 12);
      const last = block[block.length - 1];

      years.push({
        year: Math.floor(start / 12) + 1,
        fromInstallment: block[0].number,
        toInstallment: last.number,
        paid: Money.of(
          block.reduce((sum, row) => sum + row.payment.amount, 0),
          currency,
        ),
        interest: Money.of(
          block.reduce((sum, row) => sum + row.interest.amount, 0),
          currency,
        ),
        principal: Money.of(
          block.reduce((sum, row) => sum + row.principal.amount, 0),
          currency,
        ),
        remainingBalance: last.remainingBalance,
      });
    }

    return years;
  }

  /**
   * @param {AmortizationPlan} other
   * @returns {boolean} Igualdad por valor: mismos capital, tasa y plazo
   * producen, de forma determinista, el mismo plan.
   */
  equals(other) {
    return (
      other instanceof AmortizationPlan &&
      other.principal.equals(this.#principal) &&
      other.interestRate.equals(this.#interestRate) &&
      other.term.equals(this.#term)
    );
  }

  /** @returns {string} */
  toString() {
    return `${this.#term} · cuota ${this.#installment} · total ${this.#totalPaid}`;
  }

  /** @returns {Object} */
  toJSON() {
    return {
      principal: this.#principal.amount,
      annualRate: this.#interestRate.toJSON(),
      termInMonths: this.#term.months,
      installment: this.#installment.amount,
      totalPaid: this.#totalPaid.amount,
      totalInterest: this.#totalInterest.amount,
      schedule: this.#schedule.map((row) => row.toJSON()),
    };
  }
}
