[← Volver al índice maestro](./master.md)

# 04 — MVC en la capa de presentación

## 4.1 MVC aquí no es "MVC de framework"

En muchos frameworks "MVC" significa: el Modelo es el ORM, la Vista es una
plantilla y el Controlador es un archivo que hace de todo. Aquí es más estricto:

| Letra | Qué es en este proyecto | Qué **no** es |
|---|---|---|
| **M**odelo | Los DTOs que producen los casos de uso (`CreditProductDTO`), más el **estado de UI** que guarda el controlador | No es la entidad de dominio (esa no sale de la aplicación). No es un objeto global. |
| **V**ista | Una función `viewModel → HTML` + un gancho que traduce eventos del DOM a **intenciones** | No consulta datos. No decide navegación. No contiene reglas. |
| **C**ontrolador | Guarda el estado de UI, invoca **casos de uso**, construye el viewModel y manda montar la vista | No importa repositorios. No importa entidades. No construye HTML. |

MVC vive **dentro** de la capa de presentación del hexágono. No es una
arquitectura alternativa: es cómo se organiza una sola de las cuatro capas.

## 4.2 El ciclo completo

```
 usuario teclea "vivienda"
        │
        ▼
 ┌──────────────────┐  evento del DOM
 │  SimulatorView   │  ('input')
 │  (VISTA)         │
 └────────┬─────────┘
          │  handlers.onSearch({ query, rangeIndex })   ← INTENCIÓN, no datos
          ▼
 ┌──────────────────────────┐
 │  SimulatorController     │  1. guarda el estado de UI: #state = {query, …}
 │  (CONTROLADOR)           │  2. traduce índice → AmountRange (puerto)
 └────────┬─────────────────┘  3. invoca el caso de uso
          │
          ▼
 ┌────────────────────────────────┐
 │ SearchCreditProductsUseCase    │  ← capa de APLICACIÓN
 │ devuelve Result<{products…}>   │
 └────────┬───────────────────────┘
          │  DTOs planos y congelados                    ← MODELO
          ▼
 ┌──────────────────────────┐
 │  SimulatorController     │  4. construye el viewModel
 │                          │  5. this.update(viewModel, handlers)
 └────────┬─────────────────┘
          ▼
 ┌──────────────────┐
 │  ViewRenderer    │  6. view.destroy()   ← quita listeners anteriores
 │                  │  7. root.innerHTML = view.render(viewModel)
 │                  │  8. view.afterRender(root, handlers)  ← reengancha
 └──────────────────┘
```

Ninguna flecha va de la Vista al caso de uso, ni del Controlador al DOM.

## 4.3 La Vista

### Contrato

```js
// src/presentation/contracts/IView.js
export const IView = defineContract('IView', ['render', 'afterRender', 'destroy']);
```

### Clase base: `BaseView`

Implementa `IView` con el patrón **Template Method**. Las subclases solo
implementan `template(viewModel)`.

Aporta tres cosas:

1. **Ciclo de vida** — `render` → `afterRender` → `destroy`.
2. **Gestión de listeners sin fugas** — `on(target, type, handler)` registra cada
   listener en un array privado, y `destroy()` los elimina todos:

   ```js
   on(target, type, handler, options) {
     if (!target) return;
     target.addEventListener(type, handler, options);
     this.#listeners.push({ target, type, handler, options });
   }

   destroy() {
     for (const { target, type, handler, options } of this.#listeners) {
       target.removeEventListener(type, handler, options);
     }
     this.#listeners = [];
     this.#root = null;
   }
   ```

   Esto importa porque el simulador re-pinta la vista completa en cada tecla. Sin
   esta limpieza, cada pulsación acumularía un listener más sobre el mismo
   formulario.

3. **Consultas acotadas al subárbol montado** — `query()` y `queryAll()` buscan
   dentro de `#root`, no en todo el documento.

### Qué puede y qué no puede hacer una vista

| ✅ Puede | ❌ No puede |
|---|---|
| Construir strings de HTML a partir del viewModel | Llamar a un repositorio o a un caso de uso |
| Leer valores de sus propios inputs (`FormData`) | Decidir a qué ruta navegar |
| Traducir un evento del DOM en una intención (`onSearch`, `onSubmit`) | Contener una regla de negocio (`if (monto > 5000000)`) |
| Restaurar el foco tras un re-render | Guardar estado entre renders |
| Elegir la variante visual que le indica el viewModel | Importar entidades o value objects |

### Las intenciones, no los datos

Una vista **no** dice "he cambiado, aquí tienes los datos nuevos". Dice "el
usuario quiere buscar". La diferencia:

```js
// src/presentation/views/SimulatorView.js
afterRender(root, handlers = {}) {
  super.afterRender(root, handlers);
  const form = this.query('[data-filters]');
  if (!form) return;

  this.on(form, 'submit', (event) => {
    event.preventDefault();
    handlers.onSearch?.(this.#readCriteria(form));   // ← intención
  });

  const input = form.querySelector('input[name="query"]');
  this.on(input, 'input', () => handlers.onSearch?.(this.#readCriteria(form)));

  const clearButton = form.querySelector('[data-action="clear"]');
  this.on(clearButton, 'click', () => handlers.onClear?.());

  this.#restoreFocus(form, handlers.focusField);
}
```

`#readCriteria` solo empaqueta lo que hay en los campos. **No filtra nada.** El
filtrado ocurre tres capas más adentro, en `ProductSearchCriteria.isSatisfiedBy`.

### El problema del foco (y su solución)

El simulador re-pinta toda la vista en cada tecla. Tras `innerHTML = ...` el
input es un elemento nuevo y el foco se pierde: el usuario escribiría una sola
letra por pulsación.

Solución sin trucos: el controlador informa **qué campo estaba activo** y la
vista lo restaura con el cursor al final.

```js
// Controlador
this.#state = { query, rangeIndex, focusField: 'query' };
// …
#handlers() {
  return {
    onSearch: (criteria) => this.onSearch(criteria),
    onClear:  () => this.onClear(),
    focusField: this.#state.focusField,   // ← viaja como handler/hint
  };
}

// Vista
#restoreFocus(form, focusField) {
  if (!focusField) return;
  const field = form.querySelector(`[name="${focusField}"]`);
  if (!field) return;
  field.focus();
  if (typeof field.setSelectionRange === 'function' && field.type === 'text') {
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }
}
```

Verificado en la suite de jsdom: `ok : foco conservado tras re-render (filter-query)`.

### Las 6 vistas

| Vista | Ruta | Particularidad |
|---|---|---|
| `CatalogView` | `/` | Hero + grid de 6 tarjetas en variante `full` (con requisitos y dos botones) |
| `SimulatorView` | `/simulador` | Panel de filtros con estado, tarjetas en variante `compact`, contador de resultados, estado vacío |
| `ApplicationView` | `/solicitar` | Formulario declarativo: las 3 secciones y sus 11 campos se definen como **datos** en `#sections()`, y un solo método los pinta |
| `NotFoundView` | `*` | Paleta slate distinta al resto, SVG "home" inline |
| `AccessRestrictedView` | — | Pantalla de sistema del original; disponible para cuando se conecte autenticación |
| `BaseView` | — | Clase base abstracta |

### El formulario como datos

`ApplicationView` no repite marcado por campo. Declara la estructura y la
renderiza en un bucle:

```js
{
  name: 'amount',
  label: 'Monto solicitado ($)',
  type: 'number',
  placeholder: 'Ej: 5000000',
  min: 0,
}
```

Añadir un campo = añadir una entrada + su validación en el value object
correspondiente. No se toca el marcado. Esto es el Principio Abierto/Cerrado
aplicado a una plantilla.

## 4.4 El Controlador

### Contrato

```js
// src/presentation/contracts/IController.js
export const IController = defineContract('IController', ['handle', 'dispose']);
```

### Clase base: `BaseController`

```js
present(viewModel, handlers = {}) {          // navegación entre rutas
  this.#renderer.mount(this.#view, viewModel, handlers);   // hace scroll arriba
}

update(viewModel, handlers = {}) {           // interacción dentro de la vista
  this.#renderer.refresh(this.#view, viewModel, handlers); // NO mueve el scroll
}

dispose() {
  this.#view.destroy();
}
```

La distinción `present` / `update` es la que hace que filtrar en el simulador no
te devuelva al principio de la página.

### Qué puede y qué no puede hacer un controlador

| ✅ Puede | ❌ No puede |
|---|---|
| Guardar estado de UI (texto buscado, errores del formulario) | Importar un repositorio |
| Invocar casos de uso y leer su `Result` | Importar una entidad o un value object |
| Construir el viewModel a partir de DTOs | Construir HTML |
| Notificar vía `INotifier` | Acceder al DOM directamente |
| Recibir un puerto inyectado si necesita traducir (`IAmountRangeProvider`) | Instanciar sus dependencias con `new` |

### Los 4 controladores

| Controlador | Casos de uso que invoca | Estado de UI |
|---|---|---|
| `CatalogController` | `ListCreditProductsUseCase` | ninguno |
| `SimulatorController` | `SearchCreditProductsUseCase`, `GetAmountRangeFiltersUseCase` | `{ query, rangeIndex, focusField }` |
| `ApplicationController` | `SubmitCreditApplicationUseCase`, `GetCreditProductNamesUseCase` | `{ values, errors }` |
| `NotFoundController` | ninguno | ninguno |

### Ejemplo: manejo del envío del formulario

```js
// src/presentation/controllers/ApplicationController.js
async onSubmit(values) {
  const result = await this.#submitApplication.execute(values);

  if (result.isFailure) {
    this.#state = { values, errors: result.fieldErrors };   // conserva lo escrito
    this.update(this.#viewModel(), this.#handlers());
    this.#notifier.error(result.error, 'No se pudo enviar la solicitud');
    return;
  }

  const { reference, applicantFirstName, affordability } = result.value;
  this.#state = { values: {}, errors: {} };
  this.update(this.#viewModel(), this.#handlers());
  this.#notifier.success(
    `${applicantFirstName}, tu solicitud quedó radicada con el número ${reference}. …`,
    'Solicitud enviada',
  );
  // …aviso adicional si la cuota supera el 40 % del ingreso
}
```

Fíjate en lo que **no** hay: ni una validación, ni una expresión regular, ni un
`if (amount > product.max)`. Todo eso vive en los value objects y en
`CreditApplicationPolicy`. El controlador solo transporta el resultado.

## 4.5 El Modelo

El Modelo tiene dos mitades, y confundirlas es el error clásico de MVC:

### Modelo de datos: los DTOs

Producidos por los casos de uso mediante `CreditProductMapper`. Planos,
congelados y **ya formateados**:

```js
{
  id: 2,
  name: 'Crédito Vehículo',
  description: 'Financia tu carro nuevo o usado…',
  requirements: 'Mayor de 21 años, licencia de conducción, carta laboral.',
  icon: '🚗',
  themeClass: 'theme-emerald',
  annualRate: 14.2,
  annualRateLabel: '14.2%',
  maxTermMonths: 84,
  maxTermLabel: '84 meses',
  minAmountLabel: '$ 5.000.000',
  maxAmountLabel: '$ 120.000.000',
  amountRangeLabel: '$ 5.000.000 – $ 120.000.000',
}
```

Está congelado con `Object.freeze` (`freezeProductDTO`) para que la presentación
no lo mute por accidente, y **no tiene métodos**: la vista no puede ejecutar
lógica de negocio ni aunque quiera.

### Modelo de estado de UI: el controlador

`{ query, rangeIndex, focusField }` en el simulador, `{ values, errors }` en el
formulario. Vive en el controlador porque:

- No es del dominio (al dominio no le importa qué texto hay en un input).
- No es de la vista (la vista es sin estado; se destruye y se reconstruye).

## 4.6 Componentes: fragmentos reutilizables sin estado

Cuatro componentes, todos con la misma forma: `render(props) → string`. Ni
estado, ni efectos, ni listeners propios.

| Componente | Props | Variantes |
|---|---|---|
| `NavbarComponent` | `{ activePath }` | Resalta el enlace activo; "Solicitar" es CTA sólido salvo cuando es la ruta activa |
| `FooterComponent` | `{ variant }` | `catalog` (margen corto, texto largo) · `compact` (margen mayor, texto corto) |
| `ProductCardComponent` | `{ product, variant }` | `full` (requisitos + 2 botones) · `compact` (sin requisitos, 1 botón) |
| `AlertComponent` | `{ variant, icon, message }` | `info` (ámbar) · `empty` (borde discontinuo) |

`NavbarComponent` es el ejemplo de por qué `config/routes.js` no tiene imports:
el componente necesita conocer las rutas, y si `routes.js` importara componentes
habría un ciclo.

```js
// src/presentation/components/NavbarComponent.js
const items = [
  { path: ROUTES.CATALOG,     label: 'Catálogo',  cta: false },
  { path: ROUTES.SIMULATOR,   label: 'Simulador', cta: false },
  { path: ROUTES.APPLICATION, label: 'Solicitar', cta: true  },
];

#link(item, activePath) {
  const isActive = item.path === activePath;
  const cssClass = classNames(
    'navlink',
    isActive && 'navlink--active',
    !isActive && item.cta && 'navlink--cta',
  );
  // …
}
```

Esas tres líneas reproducen exactamente el comportamiento del original, donde
cada página repetía el marcado del navbar con clases distintas a mano.

## 4.7 `ViewRenderer`: el único que toca `innerHTML`

Todo el acceso de escritura al DOM está en **un solo archivo**.

```js
mount(view, viewModel, handlers = {}, { scrollToTop = true } = {}) {
  if (this.#currentView && this.#currentView !== view) {
    this.#currentView.destroy();          // libera la vista anterior
  }
  this.#root.innerHTML = view.render(viewModel);
  view.root = this.#root;
  view.afterRender(this.#root, handlers); // reengancha listeners
  this.#currentView = view;
  if (scrollToTop) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

refresh(view, viewModel, handlers = {}) {
  view.destroy();
  this.mount(view, viewModel, handlers, { scrollToTop: false });
}
```

Beneficios de concentrarlo:

- **Testeable**: en la suite de render se sustituye por
  `{ mount(){}, refresh(){}, clear(){} }` y los controladores funcionan igual.
- **Auditable**: para revisar riesgo de XSS basta mirar aquí y `Html.js`.
- **Consistente**: el scroll al inicio en cada cambio de ruta ocurre en un sitio,
  replicando el `ScrollToTop` del original.

## 4.8 Escapado por defecto

`presentation/shared/Html.js` expone una etiqueta de template literal que
**escapa todo** valor interpolado. Insertar marcado ya construido exige
envolverlo explícitamente en `raw()`:

```js
html`<p>${values.fullName}</p>`        // escapado automático
html`<div>${raw(this.#hero())}</div>`  // confianza explícita
```

Reglas de interpolación: `raw(...)` pasa tal cual; los arrays se unen y cada
elemento sigue las reglas; `null`, `undefined`, `false` y `true` producen cadena
vacía (permite `${cond && html`…`}`); todo lo demás se escapa.

`ToastNotifier` usa `textContent`, nunca `innerHTML`.

Verificado: introducir `Ana <script>` en el nombre produce
`Ana &lt;script&gt;` en el HTML, y `ok : solicitar: no hay script inyectado`.

## 4.9 El decorador: añadir comportamiento sin tocar controladores

Los títulos de página no están en ningún controlador. Se añaden desde fuera:

```js
// src/main.js
router.register(
  route.path,
  new DocumentTitleController({
    controller: container.resolve(route.controller),
    title: route.title,
  }),
);
```

`DocumentTitleController` implementa `IController`, así que el router no
distingue entre un controlador y un controlador decorado (Liskov). Y ningún
controlador tuvo que modificarse para ganar esta funcionalidad (Abierto/Cerrado).

Más sobre esto en [16 — Catálogo de patrones](./16-catalogo-de-patrones.md).

## 4.10 Siguiente lectura

- [12 — Vistas, controladores y componentes](./12-vistas-controladores-componentes.md) — referencia archivo por archivo
- [05 — Principios SOLID](./05-principios-solid.md)
- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
