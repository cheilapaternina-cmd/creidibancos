[← Volver al índice maestro](./master.md)

# 13 — Inyección de dependencias y Composition Root

## 13.1 El principio operativo

Una clase **nunca** crea sus colaboradores. Los recibe.

```js
// ❌ Acoplamiento a una implementación concreta
class ListCreditProductsUseCase {
  constructor() {
    this.repository = new InMemoryCreditProductRepository();   // imposible sustituir
  }
}

// ✅ Inyección por constructor
class ListCreditProductsUseCase extends IUseCase {
  constructor({ productRepository, productMapper }) {
    super();
    assertImplements(productRepository, ICreditProductRepository);
    this.#repository = productRepository;
    this.#mapper = productMapper;
  }
}
```

Se usa **un objeto con nombres** en lugar de argumentos posicionales:

- Las llamadas se autodocumentan: `{ productRepository, productMapper }` frente a
  `(repo, mapper)`.
- Añadir una dependencia no rompe el orden de las existentes.
- No hay riesgo de invertir dos argumentos del mismo tipo.

## 13.2 `Container` — el contenedor

`src/config/Container.js`

```js
export class Container {
  #factories = new Map();
  #instances = new Map();
  #resolving = [];

  register(key, factory) {
    if (typeof factory !== 'function') {
      throw new TypeError(`La factoría de "${key}" debe ser una función.`);
    }
    if (this.#factories.has(key)) {
      throw new Error(`La dependencia "${key}" ya estaba registrada.`);
    }
    this.#factories.set(key, factory);
    return this;
  }

  registerValue(key, value) {
    this.#instances.set(key, value);
    return this;
  }

  resolve(key) {
    if (this.#instances.has(key)) return this.#instances.get(key);

    const factory = this.#factories.get(key);
    if (!factory) throw new Error(`Dependencia no registrada: "${key}".`);

    if (this.#resolving.includes(key)) {
      throw new Error(`Dependencia circular detectada: ${[...this.#resolving, key].join(' -> ')}.`);
    }

    this.#resolving.push(key);
    try {
      const instance = factory(this);
      this.#instances.set(key, instance);
      return instance;
    } finally {
      this.#resolving.pop();
    }
  }

  eagerResolveAll() {
    for (const key of this.#factories.keys()) this.resolve(key);
    return this;
  }

  keys() {
    return [...new Set([...this.#instances.keys(), ...this.#factories.keys()])];
  }
}
```

### Qué aporta cada mecanismo

| Mecanismo | Efecto |
|---|---|
| Factorías perezosas | Nada se construye hasta que se pide. El orden de registro es irrelevante. |
| Cacheo en `#instances` | Singleton por clave: `resolve('logger')` diez veces devuelve el mismo logger. |
| `register` rechaza duplicados | Un registro repetido por copiar-pegar falla al arrancar en vez de sobrescribir en silencio. |
| `#resolving` como pila | Detecta ciclos y muestra la **cadena completa** en el mensaje, no un desbordamiento de pila. |
| `finally { pop() }` | La pila queda consistente aunque la factoría lance. |
| `eagerResolveAll()` | Construye todo el grafo en el arranque → los errores de contrato salen al cargar la página. |
| `keys()` | Inspección del grafo para depurar. |

### Detección de ciclos

```js
const c = new Container();
c.register('a', (k) => k.resolve('b'));
c.register('b', (k) => k.resolve('a'));
c.resolve('a');
// Error: Dependencia circular detectada: a -> b -> a.
```

Verificado en la suite: `ok : container: detecta dependencia circular`.

### Por qué esto NO es un Service Locator

El antipatrón Service Locator consiste en que **las clases** pidan sus
dependencias al contenedor. Aquí no ocurre:

```bash
grep -rln "Container" src/ --include=*.js
# → src/config/Container.js      la clase
#   src/config/dependencies.js   el Composition Root
#   src/main.js                  el bootstrap
```

Ninguna clase de `domain/`, `application/`, `infrastructure/` o `presentation/`
importa el contenedor. Todas reciben sus dependencias ya resueltas por
constructor. El contenedor es una herramienta de **ensamblaje**, y solo el
ensamblador la conoce.

## 13.3 `AppConfig` — la configuración

`src/config/AppConfig.js`

```js
export const AppConfig = Object.freeze({
  appName: 'CreditSmart',
  company: 'FinTech Solutions S.A.S',

  locale: 'es-CO',        // idénticos al original
  currency: 'COP',

  basePath: null,         // null = autodetectar desde document.baseURI

  logLevel: 'info',       // 'debug' | 'info' | 'warn' | 'error' | 'silent'
  toastTimeoutMs: 6000,

  selectors: Object.freeze({
    root: '#root',
    notifications: '#notifications',
  }),
});
```

Congelado, y **nadie lo importa directamente salvo `main.js` y
`dependencies.js`**: las clases reciben los valores que necesitan por
constructor. Así un test puede construir un `ConsoleLogger` con nivel `silent` sin
tocar configuración global.

| Clave | Consumidor |
|---|---|
| `appName` | prefijo del `ConsoleLogger`, título del 404 |
| `locale` / `currency` | `IntlMoneyFormatter` |
| `basePath` | `UrlBuilder` (o autodetección si es `null`) |
| `logLevel` | `ConsoleLogger` |
| `toastTimeoutMs` | `ToastNotifier` |
| `selectors.root` | `main.js` → `ViewRenderer` |
| `selectors.notifications` | `ToastNotifier` |

## 13.4 `buildContainer` — el Composition Root

`src/config/dependencies.js` es el **único** archivo del proyecto que:

- importa de las cuatro capas a la vez,
- hace `new` de clases concretas que cruzan capas,
- decide qué adaptador cumple cada puerto.

El grafo se declara de dentro hacia fuera, en siete bloques.

### Bloque 0 — Valores de arranque

```js
container.registerValue('config', config);
container.registerValue('rootElement', rootElement);
```

### Bloque 1 — Adaptadores técnicos

```js
container.register('logger', (c) =>
  assertImplements(
    new ConsoleLogger({ level: c.resolve('config').logLevel, prefix: c.resolve('config').appName }),
    ILogger,
  ),
);

container.register('notifier', (c) =>
  assertImplements(
    new ToastNotifier({
      container: document.querySelector(c.resolve('config').selectors.notifications),
      timeoutMs: c.resolve('config').toastTimeoutMs,
    }),
    INotifier,
  ),
);

container.register('clock',          () => assertImplements(new SystemClock(),       IClock));
container.register('idGenerator',    () => assertImplements(new CryptoIdGenerator(), IIdGenerator));

container.register('moneyFormatter', (c) =>
  assertImplements(
    new IntlMoneyFormatter({
      locale:   c.resolve('config').locale,
      currency: c.resolve('config').currency,
    }),
    IMoneyFormatter,
  ),
);
```

### Bloque 2 — Persistencia

```js
container.register('productRepository', () =>
  assertImplements(new InMemoryCreditProductRepository(), ICreditProductRepository));

container.register('amountRangeProvider', () =>
  assertImplements(new StaticAmountRangeProvider(), IAmountRangeProvider));

container.register('applicationRepository', (c) =>
  assertImplements(
    new LocalStorageCreditApplicationRepository({ idGenerator: c.resolve('idGenerator') }),
    ICreditApplicationRepository,
  ));
```

**Estas tres líneas son el punto de sustitución de todo el sistema de datos.**

### Bloque 3 — Aplicación

```js
container.register('productMapper', (c) =>
  new CreditProductMapper({ moneyFormatter: c.resolve('moneyFormatter') }));

container.register('listCreditProductsUseCase', (c) =>
  new ListCreditProductsUseCase({
    productRepository: c.resolve('productRepository'),
    productMapper:     c.resolve('productMapper'),
  }));

// …searchCreditProductsUseCase, getAmountRangeFiltersUseCase,
//   getCreditProductNamesUseCase, submitCreditApplicationUseCase
```

### Bloque 4 — Presentación compartida y componentes

```js
container.register('urlBuilder', (c) => {
  const configured = c.resolve('config').basePath;
  return new UrlBuilder({ basePath: configured ?? UrlBuilder.detectBasePath() });
});

container.register('viewRenderer', (c) => new ViewRenderer({ root: c.resolve('rootElement') }));

container.register('navbarComponent',      (c) => new NavbarComponent({ urlBuilder: c.resolve('urlBuilder') }));
container.register('footerComponent',      ()  => new FooterComponent());
container.register('alertComponent',       ()  => new AlertComponent());
container.register('productCardComponent', (c) => new ProductCardComponent({ urlBuilder: c.resolve('urlBuilder') }));
```

`basePath` es el único punto donde se decide entre configuración explícita y
autodetección.

### Bloque 5 — Vistas

```js
container.register('catalogView', (c) =>
  new CatalogView({
    navbar:      c.resolve('navbarComponent'),
    footer:      c.resolve('footerComponent'),
    productCard: c.resolve('productCardComponent'),
    urlBuilder:  c.resolve('urlBuilder'),
  }));

// …simulatorView, applicationView, notFoundView, accessRestrictedView
```

### Bloque 6 — Controladores

```js
container.register('applicationController', (c) =>
  new ApplicationController({
    view:     c.resolve('applicationView'),
    renderer: c.resolve('viewRenderer'),
    submitCreditApplicationUseCase: c.resolve('submitCreditApplicationUseCase'),
    getCreditProductNamesUseCase:   c.resolve('getCreditProductNamesUseCase'),
    notifier: c.resolve('notifier'),
    termOptions: STATIC_TERM_OPTIONS,     // ← inyectado, la presentación no lo importa
  }));
```

Esa última línea es la corrección del único incumplimiento de la regla de
dependencia que apareció durante la construcción.

### Bloque 7 — Router

```js
container.register('router', (c) =>
  assertImplements(
    new HistoryRouter({ urlBuilder: c.resolve('urlBuilder'), logger: c.resolve('logger') }),
    IRouter,
  ));
```

## 13.5 El grafo completo — 32 dependencias

```
config ─────────────┬─────────────────────────────────────────────┐
rootElement ────┐   │                                             │
                │   ├─► logger ────────────────────────┐          │
                │   ├─► notifier                       │          │
                │   ├─► clock ──────────┐              │          │
                │   ├─► idGenerator ──┐ │              │          │
                │   └─► moneyFormatter│ │              │          │
                │            │        │ │              │          │
                │            │        │ │              │          │
                │      productMapper  │ │              │          │
                │            │        │ │              │          │
    productRepository ───────┼────────┼─┼──────────────┤          │
    amountRangeProvider      │        │ │              │          │
    applicationRepository ◄──┘        │ │              │          │
        │  │  │                       │ │              │          │
        │  │  └─► listCreditProductsUseCase            │          │
        │  ├────► searchCreditProductsUseCase          │          │
        │  ├────► getCreditProductNamesUseCase         │          │
        │  └────► submitCreditApplicationUseCase ◄─────┘◄─────────┤
        │              (repos + clock + logger)                   │
                                                                  │
    amountRangeProvider ─► getAmountRangeFiltersUseCase           │
                                                                  │
    urlBuilder ◄──────────────────────────────────────────────────┘
        ├─► navbarComponent
        ├─► productCardComponent
        └─► notFoundView

    rootElement ─► viewRenderer

    navbar + footer + productCard + urlBuilder ─► catalogView
    navbar + footer + productCard + alert      ─► simulatorView
    navbar + footer                            ─► applicationView

    catalogView     + viewRenderer + listCreditProductsUseCase   + notifier ─► catalogController
    simulatorView   + viewRenderer + searchCreditProductsUseCase
                    + getAmountRangeFiltersUseCase + amountRangeProvider
                    + notifier                                              ─► simulatorController
    applicationView + viewRenderer + submitCreditApplicationUseCase
                    + getCreditProductNamesUseCase + notifier + termOptions ─► applicationController
    notFoundView    + viewRenderer                                          ─► notFoundController

    urlBuilder + logger ─► router
```

Las 32 claves:

```
config · rootElement · logger · notifier · clock · idGenerator · moneyFormatter
productRepository · amountRangeProvider · applicationRepository · productMapper
listCreditProductsUseCase · searchCreditProductsUseCase
getAmountRangeFiltersUseCase · getCreditProductNamesUseCase
submitCreditApplicationUseCase · urlBuilder · viewRenderer
navbarComponent · footerComponent · alertComponent · productCardComponent
catalogView · simulatorView · applicationView · notFoundView · accessRestrictedView
catalogController · simulatorController · applicationController · notFoundController
router
```

Verificado: `ok : contenedor resuelto (32 dependencias)`.

## 13.6 `main.js` — el bootstrap

```js
async function bootstrap() {
  const rootElement = document.querySelector(AppConfig.selectors.root);

  if (!rootElement) {
    throw new Error(`No se encontró el contenedor raíz "${AppConfig.selectors.root}" en el documento.`);
  }

  const container = buildContainer({ config: AppConfig, rootElement });

  // Construye todo el grafo ahora: cualquier adaptador que no cumpla su
  // contrato falla aquí, no a mitad de una navegación del usuario.
  container.eagerResolveAll();

  const logger = container.resolve('logger');
  const router = container.resolve('router');

  for (const route of ROUTE_TABLE) {
    router.register(
      route.path,
      new DocumentTitleController({
        controller: container.resolve(route.controller),
        title: route.title,
      }),
    );
  }

  router.setFallback(
    new DocumentTitleController({
      controller: container.resolve(FALLBACK_CONTROLLER),
      title: `${AppConfig.appName} — Página no encontrada`,
    }),
  );

  await router.start();

  logger.info('Aplicación iniciada', {
    basePath: container.resolve('urlBuilder').basePath,
    routes: ROUTE_TABLE.map((route) => route.path),
  });
}
```

Cinco pasos: localizar la raíz, construir el grafo, verificarlo entero, registrar
rutas decoradas, arrancar el router.

### La red de seguridad

```js
bootstrap().catch((error) => {
  console.error('[CreditSmart] Fallo en el arranque:', error);

  const root = document.querySelector(AppConfig.selectors.root);
  if (root) {
    root.innerHTML = `
      <div class="sys-page">…<h2 class="sys-title">No se pudo iniciar la aplicación</h2>
      <p class="sys-text">Revisa la consola del navegador para ver el detalle técnico.</p>…</div>
    `;
  }
});
```

Si algo falla —un contrato roto, un archivo que no carga— el usuario ve un mensaje
con el estilo del sitio en lugar de una página en blanco, y el detalle técnico
queda en la consola.

## 13.7 `routes.js` — tabla de rutas

```js
export const ROUTES = Object.freeze({
  CATALOG: '/',
  SIMULATOR: '/simulador',
  APPLICATION: '/solicitar',
});

export const ROUTE_TABLE = Object.freeze([
  Object.freeze({ path: ROUTES.CATALOG,     controller: 'catalogController',     title: 'CreditSmart — Catálogo'  }),
  Object.freeze({ path: ROUTES.SIMULATOR,   controller: 'simulatorController',   title: 'CreditSmart — Simulador' }),
  Object.freeze({ path: ROUTES.APPLICATION, controller: 'applicationController', title: 'CreditSmart — Solicitar' }),
]);

export const FALLBACK_CONTROLLER = 'notFoundController';
```

**Este archivo no tiene un solo `import`.** Es deliberado: `NavbarComponent` y
`ProductCardComponent` necesitan conocer las rutas, y si `routes.js` importara
componentes o controladores habría un ciclo. Referenciar controladores por
**clave del contenedor** (string) rompe la dependencia.

## 13.8 Ventajas medibles de este montaje

| Escenario | Archivos que cambian |
|---|---|
| Datos estáticos → API REST | 2 (nuevo adaptador + 1 línea en `dependencies.js`) |
| Cambiar de `es-CO` a `es-MX` | 1 (`AppConfig`) |
| Silenciar logs en producción | 1 (`AppConfig.logLevel`) |
| Toasts → banner en cabecera | 2 (nuevo adaptador de `INotifier` + 1 línea) |
| Añadir título a los controladores | 0 (ya lo hace el decorador) |
| Desplegar en un subdirectorio distinto | 0 (autodetección) |
| Probar sin navegador | 0 (los dobles se pasan por constructor) |

## 13.9 Cómo registrar algo nuevo

```js
// 1. Importar la clase y su contrato al inicio de dependencies.js
import { SessionStorageDraftStorage } from '../infrastructure/persistence/SessionStorageDraftStorage.js';
import { IDraftStorage } from '../domain/contracts/IDraftStorage.js';

// 2. Registrar en el bloque que le corresponda (persistencia, en este caso),
//    con verificación de contrato
container.register('draftStorage', () =>
  assertImplements(new SessionStorageDraftStorage(), IDraftStorage),
);

// 3. Inyectarlo donde haga falta
container.register('applicationController', (c) =>
  new ApplicationController({
    // …
    draftStorage: c.resolve('draftStorage'),
  }),
);
```

Reglas: registrar en el bloque correcto (el orden de los bloques documenta el
grafo), envolver siempre en `assertImplements` si hay contrato, y no crear
dependencias hacia atrás (un adaptador no debe depender de un controlador).

## 13.10 Siguiente lectura

- [14 — Enrutado y URLs](./14-enrutado-y-urls.md)
- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
