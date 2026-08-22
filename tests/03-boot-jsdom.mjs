/**
 * 03-boot-jsdom.mjs — Suite de ARRANQUE COMPLETO en un DOM real (jsdom).
 *
 * Carga el `index.html` de verdad, construye el grafo completo de dependencias,
 * arranca el router y simula la interacción del usuario: clics, teclas, envío
 * de formulario. Es la suite que verifica el sistema entero de punta a punta.
 *
 * Requiere jsdom (única dependencia de todo el proyecto, y solo para pruebas):
 *
 *   npm install jsdom --no-save
 *   node tests/03-boot-jsdom.mjs
 */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');

/* ------------------------- DOM de pruebas ------------------------- */
const dom = new JSDOM(indexHtml, {
  url: 'http://localhost/crediSmart/',
  runScripts: 'outside-only',      // los módulos se importan a mano, no vía <script>
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.FormData = window.FormData;
globalThis.URLSearchParams = window.URLSearchParams;
globalThis.MouseEvent = window.MouseEvent;
globalThis.Event = window.Event;
globalThis.localStorage = window.localStorage;
window.scrollTo = () => {};                                   // jsdom no implementa scroll
window.HTMLElement.prototype.scrollIntoView = () => {};

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails += 1; console.log('FAIL:', msg); } else console.log('ok  :', msg);
};
const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------- Arranque --------------------------- */
console.log('\n--- Arranque ---');

const { AppConfig } = await import('../src/config/AppConfig.js');
const { buildContainer } = await import('../src/config/dependencies.js');
const { ROUTE_TABLE, FALLBACK_CONTROLLER } = await import('../src/config/routes.js');
const { DocumentTitleController } = await import('../src/presentation/decorators/DocumentTitleController.js');

const rootElement = document.querySelector(AppConfig.selectors.root);
ok(!!rootElement, 'contenedor #root encontrado en index.html');
ok(!!document.querySelector(AppConfig.selectors.notifications),
   'contenedor #notifications encontrado');

const container = buildContainer({ config: AppConfig, rootElement });
container.eagerResolveAll();
ok(container.keys().length === 34, `grafo completo resuelto (${container.keys().length} dependencias)`);
ok(container.resolve('urlBuilder').basePath === '/crediSmart/',
   `basePath autodetectado (${container.resolve('urlBuilder').basePath})`);

const router = container.resolve('router');
for (const route of ROUTE_TABLE) {
  router.register(route.path, new DocumentTitleController({
    controller: container.resolve(route.controller),
    title: route.title,
  }));
}
router.setFallback(new DocumentTitleController({
  controller: container.resolve(FALLBACK_CONTROLLER),
  title: `${AppConfig.appName} — Página no encontrada`,
}));

await router.start();

/* --------------------------- Catálogo --------------------------- */
console.log('\n--- Catálogo (/) ---');

ok(rootElement.innerHTML.includes('Tu crédito ideal,'), 'catálogo renderizado');
ok(document.querySelectorAll('.product-card').length === 6,
   `6 tarjetas en el DOM (${document.querySelectorAll('.product-card').length})`);
ok(document.title === 'CreditSmart — Catálogo', `título del documento (${document.title})`);
ok(document.querySelector('.navlink--active').textContent.trim() === 'Catálogo',
   'enlace activo = Catálogo');
ok(document.querySelector('.hero') !== null, 'hero presente');
ok(document.querySelector('.footer') !== null, 'footer presente');

/* ------------------- Navegación por clic ------------------- */
console.log('\n--- Navegación sin recarga ---');

const simulatorLink = [...document.querySelectorAll('a[data-link]')]
  .find((a) => a.getAttribute('href') === '/crediSmart/simulador');
ok(!!simulatorLink, 'enlace a /simulador presente');

simulatorLink.dispatchEvent(new window.MouseEvent('click', {
  bubbles: true, cancelable: true, button: 0,
}));
await tick();

ok(window.location.pathname === '/crediSmart/simulador',
   `URL cambiada sin recarga (${window.location.pathname})`);
ok(document.title === 'CreditSmart — Simulador', 'título actualizado por el decorador');
ok(document.querySelector('h1').textContent.trim() === 'Simulador de Crédito', 'simulador renderizado');
ok(document.querySelectorAll('.product-card--compact').length === 6, 'tarjetas en variante compacta');
ok(document.querySelectorAll('#filter-range option').length === 5, '5 opciones de rango');

/* ----------------------- Simulador en vivo ----------------------- */
console.log('');
console.log('--- Simulador: cálculo sobre el DOM real ---');

// El formateador es-CO separa el símbolo con espacio duro (U+00A0): se
// normaliza antes de comparar, para no atar la prueba a un byte invisible.
const norm = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

// Cada interacción re-renderiza la vista entera y sustituye los nodos: guardar
// una referencia entre pasos daría un elemento huérfano sin listeners.
const $sim = (id) => document.getElementById(id);
const cuota = () => norm(document.querySelector('.sim-metric--highlight .sim-metric__value')?.textContent);
const teclear = async (id, value) => {
  const field = $sim(id);
  field.focus();
  field.value = value;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick();
};
const pulsar = async (selector) => {
  document.querySelector(selector)
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
};

ok(document.querySelectorAll('#sim-product option').length === 6,
   `6 productos en el selector (${document.querySelectorAll('#sim-product option').length})`);
ok($sim('sim-amount').value === '1000000',
   `arranca en el monto mínimo del primer producto (${$sim('sim-amount').value})`);
ok($sim('sim-term').value === '12', `arranca en 12 meses (${$sim('sim-term').value})`);
ok(cuota() === '$ 91.250', `simula al entrar en la ruta (${cuota()})`);
ok($sim('sim-amount').getAttribute('max') === '30000000', 'el input hereda el tope del producto');

// Cambiar el monto recalcula sin recargar ni perder el foco.
await teclear('sim-amount', '10000000');
ok(cuota() === '$ 912.498', `recalcula al teclear el monto (${cuota()})`);
ok(document.activeElement?.id === 'sim-amount',
   `foco conservado en el monto (${document.activeElement?.id})`);

// Un monto por encima del tope: error de dominio bajo el campo, y la última
// cifra válida sigue en pantalla.
await teclear('sim-amount', '99000000');
ok($sim('sim-amount').classList.contains('is-invalid'), 'monto fuera de rango marca el campo');
ok(norm($sim('sim-amount-error').textContent).includes('30.000.000'),
   `el mensaje cita el límite real del producto (${norm($sim('sim-amount-error').textContent)})`);
ok(cuota() === '$ 912.498', 'se conserva la última cuota válida mientras se corrige');

// Cambiar de producto reencaja el monto en el nuevo rango en vez de dejar el error.
const productSelect = $sim('sim-product');
productSelect.value = '3';
productSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await tick();

ok($sim('sim-amount').value === '99000000',
   `el monto cabe en Vivienda y se conserva (${$sim('sim-amount').value})`);
ok(!$sim('sim-amount').classList.contains('is-invalid'), 'al cambiar de producto desaparece el error');
ok($sim('sim-term').getAttribute('max') === '240', 'el plazo máximo pasa a ser el de Vivienda');

// Un monto por debajo del mínimo del producto nuevo sí se reencaja hacia arriba.
await teclear('sim-amount', '1000000');
ok($sim('sim-amount').classList.contains('is-invalid'),
   '1.000.000 queda por debajo del mínimo de Vivienda');
$sim('sim-product').value = '2';
$sim('sim-product').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick();
ok($sim('sim-amount').value === '5000000',
   `el monto sube al mínimo del producto elegido (${$sim('sim-amount').value})`);

// Tabla de amortización: plegada, se despliega y cambia de detalle.
ok(document.querySelector('.sim-table') === null, 'la tabla arranca plegada');

await pulsar('[data-action="toggle-schedule"]');
ok(document.querySelector('.sim-table') !== null, 'la tabla se despliega');
ok(document.querySelectorAll('.sim-table tbody tr').length === 1,
   `resumen anual: 1 bloque para 12 meses (${document.querySelectorAll('.sim-table tbody tr').length})`);

await pulsar('[data-action="schedule-mode"][data-mode="monthly"]');
ok(document.querySelectorAll('.sim-table tbody tr').length === 12,
   `detalle mensual: 12 filas (${document.querySelectorAll('.sim-table tbody tr').length})`);

const saldoFinal = norm([...document.querySelectorAll('.sim-table tbody tr')].pop()
  .querySelectorAll('td')[3].textContent);
ok(saldoFinal === '$ 0', `la última fila deja el saldo en cero (${saldoFinal})`);

// Reiniciar vuelve al estado de partida.
await pulsar('[data-action="reset-simulation"]');
ok($sim('sim-product').value === '1', 'reiniciar vuelve al primer producto');
ok(cuota() === '$ 91.250', `reiniciar restaura la simulación inicial (${cuota()})`);
ok(document.querySelector('.sim-table') === null, 'reiniciar vuelve a plegar la tabla');

/* --------------------- Búsqueda en vivo --------------------- */
console.log('\n--- Filtros del simulador ---');

const queryInput = document.getElementById('filter-query');
queryInput.value = 'vivienda';
queryInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick();

ok(document.querySelectorAll('.product-card').length === 1,
   `búsqueda "vivienda" → 1 tarjeta (${document.querySelectorAll('.product-card').length})`);
ok(document.querySelector('.results-count')?.textContent.includes('1'), 'contador de resultados');
ok(document.activeElement?.id === 'filter-query',
   `foco conservado tras el re-render (${document.activeElement?.id})`);
ok(document.getElementById('filter-query').value === 'vivienda', 'texto buscado conservado');

document.getElementById('filter-query').value = '';
const rangeSelect = document.getElementById('filter-range');
rangeSelect.value = '1';
rangeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await tick();

ok(document.querySelectorAll('.product-card').length === 4,
   `rango "Hasta $5.000.000" → 4 tarjetas (${document.querySelectorAll('.product-card').length})`);

document.getElementById('filter-query').value = 'zzzz';
document.getElementById('filter-query').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick();
ok(document.querySelector('.alert--empty') !== null, 'estado vacío cuando no hay coincidencias');

document.querySelector('[data-action="clear"]').dispatchEvent(new window.MouseEvent('click', {
  bubbles: true, cancelable: true, button: 0,
}));
await tick();
ok(document.querySelectorAll('.product-card').length === 6, '"Limpiar" restaura las 6 tarjetas');

/* ----------------------- Formulario ----------------------- */
console.log('\n--- Formulario de solicitud (/solicitar) ---');

await router.navigate('/solicitar');
ok(document.querySelector('h1').textContent.trim() === 'Solicitar Crédito', 'formulario renderizado');
ok(document.querySelectorAll('.form__section').length === 3, '3 secciones');
ok(document.querySelectorAll('#field-productName option').length === 7,
   `select de tipo: placeholder + 6 productos (${document.querySelectorAll('#field-productName option').length})`);
ok(document.querySelectorAll('#field-termInMonths option').length === 6, 'select de plazo con 5 opciones');

const form = document.querySelector('[data-application-form]');
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(50);

ok(document.querySelectorAll('.control.is-invalid').length === 11,
   `11 campos inválidos (${document.querySelectorAll('.control.is-invalid').length})`);
ok(document.querySelector('#notifications .toast--error') !== null, 'toast de error mostrado');
ok(document.querySelector('#notifications .toast--error').getAttribute('role') === 'alert',
   'toast de error con role=alert');

const setValue = (id, value) => { document.getElementById(id).value = value; };
setValue('field-fullName', 'Juan Carlos Pérez');
setValue('field-idNumber', '1234567890');
setValue('field-email', 'juan@correo.com');
setValue('field-phone', '3001234567');
setValue('field-productName', 'Crédito Vehículo');
setValue('field-amount', '50000000');
setValue('field-termInMonths', '60');
setValue('field-purpose', 'Compra de vehículo familiar nuevo');
setValue('field-companyName', 'Empresa ABC S.A.S');
setValue('field-jobTitle', 'Analista de Sistemas');
setValue('field-monthlyIncome', '3500000');

document.querySelector('[data-application-form]')
  .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(50);

ok(document.querySelectorAll('.control.is-invalid').length === 0, 'sin errores tras un envío válido');
const successToast = document.querySelector('#notifications .toast--success');
ok(successToast !== null, 'toast de éxito mostrado');
if (successToast) {
  const text = successToast.textContent.replace(/\s+/g, ' ').trim();
  ok(/CS-[0-9A-F]{8}/.test(text), `radicado en el mensaje (${text})`);
  ok(text.includes('Juan'), 'saludo con el primer nombre');
}
const stored = JSON.parse(window.localStorage.getItem('creditsmart:applications') ?? '[]');
ok(stored.length === 1, 'solicitud persistida en localStorage');
ok(stored[0].status === 'RADICADA', `estado persistido (${stored[0]?.status})`);
ok(document.getElementById('field-fullName').value === '', 'formulario limpio tras el éxito');

/* --------------------- Monto fuera de rango --------------------- */
setValue('field-fullName', 'Ana María Gómez');
setValue('field-idNumber', '9876543');
setValue('field-email', 'ana@correo.com');
setValue('field-phone', '3109876543');
setValue('field-productName', 'Crédito Vehículo');
setValue('field-amount', '1000');
setValue('field-termInMonths', '24');
setValue('field-purpose', 'Compra de motocicleta para trabajo');
setValue('field-companyName', 'XYZ Ltda');
setValue('field-jobTitle', 'Contadora');
setValue('field-monthlyIncome', '4000000');

document.querySelector('[data-application-form]')
  .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(50);

const amountError = document.getElementById('field-amount-error');
ok(amountError?.textContent.includes('El monto debe estar entre'),
   `política de dominio aplicada (${amountError?.textContent.trim()})`);

/* --------------------------- 404 --------------------------- */
console.log('\n--- Ruta inexistente ---');

await router.navigate('/no-existe');
ok(document.querySelector('.sys-code')?.textContent === '404', '404 renderizado');
ok(rootElement.innerHTML.includes('"no-existe"'), '404 muestra la ruta solicitada');
ok(document.title === 'CreditSmart — Página no encontrada', 'título del 404');

/* ----------------------- Vuelta al inicio ----------------------- */
await router.navigate('/');
ok(document.querySelector('.hero') !== null, 'regreso al catálogo');
ok(document.querySelectorAll('.product-card').length === 6, 'catálogo completo de nuevo');

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
