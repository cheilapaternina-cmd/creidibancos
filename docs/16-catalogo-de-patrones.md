[← Volver al índice maestro](./master.md)

# 16 — Catálogo de patrones de diseño

Los 14 patrones aplicados. Para cada uno: qué problema resuelve, dónde está, y
**qué pasaría sin él** — la última columna es la que justifica su presencia.

## 16.1 Tabla resumen

| # | Patrón | Categoría | Archivos |
|---|---|---|---|
| 1 | Ports & Adapters (Hexagonal) | Arquitectónico | Todo `contracts/` + `infrastructure/` |
| 2 | Layered / Clean Architecture | Arquitectónico | Las 4 capas de `src/` |
| 3 | MVC | Arquitectónico | `presentation/` |
| 4 | Dependency Injection + Composition Root | Estructural | `config/Container.js`, `config/dependencies.js` |
| 5 | Repository | Estructural | 3 repositorios + sus 2 puertos |
| 6 | Value Object | De dominio | 8 archivos en `domain/valueobjects/` |
| 7 | Entity + Always-Valid Domain Model | De dominio | `CreditProduct`, `CreditApplication` |
| 8 | Domain Service | De dominio | `CreditApplicationPolicy` |
| 9 | Specification / Criteria | De dominio | `ProductSearchCriteria` |
| 10 | Factory + Anticorruption Layer | Creacional | `CreditProductFactory` |
| 11 | Data Mapper + DTO | Estructural | `CreditProductMapper`, `CreditApplicationMapper`, `CreditProductDTO` |
| 12 | Template Method | De comportamiento | `BaseView`, `BaseController` |
| 13 | Decorator | Estructural | `DocumentTitleController` |
| 14 | Result / Either | De comportamiento | `application/shared/Result.js` |

Patrones menores también presentes: State (máquina de estados de
`CreditApplication`), Null Object (`storage: null` degradando a memoria), Event
Delegation (`HistoryRouter.#onDocumentClick`), Strategy implícito (las variantes
de componentes).

---

## 16.2 Ports & Adapters (Hexagonal)

**Problema.** La lógica de negocio termina dentro de la tecnología: probarla exige
un navegador, y cambiar de librería exige reescribir el negocio.

**Solución.** El núcleo declara *puertos* (interfaces) con lo que necesita; la
infraestructura provee *adaptadores*.

**Dónde.** 12 puertos en `domain/contracts/`, `application/contracts/` y
`presentation/contracts/`. 10 adaptadores en `infrastructure/`.

**Sin él.** La suite de dominio+aplicación no podría ejecutarse en Node. Cambiar
de datos estáticos a HTTP obligaría a tocar las 3 vistas.

Detalle: [02](./02-arquitectura-hexagonal.md).

---

## 16.3 Clean Architecture (capas + regla de dependencia)

**Problema.** Sin una regla explícita, las dependencias se cruzan y todo acaba
importando todo.

**Solución.** Cuatro capas, dependencias solo hacia dentro, verificables con
`grep`.

**Dónde.** `domain` ← `application` ← {`infrastructure`, `presentation`}, con
`config` como único punto que ve todo.

**Sin él.** No habría criterio objetivo para decidir dónde poner código nuevo, y
ningún `grep` podría detectar una violación.

Detalle: [03](./03-clean-architecture-capas.md).

---

## 16.4 MVC

**Problema.** Vistas que consultan datos, deciden navegación y contienen reglas.

**Solución.** La vista pinta y traduce eventos a intenciones; el controlador
guarda estado de UI e invoca casos de uso; el modelo son DTOs.

**Dónde.** `presentation/views/`, `presentation/controllers/`, DTOs de
`application/dto/`.

**Sin él.** `SimulatorView` implementaría el filtrado; la lógica se duplicaría en
cualquier interfaz nueva.

Detalle: [04](./04-mvc-presentacion.md).

---

## 16.5 Dependency Injection + Composition Root

**Problema.** Clases que hacen `new` de sus colaboradores quedan atadas a una
implementación concreta y son imposibles de probar en aislamiento.

**Solución.** Todo entra por constructor. Un único archivo ensambla el grafo.

**Dónde.** `config/Container.js` (contenedor: factorías perezosas, singletons por
clave, detección de ciclos) y `config/dependencies.js` (las 32 dependencias).

**Sin él.**

```js
// Sin DI: probar esto exige un navegador con localStorage
class SubmitCreditApplicationUseCase {
  constructor() {
    this.repo = new LocalStorageCreditApplicationRepository();
    this.clock = new SystemClock();
  }
}
```

Detalle: [13](./13-inyeccion-de-dependencias.md).

---

## 16.6 Repository

**Problema.** El acceso a datos disperso por la aplicación, con SQL o `fetch` en
medio de la lógica.

**Solución.** Una interfaz por agregado, en el lenguaje del dominio.

**Dónde.**

| Puerto | Adaptador |
|---|---|
| `ICreditProductRepository` | `InMemoryCreditProductRepository` |
| `ICreditApplicationRepository` | `LocalStorageCreditApplicationRepository` |
| `IAmountRangeProvider` | `StaticAmountRangeProvider` |

**Detalle de implementación.** Copias defensivas al devolver colecciones, y
`async` aunque no haya E/S, para que un adaptador HTTP sea sustituible sin romper
consumidores.

**Sin él.** Cada vista haría su propio `fetch` o leería el array global.

---

## 16.7 Value Object

**Problema.** *Primitive obsession*: `crearProducto(30000000, 5000000, 1850, -60)`
compila y nadie avisa de los tres errores.

**Solución.** Un tipo por concepto, inmutable, auto-validado, con igualdad por
valor.

**Dónde.** 8 archivos: `Money`, `InterestRate`, `Term`, `AmountRange`,
`ProductTheme`, `Applicant`, `RequestedCredit`, `EmploymentInfo`.

**Sin él.** Un `NaN` en un importe se propagaría silenciosamente; una tasa en
puntos base produciría cuotas erróneas; un rango invertido daría cero resultados
sin explicación.

Detalle: [08](./08-value-objects.md).

---

## 16.8 Entity + Always-Valid Domain Model

**Problema.** Objetos que pueden existir en estado inválido, y un método
`validate()` que alguien olvida llamar.

**Solución.** El constructor es la única puerta y lanza si algo falla. Campos
privados, getters de solo lectura, cambios de estado solo por métodos con nombre de
negocio.

**Dónde.** `CreditProduct` (congelada), `CreditApplication` (con máquina de
estados).

**Sin él.**

```js
// Sin encapsulación
app.status = 'RADICADA';   // ← salta la validación de transición
app.status = 'INVENTADO';  // ← estado que no existe
```

Con la entidad, `submit()` verifica la transición y lanza
`APPLICATION_ALREADY_SUBMITTED` en el doble envío.

Detalle: [07](./07-entidades.md).

---

## 16.9 Domain Service

**Problema.** Una regla que necesita datos de dos entidades no cabe en ninguna de
las dos sin que una conozca a la otra.

**Solución.** Un servicio stateless que las coordina, delegando en el
comportamiento de cada una.

**Dónde.** `CreditApplicationPolicy`: `assertAdmissible` (solicitud × producto) y
`assessAffordability` (compone tres reglas de tres sitios distintos).

**Cuidado.** Es el patrón más fácil de sobreusar. Un servicio por entidad
(`CreditProductService`, `ApplicationService`) produce el *anemic domain model*:
entidades sin comportamiento y servicios con toda la lógica. Aquí hay **un solo**
servicio de dominio, porque solo hay una regla que cruza entidades.

Detalle: [09](./09-dominio-servicios-criterios-errores.md).

---

## 16.10 Specification / Criteria

**Problema.** Explosión combinatoria de métodos de búsqueda:

```js
findByName(q) · findByRange(r) · findByNameAndRange(q, r) · findByNameAndRangeAndRate(q, r, m)
```

**Solución.** El criterio es un objeto con `isSatisfiedBy(candidato)`. El
repositorio tiene un solo método.

**Dónde.** `ProductSearchCriteria`, consumido por
`InMemoryCreditProductRepository.findByCriteria`.

**Beneficio de segundo orden.** El mismo objeto se traduce a query HTTP en un
adaptador remoto, sin tocar el caso de uso:

```js
if (criteria.query) params.set('q', criteria.query);
if (criteria.amountRange && !criteria.amountRange.isUnbounded) { … }
```

**Sin él.** Añadir un filtro por tasa máxima obligaría a añadir métodos al puerto,
a los dos repositorios y al caso de uso.

---

## 16.11 Factory + Anticorruption Layer

**Problema.** El formato del proveedor de datos (claves en español, números
planos) contamina el dominio.

**Solución.** Un traductor en la frontera.

**Dónde.** `CreditProductFactory.fromRaw()`:
`{ montoMin: 5e6 }` → `AmountRange(Money.of(5e6), …)`.

**Doble beneficio.**

1. Si la API cambia a `min_amount`, cambia un archivo.
2. Como la traducción pasa por los constructores de los value objects, **datos
   corruptos fallan en la frontera**: un `tasa: 1420` lanza `RATE_OUT_OF_BOUNDS`
   al arrancar en lugar de producir cálculos erróneos.

**Sin él.** `CreditProduct` tendría campos llamados `montoMin` y `tasa`, y el
dominio quedaría atado al vocabulario del proveedor.

---

## 16.12 Data Mapper + DTO

**Problema.** Si la vista recibe entidades, puede ejecutar reglas de negocio desde
la plantilla.

**Solución.** Un mapper traduce entidad → objeto plano, congelado y ya formateado.

**Dónde.** `CreditProductMapper` (entidad → DTO), `CreditApplicationMapper`
(entrada cruda → value objects), `CreditProductDTO` (la forma).

**Detalle.** El DTO lleva valores crudos **y** etiquetas
(`annualRate: 14.2` + `annualRateLabel: '14.2%'`): la vista nunca formatea, y
sigue pudiendo ordenar o comparar.

**Sin él.**

```js
// En la plantilla, con una entidad:
${product.admitsAmount(Money.of(5000000)) ? 'Disponible' : 'No disponible'}
```

Regla de negocio en la vista, condenada a duplicarse.

---

## 16.13 Template Method

**Problema.** Seis vistas repetirían el ciclo de vida (montar, enlazar eventos,
limpiar listeners) y alguna olvidaría la limpieza.

**Solución.** La clase base define el algoritmo; las subclases rellenan un hueco.

**Dónde.**

| Base | Hueco que rellena la subclase | Qué aporta la base |
|---|---|---|
| `BaseView` | `template(viewModel)` | Ciclo de vida, `on()` con limpieza automática, `query()`/`queryAll()` acotados al subárbol |
| `BaseController` | `handle(context)` | `present()`, `update()`, `dispose()` |

**Sin él.** Cada vista gestionaría sus listeners a mano. El simulador, que
re-pinta en cada tecla, acumularía un listener por pulsación.

---

## 16.14 Decorator

**Problema.** Añadir una responsabilidad transversal (título de página, logging,
métricas, guardas de autenticación) a N controladores sin modificar ninguno.

**Solución.** Un objeto que implementa el mismo contrato, envuelve al original y
añade comportamiento.

**Dónde.** `DocumentTitleController`.

```js
async handle(context) {
  document.title = this.#title;
  return this.#inner.handle(context);
}

dispose() { this.#inner.dispose(); }
```

**Tres detalles que lo hacen correcto.**

1. Verifica el contrato del decorado (`assertImplements`).
2. **Delega `dispose()`.** Olvidarlo dejaría la vista anterior sin limpiar: una
   violación silenciosa de Liskov que solo se notaría como fuga de memoria.
3. Devuelve la promesa de `handle`, no la descarta.

**Apilable.** Un `LoggingController` y un `AuthGuardController` se componen sin
tocar nada:

```js
new LoggingController({ controller:
  new DocumentTitleController({ controller: catalogController, title: '…' }),
  logger });
```

**Sin él.** `document.title = …` estaría copiado en los 4 controladores.

---

## 16.15 Result / Either

**Problema.** Un formulario mal rellenado no es una condición excepcional: es el
caso normal. Propagarlo como excepción obliga a `try/catch` en cada frontera y
hace que el flujo feliz y el de error se lean distinto.

**Solución.** El caso de uso devuelve un objeto que representa éxito o fallo, con
los errores por campo como dato.

**Dónde.** `application/shared/Result.js`, devuelto por los 5 casos de uso.

```js
const result = await this.#submitApplication.execute(values);
if (result.isFailure) {
  this.#state = { values, errors: result.fieldErrors };
  // …
}
```

**Sin él.** El controlador tendría que distinguir `ValidationError` de
`DomainError` de errores técnicos con `instanceof`, en cada llamada.

**Frontera clara.** Dentro del dominio, `throw` sigue siendo correcto (una
invariante rota *es* excepcional). Al cruzar a la aplicación se convierte en
`Result` mediante `Result.fromError(err)`.

---

## 16.16 Patrones menores

### State — máquina de estados de `CreditApplication`

```
BORRADOR ──submit()──► RADICADA ──moveToReview()──► EN_ESTUDIO
```

Las transiciones se validan en la entidad; una inválida lanza
`APPLICATION_INVALID_TRANSITION`.

### Null Object — degradación de `localStorage`

```js
constructor({ idGenerator, storage = LocalStorageCreditApplicationRepository.#safeStorage() })
```

Si `#safeStorage()` devuelve `null`, `#persist()` no hace nada y el repositorio
sigue cumpliendo su contrato con solo memoria. El consumidor no cambia.

### Event Delegation — `HistoryRouter.#onDocumentClick`

Un solo listener en `document` intercepta todos los `a[data-link]`. Necesario
porque las vistas se re-pintan y cualquier listener por enlace moriría con el
`innerHTML`.

### Strategy implícito — variantes de componentes

```js
this.#productCard.render({ product, variant: 'compact' })
this.#footer.render({ variant: 'catalog' })
```

La variante entra como dato, no como rama `if (page === 'catalog')`.

---

## 16.17 Cuándo NO aplicar estos patrones

Honestidad sobre el coste. Este conjunto de patrones tiene sentido cuando:

- el proyecto va a crecer o a durar,
- la lógica de negocio tiene reglas propias (no es un CRUD directo),
- alguien más va a mantenerlo,
- se quiere poder probar sin navegador,
- puede haber más de una interfaz.

**No** tiene sentido para: una landing estática, un prototipo de un día, un script
de un solo uso.

Señales de que se está sobre-aplicando:

| Señal | Corrección |
|---|---|
| Un puerto con un único adaptador que nunca cambiará y que no aporta testabilidad | Usa la clase directamente |
| Un servicio de dominio por entidad | Mueve el comportamiento a la entidad |
| Un DTO idéntico a la entidad, campo por campo | Puede que la entidad no necesitara existir |
| Un caso de uso que solo llama a un método del repositorio y no aporta nada | Considera si el controlador puede usar el puerto directamente |
| Capas creadas "por si acaso", vacías | Bórralas hasta que haya una necesidad real |

En este proyecto se aplicó el conjunto completo porque el objetivo explícito era
demostrar el patrón, y porque la lógica financiera (tasas, rangos, capacidad de
pago) justifica un dominio real. Con `AmountRange.overlaps()` y
`InterestRate.monthlyFraction` no hay duda de dónde ponerlos; con un CRUD de
"nombre y apellido" la conversación sería distinta.

## 16.18 Siguiente lectura

- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
- [18 — Guía de extensión](./18-guia-de-extension.md)
- [`.claude/skills/arquitectura-hexagonal-vanilla/references/anti-patrones.md`](../.claude/skills/arquitectura-hexagonal-vanilla/references/anti-patrones.md)
