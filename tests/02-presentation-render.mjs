/**
 * 02-presentation-render.mjs — Suite de PRESENTACIÓN (solo strings).
 *
 * Renderiza las 5 vistas a HTML y comprueba estructura, textos literales,
 * escapado y contratos. No necesita jsdom: las vistas son funciones de
 * viewModel → string, y aquí solo se inspecciona el string.
 *
 *   node tests/02-presentation-render.mjs
 */

// Stubs mínimos: ningún módulo de presentación toca el DOM al importarse,
// pero UrlBuilder lee document.baseURI si se le pide autodetectar.
globalThis.document = {
  baseURI: 'http://localhost/crediSmart/',
  getElementById: () => null,
  querySelector: () => null,
};
globalThis.window = { location: { pathname: '/crediSmart/', search: '', hash: '' } };

const { UrlBuilder } = await import('../src/presentation/shared/UrlBuilder.js');
const { NavbarComponent } = await import('../src/presentation/components/NavbarComponent.js');
const { FooterComponent } = await import('../src/presentation/components/FooterComponent.js');
const { ProductCardComponent } = await import('../src/presentation/components/ProductCardComponent.js');
const { AlertComponent } = await import('../src/presentation/components/AlertComponent.js');
const { CatalogView } = await import('../src/presentation/views/CatalogView.js');
const { SimulatorView } = await import('../src/presentation/views/SimulatorView.js');
const { ApplicationView } = await import('../src/presentation/views/ApplicationView.js');
const { NotFoundView } = await import('../src/presentation/views/NotFoundView.js');
const { AccessRestrictedView } = await import('../src/presentation/views/AccessRestrictedView.js');
const { NotFoundController } = await import('../src/presentation/controllers/NotFoundController.js');
const { DocumentTitleController } = await import('../src/presentation/decorators/DocumentTitleController.js');
const { HistoryRouter } = await import('../src/infrastructure/routing/HistoryRouter.js');
const { InMemoryCreditProductRepository } = await import('../src/infrastructure/persistence/InMemoryCreditProductRepository.js');
const { IntlMoneyFormatter } = await import('../src/infrastructure/formatters/IntlMoneyFormatter.js');
const { CreditProductMapper } = await import('../src/application/mappers/CreditProductMapper.js');
const { SimulationMapper } = await import('../src/application/mappers/SimulationMapper.js');
const { SimulateCreditUseCase } = await import('../src/application/usecases/SimulateCreditUseCase.js');
const { Container } = await import('../src/config/Container.js');
const { html, raw, escapeHtml } = await import('../src/presentation/shared/Html.js');

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails += 1; console.log('FAIL:', msg); } else console.log('ok  :', msg);
};

/* ----------------------------- Montaje ----------------------------- */
const urlBuilder = new UrlBuilder({ basePath: '/crediSmart/' });
const navbar = new NavbarComponent({ urlBuilder });
const footer = new FooterComponent();
const productCard = new ProductCardComponent({ urlBuilder });
const alert = new AlertComponent();

const repo = new InMemoryCreditProductRepository();
const mapper = new CreditProductMapper({ moneyFormatter: new IntlMoneyFormatter() });
const products = mapper.toDTOList(await repo.findAll());

const catalogHtml = new CatalogView({ navbar, footer, productCard, urlBuilder })
  .render({ products });

// El simulador se pinta con una simulación real: el DTO lo produce el mismo
// caso de uso que usa la aplicación, no un objeto inventado para la prueba.
const moneyFormatter = new IntlMoneyFormatter();
const simulateCredit = new SimulateCreditUseCase({
  productRepository: repo,
  simulationMapper: new SimulationMapper({ moneyFormatter }),
});
const simulation = (await simulateCredit.execute({
  productId: 1, amount: 10_000_000, termInMonths: 36,
})).value;

const simulatorViewModel = {
  catalog: products,
  form: { productId: '1', amount: '10000000', termInMonths: '36' },
  bounds: {
    minAmount: products[0].minAmount,
    maxAmount: products[0].maxAmount,
    maxTermMonths: products[0].maxTermMonths,
    amountRangeLabel: products[0].amountRangeLabel,
  },
  simulation,
  errors: {},
  schedule: { open: false, mode: 'yearly' },
  products,
  ranges: [{ index: 0, label: 'Todos los montos' }, { index: 1, label: 'Hasta $5.000.000' }],
  query: '', selectedRangeIndex: 0, matched: 6, total: 6, isFiltered: false,
};

const newSimulatorView = () => new SimulatorView({ navbar, footer, productCard, alert });

const simulatorHtml = newSimulatorView().render(simulatorViewModel);

const simulatorTableHtml = newSimulatorView().render({
  ...simulatorViewModel,
  schedule: { open: true, mode: 'monthly' },
});

const simulatorYearlyHtml = newSimulatorView().render({
  ...simulatorViewModel,
  schedule: { open: true, mode: 'yearly' },
});

const simulatorErrorHtml = newSimulatorView().render({
  ...simulatorViewModel,
  errors: { amount: 'El monto debe estar entre $1.000.000 y $30.000.000 para Crédito Libre Inversión.' },
});

const simulatorEmptyHtml = newSimulatorView().render({
  ...simulatorViewModel,
  simulation: null,
});

const applicationHtml = new ApplicationView({ navbar, footer }).render({
  productNames: products.map((p) => p.name),
  termOptions: [12, 24, 36, 48, 60],
  values: { fullName: 'Ana <script>alert(1)</script>' },
  errors: { email: 'El email es obligatorio.' },
});

const notFoundHtml = new NotFoundView({ urlBuilder }).render({ requestedPath: 'foo' });
const accessHtml = new AccessRestrictedView().render({});

/* -------------------------- Html.js -------------------------- */
console.log('\n--- Html.js (escapado) ---');

ok(escapeHtml('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
   'escapeHtml: escapa <, >, ", & ');
ok(html`<p>${'<b>x</b>'}</p>` === '<p>&lt;b&gt;x&lt;/b&gt;</p>', 'html: escapa por defecto');
ok(html`<p>${raw('<b>x</b>')}</p>` === '<p><b>x</b></p>', 'html: raw() inserta tal cual');
ok(html`<p>${null}${undefined}${false}${true}</p>` === '<p></p>',
   'html: null/undefined/false/true → cadena vacía');
ok(html`<p>${['a', 'b']}</p>` === '<p>ab</p>', 'html: arrays se unen');

/* ---------------------- HTML bien formado ---------------------- */
console.log('\n--- Estructura del HTML ---');

function tagBalance(markup) {
  const VOID = new Set(['br', 'input', 'img', 'hr', 'meta', 'link', 'path', 'source',
                        'area', 'base', 'col', 'embed', 'track', 'wbr']);
  const stack = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let match;
  while ((match = re.exec(markup))) {
    const [full, tag, selfClose] = match;
    const name = tag.toLowerCase();
    if (VOID.has(name) || selfClose === '/') continue;
    if (full.startsWith('</')) {
      const top = stack.pop();
      if (top !== name) return `cierre </${name}> pero se esperaba </${top}>`;
    } else {
      stack.push(name);
    }
  }
  return stack.length ? `sin cerrar: ${stack.join(', ')}` : null;
}

for (const [name, markup] of [
  ['catálogo', catalogHtml], ['simulador', simulatorHtml], ['solicitar', applicationHtml],
  ['404', notFoundHtml], ['acceso restringido', accessHtml],
]) {
  const err = tagBalance(markup);
  ok(err === null, `${name}: etiquetas balanceadas ${err ?? ''}`);
}

/* --------------------------- Catálogo --------------------------- */
console.log('\n--- Catálogo (/) ---');

ok(catalogHtml.includes('Tu crédito ideal,'), 'título del hero');
ok(catalogHtml.includes('en un solo lugar'), 'acento del hero');
ok(catalogHtml.includes('Consulta, simula y solicita créditos de forma rápida, segura y 100% en línea.'),
   'subtítulo literal');
ok(catalogHtml.includes('Nuestros Productos'), 'sección de productos');
ok(catalogHtml.includes('Elige el crédito que mejor se adapta a tus necesidades'), 'subtítulo de sección');
ok((catalogHtml.match(/data-product-id="/g) || []).length === 6, '6 tarjetas');
ok(catalogHtml.includes('href="/crediSmart/simulador"'), 'href con prefijo de despliegue');
ok(catalogHtml.includes('data-link'), 'enlaces marcados para el router');
ok(catalogHtml.includes('navlink--active') && catalogHtml.includes('navlink--cta'),
   'navbar: enlace activo + CTA');
ok(catalogHtml.includes('aria-current="page"'), 'navbar: aria-current en la ruta activa');
ok(catalogHtml.includes('Requisitos:'), 'variante full: requisitos visibles');
ok(catalogHtml.includes('Ver detalles'), 'variante full: botón "Ver detalles"');
ok(catalogHtml.includes('© 2025 Todos los derechos reservados · Plataforma de solicitudes de crédito en línea'),
   'footer variante catalog (texto largo)');
ok(catalogHtml.includes('theme-blue') && catalogHtml.includes('theme-rose'),
   'clases de tema de producto');
ok(catalogHtml.includes('💳') && catalogHtml.includes('🏢'), 'emojis de producto');

/* --------------------------- Simulador --------------------------- */
console.log('\n--- Simulador (/simulador) ---');

ok(simulatorHtml.includes('Simulador de Crédito'), 'título');
ok(simulatorHtml.includes('Calcula tu cuota mensual y consulta cuánto pagarías en total'),
   'subtítulo del simulador');
ok(simulatorHtml.includes('Busca y filtra los productos disponibles según tus necesidades'),
   'el filtro del catálogo conserva su subtítulo');
ok(simulatorHtml.includes('Ej: Crédito Vehículo...'), 'placeholder de búsqueda');
ok(simulatorHtml.includes('🔍 Buscar') && simulatorHtml.includes('Limpiar'), 'botones de filtro');
ok(simulatorHtml.includes('product-card--compact'), 'tarjetas en variante compacta');
ok(!simulatorHtml.includes('Requisitos:'), 'variante compacta: sin requisitos');
ok(!simulatorHtml.includes('Ver detalles'), 'variante compacta: sin "Ver detalles"');
ok(simulatorHtml.includes('<strong>estático</strong>'), 'aviso informativo');
ok(!simulatorHtml.includes('results-count'), 'sin contador cuando isFiltered es false');

const filteredHtml = newSimulatorView().render({
  ...simulatorViewModel,
  products: [products[2]],
  ranges: [{ index: 0, label: 'Todos los montos' }],
  query: 'vivienda', selectedRangeIndex: 0, matched: 1, total: 6, isFiltered: true,
});
ok(filteredHtml.includes('results-count'), 'contador presente cuando isFiltered es true');
ok(filteredHtml.includes('value="vivienda"'), 'el texto buscado sobrevive al re-render');

const emptyHtml = newSimulatorView().render({
  ...simulatorViewModel,
  products: [], ranges: [], query: 'zzz', selectedRangeIndex: 0,
  matched: 0, total: 6, isFiltered: true,
});
ok(emptyHtml.includes('Ningún producto coincide con los filtros aplicados.'), 'estado vacío');

/* --------------------------- Solicitar --------------------------- */
console.log('\n--- Solicitar (/solicitar) ---');

ok(applicationHtml.includes('Solicitar Crédito'), 'título');
ok(applicationHtml.includes('Completa el formulario y un asesor se comunicará contigo.'), 'subtítulo');
ok(applicationHtml.includes('Datos Personales')
   && applicationHtml.includes('Datos del Crédito')
   && applicationHtml.includes('Datos Laborales'), '3 secciones');
ok(applicationHtml.includes('-- Seleccione un tipo --')
   && applicationHtml.includes('-- Seleccione --'), 'placeholders de los select');
ok(applicationHtml.includes('✅ Enviar Solicitud')
   && applicationHtml.includes('🗑️ Limpiar Formulario'), 'botones');
ok((applicationHtml.match(/t-required/g) || []).length >= 11, '11 marcas de campo obligatorio');
ok(applicationHtml.includes('60 meses'), 'opciones de plazo');
ok((applicationHtml.match(/value="Crédito/g) || []).length === 6,
   'select de tipo con los 6 productos');
ok(applicationHtml.includes('is-invalid') && applicationHtml.includes('El email es obligatorio.'),
   'error de campo pintado');
ok(applicationHtml.includes('aria-invalid="true"') && applicationHtml.includes('aria-describedby'),
   'accesibilidad del error');
ok(applicationHtml.includes('role="alert"'), 'contenedor de error con role=alert');

ok(applicationHtml.includes('Ana &lt;script&gt;'), 'XSS: valor del usuario escapado');
ok(!applicationHtml.includes('<script>alert(1)</script>'), 'XSS: no hay script inyectado');

/* ------------------------ Pantallas de sistema ------------------------ */
console.log('\n--- 404 y acceso restringido ---');

ok(notFoundHtml.includes('>404<') && notFoundHtml.includes('Page Not Found')
   && notFoundHtml.includes('Go Home'), '404: contenido literal');
ok(notFoundHtml.includes('"foo"'), '404: muestra la ruta solicitada');
ok(notFoundHtml.includes('href="/crediSmart/"'), '404: enlace a inicio con prefijo');
ok(accessHtml.includes('Access Restricted'), 'acceso restringido: contenido');

/* ------------------------- Router y contratos ------------------------- */
console.log('\n--- Router, contratos y contenedor ---');

const logger = { debug() {}, info() {}, warn() {}, error() {} };
const router = new HistoryRouter({ urlBuilder, logger });
const fakeRenderer = { mount() {}, refresh() {}, clear() {} };
const notFoundController = new NotFoundController({
  view: new NotFoundView({ urlBuilder }), renderer: fakeRenderer,
});

router.register('/', notFoundController)
      .setFallback(new DocumentTitleController({ controller: notFoundController, title: 'x' }));

ok(router.currentPath() === '/', `currentPath respeta el basePath (${router.currentPath()})`);
ok(urlBuilder.toRoutePath('/crediSmart/simulador') === '/simulador', 'toRoutePath quita el prefijo');
ok(urlBuilder.href('/solicitar') === '/crediSmart/solicitar', 'href añade el prefijo');
ok(UrlBuilder.normalizeBase('apps/credito') === '/apps/credito/', 'normalizeBase canoniza');

try {
  router.register('/x', { handle() {} });
  ok(false, 'debe rechazar un controlador incompleto');
} catch (e) {
  ok(e.code === 'CONTRACT_VIOLATION', `rechaza controlador incompleto (${e.code})`);
  ok(e.details.missingMethods.includes('dispose'), 'informa del método que falta');
}

const cyclic = new Container();
cyclic.register('a', (c) => c.resolve('b'));
cyclic.register('b', (c) => c.resolve('a'));
try {
  cyclic.resolve('a');
  ok(false, 'debe detectar dependencia circular');
} catch (e) {
  ok(/circular/i.test(e.message), `detecta dependencia circular (${e.message})`);
}

const duplicated = new Container();
duplicated.register('x', () => 1);
try {
  duplicated.register('x', () => 2);
  ok(false, 'debe rechazar registro duplicado');
} catch (e) {
  ok(/ya estaba registrada/.test(e.message), 'rechaza registro duplicado');
}


console.log('');
console.log('--- Simulador: cálculo ---');

ok(simulatorHtml.includes('🧮 Simula tu crédito'), 'panel de simulación presente');
ok(simulatorHtml.includes('name="productId"') &&
   simulatorHtml.includes('name="amount"') &&
   simulatorHtml.includes('name="termInMonths"'),
   'los tres campos del simulador');
ok(simulatorHtml.includes('🧮 Calcular cuota'), 'botón de cálculo');
ok(simulatorHtml.includes('min="1000000"') && simulatorHtml.includes('max="30000000"'),
   'el input de monto se acota con los límites del producto');
ok(simulatorHtml.includes('max="60"'), 'el input de plazo se acota con el plazo máximo');

ok(simulatorHtml.includes('Cuota mensual') && simulatorHtml.includes(simulation.installmentLabel),
   `la cuota calculada se pinta (${simulation.installmentLabel})`);
ok(simulatorHtml.includes('Total en intereses') && simulatorHtml.includes(simulation.totalInterestLabel),
   'el total de intereses se pinta');
ok(simulatorHtml.includes('Total a pagar') && simulatorHtml.includes(simulation.totalPaidLabel),
   'el total a pagar se pinta');
ok(simulatorHtml.includes(simulation.monthlyRateLabel), 'la tasa mensual equivalente se pinta');
ok(simulatorHtml.includes('absorbe'), 'se avisa del ajuste por redondeo de la última cuota');

// La vista no debe recalcular: solo puede pintar lo que trae el DTO.
ok(!/Math\.(pow|round)/.test(simulatorHtml), 'la vista no filtra cálculos al HTML');

console.log('');
console.log('--- Simulador: tabla de amortización ---');

ok(!simulatorHtml.includes('sim-table'), 'la tabla va plegada por defecto');
ok(simulatorHtml.includes('▼ Ver') && simulatorHtml.includes('(36 cuotas)'),
   'el botón anuncia cuántas cuotas hay');
ok(simulatorHtml.includes('aria-expanded="false"'), 'el botón declara su estado plegado');

ok(simulatorYearlyHtml.includes('Resumen por año'), 'modo anual: encabezado');
ok((simulatorYearlyHtml.match(/<tbody>[\s\S]*?<\/tbody>/) || [''])[0].split('<tr>').length - 1 === 3,
   'modo anual: 3 filas para 36 meses');
ok(simulatorYearlyHtml.includes('Cuotas 1–12'), 'modo anual: rango del primer bloque');
ok(simulatorYearlyHtml.includes('aria-pressed="true"'), 'modo anual: el botón activo se marca');

ok(simulatorTableHtml.includes('Detalle mes a mes'), 'modo mensual: encabezado');
ok((simulatorTableHtml.match(/<tbody>[\s\S]*?<\/tbody>/) || [''])[0].split('<tr>').length - 1 === 36,
   'modo mensual: 36 filas');

console.log('');
console.log('--- Simulador: errores y estado vacío ---');

ok(simulatorErrorHtml.includes('El monto debe estar entre'),
   'el error de dominio se pinta bajo su campo');
ok(simulatorErrorHtml.includes('aria-invalid="true"'), 'el campo con error se marca para lectores');
ok(simulatorErrorHtml.includes('is-invalid'), 'el campo con error recibe la clase de estado');
ok(simulatorErrorHtml.includes(simulation.installmentLabel),
   'con un error de campo se conserva la última cuota válida en pantalla');

ok(simulatorEmptyHtml.includes('Completa el monto y el plazo'),
   'sin simulación se explica qué falta');
ok(!simulatorEmptyHtml.includes('sim-table') && !simulatorEmptyHtml.includes('tabla de amortización'),
   'sin simulación no hay tabla que mostrar');

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
