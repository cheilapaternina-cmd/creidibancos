[← Volver al índice maestro](./master.md)

# 12 — Vistas, controladores y componentes

Referencia archivo por archivo de la capa de presentación. Los conceptos de MVC
están en [04](./04-mvc-presentacion.md); esto es el detalle.

## 12.1 Inventario

```
presentation/                                            22 archivos
├── contracts/     IView · IController · IRouter               3
├── views/         BaseView · CatalogView · SimulatorView
│                  ApplicationView · NotFoundView
│                  AccessRestrictedView                        6
├── controllers/   BaseController · CatalogController
│                  SimulatorController · ApplicationController
│                  NotFoundController                          5
├── components/    NavbarComponent · FooterComponent
│                  ProductCardComponent · AlertComponent       4
├── decorators/    DocumentTitleController                     1
└── shared/        Html · UrlBuilder · ViewRenderer            3
```

---

## 12.2 `shared/Html.js` — escapado por defecto

El archivo más importante de la capa desde el punto de vista de seguridad.

### La etiqueta `html`

```js
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += interpolate(values[i]) + strings[i + 1];
  }
  return out;
}

function interpolate(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value === true) return '';
  if (Array.isArray(value)) return value.map(interpolate).join('');
  if (typeof value === 'object' && value[SAFE]) return value.toString();
  return escapeHtml(value);
}
```

Reglas de interpolación:

| Valor interpolado | Resultado |
|---|---|
| `raw(x)` | se inserta tal cual |
| array | se une sin separador; cada elemento sigue estas reglas |
| `null` / `undefined` / `false` / `true` | cadena vacía |
| cualquier otra cosa | **escapado** |

Que `false` produzca cadena vacía habilita el idioma `${cond && html\`…\`}`, y que
`true` también la produzca evita que un `&&` mal escrito imprima "true".

### `raw` — confianza explícita

```js
const SAFE = Symbol('html-safe');

export function raw(value) {
  return { [SAFE]: true, toString() { return String(value ?? ''); } };
}
```

Se usa un `Symbol` como marca, no una propiedad con nombre: un objeto que venga
de `JSON.parse` de una API **no puede** falsificar la marca, porque no puede
contener símbolos.

Marcar como seguro exige escribirlo. Ese acto deliberado es el punto: revisar el
riesgo de XSS de todo el proyecto es buscar los `raw(` y comprobar que su
argumento no proviene del usuario.

### `escapeHtml`

```js
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

`&` primero, o se escaparían dos veces las entidades ya producidas.

### `classNames`

```js
export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
```

Permite `classNames('navlink', isActive && 'navlink--active')`.

### Verificación

De la suite de render, con `values = { fullName: 'Ana <script>' }`:

```
ok  : solicitar: valor escapado (XSS)        → contiene "Ana &lt;script&gt;"
ok  : solicitar: no hay script inyectado     → NO contiene "Ana <script>"
```

---

## 12.3 `shared/UrlBuilder.js`

Traduce entre rutas de aplicación (`/simulador`) y URLs del navegador
(`/crediSmart/simulador`). Detalle completo en
[14 — Enrutado y URLs](./14-enrutado-y-urls.md).

```js
href(path)               // '/simulador'              → '/crediSmart/simulador'
toRoutePath(pathname)    // '/crediSmart/simulador'   → '/simulador'
UrlBuilder.detectBasePath()   // '/crediSmart/' desde document.baseURI
```

Sin esta pieza, cada `href` del proyecto estaría cableado a la raíz del dominio y
la app solo funcionaría en un vhost dedicado.

---

## 12.4 `shared/ViewRenderer.js`

El único módulo que escribe en el DOM.

```js
mount(view, viewModel, handlers = {}, { scrollToTop = true } = {}) {
  if (this.#currentView && this.#currentView !== view) {
    this.#currentView.destroy();
  }
  this.#root.innerHTML = view.render(viewModel);
  view.root = this.#root;
  view.afterRender(this.#root, handlers);
  this.#currentView = view;
  if (scrollToTop) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

refresh(view, viewModel, handlers = {}) {
  view.destroy();
  this.mount(view, viewModel, handlers, { scrollToTop: false });
}

clear() {
  if (this.#currentView) { this.#currentView.destroy(); this.#currentView = null; }
  this.#root.innerHTML = '';
}
```

Cuatro responsabilidades concentradas:

1. **Destruir la vista anterior** al cambiar de vista → sin fugas de listeners.
2. **Montar** el HTML y reenganchar eventos.
3. **Scroll al inicio** en cambios de ruta (réplica del `ScrollToTop` original) y
   **no** en refrescos internos.
4. **Ser sustituible en pruebas** por `{ mount(){}, refresh(){}, clear(){} }`.

El orden importa: `destroy()` de la anterior **antes** de sobrescribir
`innerHTML`, porque después los nodos ya no existen y `removeEventListener`
apuntaría a elementos huérfanos.

---

## 12.5 `views/BaseView.js`

Template Method: aporta ciclo de vida y gestión de listeners; las subclases solo
implementan `template()`.

```js
template(viewModel) {
  throw new Error(`${this.constructor.name} debe implementar template(viewModel).`);
}

render(viewModel) { return this.template(viewModel); }

afterRender(root, handlers = {}) { this.#root = root; }

on(target, type, handler, options) {
  if (!target) return;
  target.addEventListener(type, handler, options);
  this.#listeners.push({ target, type, handler, options });
}

query(selector)    { return this.#root ? this.#root.querySelector(selector) : null; }
queryAll(selector) { return this.#root ? Array.from(this.#root.querySelectorAll(selector)) : []; }

destroy() {
  for (const { target, type, handler, options } of this.#listeners) {
    target.removeEventListener(type, handler, options);
  }
  this.#listeners = [];
  this.#root = null;
}
```

`on()` tolera `target` nulo: si un selector no encuentra su elemento, no explota.

`query`/`queryAll` buscan **dentro** del subárbol montado, no en todo el
documento: una vista no puede tocar por accidente elementos de otra.

---

## 12.6 Las 5 vistas concretas

### `CatalogView` — ruta `/`

Estructura: navbar → hero → sección de productos → footer.

```js
template({ products }) {
  return html`
    <div class="page">
      ${raw(this.#navbar.render({ activePath: ROUTES.CATALOG }))}
      ${raw(this.#hero())}
      <main class="page__main container container--7xl section section--catalog">
        <h2 class="section__title">Nuestros Productos</h2>
        <p class="section__subtitle">Elige el crédito que mejor se adapta a tus necesidades</p>
        <div class="grid-products">
          ${raw(products.map((product) =>
            this.#productCard.render({ product, variant: 'full' })).join(''))}
        </div>
      </main>
      ${raw(this.#footer.render({ variant: 'catalog' }))}
    </div>
  `;
}
```

Textos literales del original: *"Tu crédito ideal, / en un solo lugar"*,
*"Consulta, simula y solicita créditos de forma rápida, segura y 100% en línea."*,
*"Simular Crédito"*, *"Solicitar Ahora"*.

Variante de footer `catalog` (margen corto + texto largo) y tarjetas en variante
`full`.

### `SimulatorView` — ruta `/simulador`

La vista más grande del proyecto. Tiene **dos mitades independientes**:

```
navbar
├── SIMULADOR
│   ├── formulario        producto · monto · plazo
│   ├── resultado         cuota · intereses · total · coste
│   └── amortización      plegable · resumen anual | detalle mensual
├── separador
└── CATÁLOGO
    ├── filtros           texto · rango de monto
    ├── aviso · contador
    └── grid o estado vacío
footer
```

El filtro **no** alimenta al simulador: son dos herramientas sobre la misma
página. Elegir un producto en el simulador no filtra el catálogo, y filtrar el
catálogo no cambia lo que se está simulando.

Estados que maneja el viewModel:

| Campo | Mitad | Uso |
|---|---|---|
| `catalog` | Simulador | DTOs de producto para el `<select>` |
| `form` | Simulador | `{ productId, amount, termInMonths }` en crudo, tal como se teclea |
| `bounds` | Simulador | Límites del producto elegido: `min`/`max` de los inputs |
| `simulation` | Simulador | `SimulationDTO` o `null` |
| `errors` | Simulador | `fieldErrors` del dominio, indexados por `name` |
| `schedule` | Simulador | `{ open, mode }` de la tabla de amortización |
| `products` | Catálogo | DTOs a pintar |
| `ranges` | Catálogo | opciones del `<select>` |
| `query` | Catálogo | valor actual del input (se re-pinta con `value="…"`) |
| `selectedRangeIndex` | Catálogo | opción marcada `selected` |
| `matched` / `total` | Catálogo | contador "Mostrando N de M productos" |
| `isFiltered` | Catálogo | si se muestra el contador |

#### Los límites llegan, no se deducen

```js
<input id="sim-amount" name="amount" type="number"
       value="${form.amount}"
       ${raw(bounds ? `min="${bounds.minAmount}"` : '')}
       ${raw(bounds && bounds.maxAmount !== null ? `max="${bounds.maxAmount}"` : '')} />
```

`bounds` viene del DTO del producto. La vista no sabe que Libre Inversión llega
hasta 30 millones: lo pinta. Y el `max` del HTML es **ayuda**, no validación: la
regla real la aplica el dominio, y por eso el mensaje de error dice el límite
concreto en vez de un genérico del navegador.

#### La tabla, plegada y por año

240 filas de un crédito de vivienda no caben en una pantalla ni en la paciencia
de nadie. Por defecto: plegada, y al abrirla, resumen anual.

```js
${schedule.open ? '▲ Ocultar' : '▼ Ver'} tabla de amortización (${rowCount} cuotas)
```

El botón declara `aria-expanded` y los dos modos usan `aria-pressed`. La tabla
scrollea dentro de `.sim-schedule__scroll`; la página nunca se desplaza en
horizontal.

#### Estado vacío y errores

Sin simulación válida no se pinta un panel en blanco, se explica qué falta:

```js
${raw(products.length === 0
  ? this.#alert.render({ variant: 'empty', icon: '🔎',
      message: 'Ningún producto coincide con los filtros aplicados.' })
  : html`<div class="grid-products" data-results>…</div>`)}
```

Los errores de campo se pintan bajo su input con `role="alert"` y marcan el
control con `is-invalid` y `aria-invalid="true"`. El texto es literalmente el que
produjo el dominio.

Enlace de eventos y restauración del foco: ver [04 §4.3](./04-mvc-presentacion.md).
Como el re-render sustituye todos los nodos, `#bindSimulator` y `#bindFilters` se
vuelven a ejecutar en cada pasada y `BaseView.destroy()` limpia los listeners
anteriores — sin eso habría una fuga por cada tecla pulsada.

### `ApplicationView` — ruta `/solicitar`

Formulario declarativo. Las 3 secciones y sus 11 campos se definen como datos:

```js
{
  id: 'personal',
  icon: '👤',
  iconClass: 'form__section-icon--personal',
  title: 'Datos Personales',
  hint: 'Información básica del solicitante',
  fields: [
    { name: 'fullName', label: 'Nombre completo', type: 'text',
      placeholder: 'Ej: Juan Carlos Pérez', autocomplete: 'name' },
    { name: 'idNumber', label: 'Cédula', type: 'number', placeholder: 'Ej: 1234567890' },
    { name: 'email', label: 'Email', type: 'email',
      placeholder: 'Ej: juan@correo.com', autocomplete: 'email' },
    { name: 'phone', label: 'Teléfono', type: 'tel',
      placeholder: 'Ej: 3001234567', autocomplete: 'tel' },
  ],
}
```

Tres métodos privados los pintan: `#section`, `#field`, `#control`. `#control`
distingue `select`, `textarea` e `input`.

#### Accesibilidad de los errores

```js
#field({ field, values, errors }) {
  const value = values[field.name] ?? '';
  const error = errors[field.name] ?? '';
  const id = `field-${field.name}`;
  const errorId = `${id}-error`;

  return html`
    <div class="field ${field.full ? 'grid-form__full' : ''}">
      <label class="label" for="${id}">
        ${field.label} <span class="t-required" aria-hidden="true">*</span>
      </label>
      ${raw(this.#control({ field, id, value, error, errorId }))}
      <span class="field__error" id="${errorId}" role="alert">${error}</span>
    </div>
  `;
}
```

- `label` con `for` apuntando al `id` del control.
- El asterisco es `aria-hidden`: el lector de pantalla no dice "asterisco".
- El `<span>` de error tiene `role="alert"` y un `id`, y el control lo referencia
  con `aria-describedby` cuando hay error:

```js
const aria = error ? `aria-invalid="true" aria-describedby="${errorId}"` : '';
```

- El `<span>` existe siempre (con `min-height` en CSS) para que aparecer un error
  no desplace el resto del formulario.

#### Foco en el primer error

```js
const firstInvalid = form.querySelector('.control.is-invalid');
if (firstInvalid) {
  firstInvalid.focus();
  firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

#### El reset

```js
this.on(form, 'reset', () => {
  // El reset nativo limpia los controles; el controlador limpia los errores.
  window.setTimeout(() => handlers.onReset?.(), 0);
});
```

El `setTimeout(…, 0)` es necesario: el evento `reset` se dispara **antes** de que
el navegador limpie los campos. Sin el aplazamiento, el controlador re-pintaría
con los valores viejos.

### `NotFoundView` — ruta `*`

Réplica de la pantalla 404 del original, con su paleta slate distinta al resto del
sitio, el "404" en peso ligero, la regla horizontal, el texto en inglés
(*"Page Not Found"*, *"could not be found in this application."*) y el botón "Go
Home" con su SVG inline.

```js
static #homeIcon() {
  return `
    <svg class="btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  `;
}
```

El `path` es idéntico al del bundle original. `aria-hidden` porque el texto "Go
Home" ya nombra la acción.

### `AccessRestrictedView`

Pantalla de sistema presente en el bundle original: se mostraba a un usuario
autenticado pero no registrado en la app. Se reprodujo para cubrir **todas** las
vistas del sitio, y queda registrada en el contenedor
(`container.register('accessRestrictedView', …)`) lista para cuando se conecte un
proveedor de autenticación real.

Textos en inglés, como el original: *"Access Restricted"*, *"You are not
registered to use this application…"*, y la lista de tres sugerencias.

---

## 12.7 `controllers/BaseController.js`

```js
async handle(context) {
  throw new Error(`${this.constructor.name} debe implementar handle(context).`);
}

present(viewModel, handlers = {}) { this.#renderer.mount(this.#view, viewModel, handlers); }
update(viewModel, handlers = {})  { this.#renderer.refresh(this.#view, viewModel, handlers); }
dispose() { this.#view.destroy(); }
```

| Método | Cuándo | Scroll |
|---|---|---|
| `present` | Al entrar en la ruta | Va arriba |
| `update` | Interacción dentro de la vista | No se mueve |

---

## 12.8 Los 4 controladores

### `CatalogController`

```js
async handle() {
  const result = await this.#listProducts.execute();

  if (result.isFailure) {
    this.#notifier.error(result.error, 'No se pudo cargar el catálogo');
    this.present({ products: [] });
    return;
  }

  this.present({ products: result.value.products });
}
```

Ante fallo, notifica **y pinta el catálogo vacío**. Nunca deja la pantalla en
blanco: el navbar y el footer siguen ahí, el usuario puede navegar.

### `SimulatorController`

El más grande, y el único con estado de UI significativo. Guarda el estado de las
dos mitades de la página por separado:

```js
#filter     = { query: '', rangeIndex: 0 };
#form       = { productId: '', amount: '', termInMonths: '' };
#schedule   = { open: false, mode: 'yearly' };
#simulation = null;      // último SimulationDTO válido
#errors     = {};        // fieldErrors del dominio
#focusField = null;
#catalog    = [];        // DTOs de producto, para el <select> y los límites
#ranges     = [];
```

#### Arranca con una simulación hecha

```js
async handle() {
  const [rangesResult, catalogResult] = await Promise.all([
    this.#getRanges.execute(),
    this.#listProducts.execute(),
  ]);
  // …
  this.#form = this.#defaultForm();      // primer producto · su monto mínimo · 12 meses
  await this.#runSimulation();
  await this.#render({ initial: true });
}
```

Una pantalla que arranca vacía no enseña qué hace. Entrar en `/simulador` ya
muestra una cuota calculada sobre el primer producto del catálogo.

#### Un error de campo no borra la cifra anterior

```js
async #runSimulation() {
  const result = await this.#simulateCredit.execute(this.#form);

  if (result.isSuccess) {
    this.#simulation = result.value;
    this.#errors = {};
    return;
  }

  this.#errors = result.fieldErrors;

  if (!result.hasFieldErrors) {
    this.#notifier.error(result.error, 'No se pudo simular el crédito');
  }
}
```

`#simulation` **no** se pone a `null` cuando falla la validación: el usuario
sigue viendo la última cuota buena mientras corrige el campo marcado. Borrarla
haría parpadear la pantalla en cada tecla intermedia.

La distinción del final importa: un fallo **con** campo señalado es del usuario y
se pinta bajo el input; uno **sin** campo es técnico y va al `INotifier`, porque
un error que no se ve es un error que nadie arregla.

#### Cambiar de producto reencaja, no castiga

```js
async onProductChange(productId) {
  const product = this.#catalog.find((item) => String(item.id) === String(productId));

  this.#form = product
    ? {
        productId: String(product.id),
        amount: String(SimulatorController.#clamp(
          Number(this.#form.amount), product.minAmount, product.maxAmount)),
        termInMonths: String(Math.min(
          Number(this.#form.termInMonths) || 12, product.maxTermMonths)),
      }
    : { ...this.#form, productId: String(productId) };
  // …
}
```

Cambiar de producto es una exploración, no una equivocación: si el monto se sale
del rango nuevo se ajusta al extremo más cercano en vez de dejar al usuario
mirando un error que no provocó. Verificado en la suite: con 1.000.000 en el
campo, pasar a Vehículo lo sube a 5.000.000.

#### Resto de decisiones

- **Reinicia el estado en `handle()`**: volver al simulador desde otra ruta
  empieza limpio.
- **`focusField`** se fija al nombre del campo que provocó el cambio y es `null`
  cuando el cambio vino de un botón, para no robar el foco.
- **Traduce el índice del `<select>` a `AmountRange`** con el puerto
  `IAmountRangeProvider`. El controlador no construye value objects a mano.
- **`initial` decide `present` vs `update`**: solo el primer render mueve el
  scroll.
- **No calcula nada.** No hay una sola operación aritmética sobre dinero en el
  controlador: `#clamp` compara límites que le dieron, y todo lo demás llega
  resuelto en el `SimulationDTO`.

### `ApplicationController`

```js
#state = { values: {}, errors: {} };
#productNames = [];
#termOptions = [];

async handle() {
  this.#state = { values: {}, errors: {} };
  const namesResult = await this.#getProductNames.execute();
  this.#productNames = namesResult.isSuccess ? namesResult.value : [];
  this.present(this.#viewModel(), this.#handlers());
}
```

`onSubmit` está en [04 §4.4](./04-mvc-presentacion.md). Detalle adicional: el
aviso de capacidad de pago se emite como notificación aparte, **sin bloquear** el
envío:

```js
if (affordability && !affordability.affordable) {
  this.#notifier.info(
    `La cuota estimada ($${affordability.estimatedInstallment.toLocaleString('es-CO')}) ` +
      'supera el 40 % de tus ingresos declarados. El estudio puede requerir codeudor.',
    'Aviso de capacidad de pago',
  );
}
```

`#termOptions` llega **inyectado** desde `dependencies.js`. Fue el único
incumplimiento de la regla de dependencia detectado durante la construcción: el
controlador importaba `STATIC_TERM_OPTIONS` del datasource, y se corrigió.

### `NotFoundController`

```js
async handle({ path = '/' } = {}) {
  this.present({ requestedPath: String(path).replace(/^\//, '') });
}
```

Quita la barra inicial, replicando el `location.pathname.substring(1)` del
original.

---

## 12.9 Los 4 componentes

Todos con la misma forma: `render(props) → string`. Sin estado, sin listeners, sin
efectos.

| Componente | Props | Variantes / lógica |
|---|---|---|
| `NavbarComponent` | `{ activePath }` | Resalta el activo; "Solicitar" es CTA salvo cuando es el activo |
| `FooterComponent` | `{ variant }` | `catalog` \| `compact` |
| `ProductCardComponent` | `{ product, variant }` | `full` \| `compact` |
| `AlertComponent` | `{ variant, icon, message }` | `info` \| `empty` |

### `ProductCardComponent` — las dos variantes

```js
${raw(isCompact ? '' : this.#requirements(product))}
…
<div class="product-card__footer">
  ${raw(isCompact ? '' : this.#detailsButton())}
  <a class="btn btn--primary btn--card" href="${this.#urlBuilder.href(ROUTES.APPLICATION)}" data-link>
    Solicitar
  </a>
</div>
```

| Aspecto | `full` (catálogo) | `compact` (simulador) |
|---|---|---|
| Padding de cabecera | `--space-6` | `--space-5` |
| Tamaño del emoji | `--text-4xl` | `--text-3xl` |
| Tamaño del título | `--text-lg` | `--text-base` |
| Requisitos | sí | no |
| Botones | "Ver detalles" + "Solicitar" | solo "Solicitar" |

Las diferencias de tamaño se resuelven en CSS con `.product-card--compact`, no con
estilos en línea.

### `AlertComponent` — la excepción documentada

```js
render({ variant = 'info', icon = 'ℹ️', message }) {
  return html`
    <div class="alert alert--${variant}" role="status">
      ${icon ? html`<span aria-hidden="true">${icon}</span>` : ''}
      <span>${raw(message)}</span>
    </div>
  `;
}
```

`message` se inserta con `raw()`, porque el aviso del simulador contiene
`<strong>estáticos</strong>`. Es la única entrada `raw` que recibe texto por
parámetro en todo el proyecto, y **todas sus llamadas usan literales del código
fuente**, nunca datos del usuario. Si en el futuro se necesitara pintar un mensaje
de usuario en un alert, hay que añadir una prop `html: false` que escape.

---

## 12.10 `decorators/DocumentTitleController.js`

```js
export class DocumentTitleController extends IController {
  #inner;
  #title;

  constructor({ controller, title }) {
    super();
    assertImplements(controller, IController);
    this.#inner = controller;
    this.#title = title;
  }

  async handle(context) {
    document.title = this.#title;
    return this.#inner.handle(context);
  }

  dispose() { this.#inner.dispose(); }
}
```

Tres detalles que lo hacen correcto:

1. **Verifica el contrato del decorado** en el constructor.
2. **Delega `dispose()`.** Olvidarlo dejaría la vista anterior sin limpiar al
   cambiar de ruta: una violación silenciosa de Liskov.
3. **Devuelve la promesa de `handle`**, no la descarta: el router puede seguir
   haciendo `await`.

Aplicado en `main.js` para las 4 rutas registradas y para el fallback.

---

## 12.11 Reglas de la capa de presentación

| Regla | Motivo |
|---|---|
| **Nunca** importar `src/infrastructure/` | Regla de dependencia; usa inyección |
| Nunca importar entidades ni value objects concretos | Se trabaja con DTOs |
| Las vistas no consultan datos ni deciden navegación | Eso es del controlador |
| Los controladores no construyen HTML ni tocan el DOM | Eso es de la vista y de `ViewRenderer` |
| Todo listener se registra con `BaseView.on()` | Limpieza automática en `destroy()` |
| Todo dato interpolado se escapa salvo `raw()` explícito | XSS |
| Los componentes son funciones puras de props a string | Testeables y reutilizables |
| Estado de UI en el controlador, nunca en la vista | La vista se destruye y reconstruye |
| Los `href` se construyen con `UrlBuilder`, nunca a mano | Soporte de subdirectorio |
| Los enlaces internos llevan `data-link` | Los intercepta el router |

## 12.12 Siguiente lectura

- [13 — Inyección de dependencias](./13-inyeccion-de-dependencias.md)
- [15 — Sistema de estilos](./15-sistema-de-estilos.md)
- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
