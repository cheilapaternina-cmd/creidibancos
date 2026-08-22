[← Volver al índice maestro](./master.md)

# 10 — Casos de uso, DTOs y mappers

## 10.1 Qué es un caso de uso

Un caso de uso responde a *"el sistema debe poder hacer X"*. Es una **secuencia**
de pasos que orquesta el dominio y los puertos. No contiene reglas de negocio
propias: las delega.

Distinción con el dominio:

| | Dominio | Caso de uso |
|---|---|---|
| Naturaleza | Invariante ("esto siempre es verdad") | Secuencia ("para lograr X se hace A, B y C") |
| Ejemplo | "el monto debe estar dentro del rango del producto" | "para radicar una solicitud: validar, aplicar política, guardar, registrar" |
| Cambia cuando | Cambian las reglas del negocio | Cambia el proceso o el flujo |
| Dependencias | Ninguna | Puertos (repositorios, reloj, logger) |

## 10.2 El contrato común

```js
// src/application/contracts/IUseCase.js
export const IUseCase = defineContract('IUseCase', ['execute']);
```

Un solo método. Consecuencias:

- **SRP**: una clase, una operación. No hay `CreditService` con ocho métodos.
- **OCP**: cualquier caso de uso se puede decorar sin conocer su tipo concreto.
  Un `CachedUseCase` o un `LoggedUseCase` funcionaría con los cinco.
- **Testeable**: la superficie a probar es una función.

## 10.3 Los 5 casos de uso

| Caso de uso | Tipo | Dependencias | Devuelve |
|---|---|---|---|
| `ListCreditProductsUseCase` | Query | `productRepository`, `productMapper` | `Result<{ products, total }>` |
| `SearchCreditProductsUseCase` | Query | `productRepository`, `productMapper` | `Result<{ products, matched, total, criteria, isFiltered }>` |
| `GetAmountRangeFiltersUseCase` | Query | `amountRangeProvider` | `Result<Array<{ index, label }>>` |
| `GetCreditProductNamesUseCase` | Query | `productRepository` | `Result<string[]>` |
| `SubmitCreditApplicationUseCase` | Command | `applicationRepository`, `productRepository`, `clock`, `logger` | `Result<{ reference, status, applicantFirstName, affordability }>` |

Cuatro queries y un command. La separación no es formalmente CQRS, pero la
distinción es útil: las queries no mutan estado y podrían cachearse; el command
sí muta y por eso registra en el log.

### `ListCreditProductsUseCase`

El más simple. Sirve la ruta `/`.

```js
export class ListCreditProductsUseCase extends IUseCase {
  #repository;
  #mapper;

  constructor({ productRepository, productMapper }) {
    super();
    assertImplements(productRepository, ICreditProductRepository);
    this.#repository = productRepository;
    this.#mapper = productMapper;
  }

  async execute() {
    try {
      const products = await this.#repository.findAll();
      return Result.ok({
        products: this.#mapper.toDTOList(products),
        total: products.length,
      });
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
```

Tres cosas a notar:

1. `assertImplements` en el constructor: si el repositorio inyectado no cumple el
   puerto, falla al construirse (y como `main.js` construye todo el grafo al
   arrancar, falla al cargar la página).
2. **Nunca devuelve entidades.** Pasa por el mapper. Si devolviera
   `CreditProduct`, la vista podría llamar a `product.admitsAmount(...)`.
3. El `try/catch` convierte cualquier excepción en `Result.fail`. El controlador
   no necesita `try/catch`.

### `SearchCreditProductsUseCase`

Traduce entrada primitiva a criterio de dominio y delega.

```js
async execute({ query = '', amountRange = null } = {}) {
  try {
    const criteria = new ProductSearchCriteria({ query, amountRange });
    const products = await this.#repository.findByCriteria(criteria);
    const total = await this.#repository.count();

    return Result.ok({
      products: this.#mapper.toDTOList(products),
      matched: products.length,
      total,
      criteria: criteria.toJSON(),
      isFiltered: !criteria.isEmpty,
    });
  } catch (err) {
    return Result.fromError(err);
  }
}
```

`matched` y `total` alimentan el contador "Mostrando 1 de 6 productos".
`isFiltered` le dice a la vista si debe mostrarlo.

**No filtra**: construye el criterio y pregunta al repositorio. El filtrado real
es `criteria.isSatisfiedBy(product)`, que llama a `product.matchesName()` y
`product.matchesAmountRange()`. Tres capas, cada una en su sitio.

### `GetAmountRangeFiltersUseCase`

Alimenta el `<select>` de rangos:

```js
async execute() {
  try {
    const ranges = await this.#provider.all();
    return Result.ok(ranges.map((range, index) => ({ index, label: range.label })));
  } catch (err) {
    return Result.fromError(err);
  }
}
```

Devuelve `{ index, label }`, no `AmountRange`. La vista solo necesita pintar
opciones; cuando el usuario elige una, el controlador pide el value object real
con `amountRangeProvider.byIndex(...)`.

### `GetCreditProductNamesUseCase`

```js
async execute() {
  try {
    const products = await this.#repository.findAll();
    return Result.ok(products.map((product) => product.name));
  } catch (err) {
    return Result.fromError(err);
  }
}
```

Existe para eliminar una duplicación real del sitio original: allí el `<select>`
"Tipo de crédito" se alimentaba de un array `dk` escrito a mano con los cinco
nombres. Añadir un producto obligaba a acordarse de dos sitios. Aquí el select
deriva del catálogo.

### `SubmitCreditApplicationUseCase`

El único command, y el que muestra el patrón completo de orquestación.

```js
async execute(rawForm = {}) {
  try {
    // 1. Entrada cruda → value objects (acumula los 11 errores posibles)
    const { applicant, requestedCredit, employmentInfo } =
      CreditApplicationMapper.toValueObjects(rawForm);

    // 2. Construir la entidad (id del repositorio, fecha del reloj)
    const application = new CreditApplication({
      id: this.#applicationRepository.nextIdentity(),
      applicant,
      requestedCredit,
      employmentInfo,
      createdAt: this.#clock.now(),
    });

    // 3. Política de dominio contra el producto elegido
    const product = await this.#findProductByName(requestedCredit.productName);
    CreditApplicationPolicy.assertAdmissible(application, product);

    // 4. Informe de capacidad de pago (no bloquea)
    const affordability = product
      ? CreditApplicationPolicy.assessAffordability(application, product)
      : null;

    // 5. Radicar y persistir
    application.submit();
    await this.#applicationRepository.save(application);

    // 6. Rastro técnico
    this.#logger.info('Solicitud radicada', {
      reference: application.referenceNumber,
      product: requestedCredit.productName,
    });

    return Result.ok({
      reference: application.referenceNumber,
      status: application.status,
      applicantFirstName: applicant.firstName,
      affordability,
    });
  } catch (err) {
    this.#logger.warn('Solicitud rechazada en validación', { message: err?.message });
    return Result.fromError(err);
  }
}
```

Lo que este método **no** contiene: ninguna expresión regular, ningún
`if (amount > …)`, ningún cálculo financiero. Solo el orden de los pasos. Cada
regla vive en su value object, en la entidad o en la política.

Método auxiliar:

```js
async #findProductByName(name) {
  const matches = await this.#productRepository.findByCriteria(
    new ProductSearchCriteria({ query: name }),
  );
  return matches.find((product) => product.name === name) ?? matches[0] ?? null;
}
```

Reutiliza el criterio de búsqueda en lugar de añadir un `findByName` al puerto.
Primero busca coincidencia exacta; si no la hay, acepta la primera aproximada.

## 10.4 `Result` — éxito y fallo como dato

`src/application/shared/Result.js`

### Por qué no excepciones entre capas

Un error de validación **no es excepcional**: es el resultado normal y esperado de
un formulario mal rellenado. Propagarlo como excepción obliga a envolver cada
llamada en `try/catch` y hace que el flujo feliz y el de error se lean distinto.

```js
// ❌ Con excepciones en la frontera
try {
  const ref = await submitUseCase.execute(values);
  notifier.success(`Radicada: ${ref}`);
} catch (err) {
  if (err instanceof ValidationError) { this.errors = err.fieldErrors; }
  else if (err instanceof DomainError) { notifier.error(err.message); }
  else { throw err; }
}

// ✅ Con Result
const result = await submitUseCase.execute(values);
if (result.isFailure) {
  this.#state = { values, errors: result.fieldErrors };
  this.update(this.#viewModel(), this.#handlers());
  this.#notifier.error(result.error, 'No se pudo enviar la solicitud');
  return;
}
// …camino feliz
```

### La API

```js
Result.ok(value)                    // éxito con valor
Result.fail(error, fieldErrors)     // fallo con mensaje y errores por campo
Result.fromError(err)               // fallo a partir de una excepción capturada

result.isSuccess                    // boolean
result.isFailure                    // boolean
result.value                        // any | null
result.error                        // string | null
result.fieldErrors                  // Record<string,string> (congelado)
result.hasFieldErrors               // boolean
result.map(fn)                      // transforma el valor si hubo éxito
```

### `fromError` — el puente desde el dominio

```js
static fromError(err) {
  return new Result({
    success: false,
    error: err?.message ?? 'Error inesperado.',
    fieldErrors: err?.fieldErrors ?? {},
  });
}
```

Extrae `fieldErrors` si el error es un `ValidationError`, y usa `{}` si es
cualquier otro. Es lo que permite que los 11 errores de campo del formulario
lleguen intactos hasta la vista sin que ninguna capa intermedia los interprete.

### Congelado

```js
this.#fieldErrors = Object.freeze({ ...fieldErrors });
Object.freeze(this);
```

Un `Result` es inmutable: nadie puede convertir un fallo en éxito por accidente.

## 10.5 DTOs — la frontera hacia la presentación

`src/application/dto/CreditProductDTO.js`

### Por qué la vista no recibe entidades

Si `CatalogView` recibiera un `CreditProduct`, podría escribir en la plantilla:

```js
// ❌ Regla de negocio evaluada en la vista
${product.admitsAmount(Money.of(5000000)) ? 'Disponible' : 'No disponible'}
```

En ese momento la regla estaría en la vista, y la siguiente interfaz que se
escriba tendrá que reimplementarla. El DTO lo hace imposible: es plano, está
congelado y **no tiene métodos**.

### Forma del DTO

```js
{
  id: 2,
  name: 'Crédito Vehículo',
  description: 'Financia tu carro nuevo o usado con las mejores tasas…',
  requirements: 'Mayor de 21 años, licencia de conducción, carta laboral.',
  icon: '🚗',
  themeClass: 'theme-emerald',
  annualRate: 14.2,
  annualRateLabel: '14.2%',
  maxTermMonths: 84,
  maxTermLabel: '84 meses',
  minAmountLabel: '$ 5.000.000',
  maxAmountLabel: '$ 120.000.000',
  amountRangeLabel: '$ 5.000.000 – $ 120.000.000',
}
```

Decisiones:

- **Valores crudos Y etiquetas** (`annualRate: 14.2` y `annualRateLabel: '14.2%'`).
  El crudo sirve para ordenar o comparar en la UI; la etiqueta para pintar. La
  vista nunca formatea.
- **`themeClass` ya resuelto** (`theme-emerald`), no `palette: 'emerald'`. La
  vista no compone nombres de clase.
- **Congelado** con `freezeProductDTO(dto)`.

## 10.6 Mappers

### `CreditProductMapper` — entidad → DTO

```js
export class CreditProductMapper {
  #moneyFormatter;

  constructor({ moneyFormatter }) {
    assertImplements(moneyFormatter, IMoneyFormatter);
    this.#moneyFormatter = moneyFormatter;
  }

  toDTO(product) {
    const minLabel = this.#moneyFormatter.format(product.minAmount);
    const maxLabel = product.maxAmount
      ? this.#moneyFormatter.format(product.maxAmount)
      : 'Sin límite';

    return freezeProductDTO({
      id: product.id,
      name: product.name,
      // …
      themeClass: product.theme.cssClass,
      annualRateLabel: `${product.interestRate.annualPercentage}%`,
      minAmountLabel: minLabel,
      maxAmountLabel: maxLabel,
      amountRangeLabel: `${minLabel} – ${maxLabel}`,
    });
  }

  toDTOList(products) {
    return products.map((product) => this.toDTO(product));
  }
}
```

Recibe el formateador **inyectado** (`IMoneyFormatter`), nunca lo instancia: es
el punto donde el DIP se hace visible en la capa de aplicación.

### `CreditApplicationMapper` — entrada cruda → value objects

Este mapper resuelve un problema de UX concreto: **mostrar todos los errores del
formulario en una sola pasada**.

Si construyéramos los tres value objects en secuencia sin capturar, el primero
que fallara abortaría y el usuario vería solo los errores de la primera sección.
Corregiría esos, reenviaría, y aparecerían los de la segunda. Tres viajes.

```js
static toValueObjects(raw = {}) {
  const errors = {};
  let applicant = null, requestedCredit = null, employmentInfo = null;

  try {
    applicant = new Applicant({ fullName: raw.fullName, idNumber: raw.idNumber,
                                email: raw.email, phone: raw.phone });
  } catch (err) { CreditApplicationMapper.#collect(errors, err); }

  try {
    requestedCredit = new RequestedCredit({ productName: raw.productName, amount: raw.amount,
                                            termInMonths: raw.termInMonths, purpose: raw.purpose });
  } catch (err) { CreditApplicationMapper.#collect(errors, err); }

  try {
    employmentInfo = new EmploymentInfo({ companyName: raw.companyName, jobTitle: raw.jobTitle,
                                          monthlyIncome: raw.monthlyIncome });
  } catch (err) { CreditApplicationMapper.#collect(errors, err); }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Hay campos obligatorios sin completar o inválidos.');
  }

  return { applicant, requestedCredit, employmentInfo };
}

static #collect(target, err) {
  if (err instanceof ValidationError) {
    Object.assign(target, err.fieldErrors);
    return;
  }
  // Un error no esperado no debe perderse silenciosamente.
  target._form = err?.message ?? 'Error al procesar el formulario.';
}
```

Los tres `try` independientes acumulan; luego se lanza **un solo**
`ValidationError` con los 11 campos.

`#collect` tiene una rama para errores inesperados: los deposita en la clave
`_form` en vez de descartarlos. Un error tragado en silencio es peor que uno
mostrado en el sitio equivocado.

Verificado: `ok : 11 errores de campo (obtenido 11)` con
`fullName, idNumber, email, phone, productName, amount, termInMonths, purpose, companyName, jobTitle, monthlyIncome`.

## 10.7 Reglas de la capa de aplicación

| Regla | Motivo |
|---|---|
| Un caso de uso = una clase = un `execute()` | SRP; permite decorar |
| Siempre devolver `Result`, nunca lanzar | El controlador no necesita `try/catch` |
| Nunca devolver entidades ni value objects | La presentación no debe poder ejecutar reglas |
| Todo puerto se verifica con `assertImplements` en el constructor | Fallo temprano y con mensaje claro |
| Nada de `document`, `window`, `fetch`, `localStorage` | Se pide por puerto |
| Sin reglas de negocio propias | Van al dominio; aquí solo orden de pasos |
| Los comandos registran en `ILogger`; las queries no | El rastro importa cuando hay mutación |

## 10.8 Cómo añadir un caso de uso

Ejemplo: consultar el histórico de solicitudes.

```js
// src/application/usecases/ListCreditApplicationsUseCase.js
import { IUseCase } from '../contracts/IUseCase.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { ICreditApplicationRepository } from '../../domain/contracts/ICreditApplicationRepository.js';
import { Result } from '../shared/Result.js';

/**
 * ListCreditApplicationsUseCase — CASO DE USO (query).
 *
 * Devuelve el histórico de solicitudes radicadas en esta sesión.
 *
 * Capa: APLICACIÓN.
 */
export class ListCreditApplicationsUseCase extends IUseCase {
  #repository;

  constructor({ applicationRepository }) {
    super();
    assertImplements(applicationRepository, ICreditApplicationRepository);
    this.#repository = applicationRepository;
  }

  async execute() {
    try {
      const applications = await this.#repository.findAll();
      return Result.ok(
        applications.map((app) => ({
          reference: app.referenceNumber,
          status: app.status,
          productName: app.requestedCredit.productName,
          createdAtLabel: app.createdAt.toLocaleDateString('es-CO'),
        })),
      );
    } catch (err) {
      return Result.fromError(err);
    }
  }
}
```

Registrarlo:

```js
// src/config/dependencies.js
container.register('listCreditApplicationsUseCase', (c) =>
  new ListCreditApplicationsUseCase({
    applicationRepository: c.resolve('applicationRepository'),
  }),
);
```

Nota: si el mapeo a DTO crece, extráelo a `application/mappers/` en lugar de
dejarlo en línea dentro del `execute`.

## 10.9 Siguiente lectura

- [11 — Adaptadores de infraestructura](./11-adaptadores-de-infraestructura.md)
- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
