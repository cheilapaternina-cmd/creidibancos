# CreditSmart — Documentación Maestra

> Índice único de toda la documentación del proyecto.
> Reconstrucción de `sweet-smart-credit-path.base44.app` en HTML + CSS +
> JavaScript vanilla, con **arquitectura hexagonal**, **Clean Architecture**,
> **MVC** en presentación, **SOLID** e **interfaces declaradas como contratos**.

| Dato | Valor |
|---|---|
| Ubicación | `C:\laragon\www\crediSmart` |
| Stack | HTML5 · CSS3 plano · JavaScript ES2022 (módulos ES nativos) |
| Dependencias de runtime | **cero** — no hay `node_modules`, ni bundler, ni transpilador |
| Capas | `domain` · `application` · `infrastructure` · `presentation` (+ `config`) |
| Archivos JS | 73 (5 327 líneas) — `domain` 23 · `presentation` 22 · `application` 12 · `infrastructure` 11 · `config` 4 · `main.js` 1 |
| Archivos CSS | 7 (1 466 líneas, cascada explícita) |
| Contratos (interfaces) | 12 |
| Casos de uso | 5 |
| Entidades | 2 · Value objects: 8 |
| Productos del catálogo | 6 (5 replicados del original + `Crédito de Libranza`) |
| Paletas de tema | 6 — `blue` · `emerald` · `violet` · `amber` · `rose` · `teal` |
| Adaptadores | 10 |
| Dependencias en el contenedor | 32 |
| Rutas | `/` · `/simulador` · `/solicitar` · `*` (404) |

---

## 1. Cómo leer esta documentación

Tres itinerarios según para qué vengas:

### Itinerario A — Entender el diseño (lectura conceptual, ~40 min)

```
01 Visión general
   ↓
02 Arquitectura hexagonal      ¿qué es un puerto? ¿un adaptador?
   ↓
03 Clean Architecture / capas  ¿quién puede importar a quién?
   ↓
04 MVC en presentación         ¿dónde está el modelo, la vista, el controlador?
   ↓
05 Principios SOLID            los 5, con el código real del proyecto
   ↓
16 Catálogo de patrones        los 14 patrones aplicados, y por qué
```

### Itinerario B — Tocar código (lectura de referencia)

```
06 Contratos e interfaces      cómo se declaran interfaces en JavaScript
07 Entidades                   CreditProduct · CreditApplication
08 Value objects               Money · Term · AmountRange · …
09 Servicios, criterios, errores
10 Casos de uso y DTOs
11 Adaptadores de infraestructura
12 Vistas, controladores y componentes
13 Inyección de dependencias
14 Enrutado y URLs
15 Sistema de estilos
```

### Itinerario C — Hacer un cambio ya (lectura operativa)

```
18 Guía de extensión           recetas paso a paso
17 Flujos end-to-end           qué pasa exactamente en cada interacción
19 Pruebas y verificación      cómo comprobar que no rompiste nada
```

---

## 2. Directorio de documentos

### Fundamentos del diseño

| # | Documento | Qué responde |
|---|---|---|
| 01 | [Visión general](./01-vision-general.md) | Qué es el proyecto, qué se replicó del original, mapa completo del sistema, cómo ejecutarlo |
| 02 | [Arquitectura hexagonal](./02-arquitectura-hexagonal.md) | Puertos y adaptadores, driving vs. driven, el diagrama del hexágono, los 12 puertos del proyecto |
| 03 | [Clean Architecture y capas](./03-clean-architecture-capas.md) | Las 4 capas + config, la regla de dependencia, cómo se verifica con `grep`, flujo de control vs. flujo de dependencias |
| 04 | [MVC en la presentación](./04-mvc-presentacion.md) | Dónde vive el Modelo (no en la vista), qué puede y no puede hacer una Vista, qué puede y no puede hacer un Controlador |
| 05 | [Principios SOLID](./05-principios-solid.md) | Los 5 principios, cada uno con el archivo y el fragmento real que lo materializa |

### Contratos

| # | Documento | Qué responde |
|---|---|---|
| 06 | [Contratos e interfaces](./06-contratos-e-interfaces.md) | Cómo se simulan `interface` en JavaScript, `defineContract`, `assertImplements`, catálogo de los 12 contratos con su firma completa |

### Dominio (el núcleo)

| # | Documento | Qué responde |
|---|---|---|
| 07 | [Entidades](./07-entidades.md) | `CreditProduct` y `CreditApplication`: invariantes, identidad, comportamiento, máquina de estados |
| 08 | [Value objects](./08-value-objects.md) | Los 8 value objects, por qué son inmutables, por qué se auto-validan, aritmética de `Money`, solape de `AmountRange` |
| 09 | [Servicios, criterios y errores](./09-dominio-servicios-criterios-errores.md) | `CreditApplicationPolicy`, `ProductSearchCriteria` (Specification), jerarquía de los 4 errores de dominio |

### Aplicación (casos de uso)

| # | Documento | Qué responde |
|---|---|---|
| 10 | [Casos de uso y DTOs](./10-casos-de-uso-y-dtos.md) | Los 5 casos de uso, el tipo `Result`, los mappers, por qué la vista recibe DTOs y no entidades |

### Infraestructura y presentación

| # | Documento | Qué responde |
|---|---|---|
| 11 | [Adaptadores de infraestructura](./11-adaptadores-de-infraestructura.md) | Los 10 adaptadores, el datasource estático, la anticorruption layer, cómo sustituir cualquiera por uno HTTP |
| 12 | [Vistas, controladores y componentes](./12-vistas-controladores-componentes.md) | `BaseView`, `BaseController`, las 6 vistas, los 4 componentes, el escapado por defecto, la gestión de listeners |
| 13 | [Inyección de dependencias](./13-inyeccion-de-dependencias.md) | El `Container`, el Composition Root, el grafo completo de las 32 dependencias, detección de ciclos |
| 14 | [Enrutado y URLs](./14-enrutado-y-urls.md) | `HistoryRouter`, `UrlBuilder`, prefijo de despliegue autodetectado, delegación de clics, reescritura en Apache/Nginx |
| 15 | [Sistema de estilos](./15-sistema-de-estilos.md) | Los 7 archivos CSS en cascada, los design tokens, el mapeo Tailwind → CSS plano, los temas de producto |

### Síntesis y operación

| # | Documento | Qué responde |
|---|---|---|
| 16 | [Catálogo de patrones](./16-catalogo-de-patrones.md) | Los 14 patrones de diseño usados (+4 menores): qué problema resuelve cada uno, dónde está, y qué pasaría sin él |
| 17 | [Flujos end-to-end](./17-flujos-end-to-end.md) | Diagramas de secuencia: arranque, cargar catálogo, filtrar en el simulador, radicar una solicitud, 404 |
| 18 | [Guía de extensión](./18-guia-de-extension.md) | 10 recetas paso a paso: añadir producto, campo, página, adaptador HTTP, contrato nuevo… |
| 19 | [Pruebas y verificación](./19-pruebas-y-verificacion.md) | Las 3 suites ejecutadas, qué cubre cada una, cómo re-ejecutarlas, qué verificar antes de dar por bueno un cambio |
| 20 | [Glosario y convenciones](./20-glosario-y-convenciones.md) | Vocabulario del proyecto, convenciones de nombres, de archivos, de comentarios y de commits |

---

## 3. Mapa de una decisión: "¿dónde pongo este código?"

Árbol de decisión rápido. La respuesta larga está en
[03 — Clean Architecture y capas](./03-clean-architecture-capas.md).

```
¿Es una regla que seguiría siendo verdad sin navegador, sin base de datos
 y sin pantalla?
 ├─ SÍ, y habla de UN solo concepto ................. domain/entities
 │                                    o domain/valueobjects (si es inmutable
 │                                      y se compara por valor)
 ├─ SÍ, y cruza DOS o más conceptos ................. domain/services
 └─ SÍ, y es un criterio de selección ............... domain/criteria

¿Es "el sistema debe poder hacer X" (un caso de uso completo)?
 └─ SÍ .............................................. application/usecases

¿Habla de una tecnología concreta (fetch, localStorage, Intl, DOM, crypto)?
 └─ SÍ .............................................. infrastructure/…
     y debe implementar un puerto ya declarado en domain/ o application/

¿Pinta píxeles o reacciona a un evento del usuario?
 └─ SÍ .............................................. presentation/views
                                                   o presentation/controllers

¿Es un `new` de una clase concreta que une capas?
 └─ SÍ ......... config/dependencies.js  ← y SOLO ahí
```

---

## 4. Reglas no negociables

Las cinco reglas que definen esta arquitectura. Romper cualquiera invalida el
diseño, no solo "empeora el estilo".

1. **`src/domain/` no importa nada de fuera de `src/domain/`.**
   Ni aplicación, ni infraestructura, ni presentación, ni config.
2. **`src/application/` solo importa de `src/domain/` y de sí misma.**
3. **`src/presentation/` nunca importa `src/infrastructure/`.**
   Si necesita un dato de infraestructura, lo recibe **inyectado**.
4. **El único archivo con `new` de clases concretas de varias capas es
   `src/config/dependencies.js`** (el Composition Root).
5. **Toda dependencia entra por el constructor.** No hay `import` de
   singletons, ni estado global mutable, ni Service Locator dentro de las
   clases.

Verificación de las tres primeras:

```bash
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/
grep -rn "from '\.\./\.\./\(infrastructure\|presentation\|config\)"              src/application/
grep -rn "infrastructure"                                                        src/presentation/
```

Las tres deben devolver **cero resultados**. Estado actual: **cero**.

---

## 5. Skill de Claude Code asociado

El patrón de diseño de este proyecto está empaquetado como skill reutilizable:

```
.claude/skills/arquitectura-hexagonal-vanilla/
├── SKILL.md                        Instrucciones y reglas del patrón
└── references/
    ├── plantillas.md               Plantillas de código por tipo de artefacto
    ├── checklist-revision.md       Checklist de revisión por capa
    └── anti-patrones.md            Los 14 errores que rompen la arquitectura
```

Se invoca con `/arquitectura-hexagonal-vanilla` o se activa solo cuando la
tarea consiste en crear o extender código en esta arquitectura.
Detalles en [18 — Guía de extensión](./18-guia-de-extension.md).

---

## 6. Índice alfabético de artefactos

Dónde está declarado cada nombre propio del proyecto.

| Artefacto | Tipo | Archivo | Doc |
|---|---|---|---|
| `AlertComponent` | Componente | `src/presentation/components/AlertComponent.js` | [12](./12-vistas-controladores-componentes.md) |
| `AmountRange` | Value object | `src/domain/valueobjects/AmountRange.js` | [08](./08-value-objects.md) |
| `APPLICATION_STATUS` | Enum | `src/domain/entities/CreditApplication.js` | [07](./07-entidades.md) |
| `ApplicationController` | Controlador | `src/presentation/controllers/ApplicationController.js` | [12](./12-vistas-controladores-componentes.md) |
| `ApplicationView` | Vista | `src/presentation/views/ApplicationView.js` | [12](./12-vistas-controladores-componentes.md) |
| `Applicant` | Value object | `src/domain/valueobjects/Applicant.js` | [08](./08-value-objects.md) |
| `AppConfig` | Configuración | `src/config/AppConfig.js` | [13](./13-inyeccion-de-dependencias.md) |
| `assertImplements` | Función | `src/domain/contracts/Contract.js` | [06](./06-contratos-e-interfaces.md) |
| `BaseController` | Clase base | `src/presentation/controllers/BaseController.js` | [12](./12-vistas-controladores-componentes.md) |
| `BaseView` | Clase base | `src/presentation/views/BaseView.js` | [12](./12-vistas-controladores-componentes.md) |
| `buildContainer` | Composition Root | `src/config/dependencies.js` | [13](./13-inyeccion-de-dependencias.md) |
| `CatalogController` | Controlador | `src/presentation/controllers/CatalogController.js` | [12](./12-vistas-controladores-componentes.md) |
| `CatalogView` | Vista | `src/presentation/views/CatalogView.js` | [12](./12-vistas-controladores-componentes.md) |
| `ConsoleLogger` | Adaptador | `src/infrastructure/logging/ConsoleLogger.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `Container` | Contenedor DI | `src/config/Container.js` | [13](./13-inyeccion-de-dependencias.md) |
| `Contract.js` | Fábrica de interfaces | `src/domain/contracts/Contract.js` | [06](./06-contratos-e-interfaces.md) |
| `ContractViolationError` | Error | `src/domain/errors/ContractViolationError.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `CreditApplication` | Entidad | `src/domain/entities/CreditApplication.js` | [07](./07-entidades.md) |
| `CreditApplicationMapper` | Mapper | `src/application/mappers/CreditApplicationMapper.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `CreditApplicationPolicy` | Servicio de dominio | `src/domain/services/CreditApplicationPolicy.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `CreditProduct` | Entidad | `src/domain/entities/CreditProduct.js` | [07](./07-entidades.md) |
| `CreditProductDTO` | DTO | `src/application/dto/CreditProductDTO.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `CreditProductFactory` | Factory / ACL | `src/infrastructure/persistence/factories/CreditProductFactory.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `CreditProductMapper` | Mapper | `src/application/mappers/CreditProductMapper.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `CryptoIdGenerator` | Adaptador | `src/infrastructure/identity/CryptoIdGenerator.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `defineContract` | Función | `src/domain/contracts/Contract.js` | [06](./06-contratos-e-interfaces.md) |
| `DocumentTitleController` | Decorador | `src/presentation/decorators/DocumentTitleController.js` | [16](./16-catalogo-de-patrones.md) |
| `DomainError` | Error base | `src/domain/errors/DomainError.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `EmploymentInfo` | Value object | `src/domain/valueobjects/EmploymentInfo.js` | [08](./08-value-objects.md) |
| `FooterComponent` | Componente | `src/presentation/components/FooterComponent.js` | [12](./12-vistas-controladores-componentes.md) |
| `GetAmountRangeFiltersUseCase` | Caso de uso | `src/application/usecases/GetAmountRangeFiltersUseCase.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `GetCreditProductNamesUseCase` | Caso de uso | `src/application/usecases/GetCreditProductNamesUseCase.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `HistoryRouter` | Adaptador | `src/infrastructure/routing/HistoryRouter.js` | [14](./14-enrutado-y-urls.md) |
| `Html` (`html`, `raw`, `escapeHtml`) | Utilidad | `src/presentation/shared/Html.js` | [12](./12-vistas-controladores-componentes.md) |
| `IAmountRangeProvider` | Puerto | `src/domain/contracts/IAmountRangeProvider.js` | [06](./06-contratos-e-interfaces.md) |
| `IClock` | Puerto | `src/domain/contracts/IClock.js` | [06](./06-contratos-e-interfaces.md) |
| `IController` | Puerto | `src/presentation/contracts/IController.js` | [06](./06-contratos-e-interfaces.md) |
| `ICreditApplicationRepository` | Puerto | `src/domain/contracts/ICreditApplicationRepository.js` | [06](./06-contratos-e-interfaces.md) |
| `ICreditProductRepository` | Puerto | `src/domain/contracts/ICreditProductRepository.js` | [06](./06-contratos-e-interfaces.md) |
| `IIdGenerator` | Puerto | `src/domain/contracts/IIdGenerator.js` | [06](./06-contratos-e-interfaces.md) |
| `ILogger` | Puerto | `src/application/contracts/ILogger.js` | [06](./06-contratos-e-interfaces.md) |
| `IMoneyFormatter` | Puerto | `src/domain/contracts/IMoneyFormatter.js` | [06](./06-contratos-e-interfaces.md) |
| `INotifier` | Puerto | `src/application/contracts/INotifier.js` | [06](./06-contratos-e-interfaces.md) |
| `InMemoryCreditProductRepository` | Adaptador | `src/infrastructure/persistence/InMemoryCreditProductRepository.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `InterestRate` | Value object | `src/domain/valueobjects/InterestRate.js` | [08](./08-value-objects.md) |
| `IntlMoneyFormatter` | Adaptador | `src/infrastructure/formatters/IntlMoneyFormatter.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `IRouter` | Puerto | `src/presentation/contracts/IRouter.js` | [06](./06-contratos-e-interfaces.md) |
| `IUseCase` | Puerto | `src/application/contracts/IUseCase.js` | [06](./06-contratos-e-interfaces.md) |
| `IView` | Puerto | `src/presentation/contracts/IView.js` | [06](./06-contratos-e-interfaces.md) |
| `ListCreditProductsUseCase` | Caso de uso | `src/application/usecases/ListCreditProductsUseCase.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `LocalStorageCreditApplicationRepository` | Adaptador | `src/infrastructure/persistence/LocalStorageCreditApplicationRepository.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `Money` | Value object | `src/domain/valueobjects/Money.js` | [08](./08-value-objects.md) |
| `NavbarComponent` | Componente | `src/presentation/components/NavbarComponent.js` | [12](./12-vistas-controladores-componentes.md) |
| `NotFoundController` | Controlador | `src/presentation/controllers/NotFoundController.js` | [12](./12-vistas-controladores-componentes.md) |
| `NotFoundView` | Vista | `src/presentation/views/NotFoundView.js` | [12](./12-vistas-controladores-componentes.md) |
| `NotImplementedError` | Error | `src/domain/errors/NotImplementedError.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `ProductCardComponent` | Componente | `src/presentation/components/ProductCardComponent.js` | [12](./12-vistas-controladores-componentes.md) |
| `ProductSearchCriteria` | Specification | `src/domain/criteria/ProductSearchCriteria.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `ProductTheme` | Value object | `src/domain/valueobjects/ProductTheme.js` | [08](./08-value-objects.md) |
| `RequestedCredit` | Value object | `src/domain/valueobjects/RequestedCredit.js` | [08](./08-value-objects.md) |
| `Result` | Tipo de retorno | `src/application/shared/Result.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `ROUTES` / `ROUTE_TABLE` | Configuración | `src/config/routes.js` | [14](./14-enrutado-y-urls.md) |
| `SearchCreditProductsUseCase` | Caso de uso | `src/application/usecases/SearchCreditProductsUseCase.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `SimulatorController` | Controlador | `src/presentation/controllers/SimulatorController.js` | [12](./12-vistas-controladores-componentes.md) |
| `SimulatorView` | Vista | `src/presentation/views/SimulatorView.js` | [12](./12-vistas-controladores-componentes.md) |
| `StaticAmountRangeProvider` | Adaptador | `src/infrastructure/persistence/StaticAmountRangeProvider.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `StaticCreditProductDataSource` | Datasource | `src/infrastructure/persistence/datasources/StaticCreditProductDataSource.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `SubmitCreditApplicationUseCase` | Caso de uso | `src/application/usecases/SubmitCreditApplicationUseCase.js` | [10](./10-casos-de-uso-y-dtos.md) |
| `SystemClock` | Adaptador | `src/infrastructure/time/SystemClock.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `Term` | Value object | `src/domain/valueobjects/Term.js` | [08](./08-value-objects.md) |
| `ToastNotifier` | Adaptador | `src/infrastructure/notification/ToastNotifier.js` | [11](./11-adaptadores-de-infraestructura.md) |
| `UrlBuilder` | Utilidad | `src/presentation/shared/UrlBuilder.js` | [14](./14-enrutado-y-urls.md) |
| `ValidationError` | Error | `src/domain/errors/ValidationError.js` | [09](./09-dominio-servicios-criterios-errores.md) |
| `ViewRenderer` | Servicio de UI | `src/presentation/shared/ViewRenderer.js` | [12](./12-vistas-controladores-componentes.md) |

---

## 7. Documentos relacionados fuera de `docs/`

| Archivo | Contenido |
|---|---|
| `../README.md` | Puesta en marcha, qué se replicó del sitio original, resumen de arquitectura |
| `../.htaccess` | Reescritura SPA para Apache/Laragon, MIME, caché, cabeceras |
| `../src/config/AppConfig.js` | Todos los valores configurables del sistema |
| `../.claude/skills/arquitectura-hexagonal-vanilla/SKILL.md` | El patrón, empaquetado como skill |
| `./iudigital_doc/CreditSmart_Arquitectura_de_la_Solucion.docx` | Documento de arquitectura para la actividad de la IU Digital — **copia de trabajo que se edita a mano** |
| `./iudigital_doc/generador/` | Scripts que generan ese documento y sus 8 gráficos. Escriben siempre en `..._generado.docx`, nunca sobre la copia editada. Ver su [`README.md`](./iudigital_doc/generador/README.md) |

---

## 8. Historial de cambios

Cambios sobre la reconstrucción inicial, con el porqué y lo que costaron.

### Sexto producto del catálogo — `Crédito de Libranza`

**Motivo**: la rúbrica de la actividad concede los puntos de «Contenido de las
páginas» con un mínimo de **6 productos** y la reconstrucción replicaba los 5 del
sitio original.

**Producto**: `id: 6` · $1 000 000 – $80 000 000 · 13,5 % E.A. · 96 meses · 🧾 ·
paleta `teal`. Descuento directo de nómina o pensión; es la segunda tasa más baja
del portafolio, entre el educativo (10,5 %) y el vehículo (14,2 %).

| Archivo | Cambio |
|---|---|
| `infrastructure/persistence/datasources/StaticCreditProductDataSource.js` | Una entrada nueva |
| `domain/valueobjects/ProductTheme.js` | `'teal'` en `THEME_PALETTES` — las cinco paletas del original ya estaban en uso |
| `assets/css/02-tokens.css` | `--color-teal-100/500/600/700` y el bloque `.theme-teal` |
| `tests/01`, `tests/02`, `tests/03` | Conteos esperados: 6 productos, 4 resultados en el filtro «Hasta $5.000.000», 7 opciones en el `<select>` |

**Lo que NO cambió**: ninguna vista, controlador, caso de uso ni componente. El
catálogo, el simulador y el `<select>` del formulario mostraron el producto nuevo
porque los tres derivan del mismo datasource. Es la [Receta
1](./18-guia-de-extension.md) ejecutada de verdad, y la mejor evidencia empírica
de la regla de dependencia.

**Detalle que conviene recordar**: el primer intento declaró `palette: 'teal'` sin
añadirla a `THEME_PALETTES`; `ProductTheme` rechazó el producto al construir el
catálogo, con la lista de paletas válidas en el mensaje. El fallo temprano
funcionó como está diseñado.

### Documento de arquitectura para la actividad

Se añadió `iudigital_doc/`: el documento de arquitectura (44 páginas, 21 figuras,
32 tablas) y los scripts que lo generan, con el patrón de diseño del documento
guía de la institución. El generador escribe en `..._generado.docx` y nunca sobre
la copia que se edita a mano; el porqué de esa regla está en el
[README del generador](./iudigital_doc/generador/README.md).
