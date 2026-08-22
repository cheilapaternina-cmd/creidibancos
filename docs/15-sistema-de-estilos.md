[← Volver al índice maestro](./master.md)

# 15 — Sistema de estilos

## 15.1 De Tailwind a CSS plano

El original usaba Tailwind: 70 KB de CSS generado y clases atómicas en el marcado
(`className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"`).

Aquí hay **1 466 líneas de CSS semántico** en 7 archivos, con la paleta exacta
extraída de la hoja compilada del original y guardada en variables.

| | Original (Tailwind) | Aquí |
|---|---|---|
| Tamaño | 70 KB generados | 1 466 líneas, sin build |
| Marcado | `class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"` | `class="navbar"` |
| Cambiar el fondo de la navbar | Editar la clase en cada página que la repite | Una línea en `05-components.css` |
| Dependencias | PostCSS + Tailwind + config | ninguna |

## 15.2 La cascada explícita

Los 7 archivos se cargan en `index.html` en orden de especificidad creciente:

```html
<link rel="stylesheet" href="./assets/css/01-reset.css" />
<link rel="stylesheet" href="./assets/css/02-tokens.css" />
<link rel="stylesheet" href="./assets/css/03-base.css" />
<link rel="stylesheet" href="./assets/css/04-layout.css" />
<link rel="stylesheet" href="./assets/css/05-components.css" />
<link rel="stylesheet" href="./assets/css/06-pages.css" />
<link rel="stylesheet" href="./assets/css/07-responsive.css" />
```

| # | Archivo | Contenido | Regla |
|---|---|---|---|
| 01 | `reset.css` | Normalización (equivalente a preflight) | Solo selectores de elemento |
| 02 | `tokens.css` | Variables CSS: paleta, tipografía, radios, sombras, espaciado + temas de producto | **Solo** custom properties |
| 03 | `base.css` | `html`/`body`, foco, spinner, `sr-only`, utilidades tipográficas | Elementos y utilidades mínimas |
| 04 | `layout.css` | `.page`, `.container`, `.section`, grids, stacks | Estructura, sin color |
| 05 | `components.css` | Navbar, botones, tarjetas, panel, alerta, formularios, footer, toasts | Componentes reutilizables |
| 06 | `pages.css` | Hero, simulador, formulario, 404, acceso restringido | Específico de una vista |
| 07 | `responsive.css` | Breakpoints `sm`/`lg` + `print` | **Todas** las media queries |

Consecuencia práctica: **no se necesita un solo `!important`**. Si una regla de
componente debe ganar a una de layout, ya gana por orden.

Y todas las media queries están en un archivo, no repartidas: para saber qué
cambia en móvil se lee un archivo.

## 15.3 `02-tokens.css` — la única fuente de verdad visual

Los componentes **solo consumen variables**. Ningún archivo posterior escribe un
color literal.

### Tipografía

```css
--font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  "Liberation Mono", "Courier New", monospace;
```

Idéntica a la del original (que no cargaba ninguna fuente web). Cero peticiones de
red por tipografía, y los emojis de los productos se renderizan porque la pila
incluye las fuentes de emoji.

Escala de tamaños con su interlineado:

```css
--text-xs:  0.75rem;   --leading-xs:  1rem;
--text-sm:  0.875rem;  --leading-sm:  1.25rem;
--text-base: 1rem;     --leading-base: 1.5rem;
--text-lg:  1.125rem;  --leading-lg:  1.75rem;
--text-2xl: 1.5rem;    --leading-2xl: 2rem;
--text-3xl: 1.875rem;  --leading-3xl: 2.25rem;
--text-4xl: 2.25rem;   --leading-4xl: 2.5rem;
--text-5xl: 3rem;      --leading-5xl: 1;
--text-7xl: 4.5rem;    --leading-7xl: 1;
```

Pesos: `--fw-normal: 400` · `medium: 500` · `semibold: 600` · `bold: 700` ·
`black: 900`.

### Paleta — valores exactos del original

```css
/* Gris (superficie y texto) */
--color-gray-50:  #f9fafb;   --color-gray-500: #6b7280;
--color-gray-100: #f3f4f6;   --color-gray-600: #4b5563;
--color-gray-200: #e5e7eb;   --color-gray-700: #374151;
--color-gray-300: #d1d5db;   --color-gray-800: #1f2937;
--color-gray-400: #9ca3af;   --color-gray-900: #111827;

/* Azul (marca) */
--color-blue-50:  #eff6ff;   --color-blue-600: #2563eb;
--color-blue-100: #dbeafe;   --color-blue-700: #1d4ed8;
--color-blue-200: #bfdbfe;   --color-blue-800: #1e40af;
--color-blue-400: #60a5fa;   --color-blue-900: #1e3a8a;
--color-blue-500: #3b82f6;

/* Esmeralda (acento), violeta, ámbar, rosa — temas de producto */
--color-emerald-500: #10b981;   --color-violet-500: #8b5cf6;
--color-amber-500:   #f59e0b;   --color-rose-500:   #f43f5e;

/* Slate — solo pantallas de sistema (404, acceso restringido) */
--color-slate-50: #f8fafc;  …  --color-slate-900: #0f172a;
```

Que la paleta slate exista aparte no es capricho: el 404 del original usaba slate
mientras el resto del sitio usaba gray. Se replicó la diferencia.

### Alias semánticos

Los componentes usan estos, no los colores crudos:

```css
--page-bg:        var(--color-gray-50);
--surface:        var(--color-white);
--surface-border: var(--color-gray-100);
--text-strong:    var(--color-gray-800);
--text-body:      var(--color-gray-600);
--text-muted:     var(--color-gray-500);
--text-faint:     var(--color-gray-400);
--brand:          var(--color-blue-700);
--brand-hover:    var(--color-blue-800);
--brand-soft:     var(--color-blue-50);
--accent:         var(--color-emerald-500);
--focus-ring:     var(--color-blue-400);
--required:       var(--color-red-500);
```

Doble nivel a propósito: cambiar la marca de azul a verde es reasignar `--brand`,
sin tocar 40 reglas.

### Sombras, radios, contenedores

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

--radius-md: 0.375rem;  --radius-xl:  0.75rem;
--radius-lg: 0.5rem;    --radius-2xl: 1rem;   --radius-full: 9999px;

--container-md:  28rem;   /* max-w-md  */
--container-3xl: 48rem;   /* max-w-3xl */
--container-7xl: 80rem;   /* max-w-7xl */
```

Los comentarios registran la equivalencia con Tailwind, para poder cotejar con el
original.

## 15.4 Temas de producto

Cinco bloques que redefinen cuatro variables cada uno:

```css
.theme-blue {
  --product-grad-from: var(--color-blue-500);
  --product-grad-to:   var(--color-blue-700);
  --product-badge-bg:  var(--color-blue-100);
  --product-badge-fg:  var(--color-blue-700);
}

.theme-emerald { /* emerald-500 → emerald-700, badge emerald-100/700 */ }
.theme-violet  { /* violet-500  → violet-700  */ }
.theme-amber   { /* amber-500   → amber-600   */ }
.theme-rose    { /* rose-500    → rose-700    */ }
.theme-teal    { /* teal-500    → teal-700    */ }   /* sexto producto */
```

El componente de tarjeta no conoce ningún color:

```css
.product-card__header {
  background-image: linear-gradient(to right, var(--product-grad-from), var(--product-grad-to));
}

.badge-amount {
  background-color: var(--product-badge-bg);
  color: var(--product-badge-fg);
}
```

La clase la aporta el DTO (`themeClass: 'theme-emerald'`), que a su vez viene de
`ProductTheme.cssClass`. Y `ProductTheme` valida en el dominio que la paleta sea
una de las seis: **no se puede pintar una tarjeta con un tema que no exista en el
CSS**.

Nótese que `theme-amber` va de `amber-500` a `amber-600` (no a `-700`): así era en
el original (`from-amber-500 to-amber-600`), y se replicó.

### Añadir un tema

1. Bloque `.theme-sky` en `02-tokens.css` con las cuatro variables.
2. `'sky'` en `THEME_PALETTES` (`src/domain/valueobjects/ProductTheme.js`).

Sin el paso 2, el dominio rechaza el producto al arrancar — que es exactamente lo
que se quiere.

Este camino ya se recorrió de verdad: `teal` se añadió así al incorporar
`Crédito de Libranza` al catálogo. El primer intento —producto nuevo con
`palette: 'teal'` pero sin declararla— fue rechazado por el value object al
construir el catálogo, tal como estaba previsto.

## 15.5 Convención de nombres

BEM relajado:

```
.bloque
.bloque__elemento
.bloque--modificador
.bloque__elemento--modificador
```

Ejemplos reales:

```css
.product-card                    /* bloque */
.product-card__header            /* elemento */
.product-card__name
.product-card--compact           /* modificador */
.navlink--active
.navlink--cta
.btn--primary
.footer--spaced
```

Los modificadores se combinan con el bloque, y el CSS los resuelve por
composición:

```css
.product-card--compact .product-card__header { padding: var(--space-5); gap: var(--space-3); }
.product-card--compact .product-card__icon   { font-size: var(--text-3xl); }
.product-card--compact .product-card__name   { font-size: var(--text-base); }
```

Esto es lo que permite que `ProductCardComponent` solo añada una clase para
cambiar de variante, sin estilos en línea ni marcado duplicado.

### Utilidades: las mínimas

Solo se conservaron las que se usan más de dos veces:

```css
.t-strong · .t-body · .t-muted · .t-faint · .t-brand · .t-accent · .t-required
.container · .container--7xl · …
.row · .row--between · .row--gap-2 · …
.stack · .stack--gap-3 · …
.sr-only
```

No hay `.mt-4`, `.px-6`, `.text-sm`. Esa es la diferencia entre "CSS semántico con
algunas utilidades" y "CSS atómico".

## 15.6 Responsive

`07-responsive.css`, mobile-first, con los breakpoints del original:

```css
@media (min-width: 640px) {                 /* sm */
  .container { padding-inline: var(--space-6); }
  .brand__tagline { display: inline; }      /* "by FinTech Solutions" aparece */
  .grid-products { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-form, .filters__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero__title { font-size: var(--text-5xl); line-height: 1.1; }
  .form-actions { flex-direction: row; }
}

@media (min-width: 1024px) {                /* lg */
  .container { padding-inline: var(--space-8); }
  .grid-products { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```

Correspondencia con el original: `sm:grid-cols-2 lg:grid-cols-3` en el grid,
`hidden sm:inline` en la etiqueta de la marca, `flex-col sm:flex-row` en los
botones del formulario.

### Dos añadidos propios

```css
/* Pantallas muy angostas: la navbar se compacta */
@media (max-width: 400px) {
  .brand__name { font-size: var(--text-xl); }
  .navlink { padding-inline: var(--space-2); font-size: var(--text-xs); }
}

@media print {
  .navbar, .footer, .notifications, .hero__actions,
  .filters__actions, .form-actions, .product-card__footer { display: none !important; }
  .page { background: #fff; }
}
```

El primero corrige un desbordamiento real del original en pantallas de 320–400 px
(la marca más tres enlaces no caben a tamaño completo).

El segundo permite imprimir el catálogo como ficha de producto: se ocultan navbar,
footer, botones y avisos. Es el **único** `!important` del proyecto, y en un
contexto donde es la práctica habitual.

## 15.7 Accesibilidad en CSS

### Foco visible

```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

`:focus-visible` en lugar de `:focus`: el anillo aparece al navegar con teclado y
no al hacer clic con ratón, que es el comportamiento que la gente espera.

Ningún `outline: none` sin sustituto en todo el proyecto. Los controles del
formulario reemplazan el outline por un anillo de sombra:

```css
.control:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--focus-ring);
}
```

### Movimiento reducido

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

En `01-reset.css`, para que aplique a todo lo que venga después. Afecta al spinner,
a los toasts y a las transiciones de hover.

### Espacio reservado para errores

```css
.field__error {
  font-size: var(--text-xs);
  color: var(--color-red-600);
  min-height: var(--leading-xs);     /* ← reserva la línea */
}
```

Sin `min-height`, aparecer un mensaje de error desplazaría todo el formulario hacia
abajo. Con él, el hueco ya está reservado.

### `sr-only`

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

Contenido solo para lectores de pantalla, sin `display: none` (que lo ocultaría
también de ellos).

### Alto contraste real

Los pares de color usados cumplen WCAG AA para su tamaño:

| Combinación | Uso |
|---|---|
| `--color-gray-800` sobre `--surface` | Títulos |
| `--color-gray-600` sobre `--surface` | Cuerpo |
| `--color-white` sobre `--brand` | Botón primario |
| `--color-amber-700` sobre `--color-amber-50` | Aviso informativo |

`--text-faint` (`gray-400`) se reserva para texto de 12 px no esencial
(etiquetas "Tasa anual", requisitos), nunca para contenido crítico.

## 15.8 Detalles de implementación destacables

### `<select>` con flecha propia

```css
.control--select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' …%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 1.25rem 1.25rem;
  padding-right: var(--space-10);
}
```

SVG embebido como data URI: apariencia consistente entre navegadores y cero
peticiones de red.

### Footer siempre abajo

```css
.page {
  min-height: 100vh;
  min-height: 100dvh;        /* corrige la barra de direcciones en móvil */
  display: flex;
  flex-direction: column;
}

.page > .page__main { flex: 1 1 auto; }
```

El doble `min-height` es intencional: `100dvh` (dynamic viewport height) evita el
salto que produce la barra de direcciones en móviles, y `100vh` queda como reserva
para navegadores que no lo soporten.

### Toasts sin bloquear clics

```css
.notifications {
  position: fixed;
  right: var(--space-4); bottom: var(--space-4);
  max-width: min(24rem, calc(100vw - 2rem));
  pointer-events: none;        /* el contenedor no intercepta clics */
}

.toast { pointer-events: auto; }   /* el toast sí */
```

El contenedor ocupa una esquina de la pantalla permanentemente; sin
`pointer-events: none` bloquearía los clics en esa zona incluso vacío.

## 15.9 Reglas del sistema de estilos

| Regla | Motivo |
|---|---|
| Ningún color literal fuera de `02-tokens.css` | Una sola fuente de verdad |
| Todas las media queries en `07-responsive.css` | Se lee el comportamiento móvil en un archivo |
| Sin `!important` salvo en `@media print` | La cascada por orden de archivos ya resuelve la especificidad |
| BEM para componentes; utilidades solo si se repiten 3+ veces | Evita CSS atómico por la puerta de atrás |
| Todo `outline: none` lleva sustituto visible | Accesibilidad de teclado |
| Los temas se declaran como bloques de variables, no como reglas de componente | El componente no conoce colores |
| Nada de estilos en línea en el JavaScript | Toda la presentación visual vive en CSS |

## 15.10 Siguiente lectura

- [16 — Catálogo de patrones](./16-catalogo-de-patrones.md)
- [12 — Vistas, controladores y componentes](./12-vistas-controladores-componentes.md)
