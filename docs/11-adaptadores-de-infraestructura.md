[← Volver al índice maestro](./master.md)

# 11 — Adaptadores de infraestructura

## 11.1 Qué va en esta capa

Todo lo que **sabe de una tecnología concreta**: `Intl`, `Date`, `crypto`,
`console`, `localStorage`, el DOM, la History API. Y nada más.

Regla de reconocimiento: si un archivo de `src/infrastructure/` no extiende un
contrato, algo va mal — con dos excepciones legítimas, ambas presentes aquí:

| Excepción | Por qué es legítima |
|---|---|
| `StaticCreditProductDataSource` | Son datos puros, sin comportamiento. No hay nada que abstraer. |
| `CreditProductFactory` | Es un traductor sin estado. Su "contrato" es su firma estática. |

## 11.2 Los 10 adaptadores

| Adaptador | Implementa | Tecnología que encapsula |
|---|---|---|
| `InMemoryCreditProductRepository` | `ICreditProductRepository` | array en memoria |
| `StaticAmountRangeProvider` | `IAmountRangeProvider` | array en memoria |
| `LocalStorageCreditApplicationRepository` | `ICreditApplicationRepository` | `Map` + `localStorage` |
| `IntlMoneyFormatter` | `IMoneyFormatter` | `Intl.NumberFormat` |
| `SystemClock` | `IClock` | `Date` |
| `CryptoIdGenerator` | `IIdGenerator` | `crypto.randomUUID` / `getRandomValues` |
| `ConsoleLogger` | `ILogger` | `console` |
| `ToastNotifier` | `INotifier` | DOM |
| `HistoryRouter` | `IRouter` | History API + delegación de eventos |
| `CreditProductFactory` | — (traductor) | formato del proveedor de datos |

---

## 11.3 Persistencia

### `StaticCreditProductDataSource` — la única fuente de datos

`src/infrastructure/persistence/datasources/StaticCreditProductDataSource.js`

Réplica literal del catálogo original. Formato crudo a propósito: claves en
español y números planos, tal como los devolvía el bundle.

```js
export const STATIC_CREDIT_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 2,
    nombre: 'Crédito Vehículo',
    descripcion: 'Financia tu carro nuevo o usado con las mejores tasas del mercado y plazos flexibles.',
    montoMin: 5_000_000,
    montoMax: 120_000_000,
    tasa: 14.2,
    plazo: 84,
    requisitos: 'Mayor de 21 años, licencia de conducción, carta laboral.',
    icon: '🚗',
    palette: 'emerald',
  }),
  // …4 más
]);
```

Exporta tres constantes:

| Constante | Contenido |
|---|---|
| `STATIC_CREDIT_PRODUCTS` | Los 6 productos |
| `STATIC_AMOUNT_RANGES` | Los 5 rangos del filtro |
| `STATIC_TERM_OPTIONS` | `[12, 24, 36, 48, 60]` |

**Es el único archivo que hay que sustituir** para pasar de datos estáticos a una
API real. Que el formato sea crudo (y no ya el del dominio) es deliberado:
simula lo que devolvería un backend, de modo que el traductor
(`CreditProductFactory`) exista desde el primer día y no haya que introducirlo
después.

Todo está congelado en dos niveles: el array y cada objeto. Un consumidor
descuidado no puede mutar el catálogo.

### `CreditProductFactory` — anticorruption layer

`src/infrastructure/persistence/factories/CreditProductFactory.js`

Traduce el registro crudo a la entidad de dominio con sus value objects:

```js
static fromRaw(raw) {
  return new CreditProduct({
    id: raw.id,
    name: raw.nombre,
    description: raw.descripcion,
    amountRange: new AmountRange(
      Money.of(raw.montoMin),
      raw.montoMax === null || raw.montoMax === undefined ? null : Money.of(raw.montoMax),
    ),
    interestRate: InterestRate.ofAnnualPercentage(raw.tasa),
    maxTerm: Term.ofMonths(raw.plazo),
    requirements: raw.requisitos,
    theme: ProductTheme.of(raw.icon, raw.palette),
  });
}

static fromRawList(rawList) {
  return rawList.map((raw) => CreditProductFactory.fromRaw(raw));
}
```

El patrón se llama *anticorruption layer* (Eric Evans): una frontera que impide
que el vocabulario y las rarezas del proveedor externo contaminen el dominio.

Beneficio concreto: si mañana la API devuelve

```json
{ "product_id": 2, "display_name": "…", "min_amount": 5000000, "annual_rate_bps": 1420 }
```

cambia **este archivo y solo este**. `CreditProduct`, los value objects, los 5
casos de uso y las 6 vistas quedan intactos.

Y hay un beneficio de segundo orden: como la traducción pasa por los
constructores de los value objects, **datos corruptos del proveedor fallan en la
frontera**. Un `tasa: 1420` (puntos base en vez de porcentaje) lanza
`RATE_OUT_OF_BOUNDS` al arrancar, no produce cálculos silenciosamente erróneos.

### `InMemoryCreditProductRepository`

```js
export class InMemoryCreditProductRepository extends ICreditProductRepository {
  #products;

  constructor({ dataSource = STATIC_CREDIT_PRODUCTS } = {}) {
    super();
    this.#products = CreditProductFactory.fromRawList(dataSource);
  }

  async findAll() {
    return [...this.#products];               // copia defensiva
  }

  async findById(id) {
    return this.#products.find((p) => String(p.id) === String(id)) ?? null;
  }

  async findByCriteria(criteria) {
    if (!criteria || typeof criteria.isSatisfiedBy !== 'function') {
      return [...this.#products];
    }
    return this.#products.filter((product) => criteria.isSatisfiedBy(product));
  }

  async count() {
    return this.#products.length;
  }
}
```

Cuatro decisiones:

1. **`async` aunque no haya E/S.** Es una decisión de contrato, no de
   implementación: sustituir esto por un adaptador HTTP no debe romper a ningún
   consumidor. Ver [05 §5.3](./05-principios-solid.md).
2. **Copias defensivas.** `[...this.#products]`: si un consumidor hace `.sort()`
   sobre el resultado, no reordena el catálogo interno.
3. **`dataSource` inyectable.** Un test puede pasar dos productos en lugar de
   cinco sin tocar el archivo de datos.
4. **`findByCriteria` delega en el criterio.** El repositorio no conoce las reglas
   de coincidencia: pregunta `criteria.isSatisfiedBy(product)`. Añadir un filtro
   nuevo no toca este archivo.

### `StaticAmountRangeProvider`

```js
export class StaticAmountRangeProvider extends IAmountRangeProvider {
  #ranges;

  constructor({ dataSource = STATIC_AMOUNT_RANGES } = {}) {
    super();
    this.#ranges = dataSource.map((raw) => AmountRange.of(raw.min, raw.max, raw.label));
  }

  async all() { return [...this.#ranges]; }

  async byIndex(index) {
    const position = Number(index);
    if (!Number.isInteger(position)) return null;
    return this.#ranges[position] ?? null;
  }
}
```

`byIndex` valida que el índice sea entero antes de indexar: el valor llega de un
`<select>` como string, y `Number('abc')` es `NaN`. Devuelve `null` en lugar de
`undefined` para que el contrato sea explícito.

### `LocalStorageCreditApplicationRepository`

```js
export class LocalStorageCreditApplicationRepository extends ICreditApplicationRepository {
  static #STORAGE_KEY = 'creditsmart:applications';

  #memory = new Map();
  #idGenerator;
  #storage;

  constructor({ idGenerator, storage = LocalStorageCreditApplicationRepository.#safeStorage() }) {
    super();
    assertImplements(idGenerator, IIdGenerator);
    this.#idGenerator = idGenerator;
    this.#storage = storage;
  }

  nextIdentity() { return this.#idGenerator.generate('app'); }

  async save(application) {
    this.#memory.set(application.id, application);
    this.#persist();
    return application;
  }

  async findById(id) { return this.#memory.get(id) ?? null; }
  async findAll()    { return [...this.#memory.values()]; }
}
```

#### Degradación segura de `localStorage`

```js
static #safeStorage() {
  try {
    const probe = '__creditsmart_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
```

No basta comprobar `typeof localStorage !== 'undefined'`: en modo privado de
Safari el objeto existe pero `setItem` lanza. La prueba de escritura real es la
única fiable.

Si devuelve `null`, el repositorio funciona **solo en memoria** y sigue cumpliendo
su contrato:

```js
#persist() {
  if (!this.#storage) return;
  try {
    const payload = [...this.#memory.values()].map((app) => app.toJSON());
    this.#storage.setItem(LocalStorageCreditApplicationRepository.#STORAGE_KEY,
                          JSON.stringify(payload));
  } catch {
    // Cuota o modo privado: la solicitud sigue viva en memoria.
  }
}
```

Perder la persistencia no debe impedir radicar una solicitud. El `catch` vacío
está comentado explicando por qué es intencional.

Este parámetro inyectable es también lo que permite probar sin navegador:

```js
new LocalStorageCreditApplicationRepository({ idGenerator, storage: null });
```

#### Lo que se guarda

Se persiste `application.toJSON()`, no la entidad. Rehidratar entidades completas
exigiría un mapper inverso que nadie usa todavía: se documentó la decisión en el
propio archivo en lugar de escribir código especulativo.

```js
readRawHistory() {
  if (!this.#storage) return [];
  try {
    const raw = this.#storage.getItem(LocalStorageCreditApplicationRepository.#STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```

---

## 11.4 Formateo

### `IntlMoneyFormatter`

```js
constructor({ locale = 'es-CO', currency = 'COP' } = {}) {
  super();
  this.#formatter = new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 0,
  });
  this.#compactFormatter = new Intl.NumberFormat(locale, {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  });
}
```

Configuración idéntica a la del original. Salida real: `$ 1.000.000`.

**Optimización deliberada**: las dos instancias de `Intl.NumberFormat` se crean
una vez y se reutilizan. Crear un `Intl.NumberFormat` es caro (carga datos de
locale), y el catálogo lo invoca dos veces por tarjeta — 10 llamadas por render
del catálogo, y el simulador re-renderiza en cada tecla.

```js
static #toNumber(money) {
  if (typeof money === 'number') return money;
  if (money && typeof money.amount === 'number') return money.amount;
  return Number(money) || 0;
}
```

Acepta `Money` o número crudo. El adaptador es tolerante en la entrada y estricto
en la salida.

---

## 11.5 Servicios técnicos

### `SystemClock`

```js
export class SystemClock extends IClock {
  now()       { return new Date(); }
  timestamp() { return Date.now(); }
}
```

Cuatro líneas útiles. Su valor no está en lo que hace, sino en lo que **permite**:
un `FixedClock` de la misma longitud hace deterministas todas las pruebas que
involucran fechas.

```js
class FixedClock extends IClock {
  constructor(date) { super(); this.#date = date; }
  now()       { return new Date(this.#date.getTime()); }
  timestamp() { return this.#date.getTime(); }
}
```

### `CryptoIdGenerator`

```js
generate(prefix = 'id') {
  return `${prefix}_${this.#randomPart()}`;
}

#randomPart() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '');
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}
```

Tres niveles de degradación. `crypto.randomUUID` solo existe en contextos seguros
(HTTPS o localhost); en HTTP plano de una red local, `getRandomValues` sigue
disponible. El último recurso no es criptográficamente seguro, y eso está bien:
generar una identidad **nunca debe tumbar el flujo de radicación**.

`globalThis.crypto` en lugar de `window.crypto`: funciona igual en navegador y en
Node, lo que permite ejecutar la suite de dominio fuera del navegador.

### `ConsoleLogger`

```js
const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });

#write(level, method, message, context) {
  if (LEVELS[level] < this.#minLevel) return;
  const label = `[${this.#prefix}] ${message}`;
  if (context === undefined) console[method](label);
  else console[method](label, context);
}
```

El nivel mínimo viene de `AppConfig.logLevel`. Subirlo a `'warn'` en producción no
requiere tocar ningún caso de uso. El nivel `silent` permite silenciar el logger
en pruebas:

```js
const logger = new ConsoleLogger({ level: 'silent' });
```

Salida real: `[CreditSmart] Solicitud radicada { reference: 'CS-190ED978', … }`

### `ToastNotifier`

Único adaptador de notificación que toca el DOM.

```js
#push(variant, title, message) {
  if (!this.#container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');

  if (title) {
    const heading = document.createElement('div');
    heading.className = 'toast__title';
    heading.textContent = title;
    toast.appendChild(heading);
  }

  const body = document.createElement('div');
  // textContent, nunca innerHTML: el mensaje puede contener datos del usuario.
  body.textContent = message;
  toast.appendChild(body);

  this.#container.appendChild(toast);
  window.setTimeout(() => { toast.remove(); }, this.#timeoutMs);
}
```

Tres decisiones:

1. **`textContent`, nunca `innerHTML`.** El mensaje incluye el nombre del
   solicitante (*"Juan, tu solicitud quedó radicada…"*), es decir, entrada del
   usuario. Con `innerHTML` sería un vector de XSS.
2. **`role="alert"` para errores, `role="status"` para el resto.** `alert` es
   asertivo (interrumpe al lector de pantalla); `status` es polite. El contenedor
   `#notifications` es `aria-live="polite"`.
3. **Degrada si no hay contenedor** (`if (!this.#container) return`): en un test
   sin DOM el notifier no explota.

---

## 11.6 Enrutado

`HistoryRouter` es el adaptador más grande y tiene su propio documento:
[14 — Enrutado y URLs](./14-enrutado-y-urls.md).

---

## 11.7 Reglas de la capa de infraestructura

| Regla | Motivo |
|---|---|
| Todo archivo extiende un contrato (salvo datasource y factory) | Si no implementa un puerto, no es un adaptador |
| El contrato se importa del dominio o de la aplicación, nunca se define aquí | El puerto pertenece a quien tiene la necesidad |
| Métodos `async` si el contrato lo es, aunque no haya E/S | Sustituibilidad (Liskov) |
| Copias defensivas al devolver colecciones | Evita mutación accidental del estado interno |
| Degradar antes que fallar, cuando la funcionalidad no es esencial | `localStorage`, `crypto`, contenedor de toasts |
| Todo `catch` vacío lleva comentario explicando por qué | Un silencio sin justificar es un bug esperando |
| Nada de reglas de negocio | Van al dominio |
| La configuración entra por constructor, no se lee de global | Testeable, y un solo lugar de verdad (`AppConfig`) |

## 11.8 Cómo sustituir un adaptador: de estático a HTTP

Ejemplo completo. **1. El adaptador nuevo:**

```js
// src/infrastructure/persistence/HttpCreditProductRepository.js
import { ICreditProductRepository } from '../../domain/contracts/ICreditProductRepository.js';
import { CreditProductFactory } from './factories/CreditProductFactory.js';

/**
 * HttpCreditProductRepository — ADAPTADOR de `ICreditProductRepository`.
 *
 * Capa: INFRAESTRUCTURA (adaptador de persistencia).
 */
export class HttpCreditProductRepository extends ICreditProductRepository {
  #baseUrl;
  #cache = null;

  constructor({ baseUrl }) {
    super();
    this.#baseUrl = baseUrl;
  }

  async findAll() {
    if (this.#cache) return [...this.#cache];
    const response = await fetch(`${this.#baseUrl}/products`);
    if (!response.ok) throw new Error(`El catálogo respondió ${response.status}.`);
    this.#cache = CreditProductFactory.fromRawList(await response.json());
    return [...this.#cache];
  }

  async findById(id) {
    const all = await this.findAll();
    return all.find((p) => String(p.id) === String(id)) ?? null;
  }

  async findByCriteria(criteria) {
    // El criterio de dominio se traduce a query del servidor.
    const params = new URLSearchParams();
    if (criteria?.query) params.set('q', criteria.query);
    if (criteria?.amountRange && !criteria.amountRange.isUnbounded) {
      params.set('min', String(criteria.amountRange.min.amount));
      if (criteria.amountRange.max) params.set('max', String(criteria.amountRange.max.amount));
    }
    const response = await fetch(`${this.#baseUrl}/products?${params}`);
    if (!response.ok) throw new Error(`La búsqueda respondió ${response.status}.`);
    return CreditProductFactory.fromRawList(await response.json());
  }

  async count() {
    return (await this.findAll()).length;
  }
}
```

**2. Añadir la URL a la configuración:**

```js
// src/config/AppConfig.js
apiBaseUrl: '/api',
```

**3. Cambiar el registro:**

```js
// src/config/dependencies.js
container.register('productRepository', (c) =>
  assertImplements(
    new HttpCreditProductRepository({ baseUrl: c.resolve('config').apiBaseUrl }),
    ICreditProductRepository,
  ),
);
```

**Eso es todo.** No cambian: los 6 casos de uso, los 4 controladores, las 6
vistas, las 2 entidades, los 10 value objects, el mapper, el router.

Si el formato de la API difiere del datasource, se ajusta `CreditProductFactory`
(o se crea una segunda factory y se elige en el adaptador). El dominio no se
enteraría tampoco de eso.

## 11.9 Siguiente lectura

- [12 — Vistas, controladores y componentes](./12-vistas-controladores-componentes.md)
- [14 — Enrutado y URLs](./14-enrutado-y-urls.md)
- [18 — Guía de extensión](./18-guia-de-extension.md)
