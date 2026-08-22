[← Volver al índice maestro](./master.md)

# 20 — Glosario y convenciones

## 20.1 Glosario de arquitectura

| Término | Definición | Ejemplo en el proyecto |
|---|---|---|
| **Adaptador** | Implementación concreta de un puerto, usando una tecnología | `IntlMoneyFormatter` implementa `IMoneyFormatter` |
| **Agregado** | Grupo de objetos de dominio tratado como una unidad, con una raíz que controla el acceso | `CreditApplication` + sus 3 value objects |
| **Always-valid domain model** | Un objeto que existe es válido; la validación está en el constructor | Los 10 value objects |
| **Anticorruption layer** | Frontera que impide que el formato de un sistema externo contamine el dominio | `CreditProductFactory` |
| **Caso de uso** | Una secuencia completa que responde a "el sistema debe poder hacer X" | `SubmitCreditApplicationUseCase` |
| **Composition Root** | El único lugar donde se construyen las clases concretas y se une el grafo | `config/dependencies.js` |
| **Contrato** | Interfaz explícita, verificable en ejecución | Los 12 archivos `I*.js` |
| **Copia defensiva** | Devolver una copia para que el consumidor no pueda mutar el estado interno | `[...this.#products]`, `new Date(...)` |
| **DTO** | Objeto plano de transferencia entre capas, sin comportamiento | `CreditProductDTO` |
| **Entidad** | Objeto de dominio con identidad propia y ciclo de vida | `CreditProduct`, `CreditApplication` |
| **Núcleo / hexágono** | El código que expresa el negocio, sin tecnología | `src/domain/` + `src/application/` |
| **Puerto** | Interfaz declarada por el núcleo con lo que necesita del exterior | `ICreditProductRepository` |
| **Puerto de entrada** (driving) | El exterior llama al núcleo | `IUseCase`, `IController`, `IRouter` |
| **Puerto de salida** (driven) | El núcleo llama al exterior | `ICreditProductRepository`, `IClock` |
| **Regla de dependencia** | Las importaciones solo apuntan hacia el núcleo | Verificada con `grep` |
| **Specification** | Objeto que encapsula un criterio: `isSatisfiedBy(candidato)` | `ProductSearchCriteria` |
| **Value object** | Objeto inmutable sin identidad, comparado por valor | `Money`, `Term`, `AmountRange`, `AmortizationPlan` |
| **ViewModel** | Los datos concretos que una vista necesita para pintarse | `{ products, ranges, query, matched, total, isFiltered }` |
| **Anemic domain model** (antipatrón) | Entidades sin comportamiento + servicios con toda la lógica | Evitado: hay 2 servicios de dominio y entidades con métodos |
| **Primitive obsession** (antipatrón) | Modelar conceptos del negocio con tipos primitivos | Evitado con los 10 value objects |
| **Service Locator** (antipatrón) | Que las clases pidan sus dependencias a un contenedor | Evitado: el contenedor solo se usa en el arranque |

## 20.2 Glosario del dominio de negocio

| Término | Significado en CreditSmart |
|---|---|
| **Solicitante** (`Applicant`) | Persona que pide un crédito: nombre, cédula, email, teléfono |
| **Producto de crédito** (`CreditProduct`) | Línea del catálogo: monto, tasa, plazo, requisitos |
| **Solicitud** (`CreditApplication`) | Petición formal de un solicitante sobre un producto |
| **Radicar** (`submit()`) | Presentar formalmente la solicitud → estado `RADICADA` |
| **Radicado** (`referenceNumber`) | Identificador legible de la solicitud: `CS-XXXXXXXX` |
| **Tasa efectiva anual (E.A.)** | Rendimiento anual real, con capitalización. Ej. 14,2 % |
| **Tasa mensual equivalente** | `(1 + i_anual)^(1/12) − 1`. **No** es `i_anual / 12` |
| **Plazo** (`Term`) | Número de cuotas mensuales |
| **Cuota fija / sistema francés** | `C = P·i / (1 − (1+i)^−n)` — cuota constante. Implementada en `CreditSimulationService` |
| **Amortización** (`AmortizationPlan`) | Reparto del crédito en cuotas: cuánto de cada una va a intereses y cuánto abona capital |
| **Cuota** (`Installment`) | Una fila del plan: pago, intereses, capital y saldo restante de ese mes |
| **Saldo vivo** | Capital pendiente tras pagar una cuota. Los intereses del mes siguiente se calculan sobre él |
| **Residuo de redondeo** | Descuadre que deja redondear cada cuota al peso. Lo absorbe la última cuota, que abona todo el saldo restante |
| **Capacidad de pago** | Regla del proyecto: la cuota no debe superar el 40 % del ingreso mensual |
| **Rango de monto** (`AmountRange`) | Intervalo `[mínimo, máximo]` que ofrece un producto, o que filtra el usuario |
| **Destino del crédito** | Uso declarado del dinero (campo `purpose`) |
| **Codeudor** | Tercero que respalda la solicitud; requisito del Crédito Educativo para menores de 18 |
| **COP** | Peso colombiano. Sin decimales en la práctica: `Money` guarda enteros |

### Estados de una solicitud

| Constante | Valor | Significado |
|---|---|---|
| `APPLICATION_STATUS.DRAFT` | `BORRADOR` | Creada, aún no presentada |
| `APPLICATION_STATUS.SUBMITTED` | `RADICADA` | Presentada formalmente |
| `APPLICATION_STATUS.UNDER_REVIEW` | `EN_ESTUDIO` | En análisis de riesgo |
| `APPLICATION_STATUS.APPROVED` | `APROBADA` | Aprobada |
| `APPLICATION_STATUS.REJECTED` | `RECHAZADA` | Rechazada |

Transiciones implementadas: `BORRADOR → RADICADA` (`submit()`),
`RADICADA → EN_ESTUDIO` (`moveToReview()`). Las dos últimas están declaradas y
pendientes de método.

## 20.3 Convenciones de nombres

### Archivos y clases

| Tipo | Convención | Ejemplo |
|---|---|---|
| Clase | `PascalCase.js`, un archivo por clase, nombre idéntico | `CreditProduct.js` |
| Contrato | `I` + `PascalCase.js` | `ICreditProductRepository.js` |
| Caso de uso | Verbo + sustantivo + `UseCase` | `SubmitCreditApplicationUseCase.js` |
| Vista | Nombre + `View` | `SimulatorView.js` |
| Controlador | Nombre + `Controller` | `SimulatorController.js` |
| Componente | Nombre + `Component` | `ProductCardComponent.js` |
| Adaptador | Tecnología + Concepto | `IntlMoneyFormatter`, `InMemoryCreditProductRepository`, `LocalStorageCreditApplicationRepository` |
| Datasource | `Static`/`Http` + Concepto + `DataSource` | `StaticCreditProductDataSource.js` |
| Módulo de utilidades | `PascalCase.js` con exports nombrados | `Html.js`, `UrlBuilder.js` |
| Configuración | `camelCase.js` o `PascalCase.js` según si exporta objeto o clase | `routes.js`, `AppConfig.js`, `Container.js` |
| CSS | `NN-nombre.css`, numerado por orden de cascada | `05-components.css` |
| Documentación | `NN-tema-en-kebab.md` | `08-value-objects.md` |
| Pruebas | `NN-alcance.mjs` | `01-domain-application.mjs` |

El nombre del adaptador **empieza por la tecnología**: así, al leer
`dependencies.js`, se ve de un vistazo qué implementación está activa
(`InMemory…` vs `Http…`).

### Código

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clase | `PascalCase` | `CreditApplication` |
| Método y variable | `camelCase` | `matchesAmountRange` |
| Campo privado | `#camelCase` | `#moneyFormatter` |
| Método privado | `#camelCase()` | `#renderResults()` |
| Estático privado | `static #NOMBRE` | `static #STORAGE_KEY` |
| Constante de módulo | `SCREAMING_SNAKE_CASE` | `STATIC_CREDIT_PRODUCTS`, `THEME_PALETTES` |
| Enum | `SCREAMING_SNAKE` congelado, con valores en español | `APPLICATION_STATUS.SUBMITTED === 'RADICADA'` |
| Código de error | `SCREAMING_SNAKE_CASE` | `CURRENCY_MISMATCH` |
| Constructor semántico | `static of(...)` / `static ofAlgo(...)` | `Money.of(5e6)`, `Term.ofMonths(60)` |
| Predicado | `is…` / `has…` / `matches…` / `admits…` | `isUnbounded`, `admitsAmount` |
| Método que lanza si falla | `assert…` | `assertImplements`, `assertAdmissible` |
| Copia con un cambio | `with…` | `criteria.withQuery('x')` |
| Clase CSS | BEM relajado | `.product-card__header--compact` |
| Atributo de gancho JS | `data-…` | `data-link`, `data-filters`, `data-application-form` |

### Idioma

Decisión explícita del proyecto:

| Elemento | Idioma | Motivo |
|---|---|---|
| Nombres de clases, métodos y variables | **inglés** | Convención del ecosistema JavaScript |
| Vocabulario del dominio dentro de esos nombres | **inglés**, salvo cuando no hay término equivalente | `CreditApplication`, `Applicant` |
| Valores de enum de negocio | **español** | Son datos que puede ver un usuario o un operador: `RADICADA` |
| Mensajes de error de negocio | **español** | Son contenido de producto |
| Códigos de error | **inglés** | Son API estable, no texto para humanos |
| Comentarios y documentación | **español** | Idioma del equipo |
| Claves crudas del datasource | **español** | Réplica literal del original (`montoMin`, `tasa`) |
| Textos de las 3 páginas | **español** | Réplica literal |
| Textos del 404 y "Access Restricted" | **inglés** | Réplica literal: el original los tenía en inglés |

## 20.4 Convenciones de comentarios

Cada archivo abre con un bloque que responde a tres preguntas: **qué es**,
**por qué existe** y **en qué capa está**.

```js
/**
 * IntlMoneyFormatter — ADAPTADOR de `IMoneyFormatter`.
 *
 * Usa `Intl.NumberFormat` con locale es-CO y moneda COP sin decimales,
 * exactamente como el sitio original.
 *
 * Reutiliza una única instancia de `Intl.NumberFormat` (crearla es costoso y
 * se invoca dos veces por tarjeta de producto).
 *
 * Capa: INFRAESTRUCTURA (adaptador).
 */
```

Reglas:

| Regla | Motivo |
|---|---|
| El comentario explica **por qué**, no **qué** | El código ya dice qué hace |
| La línea `Capa: …` es obligatoria | Ubica el archivo en la arquitectura de un vistazo |
| Un `catch` vacío **siempre** lleva comentario | Un silencio sin justificar es un bug esperando |
| Una decisión contraintuitiva se documenta en el sitio | Ej. por qué `findAll` es `async` sin E/S |
| JSDoc con `@param` y `@returns` en métodos públicos | Sustituye la verificación de tipos que no hay |
| Sin comentarios que repitan el nombre del método | `// devuelve el nombre` sobre `get name()` es ruido |

Ejemplo de `catch` justificado:

```js
} catch {
  // Cuota o modo privado: la solicitud sigue viva en memoria.
}
```

Y de decisión documentada:

```js
async findAll() {
  return [...this.#products];   // copia defensiva
}
// Devuelve promesas incluso siendo sincrónico: mantiene la misma firma que un
// adaptador remoto (Liskov).
```

## 20.5 Convenciones de commits

Formato: `tipo(ámbito): descripción en imperativo`, sujeto ≤ 50 caracteres.

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un defecto |
| `refactor` | Cambio interno sin alterar comportamiento |
| `docs` | Documentación |
| `test` | Pruebas |
| `style` | CSS o formato, sin cambio de comportamiento |
| `chore` | Configuración, `.htaccess`, `.gitignore` |

Ámbito = capa o módulo: `domain`, `application`, `infra`, `presentation`,
`config`, `css`, `docs`, `tests`.

```
feat(domain): añade DocumentType como value object
fix(presentation): conserva el foco del input tras el re-render del simulador
refactor(presentation): inyecta termOptions en vez de importar el datasource
docs(master): añade el índice alfabético de artefactos
test(infra): cubre la degradación de localStorage en modo privado
```

El cuerpo del commit solo se escribe cuando el **por qué** no es obvio desde el
sujeto:

```
refactor(presentation): inyecta termOptions en vez de importar el datasource

ApplicationController importaba STATIC_TERM_OPTIONS de
infrastructure/persistence/datasources/, rompiendo la regla de que la
presentación no depende de infraestructura. Ahora los plazos llegan
inyectados desde el Composition Root.
```

## 20.6 Reglas del proyecto (resumen ejecutable)

Las cinco reglas no negociables:

1. `src/domain/` no importa nada de fuera de `src/domain/`.
2. `src/application/` solo importa de `src/domain/` y de sí misma.
3. `src/presentation/` nunca importa `src/infrastructure/`.
4. El único archivo con `new` de clases concretas de varias capas es
   `src/config/dependencies.js`.
5. Toda dependencia entra por el constructor.

Comprobación:

```bash
cd C:/laragon/www/crediSmart
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/
grep -rn "from '\.\./\.\./\(infrastructure\|presentation\|config\)" src/application/
grep -rn "infrastructure" src/presentation/
```

Las tres → cero resultados.

Y las reglas por capa:

| Capa | Prohibido | Obligatorio |
|---|---|---|
| `domain` | `document`, `window`, `fetch`, `localStorage`, `console`, `Date.now()`, `crypto`, `Intl` (salvo en mensajes) | Validar en el constructor; `equals()`; `toJSON()`; VOs congelados |
| `application` | Lanzar hacia fuera; devolver entidades; tocar el DOM | Devolver `Result`; `assertImplements` de cada puerto; un `execute()` |
| `infrastructure` | Reglas de negocio; declarar puertos propios | `extends` de un contrato; `async` si el contrato lo es; `catch` comentado |
| `presentation` | Importar `infrastructure`; importar entidades; reglas de negocio en vistas | `BaseView.on()` para listeners; escapar por defecto; `UrlBuilder.href()`; `data-link` |
| `config` | Lógica de negocio | `assertImplements` al registrar; registrar en el bloque correcto |

## 20.7 Nomenclatura de las clases CSS por vista

Referencia rápida de qué clase pertenece a qué archivo.

| Prefijo | Archivo | Ejemplos |
|---|---|---|
| `.page`, `.container`, `.section`, `.grid-`, `.stack`, `.row` | `04-layout.css` | `.page__main`, `.container--7xl`, `.grid-products` |
| `.navbar`, `.brand`, `.navlink` | `05-components.css` | `.navlink--active`, `.brand__name-accent` |
| `.btn` | `05-components.css` | `.btn--primary`, `.btn--card`, `.btn--system` |
| `.product-card`, `.badge-amount`, `.metric` | `05-components.css` | `.product-card--compact`, `.metric__value--sm` |
| `.panel`, `.alert`, `.field`, `.label`, `.control` | `05-components.css` | `.control--select`, `.control.is-invalid` |
| `.footer`, `.toast`, `.notifications` | `05-components.css` | `.footer--spaced`, `.toast--success` |
| `.hero` | `06-pages.css` | `.hero__title-accent` |
| `.filters`, `.results-count` | `06-pages.css` | `.filters__actions` |
| `.form-page`, `.form`, `.form-actions`, `.form-note` | `06-pages.css` | `.form__section-icon--credit` |
| `.sys-` | `06-pages.css` | `.sys-code`, `.sys-title`, `.sys-note__dot` |
| `.access-` | `06-pages.css` | `.access-card__icon` |
| `.t-` | `03-base.css` | `.t-muted`, `.t-required` |
| `.theme-` | `02-tokens.css` | `.theme-emerald` |
| `.is-` | estado, en el archivo del componente | `.is-invalid` |

## 20.8 Fin de la documentación

Vuelta al [índice maestro](./master.md).
