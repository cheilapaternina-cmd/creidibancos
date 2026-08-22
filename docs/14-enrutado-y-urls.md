[← Volver al índice maestro](./master.md)

# 14 — Enrutado y URLs

## 14.1 Las rutas

| Ruta | Controlador | Título del documento |
|---|---|---|
| `/` | `CatalogController` | CreditSmart — Catálogo |
| `/simulador` | `SimulatorController` | CreditSmart — Simulador |
| `/solicitar` | `ApplicationController` | CreditSmart — Solicitar |
| `*` | `NotFoundController` | CreditSmart — Página no encontrada |

Las mismas del original (que usaba react-router en modo browser), con URLs limpias
sin `#`.

## 14.2 El puerto `IRouter`

```js
export const IRouter = defineContract('IRouter', [
  'register', 'setFallback', 'start', 'navigate', 'currentPath',
]);
```

Vive en `src/presentation/contracts/` porque es la presentación quien necesita
resolver URLs a controladores. `HistoryRouter` es el adaptador; sustituirlo por un
`HashRouter` o un `MemoryRouter` (para tests) no toca nada más.

## 14.3 `UrlBuilder` — el prefijo de despliegue

`src/presentation/shared/UrlBuilder.js`

### El problema

La app puede vivir en la raíz de un dominio (`https://creditsmart.co/simulador`) o
en un subdirectorio (`http://localhost/crediSmart/simulador`, lo habitual en
Laragon/XAMPP). Si los `href` estuvieran escritos como `/simulador`, en el segundo
caso apuntarían fuera de la aplicación.

### La solución: dos traducciones

```js
href(path) {
  const clean = String(path ?? '/').replace(/^\/+/, '');
  return `${this.#basePath}${clean}`;
}
// '/simulador' → '/crediSmart/simulador'

toRoutePath(pathname) {
  let path = String(pathname ?? '/');
  if (this.#basePath !== '/' && path.startsWith(this.#basePath)) {
    path = path.slice(this.#basePath.length - 1);
  }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path === '' ? '/' : path;
}
// '/crediSmart/simulador' → '/simulador'
```

`href` se usa en cada enlace de las vistas. `toRoutePath` lo usa el router para
saber qué ruta interna corresponde a la URL actual.

Nótese `this.#basePath.length - 1`: conserva la barra inicial, porque `basePath`
siempre termina en `/`. Con `basePath = '/crediSmart/'` (11 caracteres), cortar en
10 deja `/simulador` y no `simulador`.

### Autodetección

```js
static detectBasePath() {
  try {
    const url = new URL(document.baseURI);
    const dir = url.pathname.replace(/[^/]*$/, '');
    return UrlBuilder.normalizeBase(dir);
  } catch {
    return '/';
  }
}

static normalizeBase(base) {
  let value = String(base ?? '/');
  if (!value.startsWith('/')) value = `/${value}`;
  if (!value.endsWith('/'))   value = `${value}/`;
  return value;
}
```

`document.baseURI` resuelve a la URL del documento (o al `<base href>` si
existiera). Quitar el último segmento no-barra deja el directorio:

| `document.baseURI` | `detectBasePath()` |
|---|---|
| `http://crediSmart.test/` | `/` |
| `http://localhost/crediSmart/` | `/crediSmart/` |
| `http://localhost/crediSmart/index.html` | `/crediSmart/` |
| `http://localhost/apps/credito/simulador` | `/apps/credito/` ⚠️ |

La última fila muestra el límite: si se entra directamente a una ruta profunda sin
barra final, la detección la confundiría con un directorio. Para esos despliegues
se fija el valor explícitamente:

```js
// src/config/AppConfig.js
basePath: '/apps/credito/',
```

`normalizeBase` garantiza la forma canónica (`/algo/`) sea cual sea la entrada.

Verificado: `ok : basePath autodetectado (/crediSmart/)`, `ok : router: href`,
`ok : router: toRoutePath`.

## 14.4 `HistoryRouter`

`src/infrastructure/routing/HistoryRouter.js`

### Registro de rutas

```js
register(path, controller) {
  assertImplements(controller, IController);
  this.#routes.set(HistoryRouter.#normalize(path), controller);
  return this;      // fluido
}

setFallback(controller) {
  assertImplements(controller, IController);
  this.#fallback = controller;
  return this;
}

static #normalize(path) {
  let value = String(path ?? '/');
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  return value;
}
```

Verifica el contrato **al registrar**, no al navegar: un controlador incompleto
falla al arrancar.

`#normalize` hace que `/simulador` y `/simulador/` sean la misma ruta.

Verificado: `ok : contrato: rechaza controlador incompleto (CONTRACT_VIOLATION)`.

### Arranque

```js
async start() {
  if (this.#started) return;      // idempotente
  this.#started = true;

  window.addEventListener('popstate', () => {
    this.#resolve(this.currentPath(), { restoreScroll: true });
  });

  document.addEventListener('click', (event) => this.#onDocumentClick(event));

  await this.#resolve(this.currentPath(), { restoreScroll: false });
}
```

Dos listeners globales y la resolución inicial. `popstate` cubre los botones
atrás/adelante del navegador.

### Resolución

```js
async #resolve(path, { restoreScroll }) {
  const controller = this.#routes.get(path) ?? this.#fallback;

  if (!controller) {
    this.#logger.error('Ruta sin controlador y sin fallback', { path });
    return;
  }

  if (this.#active && this.#active !== controller) {
    this.#active.dispose();          // libera la vista anterior
  }
  this.#active = controller;

  try {
    await controller.handle({
      path,
      query: new URLSearchParams(window.location.search),
      hash: window.location.hash,
    });
    this.#logger.debug('Ruta resuelta', { path, controller: controller.constructor.name });
  } catch (err) {
    this.#logger.error('Fallo al resolver la ruta', { path, message: err?.message });
    throw err;
  }

  if (!restoreScroll) this.#applyHashScroll();
}
```

- **`dispose()` del controlador saliente**: es lo que evita fugas de listeners al
  navegar. Comparar `this.#active !== controller` evita destruir la vista que se
  está a punto de montar cuando se navega a la misma ruta.
- **El contexto que recibe `handle`** incluye `path`, `query` (parseada) y `hash`.
  `NotFoundController` usa `path`; los demás no necesitan nada, pero la firma está
  disponible para rutas con parámetros en el futuro.
- **`restoreScroll: true` en `popstate`**: al volver atrás, el navegador restaura
  la posición de scroll por su cuenta; el router no interfiere.

### Delegación de clics

```js
#onDocumentClick(event) {
  // Respeta abrir-en-nueva-pestaña, clic central y modificadores.
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = event.target instanceof Element ? event.target.closest('a[data-link]') : null;
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const url = new URL(anchor.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  const routePath = this.#urlBuilder.toRoutePath(url.pathname);

  if (routePath === this.currentPath() && url.hash === window.location.hash) return;

  this.navigate(routePath);
}
```

Siete guardas antes de interceptar. Cada una preserva un comportamiento que el
usuario espera de un enlace:

| Guarda | Qué preserva |
|---|---|
| `defaultPrevented` | Otro handler ya se ocupó del evento |
| `button !== 0` | Clic central (abrir en pestaña nueva) y derecho (menú contextual) |
| `metaKey/ctrlKey/shiftKey/altKey` | Ctrl+clic, Cmd+clic, Shift+clic |
| `closest('a[data-link]')` | Solo enlaces marcados como internos; funciona aunque se pulse un `<span>` dentro del enlace |
| `target !== '_self'` | `target="_blank"` |
| `download` | Descargas |
| `url.origin !== location.origin` | Enlaces externos |
| ruta y hash idénticos | Evita re-renderizar la vista actual sin motivo |

**Por qué delegación en `document`** y no un listener por enlace: las vistas se
re-pintan constantemente y cada `innerHTML` destruiría los listeners. Un solo
listener en `document` sobrevive a cualquier re-render.

**Por qué `data-link`** y no interceptar todos los `<a>`: hace explícito qué
enlaces son internos. Un enlace externo no necesita marcarse ni excluirse a mano.

Verificado: `ok : URL cambiada sin recarga (/crediSmart/simulador)`.

### Navegación por código

```js
async navigate(path, { replace = false } = {}) {
  const routePath = HistoryRouter.#normalize(path);
  const href = this.#urlBuilder.href(routePath);

  if (replace) window.history.replaceState({}, '', href);
  else         window.history.pushState({}, '', href);

  await this.#resolve(routePath, { restoreScroll: false });
}
```

`replace: true` sustituye la entrada del historial en lugar de añadir una: útil
para redirecciones que no deben quedar en el botón atrás.

### Scroll al ancla

Réplica del componente `ScrollToTop` del original:

```js
#applyHashScroll() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* hash no decodificable: se usa tal cual */
  }

  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, 50);
}
```

El `setTimeout(…, 50)` da tiempo a que el DOM de la vista nueva exista antes de
buscar el elemento. Es el mismo retardo que usaba el original.

El scroll al inicio (cuando no hay hash) lo hace `ViewRenderer.mount()`, no el
router: separación de responsabilidades — el router resuelve rutas, el renderer
monta vistas.

## 14.5 Configuración del servidor

Con History API, `http://localhost/crediSmart/simulador` es una URL que el
servidor debe resolver a `index.html`, porque no existe ese archivo en disco. Sin
la reescritura, la navegación interna funciona pero **recargar la página da 404**.

### Apache (Laragon / XAMPP / WAMP)

`.htaccess` incluido en la raíz del proyecto:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # No reescribas archivos ni directorios que existen de verdad
  # (assets, src, manifest.json...).
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Todo lo demás lo resuelve el router del cliente.
  RewriteRule ^ index.html [L]
</IfModule>
```

El orden es esencial: primero se excluyen archivos y directorios reales, o
`assets/css/02-tokens.css` también devolvería `index.html`.

El resto del `.htaccess`:

| Bloque | Función |
|---|---|
| `mod_mime` | `AddType text/javascript .js` — necesario para módulos ES en algunas configuraciones |
| `mod_deflate` | Compresión de HTML, CSS, JS y JSON |
| `mod_expires` | Caché de 7 días para CSS/JS, 30 para imágenes, **0 para HTML** |
| `mod_headers` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` |
| `Options -Indexes` | Sin listado de directorios |

El HTML no se cachea porque es el que arranca los módulos: si quedara en caché,
un despliegue nuevo seguiría cargando el `main.js` viejo.

### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Servidores de desarrollo

| Servidor | Comportamiento |
|---|---|
| `npx serve .` | Reescribe a `index.html` por defecto ✅ |
| `python -m http.server` | **No** reescribe: la navegación interna funciona, recargar en `/simulador` da 404 |
| `php -S localhost:8000` | Necesita un router PHP; `-t .` no basta |

## 14.6 Por qué History API y no hash

| | History API (`/simulador`) | Hash (`#/simulador`) |
|---|---|---|
| URLs | Limpias | Con `#` |
| Configuración de servidor | Necesaria | Ninguna |
| SEO / compartir enlaces | Correcto | Peor |
| Fidelidad al original | El original usaba History API | No |

Se eligió History API por fidelidad y por calidad de las URLs, asumiendo el coste
de la reescritura. El puerto `IRouter` deja la puerta abierta: un `HashRouter` que
implemente los 5 métodos funcionaría sin tocar nada más, para despliegues donde no
se pueda configurar el servidor.

## 14.7 Añadir una ruta

**1. Constante y entrada en la tabla:**

```js
// src/config/routes.js
export const ROUTES = Object.freeze({
  CATALOG: '/',
  SIMULATOR: '/simulador',
  APPLICATION: '/solicitar',
  HISTORY: '/mis-solicitudes',        // ← nueva
});

export const ROUTE_TABLE = Object.freeze([
  // …
  Object.freeze({ path: ROUTES.HISTORY, controller: 'historyController',
                  title: 'CreditSmart — Mis solicitudes' }),
]);
```

**2. Vista y controlador** en `presentation/`.

**3. Registrarlos** en `dependencies.js`.

**4. Si debe aparecer en el navbar**, añadir la entrada en `NavbarComponent`:

```js
const items = [
  { path: ROUTES.CATALOG,     label: 'Catálogo',        cta: false },
  { path: ROUTES.SIMULATOR,   label: 'Simulador',       cta: false },
  { path: ROUTES.HISTORY,     label: 'Mis solicitudes', cta: false },
  { path: ROUTES.APPLICATION, label: 'Solicitar',       cta: true  },
];
```

`main.js` no cambia: recorre `ROUTE_TABLE` y decora cada controlador
automáticamente.

Receta completa en [18 — Guía de extensión](./18-guia-de-extension.md).

## 14.8 Siguiente lectura

- [15 — Sistema de estilos](./15-sistema-de-estilos.md)
- [17 — Flujos end-to-end](./17-flujos-end-to-end.md)
