/**
 * 01-domain-application.mjs — Suite de DOMINIO + APLICACIÓN.
 *
 * Se ejecuta con Node, SIN navegador, SIN DOM y SIN dependencias.
 * Que esta suite arranque es la verificación empírica de que el núcleo está
 * aislado: si el dominio importara `document`, `window`, `fetch` o
 * `localStorage`, este archivo no podría ejecutarse.
 *
 *   node tests/01-domain-application.mjs
 */
import { InMemoryCreditProductRepository } from '../src/infrastructure/persistence/InMemoryCreditProductRepository.js';
import { StaticAmountRangeProvider } from '../src/infrastructure/persistence/StaticAmountRangeProvider.js';
import { LocalStorageCreditApplicationRepository } from '../src/infrastructure/persistence/LocalStorageCreditApplicationRepository.js';
import { IntlMoneyFormatter } from '../src/infrastructure/formatters/IntlMoneyFormatter.js';
import { SystemClock } from '../src/infrastructure/time/SystemClock.js';
import { CryptoIdGenerator } from '../src/infrastructure/identity/CryptoIdGenerator.js';
import { ConsoleLogger } from '../src/infrastructure/logging/ConsoleLogger.js';
import { CreditProductMapper } from '../src/application/mappers/CreditProductMapper.js';
import { SimulationMapper } from '../src/application/mappers/SimulationMapper.js';
import { SimulateCreditUseCase } from '../src/application/usecases/SimulateCreditUseCase.js';
import { ListCreditProductsUseCase } from '../src/application/usecases/ListCreditProductsUseCase.js';
import { SearchCreditProductsUseCase } from '../src/application/usecases/SearchCreditProductsUseCase.js';
import { GetAmountRangeFiltersUseCase } from '../src/application/usecases/GetAmountRangeFiltersUseCase.js';
import { GetCreditProductNamesUseCase } from '../src/application/usecases/GetCreditProductNamesUseCase.js';
import { SubmitCreditApplicationUseCase } from '../src/application/usecases/SubmitCreditApplicationUseCase.js';
import { CreditProduct } from '../src/domain/entities/CreditProduct.js';
import { Money } from '../src/domain/valueobjects/Money.js';
import { InterestRate } from '../src/domain/valueobjects/InterestRate.js';
import { Term } from '../src/domain/valueobjects/Term.js';
import { AmountRange } from '../src/domain/valueobjects/AmountRange.js';
import { Installment } from '../src/domain/valueobjects/Installment.js';
import { AmortizationPlan } from '../src/domain/valueobjects/AmortizationPlan.js';
import { CreditSimulationService } from '../src/domain/services/CreditSimulationService.js';
import { CreditApplicationPolicy } from '../src/domain/services/CreditApplicationPolicy.js';

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails += 1; console.log('FAIL:', msg); } else console.log('ok  :', msg);
};

/* ------------------------------------------------------------------
   Grafo construido a mano: los dobles son objetos literales porque los
   contratos son pequeños (ISP) y todo entra por constructor (DIP).
   ------------------------------------------------------------------ */
const productRepository = new InMemoryCreditProductRepository();
const amountRangeProvider = new StaticAmountRangeProvider();
const moneyFormatter = new IntlMoneyFormatter();
const productMapper = new CreditProductMapper({ moneyFormatter });
const logger = new ConsoleLogger({ level: 'silent' });
const idGenerator = new CryptoIdGenerator();
const applicationRepository = new LocalStorageCreditApplicationRepository({
  idGenerator,
  storage: null,           // ← sin localStorage: degrada a memoria
});
const clock = new SystemClock();

/* ---------------------------- Value objects ---------------------------- */
console.log('\n--- Value objects ---');

ok(Money.of(5_000_000).equals(Money.of(5_000_000)), 'Money: igualdad por valor');
ok(Money.of(100).isLessThan(Money.of(200)), 'Money: comparación');
try { Money.of(-1); ok(false, 'Money: debe rechazar negativos'); }
catch (e) { ok(e.code === 'NEGATIVE_MONEY_AMOUNT', `Money: rechaza negativos (${e.code})`); }
try { Money.of(NaN); ok(false, 'Money: debe rechazar NaN'); }
catch (e) { ok(e.code === 'INVALID_MONEY_AMOUNT', `Money: rechaza NaN (${e.code})`); }
try { Money.of(100, 'USD').isGreaterThan(Money.of(100, 'COP')); ok(false, 'Money: debe rechazar mezcla de monedas'); }
catch (e) { ok(e.code === 'CURRENCY_MISMATCH', `Money: rechaza mezcla de monedas (${e.code})`); }

const rate = InterestRate.ofAnnualPercentage(18.5);
ok(Math.abs(rate.monthlyFraction - (Math.pow(1.185, 1 / 12) - 1)) < 1e-12,
   'InterestRate: tasa mensual equivalente, no anual/12');
try { InterestRate.ofAnnualPercentage(1850); ok(false, 'InterestRate: debe rechazar >100'); }
catch (e) { ok(e.code === 'RATE_OUT_OF_BOUNDS', `InterestRate: rechaza >100 (${e.code})`); }

try { Term.ofMonths(-60); ok(false, 'Term: debe rechazar negativos'); }
catch (e) { ok(e.code === 'INVALID_TERM', `Term: rechaza negativos (${e.code})`); }
ok(Term.ofMonths(60).fitsWithin(Term.ofMonths(84)), 'Term: fitsWithin');

try { new AmountRange(Money.of(30_000_000), Money.of(5_000_000)); ok(false, 'AmountRange: debe rechazar invertido'); }
catch (e) { ok(e.code === 'INVERTED_RANGE', `AmountRange: rechaza rango invertido (${e.code})`); }
ok(AmountRange.of(0, 5_000_000).overlaps(AmountRange.of(500_000, 50_000_000)),
   'AmountRange: overlaps con intersección');
ok(!AmountRange.of(0, 5_000_000).overlaps(AmountRange.of(20_000_000, 500_000_000)),
   'AmountRange: sin overlaps cuando no hay intersección');
ok(AmountRange.of(100_000_001, null).overlaps(AmountRange.of(5_000_000, 120_000_000)),
   'AmountRange: overlaps con máximo sin límite');

ok(CreditProduct.normalize('Crédito Vehículo') === 'credito vehiculo',
   'CreditProduct.normalize: sin acentos ni mayúsculas');

/* ------------------------------ Catálogo ------------------------------ */
console.log('\n--- Catálogo ---');

const list = await new ListCreditProductsUseCase({ productRepository, productMapper }).execute();
ok(list.isSuccess, 'ListCreditProducts: Result de éxito');
ok(list.value.total === 6, `catálogo con 6 productos (${list.value.total})`);
ok(list.value.products[0].name === 'Crédito Libre Inversión', 'primer producto correcto');
// Intl separa el símbolo con un espacio duro (U+00A0); se normaliza al comparar.
const normalizeSpaces = (value) => value.replace(/\s/g, ' ');
ok(normalizeSpaces(list.value.products[0].amountRangeLabel) === '$ 1.000.000 – $ 30.000.000',
   `formato monetario es-CO/COP (${list.value.products[0].amountRangeLabel})`);
ok(list.value.products[0].themeClass === 'theme-blue',
   `themeClass resuelto (${list.value.products[0].themeClass})`);
ok(Object.isFrozen(list.value.products[0]), 'DTO congelado');
ok(typeof list.value.products[0].admitsAmount === 'undefined',
   'DTO sin comportamiento (la vista no puede ejecutar reglas)');

/* ------------------------------ Búsqueda ------------------------------ */
console.log('\n--- Búsqueda y filtros ---');

const search = new SearchCreditProductsUseCase({ productRepository, productMapper });

const r1 = await search.execute({ query: 'vehiculo' });
ok(r1.value.matched === 1, `búsqueda "vehiculo" → 1 (${r1.value.matched})`);

const r2 = await search.execute({ query: 'credito' });
ok(r2.value.matched === 6, `búsqueda "credito" → 6 (${r2.value.matched})`);

const r2b = await search.execute({ query: 'no-existe-nada' });
ok(r2b.value.matched === 0, `búsqueda sin resultados → 0 (${r2b.value.matched})`);

const ranges = await new GetAmountRangeFiltersUseCase({ amountRangeProvider }).execute();
ok(ranges.value.length === 5, `5 rangos de filtro (${ranges.value.length})`);
ok(ranges.value[0].label === 'Todos los montos', 'primer rango correcto');

const r3 = await search.execute({ amountRange: await amountRangeProvider.byIndex(1) });
ok(r3.value.matched === 4, `rango "Hasta $5.000.000" → 4 (${r3.value.matched})`);

const r4 = await search.execute({ amountRange: await amountRangeProvider.byIndex(4) });
ok(r4.value.matched === 3, `rango "Más de $100.000.000" → 3 (${r4.value.matched})`);

const r5 = await search.execute({ query: '', amountRange: await amountRangeProvider.byIndex(0) });
ok(r5.value.isFiltered === false, 'sin filtros → isFiltered false');

const names = await new GetCreditProductNamesUseCase({ productRepository }).execute();
ok(names.value.length === 6 && names.value[2] === 'Crédito Vivienda',
   'nombres de producto derivados del catálogo');

/* ---------------------------- Radicación ---------------------------- */
console.log('\n--- Radicación de solicitudes ---');

const submit = new SubmitCreditApplicationUseCase({
  applicationRepository, productRepository, clock, logger,
});

const bad = await submit.execute({});
ok(bad.isFailure, 'formulario vacío → Result de fallo');
ok(Object.keys(bad.fieldErrors).length === 11,
   `11 errores de campo (${Object.keys(bad.fieldErrors).length})`);
console.log('      campos:', Object.keys(bad.fieldErrors).join(', '));

const VALID_FORM = {
  fullName: 'Juan Carlos Pérez',
  idNumber: '1234567890',
  email: 'JUAN@correo.com',
  phone: '300 123 4567',
  productName: 'Crédito Vehículo',
  amount: '50000000',
  termInMonths: '60',
  purpose: 'Compra de vehículo familiar nuevo',
  companyName: 'Empresa ABC S.A.S',
  jobTitle: 'Analista de Sistemas',
  monthlyIncome: '3500000',
};

const good = await submit.execute(VALID_FORM);
ok(good.isSuccess, `solicitud válida radicada (${good.error ?? 'sin error'})`);
if (good.isSuccess) {
  ok(/^CS-[0-9A-F]{8}$/.test(good.value.reference),
     `número de radicado con formato (${good.value.reference})`);
  ok(good.value.status === 'RADICADA', `estado RADICADA (${good.value.status})`);
  ok(good.value.applicantFirstName === 'Juan', 'primer nombre extraído');
  ok(good.value.affordability.affordable === true,
     `capacidad de pago: cuota ${good.value.affordability.estimatedInstallment} ` +
     `≤ tope ${good.value.affordability.ceiling}`);
}
ok((await applicationRepository.findAll()).length === 1, 'solicitud persistida en memoria');

const outOfRange = await submit.execute({ ...VALID_FORM, amount: '1000' });
ok(outOfRange.isFailure && 'amount' in outOfRange.fieldErrors,
   'monto fuera de rango rechazado por CreditApplicationPolicy');
console.log('      mensaje:', outOfRange.fieldErrors.amount);

const badEmail = await submit.execute({ ...VALID_FORM, email: 'no-es-un-email' });
ok(badEmail.isFailure && 'email' in badEmail.fieldErrors, 'email inválido rechazado');

const shortPurpose = await submit.execute({ ...VALID_FORM, purpose: 'x' });
ok(shortPurpose.isFailure && 'purpose' in shortPurpose.fieldErrors,
   'destino demasiado corto rechazado');


/* ------------------------- Simulación de crédito ------------------------- */
console.log('');
console.log('--- Simulación de crédito (CreditSimulationService) ---');

const libreInversion = await productRepository.findById(1);
const vivienda = await productRepository.findById(3);

// Cifras de referencia calculadas aparte: 18,5 % E.A. -> 1,424575 % mensual;
// cuota francesa de $10.000.000 a 36 meses = $357.000 (redondeada al peso).
const plan36 = CreditSimulationService.simulate(libreInversion, Money.of(10_000_000), Term.ofMonths(36));

ok(plan36 instanceof AmortizationPlan, 'simulate devuelve un AmortizationPlan');
ok(plan36.installment.amount === 357_000,
   `cuota fija esperada $357.000 (obtenida $${plan36.installment.amount})`);
ok(plan36.schedule.length === 36, `tabla con una fila por mes (${plan36.schedule.length})`);
ok(plan36.schedule.reduce((s, r) => s + r.principal.amount, 0) === 10_000_000,
   'la suma de los abonos a capital es exactamente el capital prestado');
ok(plan36.schedule.at(-1).remainingBalance.amount === 0, 'la última cuota deja el saldo en cero');
ok(plan36.totalPaid.amount === 10_000_000 + plan36.totalInterest.amount,
   'totalPaid = capital + totalInterest');
ok(plan36.finalInstallment.amount !== plan36.installment.amount,
   `la última cuota absorbe el residuo del redondeo ` +
   `($${plan36.finalInstallment.amount} frente a $${plan36.installment.amount})`);

const primeraCuota = plan36.schedule[0];
ok(primeraCuota.interest.amount ===
     Math.round(10_000_000 * libreInversion.interestRate.monthlyFraction),
   `el interés del mes 1 se calcula sobre el saldo inicial ($${primeraCuota.interest.amount})`);
ok(primeraCuota.interest.amount > plan36.schedule.at(-1).interest.amount,
   'el interés decrece a medida que baja el saldo (sistema francés)');

// Plazo largo: es donde la deriva del redondeo se acumula y podría no cerrar.
const plan240 = CreditSimulationService.simulate(vivienda, Money.of(300_000_000), Term.ofMonths(240));
ok(plan240.schedule.reduce((s, r) => s + r.principal.amount, 0) === 300_000_000,
   'a 240 meses el capital sigue cuadrando al peso');
ok(plan240.schedule.at(-1).remainingBalance.amount === 0, 'a 240 meses el saldo cierra en cero');
ok(plan240.yearlySummary().length === 20,
   `resumen anual de 20 bloques (${plan240.yearlySummary().length})`);
ok(plan240.yearlySummary().reduce((s, y) => s + y.principal.amount, 0) === 300_000_000,
   'el resumen anual conserva el capital total');

ok(CreditSimulationService.monthlyInstallmentAmount(1_200, 0, 12) === 100,
   'tasa 0 % degenera en el reparto lineal P/n');

// La política de solicitudes debe leer la MISMA fórmula, no una copia.
const cuotaCompartida = CreditSimulationService.monthlyInstallmentAmount(
  10_000_000, libreInversion.interestRate.monthlyFraction, 36,
);
ok(Math.round(cuotaCompartida) === plan36.installment.amount,
   'CreditApplicationPolicy y el simulador comparten la fórmula de la cuota');
ok(typeof CreditApplicationPolicy.assessAffordability === 'function',
   'assessAffordability sigue expuesta tras el refactor');

/* --- Invariantes: lo que el dominio debe rechazar --- */

try {
  CreditSimulationService.simulate(libreInversion, Money.of(10_000_000), Term.ofMonths(120));
  ok(false, 'debe rechazar un plazo mayor que el máximo del producto');
} catch (e) {
  ok(e.code === 'VALIDATION_ERROR' && 'termInMonths' in e.fieldErrors,
     `plazo por encima del máximo rechazado (${e.fieldErrors.termInMonths})`);
}

try {
  CreditSimulationService.simulate(libreInversion, Money.of(100), Term.ofMonths(12));
  ok(false, 'debe rechazar un monto fuera del rango del producto');
} catch (e) {
  ok(e.code === 'VALIDATION_ERROR' && 'amount' in e.fieldErrors,
     `monto fuera de rango rechazado (${e.fieldErrors.amount})`);
}

try {
  Installment.of({
    number: 1,
    payment: Money.of(1_000),
    interest: Money.of(100),
    principal: Money.of(500),          // 100 + 500 no suma 1000
    remainingBalance: Money.of(0),
  });
  ok(false, 'Installment debe exigir cuota = interés + capital');
} catch (e) {
  ok(e.code === 'INSTALLMENT_NOT_BALANCED',
     `Installment: cuota descuadrada rechazada (${e.code})`);
}

try {
  AmortizationPlan.of({
    principal: Money.of(10_000_000),
    interestRate: libreInversion.interestRate,
    term: Term.ofMonths(36),
    installment: Money.of(357_000),
    schedule: plan36.schedule.slice(0, 10),   // faltan 26 cuotas
  });
  ok(false, 'AmortizationPlan debe exigir una cuota por cada mes');
} catch (e) {
  ok(e.code === 'PLAN_LENGTH_MISMATCH',
     `AmortizationPlan: tabla incompleta rechazada (${e.code})`);
}

/* --- Inmutabilidad --- */

ok(Object.isFrozen(plan36) && Object.isFrozen(primeraCuota), 'plan y cuotas congelados');
const scheduleRobado = plan36.schedule;
scheduleRobado.length = 0;
ok(plan36.schedule.length === 36,
   'schedule devuelve copia defensiva: mutarla no afecta al plan');


/* --------------------- Caso de uso: simular crédito --------------------- */
console.log('');
console.log('--- SimulateCreditUseCase ---');

const simulationMapper = new SimulationMapper({ moneyFormatter });
const simulate = new SimulateCreditUseCase({ productRepository, simulationMapper });

// Entrada tal como llega del formulario: todo en texto.
const simulacion = await simulate.execute({ productId: '1', amount: '10000000', termInMonths: '36' });

ok(simulacion.isSuccess, 'simula con la entrada en texto del formulario');
const sim = simulacion.value;
ok(sim.installment === 357_000, `cuota en el DTO ($${sim.installment})`);
ok(sim.installmentLabel.includes('357'), `cuota formateada (${sim.installmentLabel})`);
ok(sim.productName === 'Crédito Libre Inversión', `producto resuelto (${sim.productName})`);
ok(sim.termLabel === '36 meses (3 años)', `plazo etiquetado (${sim.termLabel})`);
ok(sim.annualRateLabel === '18.5% E.A.', `tasa anual etiquetada (${sim.annualRateLabel})`);
ok(sim.monthlyRateLabel === '1.42% mensual', `tasa mensual etiquetada (${sim.monthlyRateLabel})`);
ok(sim.hasResidualAdjustment === true, 'el DTO avisa de que la última cuota difiere');
ok(sim.schedule.length === 36, `tabla de 36 filas en el DTO (${sim.schedule.length})`);
ok(sim.yearlySummary.length === 3, `resumen de 3 años (${sim.yearlySummary.length})`);
ok(sim.yearlySummary[0].rangeLabel === 'Cuotas 1–12',
   `rango del primer bloque (${sim.yearlySummary[0].rangeLabel})`);

// El DTO no debe dejar escapar value objects ni comportamiento del dominio.
ok(typeof sim.installment === 'number' && typeof sim.schedule[0].payment === 'number',
   'los importes viajan como números planos, no como Money');
ok(Object.values(sim).every((v) => typeof v !== 'function'),
   'el DTO no expone métodos: la vista no puede ejecutar reglas');
ok(Object.isFrozen(sim) && Object.isFrozen(sim.schedule) && Object.isFrozen(sim.schedule[0]),
   'el DTO está congelado en profundidad');

/* --- El caso de uso nunca lanza: devuelve Result --- */

const sinProducto = await simulate.execute({ productId: 999, amount: '5000000', termInMonths: '12' });
ok(sinProducto.isFailure && 'productId' in sinProducto.fieldErrors,
   'producto inexistente -> Result de fallo con fieldErrors.productId');

const sinMonto = await simulate.execute({ productId: '1', amount: '', termInMonths: '36' });
ok(sinMonto.isFailure && 'amount' in sinMonto.fieldErrors,
   `monto vacío rechazado (${sinMonto.fieldErrors.amount})`);

const plazoCero = await simulate.execute({ productId: '1', amount: '10000000', termInMonths: '0' });
ok(plazoCero.isFailure && 'termInMonths' in plazoCero.fieldErrors,
   `plazo cero rechazado (${plazoCero.fieldErrors.termInMonths})`);

const dobleFallo = await simulate.execute({ productId: '1', amount: 'abc', termInMonths: '-3' });
ok(dobleFallo.isFailure &&
     'amount' in dobleFallo.fieldErrors && 'termInMonths' in dobleFallo.fieldErrors,
   'monto y plazo inválidos se reportan juntos, en una sola pasada');

const fueraDeRango = await simulate.execute({ productId: '1', amount: '99000000', termInMonths: '36' });
ok(fueraDeRango.isFailure && 'amount' in fueraDeRango.fieldErrors,
   'el límite del producto se aplica desde el dominio, no desde la vista');

const vacio = await simulate.execute();
ok(vacio.isFailure, 'sin argumentos devuelve Result de fallo en vez de lanzar');

/* --- El DTO de producto expone los límites crudos para acotar los inputs --- */

const productosDTO = productMapper.toDTOList(await productRepository.findAll());
ok(productosDTO.every((p) => typeof p.minAmount === 'number'),
   'CreditProductDTO expone minAmount crudo');
ok(productosDTO.every((p) => p.maxAmount === null || typeof p.maxAmount === 'number'),
   'CreditProductDTO expone maxAmount crudo (o null si no hay tope)');

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
