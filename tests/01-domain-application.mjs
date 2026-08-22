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

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
