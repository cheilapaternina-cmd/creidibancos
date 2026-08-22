# CreditSmart — HTML + CSS + JavaScript vanilla

Reconstrucción completa de `https://sweet-smart-credit-path.base44.app` (app
React/Vite + Tailwind) en **HTML, CSS y JavaScript básicos**, sin frameworks,
sin build y sin dependencias de terceros.

La organización combina **MVC** en la capa de presentación con **arquitectura
hexagonal** (puertos y adaptadores), **Clean Architecture** (regla de
dependencia hacia el núcleo) y los cinco principios **SOLID**, con interfaces
declaradas explícitamente como contratos.

> **Documentación completa: [`docs/master.md`](./docs/master.md)** — índice maestro
> de 21 documentos que explican el patrón de diseño, las entidades, los value
> objects, los 12 contratos, los casos de uso, los adaptadores, la inyección de
> dependencias, el enrutado, los estilos, los flujos end-to-end, las recetas de
> extensión y las convenciones.
>
> Para la entrega académica, [`docs/iudigital_doc/`](./docs/iudigital_doc/) contiene
> el documento de arquitectura en formato Word y los
> [scripts que lo generan](./docs/iudigital_doc/generador/README.md).

---

## 1. Cómo ejecutarlo

Requiere servirse por HTTP: el proyecto usa **módulos ES** (`type="module"`),
que el navegador bloquea sobre `file://` por CORS.

### Laragon / Apache (recomendado en este equipo)

El proyecto ya está en `C:\laragon\www\crediSmart`:

```
http://crediSmart.test/          (vhost automático de Laragon)
http://localhost/crediSmart/     (alternativa por subdirectorio)
```

El `.htaccess` incluido reescribe las rutas limpias hacia `index.html`, de modo
que recargar en `/simulador` o `/solicitar` funciona. Requiere `mod_rewrite`
activo (lo está por defecto en Laragon).

### Cualquier otro servidor estático

```bash
npx serve .          # o: python -m http.server 8080
```

Con un servidor sin reescritura, la navegación interna funciona (History API),
pero recargar directamente en `/simulador` devolverá 404 del servidor. Para
Nginx:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

El prefijo de despliegue se **autodetecta** desde `document.baseURI`
(`UrlBuilder.detectBasePath()`), así que funciona igual en la raíz del dominio
o en un subdirectorio. Para fijarlo a mano: `AppConfig.basePath`.

---

## 2. Qué se replicó del sitio original

Se extrajo el bundle de producción (`/assets/index-*.js`, 414 KB minificados) y
se reconstruyó su contenido literal:

| Original                                                          | Aquí                                             |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| Ruta `/` — Catálogo                                               | `CatalogView` + `CatalogController`              |
| Ruta `/simulador` — Simulador                                     | `SimulatorView` + `SimulatorController`          |
| Ruta `/solicitar` — Solicitud                                     | `ApplicationView` + `ApplicationController`      |
| Ruta `*` — 404 (paleta slate, "Go Home")                          | `NotFoundView` + `NotFoundController`            |
| Pantalla de sistema "Access Restricted"                           | `AccessRestrictedView`                           |
| Spinner de carga inicial                                          | `.app-boot` + `.spinner` en `index.html`         |
| `ScrollToTop` (scroll al inicio / al ancla)                       | `ViewRenderer` + `HistoryRouter#applyHashScroll` |
| Navbar sticky, marca `Credit`+`Smart`, "by FinTech Solutions"     | `NavbarComponent`                                |
| Hero azul con degradado y dos CTA                                 | `CatalogView#hero`                               |
| 6 productos con montos, tasas, plazos, requisitos, emoji y paleta | `StaticCreditProductDataSource`                  |
| 5 rangos de monto del filtro                                      | `STATIC_AMOUNT_RANGES`                           |
| Plazos 12/24/36/48/60 meses                                       | `STATIC_TERM_OPTIONS`                            |
| Formato `Intl.NumberFormat('es-CO', COP, 0 decimales)`            | `IntlMoneyFormatter`                             |
| Footer (dos variantes de margen y texto)                          | `FooterComponent`                                |
| Paleta Tailwind completa usada en el diseño                       | `assets/css/02-tokens.css`                       |

**Diferencias deliberadas** (dos, ambas señaladas aquí):

1. En el original los filtros del simulador eran decorativos ("La búsqueda y
   filtros son solo visuales en esta actividad"). Aquí **funcionan**: la
   búsqueda es incremental y el filtro por rango se resuelve con
   `AmountRange.overlaps()`. El aviso de la pantalla se reformuló para decir la
   verdad ("los datos del catálogo son estáticos; la búsqueda se resuelve en el
   navegador"). Si se prefiere el texto literal, está en
   `SimulatorView.template()`.
2. En el original el formulario era "solo de diseño". Aquí **valida** los 11
   campos, aplica la política de dominio (monto y plazo dentro de lo que
   permite el producto elegido), estima la cuota mensual y radica la solicitud
   con número de referencia. La nota al pie se ajustó en consecuencia.

Todo lo demás —textos, placeholders, emojis, tipos de campo, orden, colores,
sombras, radios, breakpoints— es idéntico.

---

## 3. Estructura de carpetas

```
crediSmart/
├── index.html                     Shell: punto de montaje + cascada de CSS
├── manifest.json                  PWA (nombre, iconos, tema)
├── .htaccess                      Reescritura SPA, MIME, caché, seguridad
├── README.md
│
├── assets/css/                    CSS plano, en cascada explícita
│   ├── 01-reset.css               Normalización (equivalente a preflight)
│   ├── 02-tokens.css              Design tokens + temas de producto
│   ├── 03-base.css                Elementos base y utilidades tipográficas
│   ├── 04-layout.css              Contenedores, secciones, grids
│   ├── 05-components.css          Navbar, botones, cards, formularios, toasts
│   ├── 06-pages.css               Hero, simulador, formulario, 404, acceso
│   └── 07-responsive.css          Breakpoints sm/lg + print
│
└── src/
    ├── main.js                    BOOTSTRAP (arranque)
    │
    ├── domain/                    ◄── NÚCLEO. Cero dependencias externas
    │   ├── contracts/             PUERTOS (interfaces)
    │   │   ├── Contract.js            Fábrica de interfaces + assertImplements
    │   │   ├── ICreditProductRepository.js
    │   │   ├── ICreditApplicationRepository.js
    │   │   ├── IAmountRangeProvider.js
    │   │   ├── IMoneyFormatter.js
    │   │   ├── IClock.js
    │   │   └── IIdGenerator.js
    │   ├── entities/              CreditProduct · CreditApplication
    │   ├── valueobjects/          Money · InterestRate · Term · AmountRange
    │   │                          ProductTheme · Applicant · RequestedCredit
    │   │                          EmploymentInfo
    │   ├── criteria/              ProductSearchCriteria (Specification)
    │   ├── services/              CreditApplicationPolicy (reglas cruzadas)
    │   └── errors/                DomainError · ValidationError
    │                              NotImplementedError · ContractViolationError
    │
    ├── application/               ◄── CASOS DE USO. Depende solo de domain
    │   ├── contracts/             IUseCase · ILogger · INotifier
    │   ├── usecases/              ListCreditProducts · SearchCreditProducts
    │   │                          GetAmountRangeFilters · GetCreditProductNames
    │   │                          SubmitCreditApplication
    │   ├── mappers/               CreditProductMapper · CreditApplicationMapper
    │   ├── dto/                   CreditProductDTO
    │   └── shared/                Result (éxito/fallo explícito)
    │
    ├── infrastructure/            ◄── ADAPTADORES. Implementan los puertos
    │   ├── persistence/
    │   │   ├── datasources/       StaticCreditProductDataSource (los 6 productos)
    │   │   ├── factories/         CreditProductFactory (anticorruption layer)
    │   │   ├── InMemoryCreditProductRepository.js
    │   │   ├── StaticAmountRangeProvider.js
    │   │   └── LocalStorageCreditApplicationRepository.js
    │   ├── formatters/            IntlMoneyFormatter
    │   ├── routing/               HistoryRouter (History API)
    │   ├── notification/          ToastNotifier (DOM)
    │   ├── logging/               ConsoleLogger
    │   ├── time/                  SystemClock
    │   └── identity/              CryptoIdGenerator
    │
    ├── presentation/              ◄── MVC (vistas + controladores)
    │   ├── contracts/             IView · IController · IRouter
    │   ├── views/                 BaseView · CatalogView · SimulatorView
    │   │                          ApplicationView · NotFoundView
    │   │                          AccessRestrictedView
    │   ├── controllers/           BaseController · CatalogController
    │   │                          SimulatorController · ApplicationController
    │   │                          NotFoundController
    │   ├── components/            NavbarComponent · FooterComponent
    │   │                          ProductCardComponent · AlertComponent
    │   ├── decorators/            DocumentTitleController (Open/Closed)
    │   └── shared/                Html (escapado) · UrlBuilder · ViewRenderer
    │
    └── config/                    ◄── COMPOSITION ROOT
        ├── AppConfig.js           Locale, moneda, log, basePath, timeouts
        ├── routes.js              Tabla de rutas (constantes puras)
        ├── Container.js           Contenedor DI (singletons perezosos)
        └── dependencies.js        Cableado completo del grafo
```

---

## 4. Arquitectura

### 4.1 Hexagonal (puertos y adaptadores)

```
                     ┌──────────────────────────────┐
   ADAPTADORES DE    │                              │   ADAPTADORES DE
     ENTRADA         │          DOMINIO             │      SALIDA
   (driving)         │   entidades · value objects  │     (driven)
                     │   servicios · criterios      │
 HistoryRouter ──┐   │                              │   ┌── InMemoryCreditProductRepository
 Controladores ──┤──►│   ┌──────────────────────┐   │◄──┤── StaticAmountRangeProvider
 Vistas        ──┘   │   │     APLICACIÓN       │   │   ├── LocalStorageCreditApplication…
                     │   │   (casos de uso)     │   │   ├── IntlMoneyFormatter
                     │   └──────────────────────┘   │   ├── SystemClock
                     │                              │   ├── CryptoIdGenerator
                     └──────────────────────────────┘   ├── ConsoleLogger
                                                        └── ToastNotifier
```

Cada flecha que sale del hexágono pasa por un **puerto** declarado en
`domain/contracts/` o `application/contracts/`. El núcleo nunca importa un
adaptador; es el `Composition Root` (`config/dependencies.js`) el que los une.

### 4.2 Regla de dependencia (Clean Architecture)

```
presentation ──► application ──► domain ◄── infrastructure
     └───────────────────────────────────────────┘
                (solo vía config/dependencies.js)
```

Verificable a ojo con un `grep`: ningún archivo de `domain/` importa nada de
`application/`, `infrastructure/` o `presentation/`.

### 4.3 MVC en la presentación

- **Modelo** — no vive en la vista: son los DTOs que producen los casos de uso
  (`CreditProductDTO`). Las entidades del dominio nunca llegan a la vista, así
  que la vista no puede ejecutar reglas de negocio.
- **Vista** — `BaseView` + subclases. Funciones de `viewModel → HTML`, más un
  gancho `afterRender` que traduce eventos del DOM a **intenciones**
  (`onSearch`, `onSubmit`, `onClear`). No consultan datos ni deciden navegación.
- **Controlador** — `BaseController` + subclases. Guardan el estado de UI
  (texto buscado, errores del formulario), invocan **casos de uso** y montan la
  vista. Nunca importan repositorios ni entidades.

### 4.4 Interfaces / contratos en JavaScript

JavaScript no tiene `interface`, así que se implementó con
`domain/contracts/Contract.js`:

```js
export const ILogger = defineContract("ILogger", [
  "debug",
  "info",
  "warn",
  "error",
]);

class ConsoleLogger extends ILogger {
  /* ...implementa los 4... */
}

assertImplements(new ConsoleLogger(), ILogger); // falla en el arranque si no
```

- Los métodos no implementados lanzan `NotImplementedError` al invocarse.
- `assertImplements()` compara los métodos de la instancia con los del contrato
  y lanza `ContractViolationError` con la lista exacta de los que faltan.
- `Container.eagerResolveAll()` construye **todo** el grafo al arrancar, de modo
  que una violación de contrato aparece al cargar la página y no a mitad de una
  navegación del usuario.

Contratos declarados: `ICreditProductRepository`,
`ICreditApplicationRepository`, `IAmountRangeProvider`, `IMoneyFormatter`,
`IClock`, `IIdGenerator`, `IUseCase`, `ILogger`, `INotifier`, `IView`,
`IController`, `IRouter`.

### 4.5 SOLID, archivo por archivo

| Principio                       | Dónde se ve                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S** Responsabilidad única     | Un caso de uso = un método `execute()`. `ViewRenderer` es el único módulo que escribe `innerHTML`. `CreditProductFactory` solo traduce datos crudos.                                                                           |
| **O** Abierto/cerrado           | `DocumentTitleController` añade el título del documento a **cualquier** controlador sin tocarlo. Añadir un producto = una entrada en el datasource. Añadir un campo al formulario = una entrada en `ApplicationView#sections`. |
| **L** Sustitución de Liskov     | `InMemoryCreditProductRepository` devuelve promesas aunque sea sincrónico, para que un adaptador HTTP lo sustituya sin cambiar a los consumidores. `assertImplements` verifica la sustituibilidad al arrancar.                 |
| **I** Segregación de interfaces | Contratos pequeños: `IClock` tiene 2 métodos, `IIdGenerator` 1, `IMoneyFormatter` 2. Nadie depende de métodos que no usa.                                                                                                      |
| **D** Inversión de dependencias | Todo entra por constructor. El único archivo con `new` de clases concretas es `config/dependencies.js`. El dominio define los puertos; la infraestructura los implementa.                                                      |

### 4.6 Otros patrones aplicados

- **Value Object** — `Money`, `Term`, `InterestRate`, `AmountRange`,
  `ProductTheme`, `Applicant`, `RequestedCredit`, `EmploymentInfo`:
  inmutables (`Object.freeze`) y auto-validados en el constructor
  (_always-valid domain model_).
- **Specification / Criteria** — `ProductSearchCriteria.isSatisfiedBy(product)`:
  el mismo criterio filtra hoy en memoria y mañana se traduce a un query HTTP.
- **Repository** — acceso a datos detrás de un puerto del dominio.
- **Factory / Anticorruption Layer** — `CreditProductFactory` aísla al dominio
  del formato del proveedor (`montoMin` → `AmountRange`).
- **Template Method** — `BaseView.template()`, `BaseController.handle()`.
- **Decorator** — `DocumentTitleController`.
- **Result** — éxito/fallo explícito en lugar de excepciones como flujo de
  control entre capas.
- **DI Container** — singletons perezosos, con detección de ciclos.

---

## 5. Decisiones técnicas

**Escapado por defecto.** `presentation/shared/Html.js` expone una etiqueta de
template literal que escapa **todo** valor interpolado; insertar marcado ya
construido exige envolverlo en `raw()` de forma explícita. `ToastNotifier` usa
`textContent`, nunca `innerHTML`. Ningún dato del formulario llega al DOM sin
escapar.

**Sin fugas de listeners.** `BaseView.on()` registra cada listener y
`destroy()` los quita todos. El router llama a `dispose()` del controlador
saliente en cada cambio de ruta.

**El foco sobrevive al re-render.** El simulador re-pinta la vista completa en
cada tecla; el controlador indica qué campo estaba activo (`focusField`) y la
vista restaura foco y cursor.

**CSS sin utilidades atómicas.** El original usaba Tailwind (70 KB de CSS
generado). Aquí hay ~1 100 líneas de CSS semántico con la paleta exacta en
variables (`--color-blue-700: #1d4ed8`, etc.), organizado en siete archivos que
se cargan en orden de especificidad creciente.

**Sin build.** Módulos ES nativos. No hay `node_modules`, ni bundler, ni
transpilador. El navegador carga `src/main.js` y este importa el resto.

---

## 6. Verificación realizada

Las tres suites viven en `tests/` y se ejecutan con Node — **146 aserciones**,
todas en verde. Detalle completo en
[`docs/19-pruebas-y-verificacion.md`](./docs/19-pruebas-y-verificacion.md).

```bash
node tests/01-domain-application.mjs     # núcleo, sin DOM, sin dependencias
node tests/02-presentation-render.mjs    # vistas como strings, sin DOM

npm install jsdom --no-save              # una sola vez
node tests/03-boot-jsdom.mjs             # sistema completo en un DOM real
```

Qué cubre cada una:

- **Dominio + aplicación** — catálogo de 6 productos, formato monetario
  `$ 1.000.000`, normalización sin acentos, búsqueda por texto, filtro por los
  5 rangos, formulario vacío → 11 errores de campo, solicitud válida → radicado
  `CS-XXXXXXXX` + cuota estimada, monto fuera de rango → rechazado por
  `CreditApplicationPolicy`. **Todo OK.**
- **Presentación** — HTML balanceado en las 5 vistas, textos y placeholders
  literales, variante compacta del simulador sin requisitos ni "Ver detalles",
  `<script>` en un campo → escapado, `href` con prefijo de despliegue,
  `ContractViolationError` ante un controlador incompleto, detección de
  dependencia circular en el contenedor. **Todo OK.**
- **Arranque real en DOM (jsdom, sobre el `index.html` de verdad)** — el grafo
  completo se resuelve (32 dependencias), `basePath` se autodetecta como
  `/crediSmart/`, el catálogo pinta 6 tarjetas, el título del documento cambia
  por ruta, un clic en un enlace navega sin recarga, la búsqueda en vivo filtra
  a 1 resultado conservando el foco en el input, el filtro por rango deja 3,
  "Limpiar" restaura 5, el formulario vacío marca 11 campos inválidos y muestra
  el toast de error, el envío válido radica la solicitud (`CS-XXXXXXXX`), la
  persiste en `localStorage` y muestra el toast de éxito, una ruta inexistente
  pinta el 404 con la ruta pedida, y el regreso a `/` restaura el hero.
  **Todo OK.**

---

## 7. Cómo extender

| Quiero…                             | Toco…                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cambiar datos estáticos por una API | `dependencies.js`: registrar un `HttpCreditProductRepository` que implemente `ICreditProductRepository`. Nada más. |
| Añadir un producto                  | Una entrada en `STATIC_CREDIT_PRODUCTS`. Aparece en catálogo, simulador y en el `<select>` del formulario.         |
| Añadir una paleta de color          | `THEME_PALETTES` + una clase `.theme-*` en `02-tokens.css`.                                                        |
| Añadir una página                   | Vista + controlador + una fila en `ROUTE_TABLE` + su registro en `dependencies.js`.                                |
| Añadir un campo al formulario       | Una entrada en `ApplicationView#sections` y su validación en el value object correspondiente.                      |
| Cambiar de moneda o locale          | `AppConfig.locale` / `AppConfig.currency`.                                                                         |
| Enviar avisos por otro canal        | Un adaptador nuevo de `INotifier`.                                                                                 |

Cada fila tiene su receta paso a paso con el código completo en
[`docs/18-guia-de-extension.md`](./docs/18-guia-de-extension.md).

---

## 8. Documentación

```
docs/
├── master.md                                  Índice maestro + índice alfabético
├── 01-vision-general.md                       Qué es, qué se replicó, mapa, ejecución
├── 02-arquitectura-hexagonal.md               Puertos y adaptadores
├── 03-clean-architecture-capas.md             Capas y regla de dependencia
├── 04-mvc-presentacion.md                     MVC estricto
├── 05-principios-solid.md                     Los 5, con el código real
├── 06-contratos-e-interfaces.md               Los 12 contratos y su verificación
├── 07-entidades.md                            CreditProduct · CreditApplication
├── 08-value-objects.md                        Los 8 value objects
├── 09-dominio-servicios-criterios-errores.md  Policy · Specification · errores
├── 10-casos-de-uso-y-dtos.md                  Los 5 casos de uso · Result · mappers
├── 11-adaptadores-de-infraestructura.md       Los 10 adaptadores
├── 12-vistas-controladores-componentes.md     Referencia de presentación
├── 13-inyeccion-de-dependencias.md            Container · Composition Root · grafo
├── 14-enrutado-y-urls.md                      HistoryRouter · UrlBuilder · .htaccess
├── 15-sistema-de-estilos.md                   Tokens · cascada · Tailwind → CSS
├── 16-catalogo-de-patrones.md                 Los 14 patrones aplicados
├── 17-flujos-end-to-end.md                    Diagramas de secuencia
├── 18-guia-de-extension.md                    10 recetas paso a paso
├── 19-pruebas-y-verificacion.md               Las 3 suites
└── 20-glosario-y-convenciones.md              Vocabulario y convenciones
```
