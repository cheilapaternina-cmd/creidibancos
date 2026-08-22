[← Volver al índice maestro](./master.md)

# 07 — Entidades del dominio

## 7.1 Entidad vs. value object

La distinción determina en qué carpeta va una clase nueva.

| | Entidad | Value object |
|---|---|---|
| Identidad | Tiene una **id** propia | No tiene id; **es** su valor |
| Igualdad | Por identidad: `other.id === this.id` | Por valor: todos los campos iguales |
| Mutabilidad | Puede cambiar de estado a lo largo de su vida | **Inmutable** — cambiar produce una instancia nueva |
| Ejemplo cotidiano | Una persona (cambia de dirección, sigue siendo la misma) | Un importe de $5.000.000 (no "cambia": se sustituye) |
| En este proyecto | `CreditProduct`, `CreditApplication` | `Money`, `Term`, `AmountRange`, `Applicant`… |
| Carpeta | `src/domain/entities/` | `src/domain/valueobjects/` |

Prueba rápida: *"¿si dos de estos tienen exactamente los mismos datos, son el
mismo?"* Si la respuesta es sí → value object. Si es "no, son dos cosas
distintas que coinciden" → entidad.

---

## 7.2 `CreditProduct`

`src/domain/entities/CreditProduct.js` · raíz de agregado del catálogo.

### Composición

Ningún campo es un primitivo suelto. Cada uno es un value object que ya validó
sus propias invariantes:

```js
new CreditProduct({
  id:           2,                                   // number|string
  name:         'Crédito Vehículo',                  // string
  description:  'Financia tu carro nuevo o usado…',  // string
  amountRange:  AmountRange,     // ← Money mínimo y máximo
  interestRate: InterestRate,    // ← tasa efectiva anual
  maxTerm:      Term,            // ← plazo en meses
  requirements: 'Mayor de 21 años…',                 // string
  theme:        ProductTheme,    // ← emoji + paleta
})
```

### Invariantes verificadas en el constructor

```js
if (id === undefined || id === null || id === '')  throw new DomainError('CreditProduct.id es obligatorio.', …);
if (typeof name !== 'string' || name.trim() === '') throw new DomainError('CreditProduct.name es obligatorio.', …);
if (!(amountRange  instanceof AmountRange))  throw new DomainError(…, { code: 'PRODUCT_RANGE_INVALID' });
if (!(interestRate instanceof InterestRate)) throw new DomainError(…, { code: 'PRODUCT_RATE_INVALID'  });
if (!(maxTerm      instanceof Term))         throw new DomainError(…, { code: 'PRODUCT_TERM_INVALID'  });
if (!(theme        instanceof ProductTheme)) throw new DomainError(…, { code: 'PRODUCT_THEME_INVALID' });
```

Las comprobaciones `instanceof` no son paranoia: garantizan que nadie pueda
construir un producto con `tasa: "dieciocho"` o `montoMax: -1`, porque esos
valores no habrían podido convertirse en `InterestRate` ni en `Money`.

El constructor acaba con `Object.freeze(this)`: un producto del catálogo es
inmutable en la práctica (aunque conceptualmente sea entidad, porque tiene id).

### Comportamiento — las tres reglas que la vista NO tiene

```js
matchesName(query) {
  const term = CreditProduct.normalize(query);
  if (term === '') return true;
  return CreditProduct.normalize(this.#name).includes(term)
      || CreditProduct.normalize(this.#description).includes(term);
}

matchesAmountRange(range) {
  if (!(range instanceof AmountRange)) return true;
  return this.#amountRange.overlaps(range);
}

admitsAmount(amount) { return this.#amountRange.contains(amount); }

admitsTerm(term)     { return term.fitsWithin(this.#maxTerm); }
```

Estos cuatro métodos son la razón de que el simulador funcione sin que
`SimulatorView` contenga una sola línea de lógica de filtrado.

### `normalize` — búsqueda tolerante a acentos

```js
static normalize(value) {
  // Rango de marcas diacríticas combinantes U+0300–U+036F (construido con
  // escapes ASCII para evitar problemas de codificación del archivo).
  const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim();
}
```

`normalize('NFD')` descompone `é` en `e` + marca combinante, y el `replace`
elimina la marca. Resultado: buscar `vehiculo` encuentra `Crédito Vehículo`.

La expresión regular se construye con `new RegExp` y escapos ASCII a propósito:
un carácter combinante literal dentro del archivo fuente es invisible en el
editor y frágil ante cambios de codificación.

Verificado: `ok : normalize sin acentos` — `'Crédito Vehículo'` → `'credito vehiculo'`.

### Igualdad por identidad

```js
equals(other) {
  return other instanceof CreditProduct && String(other.id) === String(this.#id);
}
```

`String(...)` en ambos lados porque la id puede venir como número del datasource
estático o como string de una API.

### Serialización

`toJSON()` delega en los `toJSON()` de sus value objects, produciendo una
estructura plana apta para logs o persistencia:

```js
{
  id: 2,
  name: 'Crédito Vehículo',
  description: '…',
  amountRange: { min: 5000000, max: 120000000, label: '' },
  interestRate: 14.2,
  maxTermMonths: 84,
  requirements: '…',
  theme: { icon: '🚗', palette: 'emerald' },
}
```

### Los 6 productos del catálogo

Los cinco primeros son datos reales tomados literalmente del original; el sexto
(`Crédito de Libranza`) se añadió en este proyecto:

| id | Nombre | Monto | Tasa E.A. | Plazo máx. | Emoji | Paleta |
|---|---|---|---|---|---|---|
| 1 | Crédito Libre Inversión | $1 000 000 – $30 000 000 | 18,5 % | 60 m | 💳 | blue |
| 2 | Crédito Vehículo | $5 000 000 – $120 000 000 | 14,2 % | 84 m | 🚗 | emerald |
| 3 | Crédito Vivienda | $20 000 000 – $500 000 000 | 11,8 % | 240 m | 🏠 | violet |
| 4 | Crédito Educativo | $500 000 – $50 000 000 | 10,5 % | 72 m | 🎓 | amber |
| 5 | Crédito Empresarial | $10 000 000 – $1 000 000 000 | 16,0 % | 120 m | 🏢 | rose |
| 6 | Crédito de Libranza | $1 000 000 – $80 000 000 | 13,5 % | 96 m | 🧾 | teal |

Con sus requisitos:

| id | Requisitos |
|---|---|
| 1 | Mayor de 18 años, cédula, extractos bancarios últimos 3 meses. |
| 2 | Mayor de 21 años, licencia de conducción, carta laboral. |
| 3 | Mayor de 25 años, ingresos demostrables, promesa de compraventa. |
| 4 | Mayor de 16 años (con codeudor), carta de admisión de institución educativa. |
| 5 | Empresa constituida mínimo 2 años, estados financieros, RUT. |
| 6 | Empleado o pensionado de entidad con convenio de libranza, certificación laboral o de pensión, autorización de descuento por nómina. |

---

## 7.3 `CreditApplication`

`src/domain/entities/CreditApplication.js` · raíz de agregado de la solicitud.

### Composición: agrega tres value objects

Uno por sección del formulario:

```js
new CreditApplication({
  id:              'app_a3f1…',      // de ICreditApplicationRepository.nextIdentity()
  applicant:       Applicant,        // 👤 Datos Personales
  requestedCredit: RequestedCredit,  // 💰 Datos del Crédito
  employmentInfo:  EmploymentInfo,   // 🏢 Datos Laborales
  status:          APPLICATION_STATUS.DRAFT,   // por defecto
  createdAt:       clock.now(),      // de IClock
})
```

La correspondencia 1:1 entre sección del formulario y value object no es
casualidad: cada sección es un conjunto cohesivo de datos con sus propias reglas,
y agruparlos así permite que cada uno valide lo suyo.

### Máquina de estados

```js
export const APPLICATION_STATUS = Object.freeze({
  DRAFT:        'BORRADOR',
  SUBMITTED:    'RADICADA',
  UNDER_REVIEW: 'EN_ESTUDIO',
  APPROVED:     'APROBADA',
  REJECTED:     'RECHAZADA',
});
```

```
   BORRADOR ──submit()──► RADICADA ──moveToReview()──► EN_ESTUDIO
                                                           │
                                              (transiciones futuras)
                                                    ┌──────┴──────┐
                                                    ▼             ▼
                                                APROBADA      RECHAZADA
```

Las transiciones se validan **en la entidad**, no en el controlador:

```js
submit() {
  if (this.#status !== APPLICATION_STATUS.DRAFT) {
    throw new DomainError('La solicitud ya fue radicada.', {
      code: 'APPLICATION_ALREADY_SUBMITTED',
      details: { id: this.#id, status: this.#status },
    });
  }
  this.#status = APPLICATION_STATUS.SUBMITTED;
  return this;      // fluido
}

moveToReview() {
  if (this.#status !== APPLICATION_STATUS.SUBMITTED) {
    throw new DomainError('Solo una solicitud radicada puede pasar a estudio.', {
      code: 'APPLICATION_INVALID_TRANSITION',
      details: { from: this.#status },
    });
  }
  this.#status = APPLICATION_STATUS.UNDER_REVIEW;
  return this;
}
```

Esto es lo que evita el doble envío: si un usuario pulsa "Enviar" dos veces sobre
la misma entidad, el segundo `submit()` lanza. La regla vive en un sitio y
protege a cualquier interfaz futura, no solo a este formulario.

### Por qué esta entidad NO está congelada

`CreditProduct` acaba en `Object.freeze(this)`. `CreditApplication` **no**, y es
intencional: una solicitud cambia de estado durante su vida
(`BORRADOR → RADICADA → EN_ESTUDIO`). Congelarla haría imposible `submit()`.

Es la diferencia práctica entre una entidad de referencia (catálogo, inmutable en
la práctica) y una entidad transaccional (con ciclo de vida).

### Protección de la fecha

```js
constructor({ …, createdAt }) {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new DomainError('CreditApplication.createdAt debe ser una fecha válida.', …);
  }
  this.#createdAt = new Date(createdAt.getTime());   // copia defensiva
}

get createdAt() {
  return new Date(this.#createdAt.getTime());        // copia defensiva
}
```

`Date` es mutable en JavaScript. Sin la copia, quien pasó la fecha podría hacer
`fecha.setFullYear(1999)` después y alterar la solicitud. Se copia al entrar y al
salir.

### Número de radicado

```js
get referenceNumber() {
  return `CS-${String(this.#id).slice(-8).toUpperCase()}`;
}
```

Deriva de la id interna: no hay un segundo contador que mantener sincronizado.
Ejemplo real de la suite: `CS-190ED978`.

### `isSubmitted`

```js
get isSubmitted() {
  return this.#status !== APPLICATION_STATUS.DRAFT;
}
```

Getter calculado, no un campo booleano aparte. Un campo `submitted: true` podría
quedar desincronizado con `status`; un getter no puede.

### Serialización

```js
toJSON() {
  return {
    id: this.#id,
    status: this.#status,
    reference: this.referenceNumber,
    createdAt: this.#createdAt.toISOString(),
    applicant: this.#applicant.toJSON(),
    requestedCredit: this.#requestedCredit.toJSON(),
    employmentInfo: this.#employmentInfo.toJSON(),
  };
}
```

Es lo que `LocalStorageCreditApplicationRepository` guarda en `localStorage`.

---

## 7.4 Patrones aplicados en las entidades

| Patrón | Cómo se materializa |
|---|---|
| **Always-Valid Domain Model** | Una entidad que existe es válida. No hay método `validate()` que alguien pueda olvidar llamar: el constructor es la única puerta y lanza si algo falla. |
| **Encapsulación con campos privados** | Todos los campos son `#privados` con getters de solo lectura. No hay setters públicos. Cambiar de estado exige un método con nombre de negocio (`submit()`), no `app.status = 'RADICADA'`. |
| **Tell, don't ask** | En vez de `if (product.maxAmount >= amount)` desde fuera, se pregunta `product.admitsAmount(amount)`. La regla vive con el dato. |
| **Copia defensiva** | `new Date(...)` al entrar y al salir; `[...this.#products]` en el repositorio. |
| **Interfaz fluida** | `submit()` y `moveToReview()` devuelven `this`, permitiendo `app.submit()` en una línea de expresión. |
| **Igualdad explícita** | `equals()` por identidad, no confianza en `===` de referencias. |

---

## 7.5 Cómo añadir una entidad

Ejemplo: `CreditOffer` (una contraoferta que el banco emite sobre una solicitud).

**1. Identificar los value objects que necesita.** Si aparece un primitivo con
reglas (un porcentaje, un plazo, un importe), es un value object — probablemente
uno que ya existe.

**2. Crear el archivo** en `src/domain/entities/CreditOffer.js`:

```js
import { DomainError } from '../errors/DomainError.js';
import { Money } from '../valueobjects/Money.js';
import { InterestRate } from '../valueobjects/InterestRate.js';
import { Term } from '../valueobjects/Term.js';

export const OFFER_STATUS = Object.freeze({
  ISSUED:   'EMITIDA',
  ACCEPTED: 'ACEPTADA',
  EXPIRED:  'VENCIDA',
});

export class CreditOffer {
  #id; #applicationId; #amount; #rate; #term; #status; #issuedAt;

  constructor({ id, applicationId, amount, rate, term, status = OFFER_STATUS.ISSUED, issuedAt }) {
    if (!id) throw new DomainError('CreditOffer.id es obligatorio.', { code: 'OFFER_ID_REQUIRED' });
    if (!(amount instanceof Money))       throw new DomainError(…);
    if (!(rate   instanceof InterestRate)) throw new DomainError(…);
    if (!(term   instanceof Term))         throw new DomainError(…);
    // …
  }

  get id() { return this.#id; }
  // …

  accept() {
    if (this.#status !== OFFER_STATUS.ISSUED) {
      throw new DomainError('Solo una oferta emitida puede aceptarse.', {
        code: 'OFFER_INVALID_TRANSITION', details: { from: this.#status },
      });
    }
    this.#status = OFFER_STATUS.ACCEPTED;
    return this;
  }

  equals(other) { return other instanceof CreditOffer && other.id === this.#id; }
  toJSON() { /* … */ }
}
```

**3. Reglas de la capa**: sin `import` que salga de `domain/`, campos privados,
getters de solo lectura, validación en constructor, `equals()` y `toJSON()`.

**4. Si necesita persistirse**: declarar `ICreditOfferRepository` en
`domain/contracts/` (ver [06 §6.8](./06-contratos-e-interfaces.md)), implementar
el adaptador, registrarlo.

**5. Documentar**: añadirla a este archivo y al índice alfabético de
[`master.md`](./master.md).

Receta completa en [18 — Guía de extensión](./18-guia-de-extension.md).

## 7.6 Siguiente lectura

- [08 — Value objects](./08-value-objects.md)
- [09 — Servicios, criterios y errores](./09-dominio-servicios-criterios-errores.md)
