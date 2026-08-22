[← Volver al índice maestro](./master.md)

# 18 — Guía de extensión

Diez recetas paso a paso. Cada una indica **qué archivos se tocan** y **qué se
verifica** al terminar.

---

## Receta 1 — Añadir un producto de crédito

**Archivos: 1.**

> **Esta receta ya se ejecutó de verdad.** El catálogo tiene hoy 6 productos: los
> 5 replicados del original más `Crédito de Libranza` (`id: 6`, $1 000 000 –
> $80 000 000, 13,5 % E.A., 96 meses, 🧾, paleta `teal`), añadido para cumplir el
> mínimo de seis productos que pide la rúbrica de la actividad. Requirió además la
> Receta 2, porque las cinco paletas del original ya estaban en uso. Coste total:
> tres archivos —datasource, `THEME_PALETTES` y `02-tokens.css`— y los conteos
> esperados de las tres suites. **Ninguna vista, controlador, caso de uso ni
> componente cambió.**

```js
// src/infrastructure/persistence/datasources/StaticCreditProductDataSource.js
Object.freeze({
  id: 7,
  nombre: 'Crédito Agropecuario',
  descripcion: 'Financia siembra, maquinaria e insumos con periodos de gracia según la cosecha.',
  montoMin: 2_000_000,
  montoMax: 200_000_000,
  tasa: 13.4,
  plazo: 96,
  requisitos: 'Predio propio o en arriendo, plan de inversión, RUT.',
  icon: '🌾',
  palette: 'emerald',        // ← debe estar en THEME_PALETTES
}),
```

**Aparece automáticamente en**: el catálogo (`/`), el simulador (`/simulador`) y el
`<select>` "Tipo de crédito" del formulario — porque ese select deriva de
`GetCreditProductNamesUseCase`, no de una lista escrita a mano.

**Verificar**: recargar `/`, contar 7 tarjetas, comprobar que el select tiene 8
opciones (placeholder + 7).

**Y actualizar las pruebas**: las tres suites afirman conteos exactos —productos
del catálogo, tarjetas en el DOM, resultados de cada filtro y opciones del
`<select>`—. Un producto nuevo las pone en rojo hasta que se ajustan esos números,
y eso es deseable: la suite avisa de que el catálogo cambió. Ojo con el filtro
"Hasta $5.000.000": si el `montoMin` del producto nuevo cae dentro del tramo,
también cambia ese conteo (con Libranza pasó de 3 a 4).

**Si falla**: una `palette` que no esté en `THEME_PALETTES` lanza
`INVALID_THEME_PALETTE` al arrancar, con la lista de válidas en el mensaje. Una
`tasa` > 100 lanza `RATE_OUT_OF_BOUNDS`. Un `montoMax < montoMin` lanza
`INVERTED_RANGE`. El fallo temprano es intencional.

---

## Receta 2 — Añadir una paleta de color

**Archivos: 2.**

> **Paletas ya declaradas**: `blue`, `emerald`, `violet`, `amber`, `rose` (las cinco
> del original) y `teal` (añadida con `Crédito de Libranza`). El ejemplo usa `sky`
> porque es la siguiente libre.

```css
/* 1. assets/css/02-tokens.css */
.theme-sky {
  --product-grad-from: var(--color-sky-500);
  --product-grad-to:   var(--color-sky-700);
  --product-badge-bg:  var(--color-sky-100);
  --product-badge-fg:  var(--color-sky-700);
}
```

Añade también los colores base en `:root` si no existen
(`--color-sky-500: #0ea5e9`, etc.). Así se hizo con `teal`: cuatro variables
nuevas (`--color-teal-100/500/600/700`) más el bloque del tema.

```js
// 2. src/domain/valueobjects/ProductTheme.js
export const THEME_PALETTES = Object.freeze([
  'blue', 'emerald', 'violet', 'amber', 'rose', 'teal', 'sky',
]);
```

**El orden importa**: sin el paso 2, el dominio rechaza el producto — que es
exactamente lo deseado. Sin el paso 1, la tarjeta se pinta sin gradiente.

---

## Receta 3 — Añadir un campo al formulario

**Archivos: 2.**

```js
// 1. src/presentation/views/ApplicationView.js — dentro de #sections()
{
  name: 'city',
  label: 'Ciudad de residencia',
  type: 'text',
  placeholder: 'Ej: Medellín',
  autocomplete: 'address-level2',
},
```

```js
// 2. src/domain/valueobjects/Applicant.js
const city = String(props.city ?? '').trim();
if (city === '') errors.city = 'La ciudad de residencia es obligatoria.';

// …y en el constructor:
this.#city = city;

// …y el getter + toJSON()
get city() { return this.#city; }
```

Y añade `city: raw.city` en `CreditApplicationMapper.toValueObjects`.

**No se toca**: marcado HTML (`#field` lo pinta), CSS, controlador, caso de uso.

**La clave del `name` debe coincidir** con la clave de `errors`: es lo que permite
que el mensaje aparezca bajo el input correcto sin traducción intermedia.

**Verificar**: enviar vacío → 12 errores en lugar de 11, y el nuevo campo marcado.

---

## Receta 4 — Añadir una página

**Archivos: 4 + 1 opcional.** Ejemplo: `/mis-solicitudes`.

```js
// 1. src/config/routes.js
export const ROUTES = Object.freeze({
  CATALOG: '/',
  SIMULATOR: '/simulador',
  APPLICATION: '/solicitar',
  HISTORY: '/mis-solicitudes',
});

export const ROUTE_TABLE = Object.freeze([
  // …las 3 existentes
  Object.freeze({ path: ROUTES.HISTORY, controller: 'historyController',
                  title: 'CreditSmart — Mis solicitudes' }),
]);
```

```js
// 2. src/presentation/views/HistoryView.js
import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

export class HistoryView extends BaseView {
  #navbar; #footer;

  constructor({ navbar, footer }) { super(); this.#navbar = navbar; this.#footer = footer; }

  template({ applications }) {
    return html`
      <div class="page">
        ${raw(this.#navbar.render({ activePath: ROUTES.HISTORY }))}
        <main class="page__main container container--3xl section">
          <h1 class="section__title section__title--page">Mis solicitudes</h1>
          <p class="section__subtitle">Solicitudes radicadas en esta sesión</p>
          ${raw(applications.length === 0
            ? html`<div class="alert alert--empty">Aún no has radicado solicitudes.</div>`
            : html`<div class="stack stack--gap-3">${applications.map((app) => html`
                <article class="panel">
                  <h2 class="panel__title">${app.reference}</h2>
                  <p class="panel__hint">${app.productName} · ${app.createdAtLabel}</p>
                  <p class="t-muted">Estado: <strong>${app.status}</strong></p>
                </article>
              `)}</div>`)}
        </main>
        ${raw(this.#footer.render({ variant: 'compact' }))}
      </div>
    `;
  }
}
```

```js
// 3. src/presentation/controllers/HistoryController.js
import { BaseController } from './BaseController.js';

export class HistoryController extends BaseController {
  #listApplications; #notifier;

  constructor({ view, renderer, listCreditApplicationsUseCase, notifier }) {
    super({ view, renderer });
    this.#listApplications = listCreditApplicationsUseCase;
    this.#notifier = notifier;
  }

  async handle() {
    const result = await this.#listApplications.execute();
    if (result.isFailure) {
      this.#notifier.error(result.error, 'No se pudo cargar el histórico');
      this.present({ applications: [] });
      return;
    }
    this.present({ applications: result.value });
  }
}
```

```js
// 4. src/config/dependencies.js
container.register('historyView', (c) =>
  new HistoryView({ navbar: c.resolve('navbarComponent'), footer: c.resolve('footerComponent') }));

container.register('historyController', (c) =>
  new HistoryController({
    view: c.resolve('historyView'),
    renderer: c.resolve('viewRenderer'),
    listCreditApplicationsUseCase: c.resolve('listCreditApplicationsUseCase'),
    notifier: c.resolve('notifier'),
  }));
```

```js
// 5. (opcional) src/presentation/components/NavbarComponent.js
const items = [
  { path: ROUTES.CATALOG,     label: 'Catálogo',        cta: false },
  { path: ROUTES.SIMULATOR,   label: 'Simulador',       cta: false },
  { path: ROUTES.HISTORY,     label: 'Mis solicitudes', cta: false },
  { path: ROUTES.APPLICATION, label: 'Solicitar',       cta: true  },
];
```

**`main.js` no cambia**: recorre `ROUTE_TABLE` y decora cada controlador.

---

## Receta 5 — Añadir un caso de uso

**Archivos: 2.** Ver el ejemplo completo en
[10 §10.8](./10-casos-de-uso-y-dtos.md).

Checklist:

- [ ] `extends IUseCase`, un solo método `execute()`
- [ ] `assertImplements` de cada puerto en el constructor
- [ ] `try/catch` que devuelve `Result.fromError(err)`
- [ ] Devuelve DTOs u objetos planos, nunca entidades
- [ ] Registrado en `dependencies.js`, bloque 3
- [ ] Si es un comando, registra en `ILogger`

---

## Receta 6 — Añadir un puerto y su adaptador

**Archivos: 3.** Ver el ejemplo completo en
[06 §6.8](./06-contratos-e-interfaces.md).

Orden obligatorio:

1. **Primero el puerto**, en la capa que tiene la necesidad
   (`domain/contracts/` si la necesidad es de negocio,
   `application/contracts/` si es de orquestación,
   `presentation/contracts/` si es de interfaz).
2. **Luego el adaptador**, en `infrastructure/`, con `extends` del puerto.
3. **Por último el registro**, envuelto en `assertImplements`.

Escribir el adaptador antes del puerto es el error que produce puertos con nombres
de tecnología (`IHttpClient` en lugar de `ICreditProductRepository`).

---

## Receta 7 — Sustituir datos estáticos por una API REST

**Archivos: 3.** Receta completa con el código del adaptador en
[11 §11.8](./11-adaptadores-de-infraestructura.md).

Resumen:

1. `src/infrastructure/persistence/HttpCreditProductRepository.js` — nuevo,
   `extends ICreditProductRepository`, reutiliza `CreditProductFactory`.
2. `src/config/AppConfig.js` — añadir `apiBaseUrl: '/api'`.
3. `src/config/dependencies.js` — cambiar **una línea** de registro.

**No cambian**: los 5 casos de uso, los 4 controladores, las 6 vistas, las 2
entidades, los 8 value objects, el mapper, el router, el CSS.

Si el formato de la API difiere del datasource, se ajusta `CreditProductFactory` —
que es precisamente para lo que existe.

---

## Receta 8 — Cambiar una regla de negocio

Tres ejemplos, para mostrar dónde vive cada tipo de regla.

### 8a. La capacidad de pago pasa del 40 % al 35 %

```js
// src/domain/valueobjects/EmploymentInfo.js
get maxAffordableInstallment() {
  return this.#monthlyIncome.multiply(0.35);
}
```

**Un archivo, una línea.** Sin el value object, ese `0.4` estaría en el
controlador, en la vista y probablemente en un comentario desactualizado.

### 8b. La cédula ahora admite 5 dígitos

```js
// src/domain/valueobjects/Applicant.js
else if (!/^\d{5,12}$/.test(document))
  errors.idNumber = 'La cédula debe tener entre 5 y 12 dígitos.';
```

### 8c. El plazo máximo del vehículo baja a 72 meses

```js
// src/infrastructure/persistence/datasources/StaticCreditProductDataSource.js
plazo: 72,
```

La política de dominio (`admitsTerm`) ya lo aplica: una solicitud a 84 meses de
Crédito Vehículo se rechaza automáticamente con el mensaje
*"El plazo máximo para Crédito Vehículo es de 72 meses."*

**Nota**: el `<select>` de plazos ofrece 12/24/36/48/60, así que ningún usuario
puede pedir 84 desde la UI. La regla protege igualmente cualquier interfaz futura o
una llamada directa al caso de uso.

---

## Receta 9 — Añadir un filtro al simulador

Ejemplo: filtrar por tasa máxima.

**Archivos: 4.**

```js
// 1. src/domain/criteria/ProductSearchCriteria.js
constructor({ query = '', amountRange = null, maxRate = null } = {}) {
  this.#query = String(query ?? '').trim();
  this.#amountRange = amountRange instanceof AmountRange ? amountRange : null;
  this.#maxRate = Number.isFinite(Number(maxRate)) ? Number(maxRate) : null;
  Object.freeze(this);
}

get isEmpty() {
  return this.#query === ''
    && (this.#amountRange === null || this.#amountRange.isUnbounded)
    && this.#maxRate === null;
}

isSatisfiedBy(product) {
  if (!product.matchesName(this.#query)) return false;
  if (this.#amountRange && !product.matchesAmountRange(this.#amountRange)) return false;
  if (this.#maxRate !== null && product.interestRate.annualPercentage > this.#maxRate) return false;
  return true;
}
```

```js
// 2. src/application/usecases/SearchCreditProductsUseCase.js
async execute({ query = '', amountRange = null, maxRate = null } = {}) {
  const criteria = new ProductSearchCriteria({ query, amountRange, maxRate });
  // …resto igual
}
```

```js
// 3. src/presentation/views/SimulatorView.js — en #filters()
<div>
  <label class="label label--block" for="filter-rate">Tasa máxima (%)</label>
  <input id="filter-rate" name="maxRate" type="number" step="0.1" class="control"
         placeholder="Ej: 15" value="${maxRate ?? ''}" />
</div>

// …y en #readCriteria()
return {
  query: String(data.get('query') ?? ''),
  rangeIndex: Number(data.get('rangeIndex') ?? 0),
  maxRate: data.get('maxRate') === '' ? null : Number(data.get('maxRate')),
};
```

```js
// 4. src/presentation/controllers/SimulatorController.js
#state = { query: '', rangeIndex: 0, maxRate: null, focusField: null };

async onSearch({ query, rangeIndex, maxRate }) {
  this.#state = { query, rangeIndex, maxRate, focusField: 'query' };
  await this.#renderResults({ initial: false });
}
```

**El repositorio NO cambia.** `findByCriteria` sigue siendo
`products.filter(p => criteria.isSatisfiedBy(p))`. Eso es el patrón Specification
pagando su coste.

---

## Receta 10 — Sustituir los toasts por otro mecanismo

**Archivos: 2.**

```js
// 1. src/infrastructure/notification/BannerNotifier.js
import { INotifier } from '../../application/contracts/INotifier.js';

export class BannerNotifier extends INotifier {
  #container;

  constructor({ container }) { super(); this.#container = container; }

  success(message, title = '¡Listo!')                 { this.#show('success', title, message); }
  error(message, title = 'Revisa la información')     { this.#show('error', title, message); }
  info(message, title = '')                           { this.#show('info', title, message); }

  #show(variant, title, message) {
    if (!this.#container) return;
    this.#container.textContent = '';
    const banner = document.createElement('div');
    banner.className = `banner banner--${variant}`;
    banner.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    banner.textContent = title ? `${title}: ${message}` : message;
    this.#container.appendChild(banner);
  }
}
```

```js
// 2. src/config/dependencies.js
container.register('notifier', (c) =>
  assertImplements(
    new BannerNotifier({
      container: document.querySelector(c.resolve('config').selectors.notifications),
    }),
    INotifier,
  ),
);
```

Los 4 controladores siguen llamando a `this.#notifier.success(...)` sin saber que
cambió nada. Añade las clases `.banner` a `05-components.css`.

---

## Checklist antes de dar por bueno un cambio

### 1. Regla de dependencia

```bash
cd C:/laragon/www/crediSmart
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/
grep -rn "from '\.\./\.\./\(infrastructure\|presentation\|config\)" src/application/
grep -rn "infrastructure" src/presentation/
```

Las tres → **cero resultados**.

### 2. Contratos

- [ ] ¿Todo adaptador nuevo `extends` su puerto?
- [ ] ¿Está envuelto en `assertImplements` al registrarlo?
- [ ] ¿Los métodos del puerto están **todos** implementados (heredar no basta)?

### 3. Dominio

- [ ] ¿Los value objects nuevos son inmutables (`Object.freeze(this)`)?
- [ ] ¿Validan en el constructor con `DomainError` y un `code`?
- [ ] ¿Tienen `equals()` y `toJSON()`?
- [ ] ¿Ninguna regla de negocio quedó en un controlador o una vista?

### 4. Presentación

- [ ] ¿Todo dato interpolado se escapa (o el `raw()` es de un literal del código)?
- [ ] ¿Los listeners se registran con `BaseView.on()`?
- [ ] ¿Los `href` se construyen con `UrlBuilder.href()`?
- [ ] ¿Los enlaces internos llevan `data-link`?
- [ ] ¿La vista sigue sin consultar datos ni decidir navegación?

### 5. Pruebas

```bash
cd <scratchpad>
node smoke.mjs     # dominio + aplicación, sin DOM
node render.mjs    # vistas, HTML balanceado, escapado
node boot.mjs      # arranque completo en jsdom
```

Las tres → **TODO OK**. Detalle en [19](./19-pruebas-y-verificacion.md).

### 6. En el navegador

- [ ] Las 4 rutas cargan y recargan sin 404
- [ ] La navegación por clic no recarga la página
- [ ] El botón atrás funciona
- [ ] En 375 px de ancho no hay desbordamiento horizontal
- [ ] Tabulando se ve el anillo de foco en cada control
- [ ] La consola no tiene errores

### 7. Documentación

- [ ] ¿Añadido al índice alfabético de [`master.md`](./master.md)?
- [ ] ¿Documentado en el archivo de su capa (07–15)?
- [ ] ¿El comentario de cabecera del archivo indica capa y propósito?

---

## Errores que rompen la arquitectura

Los cuatro antipatrones más frecuentes:

| Error | Corrección |
|---|---|
| Importar un repositorio desde un controlador | Inyectar un caso de uso |
| Poner un `if` de negocio en una plantilla | Moverlo a la entidad o al value object |
| Crear el puerto en `infrastructure/` | Va en la capa que tiene la necesidad |
| Interpolar datos del usuario con `raw()` | Usar `${valor}`, que escapa por defecto |

## Siguiente lectura

- [19 — Pruebas y verificación](./19-pruebas-y-verificacion.md)
- [20 — Glosario y convenciones](./20-glosario-y-convenciones.md)
