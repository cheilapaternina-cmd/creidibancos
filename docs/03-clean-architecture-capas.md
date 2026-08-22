[← Volver al índice maestro](./master.md)

# 03 — Clean Architecture y capas

## 3.1 La regla de dependencia

Clean Architecture (Robert C. Martin) se reduce a **una sola regla**:

> Las dependencias del código fuente solo pueden apuntar **hacia dentro**, hacia
> políticas de nivel más alto.

"Nivel más alto" significa *más cerca del negocio, más lejos de la tecnología*.
En este proyecto:

```
      ┌──────────────────────────────────────────────────────────┐
      │  presentation/          infrastructure/                  │  ← nivel bajo
      │  (vistas, controladores) (repos, DOM, Intl, History API) │    (detalles)
      │            │                        │                    │
      │            └────────┬───────────────┘                    │
      │                     ▼                                    │
      │              application/                                │
      │              (casos de uso)                              │
      │                     │                                    │
      │                     ▼                                    │
      │                domain/                                   │  ← nivel alto
      │         (entidades, VOs, reglas)                         │    (políticas)
      └──────────────────────────────────────────────────────────┘

      config/  ← el único que puede mirar hacia todos lados
```

## 3.2 Matriz de importaciones permitidas

Fila = quién importa. Columna = qué importa. Esta tabla **es** la arquitectura.

| ↓ importa a → | `domain` | `application` | `infrastructure` | `presentation` | `config` |
|---|---|---|---|---|---|
| **`domain`** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`application`** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`infrastructure`** | ✅ | ✅ *(solo puertos)* | ✅ | ❌ | ❌ |
| **`presentation`** | ✅ *(solo puertos y tipos)* | ✅ | ❌ | ✅ | ✅ *(solo `routes.js`)* |
| **`config`** | ✅ | ✅ | ✅ | ✅ | ✅ |

Notas sobre las casillas menos obvias:

- **`infrastructure` → `application`**: permitido solo para importar puertos.
  `ConsoleLogger` importa `ILogger`; `ToastNotifier` importa `INotifier`. Nunca
  importa un caso de uso.
- **`presentation` → `domain`**: permitido solo para puertos y tipos.
  `NavbarComponent` no importa `CreditProduct`; los controladores reciben DTOs.
  `SimulatorController` sí recibe `IAmountRangeProvider` inyectado, porque
  necesita traducir un índice de `<select>` a un `AmountRange`.
- **`presentation` → `config`**: permitido solo para `routes.js`, que es un
  archivo de **constantes puras** sin imports. Así `NavbarComponent` conoce las
  rutas sin crear un ciclo.
- **`presentation` → `infrastructure`**: ❌ **prohibido siempre**. Este fue el
  único incumplimiento que apareció durante la construcción:
  `ApplicationController` importaba `STATIC_TERM_OPTIONS` del datasource. Se
  corrigió inyectando `termOptions` desde `dependencies.js`.

## 3.3 Verificación automática

Las tres reglas críticas se comprueban con `grep`. Ejecuta esto antes de dar por
bueno cualquier cambio:

```bash
cd C:/laragon/www/crediSmart

# 1. El dominio no importa nada de fuera del dominio
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/

# 2. La aplicación no importa infraestructura ni presentación ni config
grep -rn "from '\.\./\.\./\(infrastructure\|presentation\|config\)" src/application/

# 3. La presentación no importa infraestructura
grep -rn "infrastructure" src/presentation/
```

Las tres deben devolver **cero líneas**. Estado actual: cero, cero y cero.

## 3.4 Qué contiene cada capa

### `src/domain/` — 23 archivos

El núcleo. Contiene todo lo que seguiría siendo verdad **sin navegador, sin base
de datos y sin pantalla**.

```
domain/
├── contracts/       7 puertos + Contract.js (la fábrica de interfaces)
├── entities/        CreditProduct · CreditApplication
├── valueobjects/    Money · InterestRate · Term · AmountRange · ProductTheme
│                    Applicant · RequestedCredit · EmploymentInfo
├── criteria/        ProductSearchCriteria (patrón Specification)
├── services/        CreditApplicationPolicy · CreditSimulationService
└── errors/          DomainError · ValidationError
                     NotImplementedError · ContractViolationError
```

**Prohibido en esta capa**: `document`, `window`, `fetch`, `localStorage`,
`console`, `Date.now()` directo (se usa `IClock`), `crypto` directo (se usa
`IIdGenerator`), `Intl` directo (se usa `IMoneyFormatter`), cualquier `import`
que salga de `domain/`.

**Permitido**: `Math`, `Number`, `String`, `Object`, `Array`, `JSON`,
`Intl.NumberFormat` **solo** dentro de mensajes de error de negocio (ver
`CreditApplicationPolicy`, que usa `toLocaleString` para componer un mensaje).

### `src/application/` — 12 archivos

Los casos de uso: *"el sistema debe poder hacer X"*. Orquestan el dominio y los
puertos, pero no contienen reglas de negocio propias.

```
application/
├── contracts/   IUseCase · ILogger · INotifier
├── usecases/    ListCreditProducts · SearchCreditProducts
│                GetAmountRangeFilters · GetCreditProductNames
│                SubmitCreditApplication
├── mappers/     CreditProductMapper (entidad → DTO)
│                CreditApplicationMapper (entrada cruda → value objects)
├── dto/         CreditProductDTO
└── shared/      Result (éxito/fallo explícito)
```

Regla de oro para distinguir dominio de aplicación:

> Si la regla es *"un monto debe estar dentro del rango del producto"* → dominio.
> Si es *"para radicar una solicitud hay que validarla, aplicar la política,
> guardarla y registrar el evento"* → aplicación.

La primera es una **invariante**. La segunda es una **secuencia**.

### `src/infrastructure/` — 11 archivos

Los adaptadores. Todo lo que sabe de una tecnología concreta.

```
infrastructure/
├── persistence/
│   ├── datasources/  StaticCreditProductDataSource (los 6 productos, datos crudos)
│   ├── factories/    CreditProductFactory (anticorruption layer)
│   ├── InMemoryCreditProductRepository
│   ├── StaticAmountRangeProvider
│   └── LocalStorageCreditApplicationRepository
├── formatters/       IntlMoneyFormatter          (sabe de Intl)
├── routing/          HistoryRouter               (sabe de History API + DOM)
├── notification/     ToastNotifier               (sabe de DOM)
├── logging/          ConsoleLogger               (sabe de console)
├── time/             SystemClock                 (sabe de Date)
└── identity/         CryptoIdGenerator           (sabe de crypto)
```

**Cada archivo de esta capa implementa un puerto.** Si escribes un archivo aquí
que no `extends` un contrato, algo va mal — con dos excepciones legítimas:
`StaticCreditProductDataSource` (datos puros, sin comportamiento) y
`CreditProductFactory` (traductor sin estado).

### `src/presentation/` — 22 archivos

La interfaz. MVC completo, detallado en
[04 — MVC en la presentación](./04-mvc-presentacion.md).

```
presentation/
├── contracts/     IView · IController · IRouter
├── views/         BaseView + CatalogView · SimulatorView · ApplicationView
│                  NotFoundView · AccessRestrictedView
├── controllers/   BaseController + Catalog · Simulator · Application · NotFound
├── components/    NavbarComponent · FooterComponent
│                  ProductCardComponent · AlertComponent
├── decorators/    DocumentTitleController
└── shared/        Html (escapado) · UrlBuilder · ViewRenderer
```

### `src/config/` — 4 archivos

El Composition Root. La única capa que puede mirar hacia todas las demás.

```
config/
├── AppConfig.js      Locale, moneda, nivel de log, basePath, timeouts, selectores
├── routes.js         ROUTES · ROUTE_TABLE · FALLBACK_CONTROLLER (constantes puras)
├── Container.js      Contenedor DI: singletons perezosos + detección de ciclos
└── dependencies.js   buildContainer(): el grafo completo de 34 dependencias
```

## 3.5 Flujo de dependencias ≠ flujo de control

Confusión habitual. Las dependencias apuntan hacia dentro; la **ejecución**
atraviesa las capas en ambos sentidos.

Ejemplo real: cargar el catálogo en `/`.

```
FLUJO DE CONTROL (lo que ocurre en tiempo de ejecución)
────────────────────────────────────────────────────────
HistoryRouter                    (infraestructura)
   └─► CatalogController.handle()          (presentación)
        └─► ListCreditProductsUseCase.execute()      (aplicación)
             ├─► productRepository.findAll()   ← interfaz del DOMINIO
             │    └─► InMemoryCreditProductRepository  (infraestructura) ①
             │         └─► CreditProductFactory.fromRawList()
             │              └─► new CreditProduct(...)      (dominio)
             └─► CreditProductMapper.toDTO()          (aplicación)
                  └─► moneyFormatter.format()   ← interfaz del DOMINIO
                       └─► IntlMoneyFormatter          (infraestructura) ②
        └─► CatalogView.render(dto)              (presentación)
             └─► ViewRenderer.mount()  →  innerHTML

FLUJO DE DEPENDENCIAS (lo que se escribe en los `import`)
────────────────────────────────────────────────────────
ListCreditProductsUseCase  importa  ICreditProductRepository   (hacia dentro ✅)
InMemoryCreditProductRepo  importa  ICreditProductRepository   (hacia dentro ✅)
ListCreditProductsUseCase  NO importa InMemoryCreditProductRepository ✅
```

En ① y ② el control **sale** del núcleo hacia la infraestructura. Pero la
dependencia de código sigue apuntando hacia dentro, porque el núcleo invoca una
**interfaz que él mismo declaró**. Esa es exactamente la aportación del
Principio de Inversión de Dependencias.

## 3.6 Fronteras y qué las cruza

Cada frontera entre capas tiene un tipo de dato definido. Nunca cruzan entidades
hacia fuera de la aplicación.

```
   INFRAESTRUCTURA          DOMINIO           APLICACIÓN         PRESENTACIÓN
   ───────────────          ───────           ──────────         ────────────

   objeto crudo
   { montoMin: 5e6,
     nombre: '...' }
        │
        │ CreditProductFactory
        ▼
                        CreditProduct
                        (entidad, con
                         Money, Term…)
                              │
                              │ CreditProductMapper
                              ▼
                                            CreditProductDTO
                                            { minAmountLabel:
                                              '$ 5.000.000' }
                                                   │
                                                   │ envuelto en Result
                                                   ▼
                                                              viewModel
                                                              → HTML string
```

| Frontera | Qué la cruza | Traductor |
|---|---|---|
| datasource → dominio | Objeto crudo con claves en español | `CreditProductFactory` (anticorruption layer) |
| dominio → aplicación | Entidades y value objects | — (misma dirección permitida) |
| aplicación → presentación | `Result<DTO>` — objetos planos y congelados | `CreditProductMapper` |
| presentación → aplicación | Objetos planos del formulario (`Record<string,string>`) | `CreditApplicationMapper` |
| presentación → DOM | String de HTML escapado | `Html.html` + `ViewRenderer` |

**Por qué la vista recibe DTOs y no entidades**: si `CatalogView` recibiera un
`CreditProduct`, podría llamar a `product.admitsAmount(...)` desde la plantilla.
En ese momento la regla de negocio se estaría evaluando en la vista, y la
siguiente interfaz que se escriba tendrá que reimplementarla. El DTO es plano y
congelado (`Object.freeze`): no ofrece comportamiento que invocar.

## 3.7 Dónde poner código nuevo

```
¿Es una regla que seguiría siendo verdad sin navegador, sin BD y sin pantalla?
 ├─ SÍ, y habla de UN solo concepto ................ domain/entities
 │                                   o domain/valueobjects (inmutable, se
 │                                     compara por valor, no tiene identidad)
 ├─ SÍ, y cruza DOS o más conceptos ................ domain/services
 └─ SÍ, y es un criterio de selección .............. domain/criteria

¿Es "el sistema debe poder hacer X" (una secuencia completa)?
 └─ SÍ ............................................. application/usecases

¿Habla de una tecnología concreta (fetch, localStorage, Intl, DOM, crypto)?
 └─ SÍ ............................................. infrastructure/…
     …y debe implementar un puerto ya declarado. Si el puerto no existe,
     créalo PRIMERO en domain/contracts o application/contracts.

¿Pinta píxeles o reacciona a un evento del usuario?
 ├─ Pinta .......................................... presentation/views
 │                                                 o presentation/components
 └─ Decide y coordina .............................. presentation/controllers

¿Es un `new` de clases concretas de varias capas?
 └─ SÍ ............................ config/dependencies.js  ← y SOLO ahí
```

## 3.8 Coste de romper la regla

No es una cuestión estética. Ejemplos concretos de lo que se pierde:

| Si el dominio importara… | Se pierde |
|---|---|
| `document` | La suite de dominio deja de correr en Node. Probar una regla exige un navegador. |
| `fetch` | Cambiar de API obliga a tocar el dominio. La lógica se vuelve asíncrona sin motivo. |
| `Date.now()` | No puedes probar "solicitud creada el 1 de enero" de forma determinista. Por eso existe `IClock`. |
| Un caso de uso | Ciclo de importación entre capas; el dominio deja de ser reutilizable por separado. |
| `Intl` | El dominio queda atado a un locale del navegador. Por eso existe `IMoneyFormatter`. |

## 3.9 Siguiente lectura

- [04 — MVC en la presentación](./04-mvc-presentacion.md)
- [05 — Principios SOLID](./05-principios-solid.md)
- [13 — Inyección de dependencias](./13-inyeccion-de-dependencias.md)
