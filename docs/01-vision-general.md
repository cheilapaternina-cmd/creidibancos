[← Volver al índice maestro](./master.md)

# 01 — Visión general

## 1.1 Qué es este proyecto

CreditSmart es una plataforma de consulta, simulación y solicitud de créditos.
El código de este repositorio es una **reconstrucción desde cero** del sitio
`https://sweet-smart-credit-path.base44.app` — originalmente una SPA de React +
Vite + Tailwind — reescrita en **HTML, CSS y JavaScript vanilla**, sin
frameworks, sin build y sin dependencias de runtime.

El objetivo no fue "copiar el HTML". Fue **reconstruir el sistema** con una
arquitectura que sobreviva al crecimiento: cuatro capas con dependencias
dirigidas hacia el núcleo, interfaces declaradas explícitamente, y un único
punto en todo el proyecto donde se conocen las clases concretas.

## 1.2 Cómo se obtuvo el contenido original

El sitio original servía un shell vacío (`<div id="root"></div>`): todo el
contenido estaba dentro del bundle de JavaScript. El proceso fue:

1. Descargar `index.html` → localizar `assets/index-DqxiHLJL.js` (414 KB
   minificados) y `assets/index-DxNO4emD.css` (70 KB de Tailwind compilado).
2. Comprobar que **no había chunks diferidos** (`grep '/assets/'` sobre el
   bundle → cero resultados): toda la app estaba en un solo archivo.
3. Formatear el bundle (21 995 líneas) y localizar el código de aplicación:
   líneas **20722–21995**. Todo lo anterior era librería (React, react-router,
   TanStack Query, PartySocket, el SDK de Base44).
4. Extraer de esa región: la tabla de rutas, los 5 productos con sus datos, los
   5 rangos de filtro, las 3 páginas completas con cada texto y `className`, el
   404, la pantalla de acceso restringido y el spinner de carga.
5. Traducir las clases de Tailwind a CSS plano con la paleta exacta
   (`blue-700` → `#1d4ed8`, etc.).

## 1.3 Qué se replicó, elemento por elemento

| Elemento del original | Dónde está aquí |
|---|---|
| Ruta `/` — Catálogo | `presentation/views/CatalogView.js` + `CatalogController.js` |
| Ruta `/simulador` | `SimulatorView.js` + `SimulatorController.js` |
| Ruta `/solicitar` | `ApplicationView.js` + `ApplicationController.js` |
| Ruta `*` — 404 (paleta slate, botón "Go Home" con SVG inline) | `NotFoundView.js` + `NotFoundController.js` |
| Pantalla de sistema "Access Restricted" | `AccessRestrictedView.js` |
| Spinner de carga inicial | `.app-boot` / `.spinner` en `index.html` + `03-base.css` |
| Componente `ScrollToTop` (scroll al inicio, o al ancla si hay hash) | `ViewRenderer.mount()` + `HistoryRouter.#applyHashScroll()` |
| Navbar sticky, marca `Credit`+`Smart`, "by FinTech Solutions" | `NavbarComponent.js` |
| Hero con degradado azul y dos CTA | `CatalogView.#hero()` |
| 5 productos: nombre, descripción, montos, tasa, plazo, requisitos, emoji, gradiente | `infrastructure/persistence/datasources/StaticCreditProductDataSource.js` (hoy con 6: ver más abajo) |
| 5 rangos de monto del filtro | `STATIC_AMOUNT_RANGES` (mismo archivo) |
| Plazos 12/24/36/48/60 meses | `STATIC_TERM_OPTIONS` (mismo archivo) |
| `Intl.NumberFormat('es-CO', {currency:'COP', maximumFractionDigits:0})` | `IntlMoneyFormatter.js` |
| Footer con dos variantes de margen y de texto | `FooterComponent.js` |
| Paleta Tailwind completa usada por el diseño | `assets/css/02-tokens.css` |
| Breakpoints `sm:640px` / `lg:1024px` | `assets/css/07-responsive.css` |

### Las tres diferencias deliberadas

El original declaraba en pantalla que dos cosas no funcionaban. Aquí funcionan:

1. **Filtros del simulador.** El original decía *"La búsqueda y filtros son
   solo visuales en esta actividad"*. Aquí la búsqueda es incremental (filtra
   al teclear) y el filtro por rango se resuelve con `AmountRange.overlaps()`.
   El aviso de la pantalla se reformuló para no mentir: *"Los datos del catálogo
   son estáticos. La búsqueda y los filtros se resuelven en el navegador."*
2. **Formulario de solicitud.** El original decía *"El formulario es solo de
   diseño en esta actividad"*. Aquí valida los 11 campos, aplica la política de
   dominio (monto y plazo dentro de lo que permite el producto elegido), estima
   la cuota mensual con el sistema francés, radica la solicitud con número de
   referencia (`CS-XXXXXXXX`) y la persiste. La nota al pie se ajustó.

3. **Un sexto producto.** El original ofrecía 5 productos. Aquí se añadió
   `Crédito de Libranza` ($1 000 000 – $80 000 000, 13,5 % E.A., 96 meses,
   emoji 🧾, paleta `teal`), con su propio tema en `02-tokens.css` y `teal`
   incorporado a `THEME_PALETTES`. Es la demostración práctica de la receta de
   extensión: se toca **un** archivo de datos y el catálogo, el filtro del
   simulador y el `<select>` del formulario se actualizan solos.

Si prefieres el texto literal del original, está señalado en
`SimulatorView.template()` y `ApplicationView.template()`.

Todo lo demás — cada texto, placeholder, emoji, tipo de campo, orden, color,
sombra, radio y breakpoint — es idéntico.

## 1.4 Mapa del sistema

```
                              NAVEGADOR
                                  │
                          index.html (shell)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            assets/css/*.css              src/main.js
          (7 archivos, cascada)          (bootstrap)
                                                │
                                    config/dependencies.js
                                    (Composition Root: 32 deps)
                                                │
        ┌───────────────────────┬───────────────┴────────┬──────────────────┐
        │                       │                        │                  │
  PRESENTACIÓN            APLICACIÓN                 DOMINIO         INFRAESTRUCTURA
  (MVC)                   (casos de uso)             (núcleo)        (adaptadores)
        │                       │                        │                  │
  HistoryRouter          ListCreditProducts       CreditProduct      InMemoryCreditProduct…
  ├ CatalogController    SearchCreditProducts     CreditApplication  StaticAmountRangeProvider
  ├ SimulatorController  GetAmountRangeFilters     Money · Term       LocalStorageCreditApp…
  ├ ApplicationCtrl      GetCreditProductNames     InterestRate       IntlMoneyFormatter
  └ NotFoundController   SubmitCreditApplication   AmountRange        SystemClock
        │                       │                  ProductTheme       CryptoIdGenerator
  6 vistas                 Result · DTOs           Applicant          ConsoleLogger
  4 componentes            2 mappers               RequestedCredit    ToastNotifier
  1 decorador                                      EmploymentInfo     HistoryRouter
  ViewRenderer                                     ProductSearchCriteria
  UrlBuilder · Html                                CreditApplicationPolicy
                                                   4 errores · 7 puertos
```

## 1.5 Estructura de carpetas

```
crediSmart/
├── index.html                     Shell: punto de montaje + cascada de CSS
├── manifest.json                  PWA (nombre, iconos, tema)
├── .htaccess                      Reescritura SPA, MIME, caché, seguridad
├── README.md                      Puesta en marcha
│
├── docs/                          ◄── esta documentación (21 archivos)
│   ├── master.md
│   └── 01…20-*.md
│
├── assets/css/                    7 archivos, cascada explícita
│   ├── 01-reset.css               Normalización
│   ├── 02-tokens.css              Design tokens + temas de producto
│   ├── 03-base.css                Elementos base + utilidades tipográficas
│   ├── 04-layout.css              Contenedores, secciones, grids
│   ├── 05-components.css          Navbar, botones, cards, formularios, toasts
│   ├── 06-pages.css               Hero, simulador, formulario, 404, acceso
│   └── 07-responsive.css          Breakpoints sm/lg + print
│
└── src/
    ├── main.js                    BOOTSTRAP
    ├── domain/                    23 archivos — núcleo, cero deps externas
    ├── application/               12 archivos — casos de uso
    ├── infrastructure/            11 archivos — adaptadores
    ├── presentation/              22 archivos — MVC
    └── config/                     4 archivos — Composition Root
```

## 1.6 Cómo ejecutarlo

Requiere servirse por **HTTP**: el proyecto usa módulos ES (`type="module"`),
que el navegador bloquea sobre `file://` por política CORS.

### Laragon / Apache

El proyecto ya vive en `C:\laragon\www\crediSmart`:

```
http://crediSmart.test/          vhost automático de Laragon
http://localhost/crediSmart/     alternativa por subdirectorio
```

El `.htaccess` incluido reescribe las rutas limpias hacia `index.html`, de modo
que recargar en `/simulador` o `/solicitar` funciona. Requiere `mod_rewrite`
(activo por defecto en Laragon).

### Otro servidor estático

```bash
npx serve .
# o
python -m http.server 8080
```

Sin reescritura, la navegación interna funciona (History API), pero recargar
directamente en `/simulador` devuelve 404 del servidor. Para Nginx:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

El prefijo de despliegue se **autodetecta** desde `document.baseURI`
(`UrlBuilder.detectBasePath()`), así que funciona igual en la raíz del dominio
o en un subdirectorio. Para fijarlo a mano: `AppConfig.basePath`.

## 1.7 Por qué esta arquitectura para un proyecto de este tamaño

Objeción legítima: *"son 3 pantallas, esto es sobre-ingeniería"*.

La respuesta es que el coste de la arquitectura se paga **una vez** y el
beneficio se cobra **en cada cambio**. Ejemplos concretos de este proyecto:

| Cambio | Con esta arquitectura | Sin ella (todo en las vistas) |
|---|---|---|
| Pasar de datos estáticos a una API REST | 1 archivo nuevo + 1 línea en `dependencies.js` | Reescribir las 3 vistas |
| Añadir un producto | 1 entrada en el datasource; aparece en catálogo, simulador y el `<select>` del formulario | 3 sitios distintos, y el `<select>` se olvida (el original lo tenía duplicado en un array aparte) |
| Cambiar la regla del 40 % de capacidad de pago | 1 método en `EmploymentInfo` | Buscar el número mágico en cada vista |
| Probar la lógica sin navegador | `node smoke.mjs` — el dominio no conoce el DOM | Imposible sin jsdom o un navegador headless |
| Reutilizar la lógica en otra interfaz (CLI, móvil) | Reutilizar `src/domain` + `src/application` tal cual | Reescribir todo |

La suite de dominio+aplicación de [19 — Pruebas](./19-pruebas-y-verificacion.md)
se ejecuta en Node **sin ninguna dependencia y sin DOM**. Eso solo es posible
porque el núcleo está aislado; es la prueba empírica de que el aislamiento
existe.

## 1.8 Siguiente lectura

- Para entender el diseño: [02 — Arquitectura hexagonal](./02-arquitectura-hexagonal.md)
- Para tocar código ya: [18 — Guía de extensión](./18-guia-de-extension.md)
