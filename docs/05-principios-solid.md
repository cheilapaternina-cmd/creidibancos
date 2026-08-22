[← Volver al índice maestro](./master.md)

# 05 — Principios SOLID

Cada principio, con el archivo y el fragmento real que lo materializa, y con la
alternativa que se rechazó.

---

## 5.1 S — Responsabilidad Única (SRP)

> Una clase debe tener una sola razón para cambiar.

La formulación útil no es "una clase hace una cosa" (demasiado vago), sino: **si
dos actores distintos pueden pedir cambios en la misma clase, esa clase tiene dos
responsabilidades**.

### Aplicación 1: un caso de uso, un método

```js
// src/application/contracts/IUseCase.js
export const IUseCase = defineContract('IUseCase', ['execute']);
```

Los 5 casos de uso exponen `execute()` y nada más. No hay una clase
`CreditService` con `list()`, `search()`, `submit()` y `getNames()`: son cuatro
archivos separados, porque cambiar la búsqueda no debe tocar el archivo donde
vive la radicación.

### Aplicación 2: `ViewRenderer` es el único que escribe en el DOM

```js
// src/presentation/shared/ViewRenderer.js
this.#root.innerHTML = view.render(viewModel);
```

Asignaciones reales de `innerHTML` en todo `src/`:

```bash
grep -rn "innerHTML" src/ --include=*.js
# ViewRenderer.js:4    ← comentario
# ViewRenderer.js:40   ← mount()  : this.#root.innerHTML = view.render(viewModel)
# ViewRenderer.js:68   ← clear()  : this.#root.innerHTML = ''
# ToastNotifier.js:64  ← comentario ("textContent, nunca innerHTML")
# main.js              ← pantalla de fallo de arranque
```

Dos asignaciones, ambas en `ViewRenderer`, más el fallback de arranque de
`main.js`. Si mañana se cambia a re-render incremental o a `replaceChildren()`,
se cambia un archivo.

### Aplicación 3: traducción separada de persistencia

`InMemoryCreditProductRepository` recupera. `CreditProductFactory` traduce el
formato crudo a entidades. Son dos archivos porque son dos motivos de cambio
distintos: cambiar la fuente de datos vs. cambiar el formato de los datos.

### Lo que se rechazó

```js
// ❌ Rechazado: una clase con todas las operaciones de crédito
class CreditService {
  listProducts() {}
  searchProducts() {}
  submitApplication() {}
  formatMoney() {}
  renderCard() {}
}
```

Cuatro actores distintos (negocio, UX, finanzas, marketing) pidiendo cambios en
el mismo archivo.

---

## 5.2 O — Abierto/Cerrado (OCP)

> Abierto a extensión, cerrado a modificación.

### Aplicación 1: el decorador `DocumentTitleController`

Añade "poner el título del documento" a **cualquier** controlador sin abrir
ninguno:

```js
// src/presentation/decorators/DocumentTitleController.js
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

Los 4 controladores quedaron intactos. Y como implementa `IController`, se puede
seguir decorando: un `LoggingController`, un `AnalyticsController`, un
`AuthGuardController` se apilan sin tocar nada.

### Aplicación 2: añadir un producto no toca código

```js
// src/infrastructure/persistence/datasources/StaticCreditProductDataSource.js
Object.freeze({
  id: 6,
  nombre: 'Crédito Agropecuario',
  descripcion: '…',
  montoMin: 2_000_000,
  montoMax: 200_000_000,
  tasa: 13.4,
  plazo: 96,
  requisitos: '…',
  icon: '🌾',
  palette: 'emerald',
}),
```

Con esa entrada, el producto aparece en el catálogo, en el simulador **y** en el
`<select>` "Tipo de crédito" del formulario — porque ese select se alimenta de
`GetCreditProductNamesUseCase`, derivado del catálogo real. (El sitio original
tenía la lista duplicada a mano en un array `dk`; era el error clásico que este
diseño elimina.)

### Aplicación 3: añadir un campo al formulario no toca marcado

`ApplicationView#sections()` declara los campos como datos:

```js
{ name: 'jobTitle', label: 'Cargo', type: 'text', placeholder: 'Ej: Analista de Sistemas' },
```

Un solo método (`#field`) los pinta todos. Añadir un campo es añadir una entrada.

### Lo que se rechazó

```js
// ❌ Rechazado: un switch que hay que abrir cada vez
function renderCard(product, page) {
  if (page === 'catalog')   { /* … */ }
  else if (page === 'simulator') { /* … */ }
  else if (page === 'compare')   { /* … */ }   // ← modificar para extender
}
```

En su lugar, `ProductCardComponent` recibe `variant` como dato.

---

## 5.3 L — Sustitución de Liskov (LSP)

> Un subtipo debe poder sustituir a su tipo base sin que el consumidor lo note.

### Aplicación 1: repositorios asíncronos aunque sean sincrónicos

```js
// src/infrastructure/persistence/InMemoryCreditProductRepository.js
async findAll() {
  return [...this.#products];      // no hay E/S, pero devuelve una promesa
}
```

Es deliberado. Si `findAll()` fuera sincrónico, todos los consumidores se
escribirían sin `await` y sustituirlo por un adaptador HTTP —inevitablemente
asíncrono— rompería a cada uno de ellos. La firma se elige por el **contrato**,
no por la implementación de hoy.

Además devuelve una **copia** (`[...this.#products]`): un consumidor que haga
`.sort()` sobre el resultado no puede corromper el catálogo interno.

### Aplicación 2: verificación de sustituibilidad en el arranque

```js
// src/domain/contracts/Contract.js
export function assertImplements(instance, ContractClass) {
  const required = ContractClass.contractMethods ?? [];
  const missing = required.filter((method) => {
    const fn = instance?.[method];
    if (typeof fn !== 'function') return true;
    // Un método heredado sin sobreescribir sigue siendo el abstracto del contrato.
    return fn === ContractClass.prototype[method];
  });
  if (missing.length > 0) {
    throw new ContractViolationError(contractName, implName, missing);
  }
  return instance;
}
```

La segunda comprobación es la importante: heredar de un contrato **no** basta.
Si `MiRepositorio extends ICreditProductRepository` pero no implementa
`findByCriteria`, el método existe (heredado) pero es el abstracto que lanza
`NotImplementedError`. `assertImplements` lo detecta comparando referencias.

Verificado: registrar `{ handle(){} }` como controlador produce
`ok : contrato: rechaza controlador incompleto (CONTRACT_VIOLATION)`.

### Aplicación 3: el router no distingue decorados de no decorados

```js
router.register('/', new DocumentTitleController({ controller: catalogController, title: '…' }));
```

`HistoryRouter` solo sabe que recibió algo que cumple `IController`. El decorador
respeta la firma completa, incluido `dispose()` (que delega). Si el decorador
"olvidara" `dispose()`, la vista anterior no se limpiaría al cambiar de ruta:
una violación silenciosa de Liskov.

### Aplicación 4: degradación sin cambiar el contrato

```js
// src/infrastructure/persistence/LocalStorageCreditApplicationRepository.js
static #safeStorage() {
  try {
    const probe = '__creditsmart_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;    // modo privado o cuota llena → solo memoria
  }
}
```

En modo privado el repositorio sigue cumpliendo `ICreditApplicationRepository`:
guarda en memoria y `save()` resuelve igual. El consumidor no cambia su código
por eso.

---

## 5.4 I — Segregación de Interfaces (ISP)

> Ningún cliente debe depender de métodos que no usa.

### Los 12 contratos y su tamaño

| Contrato | Métodos |
|---|---|
| `IIdGenerator` | 1 — `generate` |
| `IUseCase` | 1 — `execute` |
| `IClock` | 2 — `now`, `timestamp` |
| `IMoneyFormatter` | 2 — `format`, `formatCompact` |
| `IAmountRangeProvider` | 2 — `all`, `byIndex` |
| `IController` | 2 — `handle`, `dispose` |
| `IView` | 3 — `render`, `afterRender`, `destroy` |
| `INotifier` | 3 — `success`, `error`, `info` |
| `ILogger` | 4 — `debug`, `info`, `warn`, `error` |
| `ICreditProductRepository` | 4 — `findAll`, `findById`, `findByCriteria`, `count` |
| `ICreditApplicationRepository` | 4 — `save`, `findById`, `findAll`, `nextIdentity` |
| `IRouter` | 5 — `register`, `setFallback`, `start`, `navigate`, `currentPath` |

Media: 2,75 métodos por contrato. Ninguno pasa de 5.

### Por qué `IClock` e `IIdGenerator` están separados

Podrían haber sido un `ISystemServices` con `now()`, `timestamp()` y
`generate()`. Se separaron porque los consumidores son distintos:

- `SubmitCreditApplicationUseCase` necesita `IClock` (fecha de creación).
- `LocalStorageCreditApplicationRepository` necesita `IIdGenerator` (identidades).

Con un contrato único, el repositorio tendría que aceptar un objeto con `now()`,
y un test tendría que falsificar métodos que no usa.

### Lo que se rechazó

```js
// ❌ Rechazado: god interface
const IDataAccess = defineContract('IDataAccess', [
  'findAll', 'findById', 'findByCriteria', 'count',
  'save', 'update', 'delete', 'nextIdentity',
  'beginTransaction', 'commit', 'rollback',
]);
```

`StaticAmountRangeProvider` tendría que implementar `commit()`.

---

## 5.5 D — Inversión de Dependencias (DIP)

> Depende de abstracciones, no de concreciones. Los módulos de alto nivel no
> deben depender de los de bajo nivel: ambos deben depender de abstracciones.

Este es el principio que sostiene toda la arquitectura. Se aplica en tres
niveles.

### Nivel 1: quién declara la abstracción

La abstracción la declara el **consumidor**, no el proveedor:

```
domain/contracts/ICreditProductRepository.js         ← la declara el DOMINIO
infrastructure/persistence/InMemoryCreditProduct…    ← la implementa la INFRA
```

Si la interfaz viviera junto al repositorio, la dependencia no se habría
invertido: solo se habría añadido una capa de indirección inútil.

### Nivel 2: todo entra por el constructor

```js
// src/application/usecases/SubmitCreditApplicationUseCase.js
constructor({ applicationRepository, productRepository, clock, logger }) {
  super();
  assertImplements(applicationRepository, ICreditApplicationRepository);
  assertImplements(productRepository, ICreditProductRepository);
  assertImplements(clock, IClock);
  assertImplements(logger, ILogger);

  this.#applicationRepository = applicationRepository;
  this.#productRepository = productRepository;
  this.#clock = clock;
  this.#logger = logger;
}
```

Cuatro dependencias, cuatro puertos, cero `new`. Y cada una verificada.

### Nivel 3: un único punto con clases concretas

`src/config/dependencies.js` es el **único** archivo del proyecto donde se hace
`new` de una clase concreta que cruza capas. Ejemplo del cambio completo para
pasar a una API REST:

```js
// Antes
container.register('productRepository', () =>
  assertImplements(new InMemoryCreditProductRepository(), ICreditProductRepository),
);

// Después
container.register('productRepository', (c) =>
  assertImplements(
    new HttpCreditProductRepository({ baseUrl: c.resolve('config').apiBaseUrl }),
    ICreditProductRepository,
  ),
);
```

Archivos que cambian además de ese: **uno** (el nuevo adaptador). Archivos que
**no** cambian: los 5 casos de uso, los 4 controladores, las 6 vistas, las 2
entidades, los 8 value objects.

### El contenedor no es un Service Locator disfrazado

Objeción legítima: *"un contenedor DI es un Service Locator, y eso es un
antipatrón"*. La diferencia está en **quién lo usa**:

```js
// ❌ Service Locator: la clase pide sus dependencias
class ListCreditProductsUseCase {
  execute() {
    const repo = Container.resolve('productRepository');   // acoplada al contenedor
  }
}

// ✅ Inyección: la clase recibe sus dependencias
class ListCreditProductsUseCase {
  constructor({ productRepository, productMapper }) { /* … */ }
}
```

En este proyecto el contenedor solo aparece en tres archivos, todos de arranque:

```bash
grep -rln "Container" src/ --include=*.js
# → src/config/Container.js      la clase
#   src/config/dependencies.js   el Composition Root que la usa
#   src/main.js                  el bootstrap que llama a buildContainer()
```

Ninguna clase de `domain/`, `application/`, `infrastructure/` o `presentation/`
conoce el contenedor. Todas reciben sus dependencias ya resueltas.

### El corolario que se cobra en las pruebas

Por DIP, la suite de dominio+aplicación puede construir el grafo a mano con
dobles triviales:

```js
const logger = { debug(){}, info(){}, warn(){}, error(){} };
const applicationRepository = new LocalStorageCreditApplicationRepository({
  idGenerator,
  storage: null,             // ← sin localStorage, sin navegador
});
```

Sin librería de mocking. Los dobles son objetos literales porque los contratos
son pequeños (ISP) y las dependencias entran por constructor (DIP).

---

## 5.6 Tabla resumen

| Principio | Materializado en | Verificación |
|---|---|---|
| **S** | 5 casos de uso con `execute()` único · `ViewRenderer` como único escritor del DOM · factory separada del repositorio | Todas las asignaciones de `innerHTML` de `src/presentation/` están en `ViewRenderer` |
| **O** | `DocumentTitleController` · `variant` en componentes · formulario declarativo · datasource como única fuente de productos | Añadir un producto = 1 entrada; aparece en 3 sitios |
| **L** | Repositorios `async` y con copias defensivas · `assertImplements` comparando referencias · decorador que delega `dispose()` | `ok : contrato: rechaza controlador incompleto` |
| **I** | 12 contratos, media de 2,75 métodos, máximo 5 | Tabla de §5.4 |
| **D** | Puertos declarados por el consumidor · inyección por constructor · un único Composition Root | `grep Container src/` → solo `config/Container.js`, `config/dependencies.js` y `main.js` |

## 5.7 Siguiente lectura

- [06 — Contratos e interfaces](./06-contratos-e-interfaces.md) — cómo funciona `defineContract` por dentro
- [16 — Catálogo de patrones](./16-catalogo-de-patrones.md)
- [`.claude/skills/arquitectura-hexagonal-vanilla/references/anti-patrones.md`](../.claude/skills/arquitectura-hexagonal-vanilla/references/anti-patrones.md) — los 14 errores que rompen esto
