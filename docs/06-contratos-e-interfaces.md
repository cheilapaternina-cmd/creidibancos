[← Volver al índice maestro](./master.md)

# 06 — Contratos e interfaces

## 6.1 El problema: JavaScript no tiene `interface`

En TypeScript, Java o C# el compilador garantiza que una clase cumple una
interfaz. En JavaScript no existe la construcción, y las alternativas habituales
fallan:

| Alternativa | Por qué no basta |
|---|---|
| Un comentario JSDoc `@implements` | No se verifica en ejecución. Es documentación. |
| Duck typing ("si tiene el método, sirve") | El error aparece cuando el usuario pulsa el botón, no al arrancar. Y un método mal escrito (`findall` en vez de `findAll`) pasa desapercibido. |
| Una clase base con métodos vacíos | Un método vacío que devuelve `undefined` es peor que uno que falla: propaga el error lejos de su causa. |
| TypeScript | Introduce build, transpilador y `node_modules`. El proyecto es explícitamente vanilla. |

La solución de este proyecto: **`src/domain/contracts/Contract.js`**, una fábrica
de interfaces con verificación en el arranque.

## 6.2 `defineContract` — declarar una interfaz

```js
// src/domain/contracts/Contract.js
export function defineContract(name, methods) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('defineContract requiere un nombre de contrato.');
  }
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new TypeError(`El contrato "${name}" debe declarar al menos un método.`);
  }

  const ContractBase = class {
    constructor() {
      if (new.target === ContractBase) {
        throw new NotImplementedError(name, 'constructor');
      }
    }
  };

  Object.defineProperty(ContractBase, 'name',            { value: name });
  Object.defineProperty(ContractBase, 'contractName',    { value: name });
  Object.defineProperty(ContractBase, 'contractMethods', { value: Object.freeze([...methods]) });

  for (const method of methods) {
    Object.defineProperty(ContractBase.prototype, method, {
      value: function abstractMethod() {
        throw new NotImplementedError(name, method);
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  return ContractBase;
}
```

Qué consigue cada parte:

| Línea | Efecto |
|---|---|
| `new.target === ContractBase` | Instanciar el contrato directamente lanza `NotImplementedError`. Es abstracto de verdad. |
| `contractName` y `contractMethods` como propiedades estáticas | Metadatos legibles en ejecución: permiten verificar sin reflexión frágil. |
| Métodos que lanzan `NotImplementedError` | Una implementación incompleta falla **en el punto exacto** de la llamada, con el nombre del contrato y del método. |
| `enumerable: false` | Los métodos abstractos no aparecen en `Object.keys()` ni en `for…in`, igual que los métodos normales de una clase. |
| `Object.defineProperty(…, 'name')` | El error dice `ILogger.warn()`, no `ContractBase.warn()`. |

### Uso

```js
export const ILogger = defineContract('ILogger', ['debug', 'info', 'warn', 'error']);

export class ConsoleLogger extends ILogger {
  debug(message, context) { /* … */ }
  info(message, context)  { /* … */ }
  warn(message, context)  { /* … */ }
  error(message, context) { /* … */ }
}
```

## 6.3 `assertImplements` — verificar en el arranque

```js
export function assertImplements(instance, ContractClass) {
  const contractName = ContractClass.contractName ?? ContractClass.name;
  const required = ContractClass.contractMethods ?? [];
  const implName = instance?.constructor?.name ?? String(instance);

  const missing = required.filter((method) => {
    const fn = instance?.[method];
    if (typeof fn !== 'function') return true;
    // Un método heredado sin sobreescribir sigue siendo el abstracto del contrato.
    return fn === ContractClass.prototype[method];
  });

  if (missing.length > 0) {
    throw new ContractViolationError(contractName, implName, missing);
  }

  return instance;   // permite encadenar
}
```

La comprobación clave es la segunda: **heredar no es implementar**. Si una clase
extiende `ICreditProductRepository` pero olvida `findByCriteria`, el método
*existe* (heredado), pero es la misma referencia que el abstracto del contrato.
Comparar referencias lo detecta.

Devuelve la instancia, lo que permite el idioma que se usa en todo
`dependencies.js`:

```js
container.register('logger', (c) =>
  assertImplements(new ConsoleLogger({ level: c.resolve('config').logLevel }), ILogger),
);
```

### `implementsContract` — versión no destructiva

```js
export function implementsContract(instance, ContractClass) {
  try {
    assertImplements(instance, ContractClass);
    return true;
  } catch {
    return false;
  }
}
```

Útil en pruebas o en ramas condicionales, donde un fallo no debe abortar.

## 6.4 El error que se produce

```js
// src/domain/errors/ContractViolationError.js
export class ContractViolationError extends DomainError {
  constructor(contractName, implementationName, missingMethods) {
    super(
      `"${implementationName}" no cumple el contrato "${contractName}". ` +
        `Métodos faltantes: ${missingMethods.join(', ')}.`,
      { code: 'CONTRACT_VIOLATION',
        details: { contractName, implementationName, missingMethods } },
    );
  }
}
```

Mensaje real de la suite de verificación:

```
"Object" no cumple el contrato "IController". Métodos faltantes: dispose.
```

Nombre del contrato, nombre de la implementación, y la lista exacta de lo que
falta. No un `undefined is not a function` tres capas más adentro.

## 6.5 La verificación ocurre al cargar la página

El mecanismo tiene dos mitades. La primera es `assertImplements` en cada
registro. La segunda es esta línea de `main.js`:

```js
const container = buildContainer({ config: AppConfig, rootElement });

// Construye todo el grafo ahora: cualquier adaptador que no cumpla su
// contrato falla aquí, no a mitad de una navegación del usuario.
container.eagerResolveAll();
```

`eagerResolveAll()` fuerza la construcción de las 32 dependencias. Sin esa
llamada, un adaptador defectuoso registrado para la ruta `/solicitar` no fallaría
hasta que alguien visitara esa ruta.

Si algo falla, `main.js` lo captura y pinta una pantalla de error legible en
lugar de dejar la página en blanco:

```js
bootstrap().catch((error) => {
  console.error('[CreditSmart] Fallo en el arranque:', error);
  // …pinta "No se pudo iniciar la aplicación"
});
```

## 6.6 Catálogo completo de los 12 contratos

### Dominio — `src/domain/contracts/`

#### `ICreditProductRepository`

```js
export const ICreditProductRepository = defineContract('ICreditProductRepository', [
  'findAll', 'findById', 'findByCriteria', 'count',
]);
```

| Método | Firma | Devuelve |
|---|---|---|
| `findAll()` | — | `Promise<CreditProduct[]>` — copia del catálogo |
| `findById(id)` | `number\|string` | `Promise<CreditProduct\|null>` |
| `findByCriteria(criteria)` | `ProductSearchCriteria` | `Promise<CreditProduct[]>` |
| `count()` | — | `Promise<number>` — total sin filtrar |

Implementado por `InMemoryCreditProductRepository`.

#### `ICreditApplicationRepository`

```js
export const ICreditApplicationRepository = defineContract('ICreditApplicationRepository', [
  'save', 'findById', 'findAll', 'nextIdentity',
]);
```

| Método | Firma | Devuelve |
|---|---|---|
| `save(application)` | `CreditApplication` | `Promise<CreditApplication>` |
| `findById(id)` | `string` | `Promise<CreditApplication\|null>` |
| `findAll()` | — | `Promise<CreditApplication[]>` |
| `nextIdentity()` | — | `string` — **sincrónico**; genera identidad antes de construir la entidad |

Implementado por `LocalStorageCreditApplicationRepository`.

`nextIdentity()` es sincrónico a propósito: la entidad necesita su id en el
constructor, y hacer `await` ahí complicaría el caso de uso sin ganancia.

#### `IAmountRangeProvider`

```js
export const IAmountRangeProvider = defineContract('IAmountRangeProvider', ['all', 'byIndex']);
```

| Método | Firma | Devuelve |
|---|---|---|
| `all()` | — | `Promise<AmountRange[]>` |
| `byIndex(index)` | `number\|string` | `Promise<AmountRange\|null>` |

Implementado por `StaticAmountRangeProvider`. `byIndex` existe porque el
`<select>` del simulador trabaja con índices, y la traducción índice → value
object no debe ocurrir en el controlador.

#### `IMoneyFormatter`

```js
export const IMoneyFormatter = defineContract('IMoneyFormatter', ['format', 'formatCompact']);
```

| Método | Firma | Devuelve |
|---|---|---|
| `format(money)` | `Money\|number` | `string` — `"$ 5.000.000"` |
| `formatCompact(money)` | `Money\|number` | `string` — `"$ 5 M"` |

Implementado por `IntlMoneyFormatter`.

#### `IClock`

```js
export const IClock = defineContract('IClock', ['now', 'timestamp']);
```

| Método | Devuelve |
|---|---|
| `now()` | `Date` |
| `timestamp()` | `number` |

Implementado por `SystemClock`. Existe para que `CreditApplication.createdAt` sea
determinista en pruebas: un `FixedClock` de tres líneas sustituye al del sistema.

#### `IIdGenerator`

```js
export const IIdGenerator = defineContract('IIdGenerator', ['generate']);
```

| Método | Firma | Devuelve |
|---|---|---|
| `generate(prefix?)` | `string` | `string` — `"app_a3f1…"` |

Implementado por `CryptoIdGenerator`.

### Aplicación — `src/application/contracts/`

#### `IUseCase`

```js
export const IUseCase = defineContract('IUseCase', ['execute']);
```

Un único método por caso de uso. Es lo que permite decorar cualquiera de ellos
(logging, caché, métricas) sin conocer su tipo concreto.

Implementado por los 5 casos de uso.

#### `ILogger`

```js
export const ILogger = defineContract('ILogger', ['debug', 'info', 'warn', 'error']);
```

Firma de todos: `(message: string, context?: Object) => void`.

Implementado por `ConsoleLogger`.

#### `INotifier`

```js
export const INotifier = defineContract('INotifier', ['success', 'error', 'info']);
```

Firma de todos: `(message: string, title?: string) => void`.

Implementado por `ToastNotifier`.

### Presentación — `src/presentation/contracts/`

#### `IView`

```js
export const IView = defineContract('IView', ['render', 'afterRender', 'destroy']);
```

| Método | Firma | Propósito |
|---|---|---|
| `render(viewModel)` | `Object` → `string` | HTML de la vista |
| `afterRender(root, handlers)` | `HTMLElement, Object` | Enlazar eventos tras el montaje |
| `destroy()` | — | Quitar listeners y liberar referencias |

Implementado por `BaseView` (y heredado por las 5 vistas).

#### `IController`

```js
export const IController = defineContract('IController', ['handle', 'dispose']);
```

| Método | Firma | Propósito |
|---|---|---|
| `handle(context)` | `{ path, params?, query?, hash? }` → `Promise<void>` | Atender una ruta |
| `dispose()` | — | Liberar la vista al salir de la ruta |

Implementado por `BaseController` (heredado por los 4 controladores) y por
`DocumentTitleController`.

#### `IRouter`

```js
export const IRouter = defineContract('IRouter', [
  'register', 'setFallback', 'start', 'navigate', 'currentPath',
]);
```

| Método | Firma | Propósito |
|---|---|---|
| `register(path, controller)` | `string, IController` | Asociar ruta ↔ controlador |
| `setFallback(controller)` | `IController` | Controlador para rutas no registradas |
| `start()` | — → `Promise<void>` | Enlazar eventos y resolver la URL actual |
| `navigate(path, options?)` | `string, { replace? }` → `Promise<void>` | Navegar por código |
| `currentPath()` | — → `string` | Ruta de aplicación actual, sin prefijo de despliegue |

Implementado por `HistoryRouter`.

## 6.7 Convenciones de contratos

| Convención | Regla |
|---|---|
| Nombre | `I` + PascalCase. Un archivo por contrato. |
| Ubicación | La carpeta `contracts/` de la capa que **tiene la necesidad**, nunca la que la satisface. |
| Nombre del archivo | Idéntico al contrato: `ICreditProductRepository.js`. |
| Contenido del archivo | Solo la declaración y su comentario. Sin lógica, sin helpers. |
| Documentación | Comentario de bloque que indique: qué necesidad expresa, la lista de métodos con firma, la capa y el adaptador actual. |
| Tamaño | Si pasa de 5 métodos, probablemente son dos contratos (ISP). |
| Nombre de los métodos | Lenguaje del **negocio**, no de la tecnología: `findByCriteria`, no `executeQuery`. |
| Prohibido | Que el nombre del contrato o de sus métodos mencione una tecnología (`IHttpClient`, `ISqlRepository`, `fetchJson`). |

## 6.8 Cómo crear un contrato nuevo

Cinco pasos. Ejemplo: guardar un borrador de solicitud.

**1. Declarar el puerto** en la capa que lo necesita:

```js
// src/domain/contracts/IDraftStorage.js
import { defineContract } from './Contract.js';

/**
 * IDraftStorage — PUERTO DE SALIDA (driven port).
 *
 * Guarda y recupera el borrador de una solicitud en curso, para que el usuario
 * no pierda lo escrito si cierra la pestaña.
 *
 * Contrato:
 *  - save(draft): Promise<void>
 *  - load(): Promise<Object|null>
 *  - clear(): Promise<void>
 *
 * Capa: DOMINIO (puerto).
 */
export const IDraftStorage = defineContract('IDraftStorage', ['save', 'load', 'clear']);
```

**2. Implementar el adaptador** en infraestructura:

```js
// src/infrastructure/persistence/SessionStorageDraftStorage.js
import { IDraftStorage } from '../../domain/contracts/IDraftStorage.js';

export class SessionStorageDraftStorage extends IDraftStorage {
  async save(draft) { /* … */ }
  async load()      { /* … */ }
  async clear()     { /* … */ }
}
```

**3. Registrarlo** en el Composition Root, con verificación:

```js
container.register('draftStorage', () =>
  assertImplements(new SessionStorageDraftStorage(), IDraftStorage),
);
```

**4. Inyectarlo** donde se necesite, verificando de nuevo en el constructor:

```js
constructor({ draftStorage }) {
  assertImplements(draftStorage, IDraftStorage);
  this.#draftStorage = draftStorage;
}
```

**5. Documentarlo**: añadir la fila a §6.6 de este documento y al índice
alfabético de [`master.md`](./master.md).

## 6.9 Limitaciones honestas de este enfoque

Lo que **sí** garantiza: que los métodos declarados existen y no son los
abstractos, y que eso se comprueba al arrancar.

Lo que **no** garantiza:

| Limitación | Mitigación en este proyecto |
|---|---|
| No verifica aridad ni tipos de los parámetros | JSDoc en cada método del adaptador; las suites de verificación ejercitan las firmas reales |
| No verifica el tipo de retorno | Los tests comprueban forma y valores (`result.isSuccess`, `products.length === 5`) |
| No verifica propiedades, solo métodos | Los contratos se diseñan solo con métodos; los getters de conveniencia (`IntlMoneyFormatter.locale`) quedan fuera del contrato a propósito |
| Un adaptador podría implementar el método y devolver basura | Es el límite de cualquier verificación en ejecución; para eso están las pruebas de [19](./19-pruebas-y-verificacion.md) |

Con TypeScript se ganaría verificación estática de tipos, a cambio de un build.
La decisión fue mantener el proyecto sin build, y compensar con verificación en
arranque + JSDoc + suites.

## 6.10 Siguiente lectura

- [07 — Entidades](./07-entidades.md)
- [11 — Adaptadores de infraestructura](./11-adaptadores-de-infraestructura.md)
- [13 — Inyección de dependencias](./13-inyeccion-de-dependencias.md)
