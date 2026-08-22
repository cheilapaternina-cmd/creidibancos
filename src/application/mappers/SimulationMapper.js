import { assertImplements } from '../../domain/contracts/Contract.js';
import { IMoneyFormatter } from '../../domain/contracts/IMoneyFormatter.js';
import { freezeSimulationDTO } from '../dto/SimulationDTO.js';

/**
 * SimulationMapper — traductor AmortizationPlan → SimulationDTO.
 *
 * Recibe el formateador por inyección (puerto `IMoneyFormatter`), igual que
 * `CreditProductMapper`: aquí no se conoce `Intl` ni el locale.
 *
 * Es el único punto donde el plan de amortización se aplana: a partir de aquí
 * la presentación trabaja con números y cadenas, nunca con value objects.
 *
 * Capa: APLICACIÓN (mapper).
 */
export class SimulationMapper {
  /** @type {IMoneyFormatter} */
  #moneyFormatter;

  /** @param {{ moneyFormatter: IMoneyFormatter }} deps */
  constructor({ moneyFormatter }) {
    assertImplements(moneyFormatter, IMoneyFormatter);
    this.#moneyFormatter = moneyFormatter;
  }

  /**
   * @param {import('../../domain/valueobjects/AmortizationPlan.js').AmortizationPlan} plan
   * @param {import('../../domain/entities/CreditProduct.js').CreditProduct} product
   * @returns {Readonly<import('../dto/SimulationDTO.js').SimulationDTO>}
   */
  toDTO(plan, product) {
    const money = (value) => this.#moneyFormatter.format(value);
    const monthlyPercentage = plan.interestRate.monthlyFraction * 100;

    return freezeSimulationDTO({
      productId: product.id,
      productName: product.name,
      productIcon: product.theme.icon,
      themeClass: product.theme.cssClass,

      annualRate: plan.interestRate.annualPercentage,
      annualRateLabel: `${plan.interestRate.annualPercentage}% E.A.`,
      monthlyRateLabel: `${monthlyPercentage.toFixed(2)}% mensual`,

      amount: plan.principal.amount,
      amountLabel: money(plan.principal),

      termInMonths: plan.term.months,
      termLabel: SimulationMapper.#termLabel(plan.term),

      installment: plan.installment.amount,
      installmentLabel: money(plan.installment),
      finalInstallment: plan.finalInstallment.amount,
      finalInstallmentLabel: money(plan.finalInstallment),
      hasResidualAdjustment: plan.finalInstallment.amount !== plan.installment.amount,

      totalPaid: plan.totalPaid.amount,
      totalPaidLabel: money(plan.totalPaid),
      totalInterest: plan.totalInterest.amount,
      totalInterestLabel: money(plan.totalInterest),
      interestRatioLabel: `${(plan.interestRatio * 100).toFixed(1)}% del capital`,

      schedule: plan.schedule.map((row) => ({
        number: row.number,
        payment: row.payment.amount,
        paymentLabel: money(row.payment),
        interest: row.interest.amount,
        interestLabel: money(row.interest),
        principal: row.principal.amount,
        principalLabel: money(row.principal),
        remainingBalance: row.remainingBalance.amount,
        remainingBalanceLabel: money(row.remainingBalance),
      })),

      yearlySummary: plan.yearlySummary().map((block) => ({
        year: block.year,
        fromInstallment: block.fromInstallment,
        toInstallment: block.toInstallment,
        rangeLabel: `Cuotas ${block.fromInstallment}–${block.toInstallment}`,
        paid: block.paid.amount,
        paidLabel: money(block.paid),
        interest: block.interest.amount,
        interestLabel: money(block.interest),
        principal: block.principal.amount,
        principalLabel: money(block.principal),
        remainingBalance: block.remainingBalance.amount,
        remainingBalanceLabel: money(block.remainingBalance),
      })),
    });
  }

  /**
   * "36 meses (3 años)" cuando el plazo es múltiplo de 12; "18 meses" si no.
   *
   * @param {import('../../domain/valueobjects/Term.js').Term} term
   * @returns {string}
   */
  static #termLabel(term) {
    if (term.months % 12 !== 0) return `${term.months} meses`;
    const years = term.years;
    return `${term.months} meses (${years} ${years === 1 ? 'año' : 'años'})`;
  }
}
