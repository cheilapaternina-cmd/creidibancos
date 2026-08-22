import { ValidationError } from '../errors/ValidationError.js';
import { DomainError } from '../errors/DomainError.js';
import { CreditProduct } from '../entities/CreditProduct.js';
import { Money } from '../valueobjects/Money.js';
import { Term } from '../valueobjects/Term.js';
import { Installment } from '../valueobjects/Installment.js';
import { AmortizationPlan } from '../valueobjects/AmortizationPlan.js';

/**
 * CreditSimulationService — SERVICIO DE DOMINIO (stateless, puro).
 *
 * Calcula la amortización de un crédito por el sistema francés: cuota fija,
 * intereses sobre saldo decreciente.
 *
 * Va aquí y no en `CreditProduct` porque la operación cruza tres conceptos
 * —el producto (que aporta la tasa y los límites), el importe pedido y el
 * plazo— y no pertenece a ninguno en particular.
 *
 * Es el ÚNICO sitio del proyecto donde vive la fórmula de la cuota:
 * `CreditApplicationPolicy.assessAffordability` la consume desde aquí en vez
 * de repetirla.
 *
 * Sin dependencias: determinista y testeable sin dobles de prueba.
 *
 * Capa: DOMINIO (servicio).
 */
export class CreditSimulationService {
  /**
   * Simula el crédito y devuelve el plan completo.
   *
   * @param {CreditProduct} product Producto que aporta tasa y límites.
   * @param {Money} amount Capital solicitado.
   * @param {Term} term Plazo solicitado.
   * @returns {AmortizationPlan}
   * @throws {ValidationError} Si el producto no admite ese monto o ese plazo.
   */
  static simulate(product, amount, term) {
    CreditSimulationService.assertSimulable(product, amount, term);

    const monthlyRate = product.interestRate.monthlyFraction;
    const months = term.months;
    const currency = amount.currency;

    const installmentAmount = Math.round(
      CreditSimulationService.monthlyInstallmentAmount(amount.amount, monthlyRate, months),
    );

    return AmortizationPlan.of({
      principal: amount,
      interestRate: product.interestRate,
      term,
      installment: Money.of(installmentAmount, currency),
      schedule: CreditSimulationService.#buildSchedule({
        principal: amount.amount,
        monthlyRate,
        months,
        installmentAmount,
        currency,
      }),
    });
  }

  /**
   * Cuota fija del sistema francés, SIN redondear:
   *
   *   C = P · i / (1 - (1 + i)^-n)
   *
   * Con `i = 0` degenera en el reparto lineal `P / n`.
   *
   * Se expone como método propio porque hay dos consumidores —la simulación y
   * el estudio de capacidad de pago de una solicitud— y duplicar la fórmula
   * sería la vía más rápida a que ambos den cifras distintas.
   *
   * @param {number} principal Capital, en unidades enteras de la moneda.
   * @param {number} monthlyRate Tasa mensual en fracción (0.0142 = 1,42 %).
   * @param {number} months Número de cuotas.
   * @returns {number} Importe de la cuota, con decimales.
   */
  static monthlyInstallmentAmount(principal, monthlyRate, months) {
    if (months <= 0) {
      throw new DomainError('El número de cuotas debe ser mayor que cero.', {
        code: 'INVALID_INSTALLMENT_COUNT',
        details: { months },
      });
    }
    if (monthlyRate === 0) return principal / months;
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  /**
   * Comprueba que el producto admita la combinación monto + plazo.
   *
   * Reutiliza las reglas que ya viven en la entidad (`admitsAmount`,
   * `admitsTerm`) en lugar de reimplementar la comparación de límites.
   *
   * @param {CreditProduct} product
   * @param {Money} amount
   * @param {Term} term
   * @throws {ValidationError} Con errores por campo, listos para el formulario.
   */
  static assertSimulable(product, amount, term) {
    if (!(product instanceof CreditProduct)) {
      throw new DomainError('Se requiere un CreditProduct para simular.', {
        code: 'SIMULATION_PRODUCT_REQUIRED',
      });
    }
    if (!(amount instanceof Money)) {
      throw new DomainError('El monto a simular debe ser un Money.', {
        code: 'SIMULATION_AMOUNT_INVALID',
      });
    }
    if (!(term instanceof Term)) {
      throw new DomainError('El plazo a simular debe ser un Term.', {
        code: 'SIMULATION_TERM_INVALID',
      });
    }

    const errors = CreditSimulationService.productFieldErrors(product, amount, term);

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'No se puede simular con esos datos.');
    }
  }

  /**
   * Errores de encaje entre lo pedido y lo que el producto ofrece, indexados
   * por nombre de campo del formulario.
   *
   * Devuelve el mapa en vez de lanzar porque hay dos consumidores que necesitan
   * el MISMO diagnóstico con distinto encabezado: la simulación
   * (`assertSimulable`) y el envío de una solicitud
   * (`CreditApplicationPolicy.assertAdmissible`).
   *
   * @param {CreditProduct} product
   * @param {Money} amount
   * @param {Term} term
   * @returns {Record<string, string>} Vacío si la combinación es admisible.
   */
  static productFieldErrors(product, amount, term) {
    const errors = {};

    if (!product.admitsAmount(amount)) {
      const min = product.minAmount.amount.toLocaleString('es-CO');
      const max = product.maxAmount
        ? product.maxAmount.amount.toLocaleString('es-CO')
        : 'sin límite';
      errors.amount = `El monto debe estar entre $${min} y $${max} para ${product.name}.`;
    }

    if (!product.admitsTerm(term)) {
      errors.termInMonths = `El plazo máximo para ${product.name} es de ${product.maxTerm.months} meses.`;
    }

    return errors;
  }

  /**
   * Construye la tabla mes a mes.
   *
   * Redondeo: la cuota se redondea al peso y cada mes el interés se redondea
   * sobre el saldo vivo. El descuadre que eso acumula se concentra en la
   * ÚLTIMA cuota, que abona todo el saldo restante en lugar de una cifra fija.
   * Es lo que hace la banca, y garantiza dos cosas que la vista da por
   * supuestas: que la suma de los abonos a capital es exactamente el capital
   * prestado y que el saldo final es cero.
   *
   * @param {{
   *   principal: number,
   *   monthlyRate: number,
   *   months: number,
   *   installmentAmount: number,
   *   currency: string
   * }} params
   * @returns {Installment[]}
   */
  static #buildSchedule({ principal, monthlyRate, months, installmentAmount, currency }) {
    const schedule = [];
    let balance = principal;

    for (let number = 1; number <= months; number += 1) {
      const interest = Math.round(balance * monthlyRate);

      let capital;
      if (number === months) {
        // Última cuota: liquida el saldo y absorbe el residuo del redondeo.
        capital = balance;
      } else {
        capital = installmentAmount - interest;

        if (capital <= 0) {
          throw new DomainError(
            'La cuota no alcanza a cubrir los intereses: el crédito nunca se amortizaría.',
            {
              code: 'NON_AMORTIZING_INSTALLMENT',
              details: { number, installmentAmount, interest },
            },
          );
        }

        // Blindaje frente a la deriva del redondeo en plazos largos: nunca se
        // abona más capital del que queda vivo.
        if (capital > balance) capital = balance;
      }

      balance -= capital;

      schedule.push(
        Installment.of({
          number,
          payment: Money.of(capital + interest, currency),
          interest: Money.of(interest, currency),
          principal: Money.of(capital, currency),
          remainingBalance: Money.of(balance, currency),
        }),
      );
    }

    return schedule;
  }
}
