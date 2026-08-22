import { ValidationError } from '../errors/ValidationError.js';
import { Money } from './Money.js';

/**
 * EmploymentInfo — VALUE OBJECT inmutable (Datos Laborales).
 *
 * Corresponde a la sección "🏢 Datos Laborales" del formulario.
 * Guarda los ingresos como `Money`, no como número suelto.
 *
 * Capa: DOMINIO.
 */
export class EmploymentInfo {
  #companyName;
  #jobTitle;
  #monthlyIncome;

  /**
   * @param {{ companyName: string, jobTitle: string, monthlyIncome: number|Money }} props
   */
  constructor({ companyName, jobTitle, monthlyIncome }) {
    const errors = {};

    const company = String(companyName ?? '').trim();
    if (company === '') errors.companyName = 'La empresa donde trabaja es obligatoria.';

    const role = String(jobTitle ?? '').trim();
    if (role === '') errors.jobTitle = 'El cargo es obligatorio.';

    let income = null;
    if (monthlyIncome instanceof Money) {
      income = monthlyIncome;
    } else {
      const raw = Number(monthlyIncome);
      if (!Number.isFinite(raw) || String(monthlyIncome ?? '').trim() === '') {
        errors.monthlyIncome = 'Los ingresos mensuales son obligatorios.';
      } else if (raw <= 0) {
        errors.monthlyIncome = 'Los ingresos mensuales deben ser mayores que cero.';
      } else {
        income = Money.of(raw);
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'Revisa los datos laborales.');
    }

    this.#companyName = company;
    this.#jobTitle = role;
    this.#monthlyIncome = income;

    Object.freeze(this);
  }

  get companyName() { return this.#companyName; }
  get jobTitle() { return this.#jobTitle; }
  get monthlyIncome() { return this.#monthlyIncome; }

  /**
   * Capacidad de pago estimada: regla de negocio del 40 % del ingreso.
   * @returns {Money}
   */
  get maxAffordableInstallment() {
    return this.#monthlyIncome.multiply(0.4);
  }

  /** @returns {Object} */
  toJSON() {
    return {
      companyName: this.#companyName,
      jobTitle: this.#jobTitle,
      monthlyIncome: this.#monthlyIncome.amount,
    };
  }
}
