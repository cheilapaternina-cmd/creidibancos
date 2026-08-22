[← Volver al índice maestro](./master.md)

# 08 — Value objects

## 8.1 Qué problema resuelven

El problema se llama **primitive obsession**: representar conceptos del negocio
con tipos primitivos.

```js
// ❌ Sin value objects
function crearProducto(montoMin, montoMax, tasa, plazo) { … }
crearProducto(30_000_000, 5_000_000, 18.5, 60);   // ← min y max invertidos: nadie avisa
crearProducto(5_000_000, 30_000_000, 1850, 60);   // ← tasa en puntos base: nadie avisa
crearProducto(5_000_000, 30_000_000, 18.5, -60);  // ← plazo negativo: nadie avisa

// ✅ Con value objects
new CreditProduct({
  amountRange:  new AmountRange(Money.of(5_000_000), Money.of(30_000_000)),
  interestRate: InterestRate.ofAnnualPercentage(18.5),   // lanza si >100 o <0
  maxTerm:      Term.ofMonths(60),                       // lanza si ≤0 o no entero
  // …
});
```

Los tres errores del primer bloque son imposibles en el segundo: `AmountRange`
rechaza rangos invertidos, `InterestRate` rechaza valores fuera de [0,100] y
`Term` rechaza plazos no positivos.

## 8.2 Las cuatro reglas de un value object en este proyecto

1. **Inmutable.** Campos privados + `Object.freeze(this)` al final del
   constructor. Toda operación devuelve una instancia nueva.
2. **Auto-validado.** El constructor lanza si los datos no son válidos. No existe
   un método `validate()` externo que se pueda olvidar.
3. **Igualdad por valor.** `equals(other)` compara contenido, no referencias.
4. **Sin identidad.** No tiene `id`. Dos importes de $5.000.000 son el mismo
   importe.

## 8.3 Los 8 value objects

| Value object | Encapsula | Invariantes que garantiza |
|---|---|---|
| `Money` | Importe + moneda | Número finito, no negativo, entero (redondeado); no se operan monedas distintas |
| `InterestRate` | Tasa efectiva anual en % | Número finito, entre 0 y 100 |
| `Term` | Plazo en meses | Entero positivo |
| `AmountRange` | Rango [min, max] | `min` y `max` son `Money`; `max ≥ min`; `max` puede ser "sin límite" |
| `ProductTheme` | Emoji + paleta | Icono no vacío; paleta dentro de las 6 admitidas |
| `Applicant` | Datos personales | Nombre ≥5 caracteres, cédula 6–12 dígitos, email con formato, teléfono 7–15 dígitos |
| `RequestedCredit` | Datos del crédito pedido | Tipo seleccionado, monto >0, plazo entero >0, destino ≥10 caracteres |
| `EmploymentInfo` | Datos laborales | Empresa y cargo no vacíos, ingresos >0 |

---

## 8.4 `Money`

`src/domain/valueobjects/Money.js`

### Decisión de diseño: enteros, no decimales

```js
this.#amount = Math.round(amount);
```

El peso colombiano no usa centavos en la práctica, y el sitio original formateaba
con `maximumFractionDigits: 0`. Almacenar enteros evita la clase entera de bugs
de coma flotante (`0.1 + 0.2 !== 0.3`).

### Constructores

```js
Money.of(5_000_000)        // constructor semántico, COP por defecto
Money.of(100, 'USD')
Money.zero()               // cero explícito
new Money(5_000_000)       // también válido
```

### Validación

```js
if (typeof amount !== 'number' || !Number.isFinite(amount)) {
  throw new DomainError('El importe debe ser un número finito.', { code: 'INVALID_MONEY_AMOUNT', … });
}
if (amount < 0) {
  throw new DomainError('El importe no puede ser negativo.', { code: 'NEGATIVE_MONEY_AMOUNT', … });
}
```

`Number.isFinite` rechaza `NaN`, `Infinity` y `-Infinity`. Un `NaN` colándose en
un importe produciría cálculos silenciosamente erróneos aguas abajo.

### Comparación con protección de moneda

```js
isGreaterThan(other) { this.#assertSameCurrency(other); return this.#amount > other.amount; }
isLessThan(other)    { this.#assertSameCurrency(other); return this.#amount < other.amount; }
isBetween(min, max)  { return !this.isLessThan(min) && !this.isGreaterThan(max); }

#assertSameCurrency(other) {
  if (!(other instanceof Money)) {
    throw new DomainError('Se esperaba un Money para comparar.', { code: 'INVALID_MONEY_OPERAND' });
  }
  if (other.currency !== this.#currency) {
    throw new DomainError(
      `No se pueden operar monedas distintas: ${this.#currency} vs ${other.currency}.`,
      { code: 'CURRENCY_MISMATCH' },
    );
  }
}
```

Comparar 100 USD con 100 COP es un error de negocio, y aquí falla ruidosamente en
vez de dar `false` como si fuera una respuesta.

### Aritmética inmutable

```js
add(other)       { this.#assertSameCurrency(other); return new Money(this.#amount + other.amount, this.#currency); }
multiply(factor) { return new Money(this.#amount * factor, this.#currency); }
```

Ambas devuelven **instancias nuevas**. `multiply` es lo que usa la regla del 40 %:
`monthlyIncome.multiply(0.4)`.

### `valueOf` — comparación con operadores nativos

```js
valueOf() { return this.#amount; }
```

Permite `money1 > money2` con operadores relacionales (JavaScript llama a
`valueOf`). Se usa internamente en `AmountRange.overlaps`, donde se comparan
importes crudos junto a `Infinity`.

Advertencia consciente: `valueOf` **no** hace que `money1 === money2` funcione
(el `===` no convierte). Por eso existe `equals()`, y es el que se debe usar.

---

## 8.5 `InterestRate`

`src/domain/valueobjects/InterestRate.js`

### Regla financiera encapsulada

```js
get annualFraction()  { return this.#annualPercentage / 100; }              // 18.5 → 0.185

get monthlyFraction() { return Math.pow(1 + this.annualFraction, 1/12) - 1; }
```

La conversión de tasa efectiva anual a mensual equivalente es
`i_m = (1 + i_a)^(1/12) − 1`. **No** es `i_a / 12`, que es el error clásico
(daría 1,54 % mensual en vez de 1,42 % para una E.A. del 18,5 %).

Está aquí y no en la vista precisamente porque es el tipo de fórmula que se copia
mal cuando se duplica. La usa `CreditApplicationPolicy.assessAffordability`.

### Validación de rango

```js
if (annualPercentage < 0 || annualPercentage > 100) {
  throw new DomainError('La tasa anual debe estar entre 0 y 100 %.', { code: 'RATE_OUT_OF_BOUNDS', … });
}
```

El tope de 100 % es una decisión de negocio explícita: una tasa mayor
probablemente sea un error de unidad (puntos base en lugar de porcentaje).

---

## 8.6 `Term`

`src/domain/valueobjects/Term.js`

```js
if (!Number.isInteger(months) || months <= 0) {
  throw new DomainError('El plazo debe ser un número entero de meses mayor que cero.', …);
}
```

```js
get months() { return this.#months; }
get years()  { return this.#months / 12; }

isLongerThan(other) { return this.#months > other.months; }
fitsWithin(other)   { return this.#months <= other.months; }   // ← usado por admitsTerm
```

`fitsWithin` se lee como negocio: *"el plazo pedido cabe dentro del plazo máximo
del producto"*. Compárese con `pedido.months <= producto.maxTerm.months` escrito
en un controlador.

---

## 8.7 `AmountRange`

`src/domain/valueobjects/AmountRange.js`

Modela **dos cosas** con la misma clase: el rango que ofrece un producto
(`montoMin`–`montoMax`) y el rango que elige el usuario en el filtro. Que sean el
mismo tipo es lo que hace que el filtrado sea una sola línea.

### "Sin límite superior"

```js
static of(min, max, label = '') {
  const upper = max === null || max === Infinity ? null : Money.of(max);
  return new AmountRange(Money.of(min), upper, label);
}

static unbounded(label = 'Todos los montos') {
  return new AmountRange(Money.zero(), null, label);
}

get isUnbounded() { return this.#max === null; }
```

`null` representa el infinito. Se eligió `null` en lugar de `Money.of(Infinity)`
porque `Money` rechaza valores no finitos: la ausencia de tope es *conceptualmente
distinta* de un tope enorme.

### `contains` — ¿este importe cae dentro?

```js
contains(money) {
  if (money.isLessThan(this.#min)) return false;
  if (this.#max === null) return true;
  return !money.isGreaterThan(this.#max);
}
```

Usado por `CreditProduct.admitsAmount()`, que a su vez usa
`CreditApplicationPolicy` para validar el monto solicitado.

### `overlaps` — el corazón del filtro del simulador

```js
overlaps(other) {
  const thisMaxAmount  = this.#max === null  ? Infinity : this.#max.amount;
  const otherMaxAmount = other.max === null ? Infinity : other.max.amount;
  return this.#min.amount <= otherMaxAmount && other.min.amount <= thisMaxAmount;
}
```

La regla de negocio: **un producto se muestra si su rango ofertado intersecta el
rango pedido**. No "si su mínimo cae dentro", ni "si su máximo cae dentro":
intersección.

Comprobación con los datos reales:

| Filtro | Producto | ¿Overlaps? | Por qué |
|---|---|---|---|
| Hasta $5 000 000 → [0, 5M] | Crédito Educativo [500K, 50M] | ✅ | 500K ≤ 5M y 0 ≤ 50M |
| Hasta $5 000 000 → [0, 5M] | Crédito Vivienda [20M, 500M] | ❌ | 20M > 5M |
| Más de $100 000 000 → [100 000 001, ∞] | Libre Inversión [1M, 30M] | ❌ | 100 000 001 > 30M |
| Más de $100 000 000 → [100 000 001, ∞] | Crédito Vehículo [5M, 120M] | ✅ | 100 000 001 ≤ 120M |

Verificado en la suite: `rango "Hasta 5M" → 3 resultados`, `rango ">100M" → 3`.

### Los 5 rangos del filtro

| Índice | Etiqueta | min | max |
|---|---|---|---|
| 0 | Todos los montos | 0 | ∞ |
| 1 | Hasta $5.000.000 | 0 | 5 000 000 |
| 2 | $5.000.001 – $20.000.000 | 5 000 001 | 20 000 000 |
| 3 | $20.000.001 – $100.000.000 | 20 000 001 | 100 000 000 |
| 4 | Más de $100.000.000 | 100 000 001 | ∞ |

---

## 8.8 `ProductTheme`

`src/domain/valueobjects/ProductTheme.js`

Value object que impide que la vista invente clases CSS.

```js
export const THEME_PALETTES = Object.freeze([
  'blue', 'emerald', 'violet', 'amber', 'rose', 'teal',
]);

if (!THEME_PALETTES.includes(palette)) {
  throw new DomainError(
    `Paleta "${palette}" no admitida. Válidas: ${THEME_PALETTES.join(', ')}.`,
    { code: 'INVALID_THEME_PALETTE', details: { palette } },
  );
}

get cssClass() { return `theme-${this.#palette}`; }
```

`cssClass` devuelve `theme-emerald`, y esa clase **existe declarada** en
`assets/css/02-tokens.css`. Si alguien añade un producto con
`palette: 'turquesa'`, el error aparece al arrancar con la lista de paletas
válidas — no una tarjeta sin color en producción.

Objeción razonable: *"¿un asunto de CSS en el dominio?"* Lo que está en el
dominio es la **restricción** (un producto tiene una de 5 identidades visuales);
el detalle de que se materialice como clase CSS es un contrato compartido y
documentado con la hoja de estilos. La alternativa —un `switch` de colores en la
vista— duplicaría la restricción sin verificarla.

---

## 8.9 Los tres value objects del formulario

Cada uno corresponde a una sección de `/solicitar` y valida sus propios campos.
El patrón es idéntico en los tres: acumular errores en un objeto y lanzar un
único `ValidationError`.

### `Applicant` — 👤 Datos Personales

```js
const errors = {};

const name = String(fullName ?? '').trim();
if (name === '') errors.fullName = 'El nombre completo es obligatorio.';
else if (name.length < 5) errors.fullName = 'Ingresa el nombre completo (mínimo 5 caracteres).';

const document = String(idNumber ?? '').trim();
if (document === '') errors.idNumber = 'La cédula es obligatoria.';
else if (!/^\d{6,12}$/.test(document)) errors.idNumber = 'La cédula debe tener entre 6 y 12 dígitos.';

const mail = String(email ?? '').trim();
if (mail === '') errors.email = 'El email es obligatorio.';
else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) errors.email = 'Ingresa un email válido.';

const tel = String(phone ?? '').replace(/[\s()-]/g, '');
if (tel === '') errors.phone = 'El teléfono es obligatorio.';
else if (!/^\+?\d{7,15}$/.test(tel)) errors.phone = 'Ingresa un teléfono válido (7 a 15 dígitos).';

if (Object.keys(errors).length > 0) {
  throw new ValidationError(errors, 'Revisa los datos personales.');
}
```

Normalizaciones aplicadas: el email se guarda en minúsculas; el teléfono se
guarda sin espacios, paréntesis ni guiones. La normalización pertenece al value
object, no al formulario, para que cualquier interfaz obtenga el mismo resultado.

Getter de conveniencia:

```js
get firstName() { return this.#fullName.split(/\s+/)[0]; }
```

Se usa en el mensaje de confirmación: *"Juan, tu solicitud quedó radicada…"*.

### `RequestedCredit` — 💰 Datos del Crédito

Acepta primitivos **o** value objects ya construidos:

```js
let money = null;
if (amount instanceof Money) {
  money = amount;
} else {
  const raw = Number(amount);
  if (String(amount ?? '').trim() === '' || !Number.isFinite(raw)) {
    errors.amount = 'El monto solicitado es obligatorio.';
  } else if (raw <= 0) {
    errors.amount = 'El monto solicitado debe ser mayor que cero.';
  } else {
    money = Money.of(raw);
  }
}
```

La doble puerta importa: el formulario envía strings (`"50000000"`), pero un test
o un futuro caso de uso puede pasar `Money.of(50_000_000)` directamente. Ambos
funcionan sin conversiones en el llamante.

Nótese el orden de las comprobaciones: primero *"está vacío"*, luego *"no es
número"*, luego *"no es positivo"*. Cada caso produce un mensaje distinto y
accionable.

El destino exige 10 caracteres mínimo, para evitar un `"x"` que no aporta nada al
estudio de la solicitud.

### `EmploymentInfo` — 🏢 Datos Laborales

Misma estructura, más una regla de negocio propia:

```js
get maxAffordableInstallment() {
  return this.#monthlyIncome.multiply(0.4);
}
```

La política del 40 % del ingreso vive aquí, no en el caso de uso ni en el
controlador. `CreditApplicationPolicy.assessAffordability` la consume:

```js
const ceiling = application.employmentInfo.maxAffordableInstallment.amount;
return { affordable: estimatedInstallment <= ceiling, estimatedInstallment, ceiling };
```

Cambiar del 40 % al 35 % es cambiar un número en un archivo.

---

## 8.10 Los 11 errores de campo posibles

Enviar el formulario vacío produce exactamente 11 entradas en `fieldErrors`,
verificado en las suites:

```
fullName, idNumber, email, phone,
productName, amount, termInMonths, purpose,
companyName, jobTitle, monthlyIncome
```

Los tres value objects se construyen de forma independiente y sus errores se
acumulan en `CreditApplicationMapper`, para que el formulario marque **todos** los
campos fallidos en una sola pasada. Detalle en
[10 §10.6](./10-casos-de-uso-y-dtos.md).

---

## 8.11 Cómo añadir un value object

Ejemplo: `DocumentType` (cédula, cédula de extranjería, pasaporte, NIT).

```js
// src/domain/valueobjects/DocumentType.js
import { DomainError } from '../errors/DomainError.js';

export const DOCUMENT_TYPES = Object.freeze(['CC', 'CE', 'PA', 'NIT']);

export class DocumentType {
  #code;

  constructor(code) {
    const value = String(code ?? '').trim().toUpperCase();
    if (!DOCUMENT_TYPES.includes(value)) {
      throw new DomainError(
        `Tipo de documento "${code}" no admitido. Válidos: ${DOCUMENT_TYPES.join(', ')}.`,
        { code: 'INVALID_DOCUMENT_TYPE', details: { code } },
      );
    }
    this.#code = value;
    Object.freeze(this);          // ① inmutable
  }

  static of(code) { return new DocumentType(code); }   // ② constructor semántico

  get code() { return this.#code; }

  get label() {
    return { CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería',
             PA: 'Pasaporte', NIT: 'NIT' }[this.#code];
  }

  equals(other) {                                       // ③ igualdad por valor
    return other instanceof DocumentType && other.code === this.#code;
  }

  toString() { return this.#code; }
  toJSON()   { return this.#code; }                      // ④ serializable
}
```

Checklist: ① `Object.freeze(this)` · ② `static of()` · ③ `equals()` ·
④ `toJSON()` · ⑤ validación en el constructor con `DomainError` y un `code`
· ⑥ campos `#privados` con getters de solo lectura · ⑦ cero `import` que salga
de `domain/`.

## 8.12 Siguiente lectura

- [09 — Servicios, criterios y errores](./09-dominio-servicios-criterios-errores.md)
- [10 — Casos de uso y DTOs](./10-casos-de-uso-y-dtos.md)
