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

const simulatorHtml = new SimulatorView({ navbar, footer, productCard, alert }).render({
  products,
  ranges: [{ index: 0, label: 'Todos los montos' }, { index: 1, label: 'Hasta $5.000.000' }],
  query: '', selectedRangeIndex: 0, matched: 6, total: 6, isFiltered: false,
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
ok(simulatorHtml.includes('Busca y filtra los productos disponibles según tus necesidades'), 'subtítulo');
ok(simulatorHtml.includes('Ej: Crédito Vehículo...'), 'placeholder de búsqueda');
ok(simulatorHtml.includes('🔍 Buscar') && simulatorHtml.includes('Limpiar'), 'botones de filtro');
ok(simulatorHtml.includes('product-card--compact'), 'tarjetas en variante compacta');
ok(!simulatorHtml.includes('Requisitos:'), 'variante compacta: sin requisitos');
ok(!simulatorHtml.includes('Ver detalles'), 'variante compacta: sin "Ver detalles"');
ok(simulatorHtml.includes('<strong>estáticos</strong>'), 'aviso informativo');
ok(!simulatorHtml.includes('results-count'), 'sin contador cuando isFiltered es false');

const filteredHtml = new SimulatorView({ navbar, footer, productCard, alert }).render({
  products: [products[2]],
  ranges: [{ index: 0, label: 'Todos los montos' }],
  query: 'vivienda', selectedRangeIndex: 0, matched: 1, total: 6, isFiltered: true,
});
ok(filteredHtml.includes('results-count'), 'contador presente cuando isFiltered es true');
ok(filteredHtml.includes('value="vivienda"'), 'el texto buscado sobrevive al re-render');

const emptyHtml = new SimulatorView({ navbar, footer, productCard, alert }).render({
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

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
