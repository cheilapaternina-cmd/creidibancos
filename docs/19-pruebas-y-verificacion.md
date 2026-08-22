[← Volver al índice maestro](./master.md)

# 19 — Pruebas y verificación

## 19.1 Las tres suites

```
tests/
├── 01-domain-application.mjs      Núcleo, sin DOM, sin dependencias
├── 02-presentation-render.mjs     Vistas como strings, sin DOM
└── 03-boot-jsdom.mjs              Sistema completo en un DOM real
```

| Suite | Qué cubre | Dependencias | Aserciones |
|---|---|---|---|
| 01 | Value objects, entidades, servicios de dominio, simulación, criterios, los 6 casos de uso, repositorios | **ninguna** | 85 |
| 02 | `Html.js`, las 5 vistas, el simulador, componentes, `UrlBuilder`, router, contratos, contenedor | **ninguna** | 89 |
| 03 | Arranque completo, navegación, simulador en vivo, filtros, formulario, persistencia, 404 | jsdom (solo pruebas) | 66 |

Total: **240 aserciones**, todas en verde.

Ejecución:

```bash
cd C:/laragon/www/crediSmart

node tests/01-domain-application.mjs
node tests/02-presentation-render.mjs

npm install jsdom --no-save        # una sola vez
node tests/03-boot-jsdom.mjs
```

Las tres imprimen `TODO OK` y devuelven código de salida 0. Cualquier fallo
imprime `FAIL: <descripción>` y sale con 1, así que sirven en un pipeline de CI
sin adaptación.

**No hay framework de pruebas.** No hay Jest, ni Vitest, ni Mocha. Son tres
scripts con un `ok(condición, mensaje)` de tres líneas. Coherente con la decisión
de proyecto sin build: la única dependencia de todo el repositorio es jsdom, y
solo para la tercera suite.

## 19.2 Suite 01 — Dominio y aplicación

`tests/01-domain-application.mjs`

### Por qué esta suite es la prueba de la arquitectura

Se ejecuta en Node **sin navegador, sin DOM, sin jsdom y sin dependencias**. Si el
dominio importara `document`, `window`, `fetch`, `localStorage` o `Intl`
directamente, este archivo no arrancaría.

Que arranque **es** la verificación de que el núcleo está aislado. No es una
prueba *sobre* la arquitectura: es una consecuencia de ella.

El grafo se construye a mano, con dobles que son objetos literales:

```js
const logger = new ConsoleLogger({ level: 'silent' });
const applicationRepository = new LocalStorageCreditApplicationRepository({
  idGenerator,
  storage: null,          // ← sin localStorage
});
```

Eso solo es posible porque los contratos son pequeños (ISP) y todo entra por
constructor (DIP). Sin librería de mocking.

### Qué verifica

**Value objects** (13 aserciones)

| Comprobación | Código esperado |
|---|---|
| `Money`: igualdad por valor y comparación | — |
| `Money` rechaza negativos | `NEGATIVE_MONEY_AMOUNT` |
| `Money` rechaza `NaN` | `INVALID_MONEY_AMOUNT` |
| `Money` rechaza mezclar COP con USD | `CURRENCY_MISMATCH` |
| `InterestRate.monthlyFraction` usa `(1+i)^(1/12)−1`, no `i/12` | — |
| `InterestRate` rechaza tasas > 100 | `RATE_OUT_OF_BOUNDS` |
| `Term` rechaza plazos negativos | `INVALID_TERM` |
| `AmountRange` rechaza rangos invertidos | `INVERTED_RANGE` |
| `AmountRange.overlaps` con y sin intersección, y con máximo infinito | — |
| `CreditProduct.normalize` quita acentos y mayúsculas | — |

**Catálogo** (6 aserciones): 6 productos, formato `$ 1.000.000 – $ 30.000.000`,
`themeClass: 'theme-blue'`, DTO congelado, y —importante— que el DTO **no tenga
métodos**:

```js
ok(typeof list.value.products[0].admitsAmount === 'undefined',
   'DTO sin comportamiento (la vista no puede ejecutar reglas)');
```

**Búsqueda y filtros** (9 aserciones): `"vehiculo"` → 1, `"credito"` → 5, sin
resultados → 0, los 5 rangos, `"Hasta $5.000.000"` → 3,
`"Más de $100.000.000"` → 3, `isFiltered` false sin filtros, nombres derivados del
catálogo.

**Radicación** (13 aserciones): formulario vacío → 11 errores con las claves
exactas; solicitud válida → radicado con formato `CS-XXXXXXXX`, estado `RADICADA`,
primer nombre extraído, capacidad de pago calculada, persistencia; monto fuera de
rango → rechazado por `CreditApplicationPolicy` con el mensaje literal; email
inválido y destino corto → rechazados.

**Simulación de crédito** (22 aserciones). Las cifras de referencia se calcularon
aparte y se comprueban literalmente:

| Caso | Comprobación |
|---|---|
| Libre Inversión · $10.000.000 · 36 m · 18,5 % E.A. | cuota exacta de **$357.000** |
| — | la suma de los abonos a capital es exactamente $10.000.000 |
| — | la última cuota ($356.984) difiere: absorbe el residuo del redondeo |
| — | `totalPaid = capital + totalInterest` |
| — | el interés del mes 1 se calcula sobre el saldo inicial y decrece después |
| Vivienda · $300.000.000 · **240 m** · 11,8 % E.A. | el capital sigue cuadrando al peso y el saldo cierra en cero |
| — | `yearlySummary()` produce 20 bloques que conservan el capital total |
| Tasa 0 % | degenera en el reparto lineal `P / n` |
| Fórmula compartida | `CreditApplicationPolicy` y el simulador dan la misma cuota |

El caso de 240 meses no es decorativo: es donde la deriva del redondeo se acumula
y donde un reparto mal hecho dejaría un saldo final distinto de cero.

Invariantes que deben **rechazarse**: plazo mayor que el máximo del producto
(`VALIDATION_ERROR` con `termInMonths`), monto fuera de rango (con `amount`), una
`Installment` cuya cuota no sea interés + capital (`INSTALLMENT_NOT_BALANCED`) y
un `AmortizationPlan` con menos cuotas que meses (`PLAN_LENGTH_MISMATCH`).

**`SimulateCreditUseCase`** (22 aserciones): simula con la entrada en texto tal
como llega del formulario; el DTO trae los importes como números planos, sin
métodos y congelado en profundidad; y el caso de uso **nunca lanza** — producto
inexistente, monto vacío, plazo cero, monto y plazo inválidos a la vez (que se
reportan juntos), monto fuera de rango y llamada sin argumentos devuelven todos
un `Result` de fallo con sus `fieldErrors`.

### Salida real

```
--- Value objects ---
ok  : Money: igualdad por valor
ok  : Money: rechaza negativos (NEGATIVE_MONEY_AMOUNT)
ok  : Money: rechaza mezcla de monedas (CURRENCY_MISMATCH)
ok  : InterestRate: tasa mensual equivalente, no anual/12
ok  : AmountRange: overlaps con máximo sin límite
ok  : CreditProduct.normalize: sin acentos ni mayúsculas

--- Catálogo ---
ok  : catálogo con 6 productos (6)
ok  : formato monetario es-CO/COP ($ 1.000.000 – $ 30.000.000)
ok  : DTO congelado
ok  : DTO sin comportamiento (la vista no puede ejecutar reglas)

--- Búsqueda y filtros ---
ok  : búsqueda "vehiculo" → 1 (1)
ok  : rango "Hasta $5.000.000" → 3 (3)
ok  : rango "Más de $100.000.000" → 3 (3)
ok  : sin filtros → isFiltered false

--- Radicación de solicitudes ---
ok  : 11 errores de campo (11)
      campos: fullName, idNumber, email, phone, productName, amount,
              termInMonths, purpose, companyName, jobTitle, monthlyIncome
ok  : número de radicado con formato (CS-F49B53E9)
ok  : capacidad de pago: cuota 1146680 ≤ tope 1400000
ok  : monto fuera de rango rechazado por CreditApplicationPolicy
      mensaje: El monto debe estar entre $5.000.000 y $120.000.000 para Crédito Vehículo.

TODO OK
```

### Un detalle que costó una iteración

`Intl.NumberFormat('es-CO')` separa el símbolo de moneda con un **espacio duro**
(U+00A0), no con un espacio normal. La primera versión de la aserción comparaba
contra un espacio ASCII y fallaba con una salida que *parecía* idéntica. La
corrección normaliza los espacios al comparar:

```js
// Intl separa el símbolo con un espacio duro (U+00A0); se normaliza al comparar.
const normalizeSpaces = (value) => value.replace(/\s/g, ' ');
ok(normalizeSpaces(list.value.products[0].amountRangeLabel) === '$ 1.000.000 – $ 30.000.000', …);
```

## 19.3 Suite 02 — Presentación como strings

`tests/02-presentation-render.mjs`

Las vistas son funciones de `viewModel → string`, así que se pueden probar sin
DOM. Solo hacen falta dos stubs mínimos:

```js
globalThis.document = { baseURI: 'http://localhost/crediSmart/',
                        getElementById: () => null, querySelector: () => null };
globalThis.window = { location: { pathname: '/crediSmart/', search: '', hash: '' } };
```

### Qué verifica

**`Html.js`**: `escapeHtml` escapa `<`, `>`, `"`, `&`; `html`
escapa por defecto; `raw()` inserta tal cual; `null`/`undefined`/`false`/`true`
producen cadena vacía; los arrays se unen.

**HTML bien formado**: un verificador de balance de etiquetas
recorre cada vista con una pila, saltando elementos vacíos
(`br`, `input`, `path`, …) y auto-cerrados, y comprueba que cada cierre
corresponde al último abierto.

**Catálogo**: textos literales del original (*"Tu crédito ideal,"*,
*"en un solo lugar"*, el subtítulo completo, *"Nuestros Productos"*), 6 tarjetas,
`href` con prefijo de despliegue, `data-link`, `navlink--active` + `navlink--cta`,
`aria-current="page"`, requisitos visibles, botón "Ver detalles", footer con el
texto largo, clases de tema, emojis.

**Simulador — filtro del catálogo**: título y ambos subtítulos, placeholder
*"Ej: Crédito Vehículo..."*, botones *"🔍 Buscar"* y *"Limpiar"*, tarjetas
compactas, **ausencia** de requisitos y de "Ver detalles", el aviso con
`<strong>estático</strong>`, contador ausente cuando `isFiltered` es false y
presente cuando es true, valor buscado conservado, estado vacío.

Las aserciones negativas importan tanto como las positivas: son las que verifican
que la variante compacta *es* distinta.

**Simulador — cálculo**: el `SimulationDTO` que se pinta lo produce el mismo
`SimulateCreditUseCase` que usa la aplicación, no un objeto inventado para la
prueba. Se comprueban los tres campos, el botón, que los inputs hereden los
límites del producto (`min="1000000"`, `max="30000000"`, `max="60"`), y que la
cuota, el total de intereses, el total a pagar y la tasa mensual aparezcan con el
valor exacto del DTO.

Y una aserción negativa que vigila la regla de la capa:

```js
ok(!/Math\.(pow|round)/.test(simulatorHtml), 'la vista no filtra cálculos al HTML');
```

**Simulador — tabla de amortización**: plegada por defecto (`aria-expanded="false"`
y sin `.sim-table`), el botón anuncia *"(36 cuotas)"*; en modo anual hay **3 filas**
para 36 meses y el primer bloque dice *"Cuotas 1–12"*; en modo mensual hay **36**.
El recuento se hace contando `<tr>` dentro de `<tbody>`, no sobre el HTML entero.

**Simulador — errores**: el mensaje del dominio se pinta bajo su campo, el control
recibe `is-invalid` y `aria-invalid="true"`, y —lo que importa— la última cuota
válida **sigue en pantalla** mientras se corrige. Sin simulación, en su lugar se
explica qué falta y no se pinta tabla alguna.

**Formulario**: título y subtítulo, 3 secciones, ambos
placeholders de select, ambos botones, 11 marcas de obligatorio, opciones de
plazo, los 6 productos en el select, campo con error, `aria-invalid` +
`aria-describedby`, `role="alert"`.

Y la prueba de XSS:

```js
values: { fullName: 'Ana <script>alert(1)</script>' }
// …
ok(applicationHtml.includes('Ana &lt;script&gt;'), 'XSS: valor del usuario escapado');
ok(!applicationHtml.includes('<script>alert(1)</script>'), 'XSS: no hay script inyectado');
```

**Pantallas de sistema**: 404 con `>404<`, *"Page Not Found"*,
*"Go Home"*, la ruta solicitada entre comillas, el enlace con prefijo; y
*"Access Restricted"*.

**Router, contratos y contenedor**:

```js
try {
  router.register('/x', { handle() {} });     // le falta dispose()
  ok(false, 'debe rechazar un controlador incompleto');
} catch (e) {
  ok(e.code === 'CONTRACT_VIOLATION', `rechaza controlador incompleto (${e.code})`);
  ok(e.details.missingMethods.includes('dispose'), 'informa del método que falta');
}
```

Más: `currentPath` respeta el `basePath`, `toRoutePath` lo quita, `href` lo añade,
`normalizeBase('apps/credito')` → `/apps/credito/`, detección de dependencia
circular, y rechazo de registro duplicado en el contenedor.

### Dos detalles que costaron una iteración

1. **`class="product-card theme-blue"`**: la primera versión contaba
   `/product-card"/g`, que nunca coincide porque la clase de tema va detrás. Se
   cambió a contar `data-product-id="`.
2. **Atributos multilínea**: el `html` con sangría produce
   `<option\n  value="Crédito…`, así que `/<option value="Crédito/` no coincidía.
   Se relajó a `/value="Crédito/`.

Ambos son la lección habitual de las pruebas sobre HTML como texto: **afirma sobre
la estructura, no sobre el formato**.

## 19.4 Suite 03 — Arranque completo en jsdom

`tests/03-boot-jsdom.mjs`

La única que necesita una dependencia. Carga el `index.html` **real** del proyecto
y ejecuta el sistema entero.

```js
const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(indexHtml, {
  url: 'http://localhost/crediSmart/',
  runScripts: 'outside-only',      // los módulos se importan a mano
  pretendToBeVisual: true,
});
```

`url` con subdirectorio a propósito: así se verifica de paso la autodetección del
prefijo de despliegue.

Dos parches necesarios porque jsdom no implementa scroll:

```js
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
```

### Qué verifica

**Arranque**: `#root` y `#notifications` presentes en el `index.html` real,
**34 dependencias** resueltas, `basePath` autodetectado como `/crediSmart/`.

**Catálogo**: renderizado, 6 tarjetas en el DOM real, título del documento
puesto por el decorador, enlace activo correcto, hero y footer presentes.

**Navegación**: un `MouseEvent` real sobre el enlace del simulador cambia
`window.location.pathname` **sin recargar**, el título se actualiza, la vista es la
del simulador, las tarjetas son compactas, hay 5 opciones de rango.

**Filtros en vivo**:

```js
queryInput.value = 'vivienda';
queryInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick();

ok(document.querySelectorAll('.product-card').length === 1, 'búsqueda "vivienda" → 1 tarjeta');
ok(document.querySelector('.results-count')?.textContent.includes('1'), 'contador de resultados');
ok(document.activeElement?.id === 'filter-query', 'foco conservado tras el re-render');
```

Esa tercera aserción es la que protege la corrección del foco descrita en
[04 §4.3](./04-mvc-presentacion.md): sin ella, una regresión haría que el usuario
solo pudiera escribir una letra por pulsación, y ninguna otra prueba lo detectaría.

Además: filtro por rango → 4 tarjetas, estado vacío con `.alert--empty`, y
"Limpiar" → 6 tarjetas.

**Simulador en vivo**: es la prueba que demuestra que el simulador *funciona*,
no que se pinta. Al entrar en la ruta ya hay una simulación hecha
(`$ 1.000.000 / 12 m` → **$ 91.250**); teclear `10000000` en el monto la
recalcula a **$ 912.498** sin recargar y sin perder el foco; un monto de
`99000000` en Libre Inversión marca el campo y muestra *"El monto debe estar
entre $1.000.000 y $30.000.000"* **conservando** la cuota anterior; cambiar de
producto reencaja el monto en el rango nuevo; desplegar la tabla da 1 bloque
anual y 12 filas mensuales, con la última dejando el saldo en `$ 0`; y
*"Reiniciar"* vuelve al estado de partida.

Dos detalles que hacen falta para que esta prueba sea honesta:

```js
// Cada interacción re-renderiza la vista entera y sustituye los nodos: guardar
// una referencia entre pasos daría un elemento huérfano sin listeners.
const $sim = (id) => document.getElementById(id);

// El formateador es-CO separa el símbolo con espacio duro (U+00A0).
const norm = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();
```

La primera versión de la prueba fallaba en seis aserciones por guardar
`const amountInput = …` y reutilizarlo tras un re-render: el nodo ya no estaba en
el documento y el evento no llegaba a ningún sitio.

**Formulario**: 3 secciones, selects con el número correcto de opciones;
envío vacío → **11 campos con `.is-invalid`** y toast con `role="alert"`; envío
válido → cero errores, toast de éxito con radicado `CS-XXXXXXXX` y saludo por el
primer nombre, persistencia real en `localStorage` con `status: 'RADICADA'`, y
formulario limpio.

Y la política de dominio a través de toda la pila:

```js
setValue('field-amount', '1000');            // fuera del rango del Crédito Vehículo
// …enviar…
const amountError = document.getElementById('field-amount-error');
ok(amountError?.textContent.includes('El monto debe estar entre'), 'política de dominio aplicada');
```

**404 y vuelta**: ruta inexistente → `.sys-code` con `404`, la ruta solicitada
visible, título correcto; y navegar a `/` restaura el hero y las 6 tarjetas.

### Salida real (extracto)

```
--- Arranque ---
ok  : contenedor #root encontrado en index.html
ok  : grafo completo resuelto (34 dependencias)
ok  : basePath autodetectado (/crediSmart/)

--- Navegación sin recarga ---
ok  : URL cambiada sin recarga (/crediSmart/simulador)
ok  : título actualizado por el decorador

--- Simulador: cálculo sobre el DOM real ---
ok  : arranca en el monto mínimo del primer producto (1000000)
ok  : simula al entrar en la ruta ($ 91.250)
ok  : recalcula al teclear el monto ($ 912.498)
ok  : foco conservado en el monto (sim-amount)
ok  : monto fuera de rango marca el campo
ok  : se conserva la última cuota válida mientras se corrige
ok  : el monto sube al mínimo del producto elegido (5000000)
ok  : detalle mensual: 12 filas (12)
ok  : la última fila deja el saldo en cero ($ 0)
ok  : reiniciar restaura la simulación inicial ($ 91.250)

--- Filtros del simulador ---
ok  : búsqueda "vivienda" → 1 tarjeta (1)
ok  : foco conservado tras el re-render (filter-query)
ok  : rango "Hasta $5.000.000" → 4 tarjetas (4)
ok  : "Limpiar" restaura las 6 tarjetas

--- Formulario de solicitud (/solicitar) ---
ok  : 11 campos inválidos (11)
ok  : toast de error mostrado
ok  : radicado en el mensaje (Solicitud enviada Juan, tu solicitud quedó radicada
      con el número CS-190ED978. Un asesor se comunicará contigo.)
ok  : solicitud persistida en localStorage
ok  : política de dominio aplicada (El monto debe estar entre $5.000.000 y
      $120.000.000 para Crédito Vehículo.)

--- Ruta inexistente ---
ok  : 404 renderizado

TODO OK
```

## 19.5 Verificación estructural con `grep`

Complementa las suites: comprueba la **arquitectura**, no el comportamiento.

```bash
cd C:/laragon/www/crediSmart

# 1. El dominio no importa nada de fuera del dominio
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/

# 2. La aplicación no importa infraestructura, presentación ni config
grep -rn "from '\.\./\.\./\(infrastructure\|presentation\|config\)" src/application/

# 3. La presentación no importa infraestructura
grep -rn "infrastructure" src/presentation/

# 4. El contenedor solo se usa en el arranque
grep -rln "Container" src/ --include=*.js
# → src/config/Container.js · src/config/dependencies.js · src/main.js

# 5. Solo ViewRenderer (y el fallback de main.js) escriben innerHTML
grep -rn "innerHTML" src/ --include=*.js
```

Las tres primeras deben devolver **cero líneas**. Estado actual: cero, cero, cero.

Durante la construcción, la comprobación 3 detectó el único incumplimiento real:
`ApplicationController` importaba `STATIC_TERM_OPTIONS` del datasource. Se corrigió
inyectando `termOptions` desde `dependencies.js`.

## 19.6 Verificación manual en el navegador

Lo que las suites no cubren: apariencia, comportamiento real del navegador y
servidor.

### Rutas y recarga

| Prueba | Esperado |
|---|---|
| Abrir `/` | Catálogo con 6 tarjetas |
| Clic en "Simulador" | Cambia sin recarga (sin parpadeo) |
| **Recargar** en `/simulador` | Carga el simulador, no un 404 de Apache |
| **Recargar** en `/solicitar` | Carga el formulario |
| Abrir `/loquesea` | Pantalla 404 con la ruta pedida |
| Botón atrás/adelante | Navega correctamente |
| Ctrl+clic en un enlace | Abre en pestaña nueva (no lo intercepta el router) |
| Clic central | Igual |

Si recargar da 404: falta la reescritura del servidor
([14 §14.5](./14-enrutado-y-urls.md)).

### Responsive

| Ancho | Esperado |
|---|---|
| 320 px | Sin desbordamiento horizontal; navbar compacta; 1 tarjeta por fila |
| 375 px | Igual |
| 640 px (`sm`) | 2 tarjetas por fila; aparece "by FinTech Solutions"; botones del formulario en fila |
| 1024 px (`lg`) | 3 tarjetas por fila |

### Accesibilidad

- Tabular por toda la página: cada control muestra el anillo de foco
  (`:focus-visible`).
- Enviar el formulario vacío: el foco salta al primer campo con error.
- Con un lector de pantalla: los mensajes de error se anuncian (`role="alert"`), y
  los toasts también.
- Activar "reducir movimiento" en el sistema: el spinner y las transiciones se
  detienen.
- Comprobar contraste con las herramientas del navegador.

### Consola

Cero errores. Un `ContractViolationError` o un `Dependencia no registrada` aparece
al cargar, no durante la navegación — por diseño.

## 19.7 Qué NO está cubierto

Honestidad sobre los límites:

| No cubierto | Por qué / mitigación |
|---|---|
| Pruebas visuales de regresión | Requerirían capturas de referencia y un navegador headless |
| Navegadores reales (Safari, Firefox) | jsdom no es un navegador; verificación manual |
| Rendimiento con catálogos grandes | Con 6 productos el re-render completo es instantáneo; con 500 haría falta render incremental |
| Rehidratar solicitudes desde `localStorage` | El repositorio persiste `toJSON()`, pero no reconstruye entidades: nadie consume el histórico todavía |
| Restauración exacta del scroll con el botón atrás | `ViewRenderer.mount()` sube al inicio; guardar el scroll por entrada de historial queda pendiente |
| Tipos de los parámetros de los contratos | `assertImplements` verifica existencia de métodos, no firmas; ver [06 §6.9](./06-contratos-e-interfaces.md) |

## 19.8 Añadir pruebas

Ubicación por capa:

| Qué pruebas | Suite |
|---|---|
| Un value object, una entidad, un servicio de dominio, un caso de uso | 01 |
| Una vista, un componente, el escapado, un contrato | 02 |
| Una interacción completa del usuario | 03 |

El helper es siempre el mismo:

```js
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails += 1; console.log('FAIL:', msg); } else console.log('ok  :', msg);
};
// …al final
console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
```

Convenciones:

- **Un mensaje descriptivo por aserción**, y cuando el valor importa, incluirlo:
  `` `6 tarjetas (${count})` ``. Un `FAIL` debe decir qué se obtuvo, no solo que
  falló.
- **Afirmar sobre estructura, no sobre formato**: cuenta `data-product-id="`, no
  espacios ni sangrías.
- **Incluir aserciones negativas** cuando lo importante es una ausencia
  (`!simulatorHtml.includes('Requisitos:')`).
- **Normalizar espacios** al comparar salidas de `Intl`.

## 19.9 Nota sobre `node_modules`

`npm install jsdom --no-save` crea un `node_modules/` de ~25 MB en la raíz. Es
**solo** para la suite 03: la aplicación no tiene dependencias de runtime y se
sirve tal cual. El `.gitignore` incluido lo excluye.

## 19.10 Siguiente lectura

- [20 — Glosario y convenciones](./20-glosario-y-convenciones.md)
- [18 — Guía de extensión](./18-guia-de-extension.md)
