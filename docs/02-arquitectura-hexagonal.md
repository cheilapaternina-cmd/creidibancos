[← Volver al índice maestro](./master.md)

# 02 — Arquitectura hexagonal (puertos y adaptadores)

## 2.1 El problema que resuelve

En una aplicación web típica, la lógica de negocio termina *dentro* de la
tecnología: la regla "el monto debe estar dentro del rango del producto" acaba
escrita en el `onSubmit` de un componente React, mezclada con `useState`,
`fetch` y `className`.

Consecuencias: no puedes probar la regla sin montar un navegador, no puedes
reutilizarla en otra interfaz, y cambiar de librería de UI significa reescribir
el negocio.

La arquitectura hexagonal —Alistair Cockburn, 2005— invierte la relación: **la
tecnología se conecta al negocio, no al contrario**. El negocio queda en el
centro y declara, mediante *puertos*, qué necesita del mundo exterior. La
tecnología provee *adaptadores* que cumplen esos puertos.

## 2.2 Vocabulario

| Término | Definición | En este proyecto |
|---|---|---|
| **Hexágono / núcleo** | El código que expresa el negocio. No conoce ninguna tecnología. | `src/domain/` + `src/application/` |
| **Puerto** | Una interfaz declarada **por el núcleo**, que expresa una necesidad en el lenguaje del negocio. | Los 12 archivos `I*.js` en `contracts/` |
| **Adaptador** | Una implementación concreta de un puerto, escrita con una tecnología. | Los 10 archivos de `src/infrastructure/` |
| **Puerto de entrada** (*driving* / primario) | Cómo el mundo exterior le pide cosas al núcleo. Lo invoca alguien de fuera. | `IUseCase`, `IController`, `IRouter` |
| **Puerto de salida** (*driven* / secundario) | Qué necesita el núcleo del mundo exterior. Lo invoca el núcleo. | `ICreditProductRepository`, `IMoneyFormatter`, `IClock`… |
| **Composition Root** | El único lugar que conoce puertos **y** adaptadores, y los une. | `src/config/dependencies.js` |

La distinción entre puerto de entrada y de salida es la que más se malinterpreta.
Regla mnemotécnica: **mira quién llama al método**.

```
Puerto de ENTRADA   →   el exterior llama al núcleo
                        HistoryRouter → CatalogController.handle()

Puerto de SALIDA    →   el núcleo llama al exterior
                        ListCreditProductsUseCase → repository.findAll()
```

## 2.3 El hexágono de CreditSmart

```
   ADAPTADORES DE ENTRADA                                ADAPTADORES DE SALIDA
        (driving)                                              (driven)

                        ┌───────────────────────────────┐
   HistoryRouter        │                               │      InMemoryCreditProductRepository
   (History API)  ──┐   │    ┌─────────────────────┐    │  ┌── implementa ICreditProductRepository
                    │   │    │    APLICACIÓN       │    │  │
   Controladores    ├──►│    │  5 casos de uso     │◄───┼──┤   StaticAmountRangeProvider
   (MVC)            │   │    │  Result · mappers   │    │  │   implementa IAmountRangeProvider
                    │   │    └──────────┬──────────┘    │  │
   Vistas + DOM   ──┘   │               │               │  ├── LocalStorageCreditApplicationRepository
   (eventos)            │    ┌──────────▼──────────┐    │  │   implementa ICreditApplicationRepository
                        │    │      DOMINIO        │    │  │
                        │    │  2 entidades        │    │  ├── IntlMoneyFormatter
                        │    │  8 value objects    │    │  │   implementa IMoneyFormatter
                        │    │  1 servicio         │    │  │
                        │    │  1 criterio         │    │  ├── SystemClock            → IClock
                        │    │  4 errores          │    │  ├── CryptoIdGenerator      → IIdGenerator
                        │    │  7 PUERTOS          │    │  ├── ConsoleLogger          → ILogger
                        │    └─────────────────────┘    │  └── ToastNotifier          → INotifier
                        │                               │
                        └───────────────────────────────┘
                          NADA de aquí importa nada
                          de las columnas laterales
```

Lo importante del dibujo: **las flechas de la derecha apuntan hacia dentro**.
`InMemoryCreditProductRepository` importa `ICreditProductRepository` del dominio.
El dominio **no importa** el repositorio. Eso es la inversión de dependencias.

## 2.4 Los 12 puertos, agrupados por dueño

Quién *declara* el puerto determina en qué carpeta vive. El dueño es quien tiene
la necesidad, no quien la satisface.

### Puertos declarados por el DOMINIO (`src/domain/contracts/`)

Necesidades expresadas en lenguaje de negocio, sin rastro de tecnología.

| Puerto | Métodos | Necesidad de negocio | Adaptador actual |
|---|---|---|---|
| `ICreditProductRepository` | `findAll` · `findById` · `findByCriteria` · `count` | "Necesito consultar el catálogo de productos" | `InMemoryCreditProductRepository` |
| `ICreditApplicationRepository` | `save` · `findById` · `findAll` · `nextIdentity` | "Necesito guardar solicitudes y pedir identidades" | `LocalStorageCreditApplicationRepository` |
| `IAmountRangeProvider` | `all` · `byIndex` | "Necesito los rangos de monto ofrecidos como filtro" | `StaticAmountRangeProvider` |
| `IMoneyFormatter` | `format` · `formatCompact` | "Necesito mostrar dinero como texto al usuario" | `IntlMoneyFormatter` |
| `IClock` | `now` · `timestamp` | "Necesito saber cuándo es ahora" | `SystemClock` |
| `IIdGenerator` | `generate` | "Necesito una identidad para una entidad nueva" | `CryptoIdGenerator` |

Nota sobre `IMoneyFormatter`: podría parecer un asunto de presentación, pero la
necesidad *"un importe debe poder mostrarse al usuario"* es del negocio; lo que
es tecnología es `Intl.NumberFormat`. Por eso el puerto vive en el dominio y el
adaptador en infraestructura.

### Puertos declarados por la APLICACIÓN (`src/application/contracts/`)

| Puerto | Métodos | Necesidad | Adaptador actual |
|---|---|---|---|
| `IUseCase` | `execute` | "Todo caso de uso se invoca igual" (puerto de entrada) | `ListCreditProductsUseCase` y los otros 4 |
| `ILogger` | `debug` · `info` · `warn` · `error` | "Necesito dejar rastro técnico" | `ConsoleLogger` |
| `INotifier` | `success` · `error` · `info` | "Necesito avisar al usuario del resultado" | `ToastNotifier` |

### Puertos declarados por la PRESENTACIÓN (`src/presentation/contracts/`)

| Puerto | Métodos | Necesidad | Implementación |
|---|---|---|---|
| `IView` | `render` · `afterRender` · `destroy` | "Toda vista se pinta y se limpia igual" | `BaseView` + 5 vistas |
| `IController` | `handle` · `dispose` | "Todo controlador atiende una ruta igual" | `BaseController` + 4 controladores + `DocumentTitleController` |
| `IRouter` | `register` · `setFallback` · `start` · `navigate` · `currentPath` | "Necesito resolver URLs a controladores" | `HistoryRouter` |

La firma completa de cada uno está en
[06 — Contratos e interfaces](./06-contratos-e-interfaces.md).

## 2.5 Cómo se conecta todo: el Composition Root

Un puerto no sirve de nada si nadie decide qué adaptador lo cumple. Esa decisión
está **centralizada en un solo archivo**, `src/config/dependencies.js`:

```js
container.register('productRepository', () =>
  assertImplements(new InMemoryCreditProductRepository(), ICreditProductRepository),
);

container.register('listCreditProductsUseCase', (c) =>
  new ListCreditProductsUseCase({
    productRepository: c.resolve('productRepository'),   // ← el puerto, resuelto
    productMapper:    c.resolve('productMapper'),
  }),
);
```

Dos cosas ocurren en esas líneas:

1. **La elección del adaptador es una línea.** Cambiar a una API REST es:
   ```js
   container.register('productRepository', (c) =>
     assertImplements(new HttpCreditProductRepository({
       baseUrl: c.resolve('config').apiBaseUrl,
     }), ICreditProductRepository),
   );
   ```
   Ni el dominio, ni los casos de uso, ni los controladores, ni las vistas
   cambian una sola línea.

2. **El contrato se verifica en el arranque.** `assertImplements` compara los
   métodos de la instancia con los del puerto y lanza `ContractViolationError`
   con la lista exacta de los que faltan. Y como `main.js` llama a
   `container.eagerResolveAll()`, esto ocurre al cargar la página, no a mitad de
   una navegación del usuario.

Detalle completo en [13 — Inyección de dependencias](./13-inyeccion-de-dependencias.md).

## 2.6 La prueba de que el hexágono está bien cerrado

Un hexágono "bien cerrado" tiene una propiedad observable: **el núcleo se puede
ejecutar fuera de su entorno de producción**. Aquí eso se comprueba
literalmente: la suite de dominio+aplicación corre en Node, sin navegador, sin
DOM, sin jsdom y sin dependencias:

```
ok  : catalogo tiene 6 productos
ok  : busqueda "vehiculo" -> 1 resultado
ok  : formulario vacio -> falla
ok  : 11 errores de campo
ok  : solicitud valida radicada
ok  : monto fuera de rango rechazado por politica de dominio
```

Si el dominio importara `document`, `window`, `fetch` o `localStorage`, esa
suite no arrancaría. El hecho de que arranque **es** la verificación.

La segunda prueba es el `grep` de la regla de dependencia:

```bash
grep -rn "from '\.\./\.\./\(application\|infrastructure\|presentation\|config\)" src/domain/
# → cero resultados
```

## 2.7 Errores frecuentes al aplicar el patrón

| Error | Por qué está mal | Cómo se evita aquí |
|---|---|---|
| Declarar el puerto en la capa de infraestructura | El puerto pertenece a quien tiene la *necesidad*. Si lo declara el adaptador, la dependencia no se invirtió: solo se añadió una interfaz inútil. | Los puertos viven en `domain/contracts/`, `application/contracts/` y `presentation/contracts/`. Nunca en `infrastructure/`. |
| Puertos con nombres de tecnología (`IHttpClient`, `ISqlRepository`) | Filtra la tecnología al núcleo. El dominio no debería saber que existe HTTP. | `ICreditProductRepository`, no `IProductApiClient`. |
| Puertos enormes ("god interface") | Obliga a los adaptadores a implementar métodos que no usan; rompe ISP. | El puerto más grande tiene 5 métodos (`IRouter`); `IIdGenerator` tiene 1. |
| Adaptadores que se instancian entre sí con `new` | Reintroduce el acoplamiento que el patrón elimina. | El único archivo con `new` de clases concretas es `dependencies.js`. |
| El núcleo devolviendo tipos de la tecnología | Un caso de uso que devuelve un `Response` de `fetch` acopla a todos sus consumidores a HTTP. | Los casos de uso devuelven `Result` con DTOs planos. |
| "Hexágono decorativo": interfaces que nadie verifica | En JavaScript, una interfaz sin verificación es un comentario. | `assertImplements()` + `eagerResolveAll()` lo verifican en el arranque. |

## 2.8 Relación con las otras capas del diseño

La arquitectura hexagonal responde a *"¿quién depende de quién?"*. No responde a
*"¿en qué orden se ejecuta?"* ni *"¿cómo organizo la pantalla?"*. Para eso:

- El **orden de las capas** y la regla de dependencia formal:
  [03 — Clean Architecture y capas](./03-clean-architecture-capas.md)
- La **organización de la pantalla**:
  [04 — MVC en la presentación](./04-mvc-presentacion.md)
- El **catálogo completo de patrones** que complementan al hexágono:
  [16 — Catálogo de patrones](./16-catalogo-de-patrones.md)
