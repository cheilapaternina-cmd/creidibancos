[← Volver al índice maestro](./master.md)

# 09 — Servicios, criterios y errores del dominio

Tres piezas del núcleo que no son entidades ni value objects.

---

## 9.1 Servicios de dominio

### Cuándo una regla NO cabe en una entidad

Regla de decisión:

```
¿La regla necesita datos de UNA sola entidad?
 └─ SÍ → método de esa entidad     (CreditProduct.admitsAmount)

¿Necesita datos de DOS o más entidades?
 └─ SÍ → servicio de dominio       (CreditApplicationPolicy, CreditSimulationService)

¿No necesita ninguna entidad, solo transforma datos?
 └─ Probablemente sea un value object o un helper, no un servicio
```

El error común es crear servicios para todo (`CreditProductService`,
`ApplicationService`) y dejar las entidades como sacos de datos sin
comportamiento — el *anemic domain model*. Aquí hay **dos** servicios de
dominio, uno por cada regla que cruza conceptos:

| Servicio | Qué cruza | Responde a |
|---|---|---|
| `CreditApplicationPolicy` | `CreditApplication` × `CreditProduct` | ¿Se puede radicar esta solicitud? |
| `CreditSimulationService` | `CreditProduct` × `Money` × `Term` | ¿Cuánto pagaría por este crédito? |

### `CreditApplicationPolicy`

`src/domain/services/CreditApplicationPolicy.js` · stateless, métodos estáticos,
sin dependencias.

Cruza `CreditApplication` × `CreditProduct`: verifica que lo que pide el
solicitante sea compatible con lo que ofrece el producto.

#### `assertAdmissible(application, product)`

```js
static assertAdmissible(application, product) {
  if (!(application instanceof CreditApplication)) {
    throw new TypeError('assertAdmissible espera una CreditApplication.');
  }
  if (!product) {
    // Sin producto de referencia no hay reglas cruzadas que aplicar.
    return;
  }

  const requested = application.requestedCredit;

  // Mismo diagnóstico que usa el simulador: si cambian los límites de un
  // producto, ambas rutas lo reflejan sin tocar dos sitios.
  const errors = CreditSimulationService.productFieldErrors(
    product,
    requested.amount,
    requested.term,
  );

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'La solicitud no cumple las condiciones del producto.');
  }
}
```

Detalles de diseño:

- **Delega en las entidades.** No implementa la comparación de rangos:
  `productFieldErrors` pregunta `product.admitsAmount(...)` y
  `product.admitsTerm(...)`. El servicio orquesta, las entidades deciden.
- **El diagnóstico se comparte con el simulador.** El mapa de errores lo produce
  `CreditSimulationService.productFieldErrors`, y cada consumidor lo envuelve con
  su propio encabezado: "La solicitud no cumple las condiciones del producto" al
  radicar, "No se puede simular con esos datos" al simular. Un límite de producto
  que cambie se refleja en las dos rutas a la vez.
- **Las claves de `errors` son los `name` de los campos del formulario**
  (`amount`, `termInMonths`). Así el `ValidationError` viaja intacto hasta la
  vista, que marca el input correspondiente. El dominio no conoce el formulario,
  pero sí acuerda un vocabulario de campos con la aplicación.
- **`toLocaleString` en el mensaje** es la única concesión a la localización
  dentro del dominio, y es deliberada: el mensaje de error *es* contenido de
  negocio dirigido al usuario.
- **Si no hay producto, no valida.** El caso de uso podría no encontrarlo; en ese
  caso las reglas cruzadas no aplican y las de cada value object ya se ejecutaron.

Mensaje real de la suite:

```
El monto debe estar entre $5.000.000 y $120.000.000 para Crédito Vehículo.
```

#### `assessAffordability(application, product)`

```js
static assessAffordability(application, product) {
  const { amount, term } = application.requestedCredit;

  // La fórmula de la cuota vive en CreditSimulationService y solo ahí: aquí
  // se consume para que la solicitud y el simulador no puedan discrepar.
  const estimatedInstallment = CreditSimulationService.monthlyInstallmentAmount(
    amount.amount,
    product.interestRate.monthlyFraction,
    term.months,
  );

  const ceiling = application.employmentInfo.maxAffordableInstallment.amount;

  return {
    affordable: estimatedInstallment <= ceiling,
    estimatedInstallment: Math.round(estimatedInstallment),
    ceiling,
  };
}
```

Composición de tres reglas que viven en tres sitios distintos:

| Regla | Dónde vive |
|---|---|
| Tasa mensual equivalente a partir de la E.A. | `InterestRate.monthlyFraction` |
| Techo de cuota = 40 % del ingreso | `EmploymentInfo.maxAffordableInstallment` |
| Cuota fija del sistema francés | `CreditSimulationService.monthlyInstallmentAmount` |

Este método **no** reimplementa la cuota: la pide. Antes la fórmula estaba
escrita aquí y volvió a hacer falta al construir el simulador; duplicarla habría
permitido que la cifra del estudio de capacidad de pago y la del simulador se
separaran con cualquier ajuste posterior. Verificado en la suite:

```
ok  : CreditApplicationPolicy y el simulador comparten la fórmula de la cuota
```

**No lanza**: devuelve un informe. Superar el 40 % no invalida la solicitud, es
un aviso para el estudio. La diferencia entre "no se puede" y "hay que mirarlo"
se modela como excepción vs. valor de retorno.

Resultado real de la suite (50 M a 60 meses al 14,2 % E.A., ingreso 3,5 M):

```
cuota estimada: 1146680 | tope: 1400000 | viable: true
```

---

### `CreditSimulationService`

`src/domain/services/CreditSimulationService.js` · stateless, métodos estáticos,
sin dependencias.

Cruza `CreditProduct` × `Money` × `Term`: dado un producto, un capital y un
plazo, produce el `AmortizationPlan` completo. Es el **único sitio del proyecto
donde vive la fórmula de la cuota**.

#### `simulate(product, amount, term)`

```js
static simulate(product, amount, term) {
  CreditSimulationService.assertSimulable(product, amount, term);

  const monthlyRate = product.interestRate.monthlyFraction;
  const installmentAmount = Math.round(
    CreditSimulationService.monthlyInstallmentAmount(amount.amount, monthlyRate, term.months),
  );

  return AmortizationPlan.of({
    principal: amount,
    interestRate: product.interestRate,
    term,
    installment: Money.of(installmentAmount, amount.currency),
    schedule: CreditSimulationService.#buildSchedule({ … }),
  });
}
```

#### `monthlyInstallmentAmount(principal, monthlyRate, months)`

Cuota fija del sistema francés, **sin redondear**:

```
C = P · i / (1 - (1 + i)^-n)
```

Con `i = 0` degenera en el reparto lineal `P / n`, lo que evita una división por
cero. Es un método público y no un detalle privado porque tiene **dos
consumidores**: la simulación y `CreditApplicationPolicy.assessAffordability`.

#### Redondeo: la última cuota absorbe el residuo

`Money` guarda enteros, así que cada cuota y cada interés se redondean al peso.
Repetido 240 veces eso acumula un descuadre. La decisión:

```js
for (let number = 1; number <= months; number += 1) {
  const interest = Math.round(balance * monthlyRate);

  let capital;
  if (number === months) {
    capital = balance;                      // liquida el saldo y absorbe el residuo
  } else {
    capital = installmentAmount - interest;
    if (capital > balance) capital = balance;   // blindaje ante la deriva
  }

  balance -= capital;
  schedule.push(Installment.of({ … }));
}
```

Es lo que hace la banca, y garantiza las dos invariantes que `AmortizationPlan`
comprueba después: la suma de capital es exactamente el capital prestado y el
saldo final es cero.

Verificado con el catálogo real:

| Producto | Capital | Plazo | Cuota | Última cuota | Saldo final |
|---|---|---|---|---|---|
| Libre Inversión (18,5 % E.A.) | $10.000.000 | 36 m | $357.000 | $356.984 | $0 |
| Vivienda (11,8 % E.A.) | $300.000.000 | 240 m | $3.138.761 | $3.139.123 | $0 |

Si la cuota no alcanzara a cubrir los intereses —el crédito nunca se
amortizaría— se lanza `NON_AMORTIZING_INSTALLMENT` en vez de producir una tabla
sin sentido.

#### `productFieldErrors(product, amount, term)`

Devuelve el mapa `campo → mensaje` de los desencajes entre lo pedido y lo que el
producto ofrece. **Devuelve en vez de lanzar** porque hay dos consumidores que
necesitan el mismo diagnóstico con distinto encabezado: `assertSimulable` (que sí
lanza, con "No se puede simular con esos datos") y
`CreditApplicationPolicy.assertAdmissible`.

Las claves son `amount` y `termInMonths`: los mismos `name` de los campos del
formulario, para que el `ValidationError` llegue intacto hasta el input correcto.

---

## 9.2 Criterios: el patrón Specification

### `ProductSearchCriteria`

`src/domain/criteria/ProductSearchCriteria.js` · value object + Specification.

Encapsula los filtros del simulador: texto libre y rango de monto.

```js
export class ProductSearchCriteria {
  #query;
  #amountRange;

  constructor({ query = '', amountRange = null } = {}) {
    this.#query = String(query ?? '').trim();
    this.#amountRange = amountRange instanceof AmountRange ? amountRange : null;
    Object.freeze(this);
  }

  static empty() { return new ProductSearchCriteria(); }

  get isEmpty() {
    return this.#query === '' && (this.#amountRange === null || this.#amountRange.isUnbounded);
  }

  withQuery(query)             { return new ProductSearchCriteria({ query, amountRange: this.#amountRange }); }
  withAmountRange(amountRange) { return new ProductSearchCriteria({ query: this.#query, amountRange }); }

  isSatisfiedBy(product) {
    if (!product.matchesName(this.#query)) return false;
    if (this.#amountRange && !product.matchesAmountRange(this.#amountRange)) return false;
    return true;
  }
}
```

### Por qué Specification y no un `filter` en el repositorio

Sin el patrón, el repositorio tendría un método por combinación de filtros:

```js
// ❌ Explosión combinatoria
findByName(query) { … }
findByRange(range) { … }
findByNameAndRange(query, range) { … }
findByNameAndRangeAndRate(query, range, maxRate) { … }
```

Con Specification, el repositorio tiene **un** método y el criterio es un objeto
componible:

```js
async findByCriteria(criteria) {
  if (!criteria || typeof criteria.isSatisfiedBy !== 'function') {
    return [...this.#products];
  }
  return this.#products.filter((product) => criteria.isSatisfiedBy(product));
}
```

Añadir un filtro por tasa máxima es añadir un campo a `ProductSearchCriteria` y
una línea a `isSatisfiedBy`. El repositorio no cambia.

### Inmutabilidad con `withX`

Los métodos `withQuery` y `withAmountRange` devuelven instancias nuevas, lo que
permite construir criterios por pasos sin efectos colaterales:

```js
const criteria = ProductSearchCriteria.empty()
  .withQuery('vehiculo')
  .withAmountRange(rangoElegido);
```

### `isEmpty` y para qué sirve

Determina si hay filtros activos. `SearchCreditProductsUseCase` lo expone como
`isFiltered`, y `SimulatorView` usa ese dato para mostrar u ocultar el contador
"Mostrando N de M productos".

Verificado: `ok : sin filtros -> isFiltered false`.

### El mismo criterio, otra implementación mañana

Hoy `isSatisfiedBy` se evalúa en memoria. Con un backend, el mismo objeto se
traduce a query en el adaptador HTTP, **sin tocar el caso de uso**:

```js
// Futuro HttpCreditProductRepository
async findByCriteria(criteria) {
  const params = new URLSearchParams();
  if (criteria.query) params.set('q', criteria.query);
  if (criteria.amountRange && !criteria.amountRange.isUnbounded) {
    params.set('min', criteria.amountRange.min.amount);
    if (criteria.amountRange.max) params.set('max', criteria.amountRange.max.amount);
  }
  const response = await fetch(`${this.#baseUrl}/products?${params}`);
  return CreditProductFactory.fromRawList(await response.json());
}
```

Esa es la ventaja concreta de que el criterio sea un objeto de dominio y no tres
argumentos primitivos.

---

## 9.3 Jerarquía de errores

```
Error  (nativo)
└── DomainError                    código + detalles + toJSON()
    ├── NotImplementedError        método de contrato sin implementar
    ├── ValidationError            mapa campo → mensaje
    └── ContractViolationError     adaptador que no cumple su puerto
```

Todos heredan de `DomainError`, lo que permite a las capas externas distinguir un
fallo de negocio de un fallo técnico sin comparar mensajes:

```js
if (err instanceof DomainError) { /* fallo de negocio: mostrar al usuario */ }
else                            { /* fallo técnico: registrar y avisar */ }
```

### `DomainError` — la base

`src/domain/errors/DomainError.js`

```js
export class DomainError extends Error {
  constructor(message, { code = 'DOMAIN_ERROR', details = {} } = {}) {
    super(message);
    this.name = new.target.name;             // ① nombre real de la subclase
    this.code = code;                        // ② código estable
    this.details = Object.freeze({ ...details });   // ③ contexto inmutable

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);    // ④ stack limpio
    }
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message, details: this.details };
  }
}
```

| # | Decisión | Por qué |
|---|---|---|
| ① | `this.name = new.target.name` | Sin esto, todas las subclases se llamarían `Error`. Con esto, `ValidationError` se identifica a sí mismo. |
| ② | `code` estable | El mensaje puede reescribirse o traducirse; el código no. El código de programación se ramifica por `code`, nunca por texto. |
| ③ | `details` congelado | Contexto estructurado para logs, sin riesgo de que alguien lo mute después. |
| ④ | `captureStackTrace` | Elimina el constructor del error de la traza: el stack apunta a donde se lanzó, no a `DomainError`. |

### Catálogo de códigos de error

| `code` | Lanzado por | Cuándo |
|---|---|---|
| `INVALID_MONEY_AMOUNT` | `Money` | Importe no finito |
| `NEGATIVE_MONEY_AMOUNT` | `Money` | Importe negativo |
| `INVALID_MONEY_OPERAND` | `Money` | Comparar con algo que no es `Money` |
| `CURRENCY_MISMATCH` | `Money` | Operar monedas distintas |
| `INVALID_RATE` | `InterestRate` | Tasa no finita |
| `RATE_OUT_OF_BOUNDS` | `InterestRate` | Tasa fuera de [0, 100] |
| `INVALID_TERM` | `Term` | Plazo no entero o ≤ 0 |
| `INVALID_RANGE_MIN` / `INVALID_RANGE_MAX` | `AmountRange` | Extremo que no es `Money` |
| `INVERTED_RANGE` | `AmountRange` | `max < min` |
| `INVALID_THEME_ICON` | `ProductTheme` | Icono vacío |
| `INVALID_THEME_PALETTE` | `ProductTheme` | Paleta no admitida |
| `PRODUCT_ID_REQUIRED` · `PRODUCT_NAME_REQUIRED` | `CreditProduct` | Campos obligatorios |
| `PRODUCT_RANGE_INVALID` · `PRODUCT_RATE_INVALID` · `PRODUCT_TERM_INVALID` · `PRODUCT_THEME_INVALID` | `CreditProduct` | Value object del tipo equivocado |
| `APPLICATION_ID_REQUIRED` | `CreditApplication` | Id ausente |
| `APPLICATION_APPLICANT_INVALID` · `APPLICATION_CREDIT_INVALID` · `APPLICATION_EMPLOYMENT_INVALID` | `CreditApplication` | Value object del tipo equivocado |
| `APPLICATION_DATE_INVALID` | `CreditApplication` | Fecha no válida |
| `APPLICATION_STATUS_UNKNOWN` | `CreditApplication` | Estado fuera del enum |
| `APPLICATION_ALREADY_SUBMITTED` | `CreditApplication.submit()` | Doble envío |
| `APPLICATION_INVALID_TRANSITION` | `CreditApplication.moveToReview()` | Transición no permitida |
| `INSTALLMENT_NOT_BALANCED` | `Installment` | La cuota no es interés + capital |
| `INVALID_INSTALLMENT_NUMBER` · `INVALID_INSTALLMENT_AMOUNT` | `Installment` | Nº no entero >0 · importe que no es `Money` |
| `PLAN_LENGTH_MISMATCH` · `PLAN_OUT_OF_ORDER` | `AmortizationPlan` | Nº de cuotas ≠ plazo · numeración con huecos |
| `PLAN_CAPITAL_MISMATCH` · `PLAN_NOT_SETTLED` | `AmortizationPlan` | El capital no cuadra · el saldo final no es cero |
| `INVALID_PLAN_PRINCIPAL` · `INVALID_PLAN_RATE` · `INVALID_PLAN_TERM` · `INVALID_PLAN_INSTALLMENT` · `INVALID_PLAN_SCHEDULE` | `AmortizationPlan` | Argumento del tipo equivocado |
| `SIMULATION_PRODUCT_REQUIRED` · `SIMULATION_AMOUNT_INVALID` · `SIMULATION_TERM_INVALID` | `CreditSimulationService` | Argumento del tipo equivocado |
| `NON_AMORTIZING_INSTALLMENT` | `CreditSimulationService` | La cuota no cubre los intereses |
| `INVALID_INSTALLMENT_COUNT` | `CreditSimulationService` | Número de cuotas ≤ 0 |
| `VALIDATION_ERROR` | `ValidationError` | Uno o más campos inválidos |
| `NOT_IMPLEMENTED` | `NotImplementedError` | Método abstracto invocado |
| `CONTRACT_VIOLATION` | `ContractViolationError` | Adaptador incompleto |

### `ValidationError` — errores por campo

`src/domain/errors/ValidationError.js`

```js
export class ValidationError extends DomainError {
  constructor(fieldErrors = {}, message = 'La información suministrada no es válida.') {
    super(message, { code: 'VALIDATION_ERROR', details: { fieldErrors } });
    this.fieldErrors = Object.freeze({ ...fieldErrors });
  }

  get isEmpty() { return Object.keys(this.fieldErrors).length === 0; }
  get fields()  { return Object.keys(this.fieldErrors); }
}
```

Es el único error que **cruza todas las capas como dato**, no como excepción:

```
Applicant / RequestedCredit / EmploymentInfo   lanzan ValidationError
        ↓  capturados y acumulados
CreditApplicationMapper                        lanza uno solo con los 11 campos
        ↓  capturado
SubmitCreditApplicationUseCase                 → Result.fromError(err)
        ↓  como dato
ApplicationController                          → this.#state.errors
        ↓  como dato
ApplicationView                                → clase is-invalid + <span> del mensaje
```

Gracias a esto, la vista pinta el error exacto de cada campo sin conocer ninguna
regla de validación.

### `NotImplementedError`

`src/domain/errors/NotImplementedError.js`

```js
export class NotImplementedError extends DomainError {
  constructor(contractName, methodName) {
    super(
      `${contractName}.${methodName}() debe ser implementado por la clase concreta.`,
      { code: 'NOT_IMPLEMENTED', details: { contractName, methodName } },
    );
  }
}
```

Lo lanzan los métodos abstractos que genera `defineContract`. Mensaje típico:
`ICreditProductRepository.findByCriteria() debe ser implementado por la clase concreta.`

### `ContractViolationError`

Ya detallado en [06 §6.4](./06-contratos-e-interfaces.md). Es el error que hace
que las interfaces de este proyecto sean reales y no comentarios.

### Convenciones de errores

| Convención | Regla |
|---|---|
| Todo error de negocio hereda de `DomainError` | Permite `instanceof DomainError` en las capas externas |
| Todo error lleva `code` | El código es la API estable; el mensaje es para humanos |
| `details` estructurado | Nunca concatenar contexto en el mensaje: va en `details` |
| Mensajes en español, orientados al usuario | Son contenido de producto, no jerga técnica |
| Las claves de `fieldErrors` coinciden con los `name` de los inputs | Es lo que permite marcar el campo correcto sin traducción intermedia |
| No usar `throw` como flujo de control **entre capas** | Dentro del dominio sí; al cruzar a la aplicación se convierte en `Result` |

---

## 9.4 Siguiente lectura

- [10 — Casos de uso y DTOs](./10-casos-de-uso-y-dtos.md)
- [16 — Catálogo de patrones](./16-catalogo-de-patrones.md)
