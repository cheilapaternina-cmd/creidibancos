[← Volver al índice maestro](./master.md)

# 17 — Flujos end-to-end

Qué ocurre exactamente, capa por capa, en cada interacción del sistema.
Notación de capas: **[P]** presentación · **[A]** aplicación · **[D]** dominio ·
**[I]** infraestructura · **[C]** config.

---

## 17.1 Arranque de la aplicación

```
Navegador carga index.html
  │
  ├─► 7 archivos CSS en cascada
  └─► <script type="module" src="./src/main.js">   (deferido: el DOM ya existe)
        │
        ▼
   [C] main.js — bootstrap()
        │
        ├─ 1. document.querySelector('#root')
        │     └─ si no existe → throw → pantalla "No se pudo iniciar la aplicación"
        │
        ├─ 2. buildContainer({ config: AppConfig, rootElement })
        │     └─ registra 32 factorías perezosas (nada se construye aún)
        │
        ├─ 3. container.eagerResolveAll()
        │     ├─ construye las 34 dependencias en orden de necesidad
        │     ├─ assertImplements() verifica cada adaptador contra su puerto
        │     ├─ UrlBuilder.detectBasePath() → '/crediSmart/'
        │     └─ un contrato roto lanza ContractViolationError AQUÍ
        │
        ├─ 4. por cada entrada de ROUTE_TABLE:
        │     router.register(path, new DocumentTitleController({ controller, title }))
        │     └─ assertImplements(controller, IController) en cada registro
        │
        ├─ 5. router.setFallback(new DocumentTitleController({ notFoundController, … }))
        │
        └─ 6. await router.start()
               │
          [I] HistoryRouter.start()
               ├─ window.addEventListener('popstate', …)
               ├─ document.addEventListener('click', …)   ← delegación de enlaces
               └─ #resolve(currentPath(), { restoreScroll: false })
                    └─► flujo 17.2
```

Verificado: `ok : contenedor resuelto (34 dependencias)`,
`ok : basePath autodetectado (/crediSmart/)`.

---

## 17.2 Cargar el catálogo (`/`)

```
[I] HistoryRouter.#resolve('/')
     ├─ controller = routes.get('/')  → DocumentTitleController(CatalogController)
     ├─ this.#active?.dispose()       ← libera la vista anterior si había
     │
     ▼
[P] DocumentTitleController.handle({ path:'/', query, hash })
     ├─ document.title = 'CreditSmart — Catálogo'
     ▼
[P] CatalogController.handle()
     ▼
[A] ListCreditProductsUseCase.execute()
     ├─► [D] ICreditProductRepository.findAll()
     │        ▼
     │   [I] InMemoryCreditProductRepository.findAll()
     │        └─ ya construidos en el constructor por:
     │           [I] CreditProductFactory.fromRawList(STATIC_CREDIT_PRODUCTS)
     │                └─ por cada registro crudo:
     │                   [D] new Money(5_000_000)                → valida finito, no negativo
     │                   [D] new AmountRange(min, max)           → valida max ≥ min
     │                   [D] InterestRate.ofAnnualPercentage(14.2) → valida 0..100
     │                   [D] Term.ofMonths(84)                   → valida entero > 0
     │                   [D] ProductTheme.of('🚗','emerald')     → valida paleta
     │                   [D] new CreditProduct({...})            → valida y congela
     │        └─ return [...this.#products]                      ← copia defensiva
     │
     ├─► [A] CreditProductMapper.toDTOList(products)
     │        └─ por producto:
     │           [D] IMoneyFormatter.format(product.minAmount)
     │                ▼
     │           [I] IntlMoneyFormatter → '$ 5.000.000'
     │           └─ freezeProductDTO({ …, amountRangeLabel: '$ 5.000.000 – $ 120.000.000' })
     │
     └─ return Result.ok({ products: DTO[], total: 5 })
     ▼
[P] CatalogController — result.isSuccess → this.present({ products })
     ▼
[P] BaseController.present() → ViewRenderer.mount(catalogView, viewModel)
     ├─ currentView?.destroy()
     ├─ root.innerHTML = catalogView.render(viewModel)
     │    ├─ NavbarComponent.render({ activePath: '/' })      → Catálogo activo, Solicitar CTA
     │    ├─ CatalogView.#hero()
     │    ├─ ProductCardComponent.render({ product, variant:'full' }) × 5
     │    └─ FooterComponent.render({ variant: 'catalog' })
     ├─ catalogView.afterRender(root, {})                    ← sin listeners propios
     └─ window.scrollTo({ top: 0, behavior: 'instant' })     ← réplica de ScrollToTop
```

Verificado: `ok : catalogo renderizado en /`, `ok : 6 tarjetas en el DOM (6)`,
`ok : titulo del documento (CreditSmart — Catálogo)`,
`ok : nav activo = Catálogo`.

---

## 17.3 Navegar con un clic (`/` → `/simulador`)

```
Usuario pulsa <a href="/crediSmart/simulador" data-link>Simulador</a>
     ▼
[I] HistoryRouter.#onDocumentClick(event)        ← listener único en document
     ├─ ¿defaultPrevented? no
     ├─ ¿button !== 0? no          (clic izquierdo)
     ├─ ¿meta/ctrl/shift/alt? no
     ├─ closest('a[data-link]')    → encontrado
     ├─ ¿target !== '_self'? no
     ├─ ¿download? no
     ├─ ¿otro origen? no
     ├─ toRoutePath('/crediSmart/simulador') → '/simulador'
     ├─ ¿misma ruta y mismo hash? no
     ├─ event.preventDefault()                  ← sin recarga de página
     ▼
[I] HistoryRouter.navigate('/simulador')
     ├─ history.pushState({}, '', '/crediSmart/simulador')
     ▼
[I] #resolve('/simulador', { restoreScroll: false })
     ├─ this.#active.dispose()   ← CatalogView.destroy(): quita sus listeners
     ▼
[P] DocumentTitleController → document.title = 'CreditSmart — Simulador'
     ▼
[P] SimulatorController.handle()
     ├─ #filter = { query:'', rangeIndex:0 }   #schedule = { open:false, mode:'yearly' }
     ├─► Promise.all([
     │     [A] GetAmountRangeFiltersUseCase.execute()
     │          └─► [D] IAmountRangeProvider.all()
     │                   ▼
     │              [I] StaticAmountRangeProvider → 5 AmountRange
     │          └─ Result.ok([{index:0,label:'Todos los montos'}, …]),
     │
     │     [A] ListCreditProductsUseCase.execute()     ← catálogo para el <select>
     │          └─ Result.ok({ products: CreditProductDTO[6] })
     │   ])
     ├─ #form = #defaultForm()   → { productId:'1', amount:'1000000', termInMonths:'12' }
     ├─► #runSimulation()                        →  flujo 17.5
     └─► #render({ initial: true })
```

Entrar en la ruta ya deja una simulación hecha sobre el primer producto: una
pantalla que arranca vacía no enseña qué hace.

Verificado: `ok : URL cambiada sin recarga (/crediSmart/simulador)`,
`ok : simulador renderizado`, `ok : 5 opciones de rango`,
`ok : simula al entrar en la ruta ($ 91.250)`.

---

## 17.4 Filtrar en el simulador (búsqueda incremental)

Usuario teclea `vivienda` en el campo de búsqueda.

```
[P] SimulatorView — listener 'input' del <input name="query">
     ├─ #readCriteria(form) → { query: 'vivienda', rangeIndex: 0 }
     └─ handlers.onSearch({ query, rangeIndex })          ← INTENCIÓN, no datos
     ▼
[P] SimulatorController.onSearch({ query, rangeIndex })
     ├─ #state = { query:'vivienda', rangeIndex:0, focusField:'query' }
     ▼
[P] #renderResults({ initial: false })
     ├─► [D] IAmountRangeProvider.byIndex(0)
     │        ▼
     │   [I] StaticAmountRangeProvider → AmountRange(0, null, 'Todos los montos')
     │
     ├─► [A] SearchCreditProductsUseCase.execute({ query:'vivienda', amountRange })
     │        ├─ [D] new ProductSearchCriteria({ query, amountRange })
     │        │
     │        ├─► [D] ICreditProductRepository.findByCriteria(criteria)
     │        │        ▼
     │        │   [I] InMemoryCreditProductRepository
     │        │        └─ products.filter(p => criteria.isSatisfiedBy(p))
     │        │             ▼
     │        │        [D] ProductSearchCriteria.isSatisfiedBy(product)
     │        │             ├─ [D] product.matchesName('vivienda')
     │        │             │      └─ normalize('Crédito Vivienda') → 'credito vivienda'
     │        │             │         .includes('vivienda') → true  ✓ solo id 3
     │        │             └─ [D] product.matchesAmountRange(range)
     │        │                    └─ amountRange.overlaps(range)   → true (unbounded)
     │        │
     │        ├─► [D] ICreditProductRepository.count() → 5
     │        └─ Result.ok({ products:[DTO], matched:1, total:5, isFiltered:true })
     │
     ├─ viewModel = { products, ranges, query:'vivienda', selectedRangeIndex:0,
     │                matched:1, total:5, isFiltered:true }
     ├─ handlers  = { onSearch, onClear, focusField:'query' }
     ▼
[P] BaseController.update() → ViewRenderer.refresh()
     ├─ simulatorView.destroy()            ← quita los listeners viejos
     ├─ root.innerHTML = render(viewModel)
     │    ├─ input con value="vivienda"    ← el texto sobrevive al re-render
     │    ├─ <p class="results-count">Mostrando 1 de 6 productos</p>
     │    └─ 1 ProductCardComponent variante 'compact'
     ├─ simulatorView.afterRender(root, handlers)
     │    ├─ reengancha submit / input / change / click
     │    └─ #restoreFocus(form, 'query')
     │         ├─ field.focus()
     │         └─ field.setSelectionRange(8, 8)    ← cursor al final
     └─ SIN scrollTo                                ← la página no salta
```

Puntos clave del flujo:

- **La vista no filtra.** Solo empaqueta lo que hay en los campos y avisa.
- **El filtrado real ocurre en el dominio**, tres capas más adentro:
  `criteria.isSatisfiedBy` → `product.matchesName` → `CreditProduct.normalize`.
- **`update` en lugar de `present`**: no hay scroll al inicio.
- **El foco se restaura** con el cursor al final, o el usuario escribiría una letra
  por pulsación.

Verificado: `ok : busqueda "vivienda" -> 1 tarjeta (1)`,
`ok : contador de resultados visible`,
`ok : foco conservado tras re-render (filter-query)`.

### Variante: filtro por rango

Usuario elige "Hasta $5.000.000" (índice 1) con el campo de texto vacío.

```
[P] SimulatorView — listener 'change' del <select name="rangeIndex">
     └─ handlers.onSearch({ query: '', rangeIndex: 1 })
     ▼
[D] AmountRange(0, 5_000_000, 'Hasta $5.000.000')
     ▼
[D] Por cada producto: amountRange.overlaps(filtro)
     ├─ Libre Inversión  [1M, 30M]   → 1M ≤ 5M  y 0 ≤ 30M   → ✓
     ├─ Vehículo         [5M, 120M]  → 5M ≤ 5M  y 0 ≤ 120M  → ✓
     ├─ Vivienda         [20M, 500M] → 20M > 5M              → ✗
     ├─ Educativo        [500K, 50M] → 500K ≤ 5M y 0 ≤ 50M   → ✓
     ├─ Empresarial      [10M, 1000M]→ 10M > 5M              → ✗
     └─ Libranza         [1M, 80M]   → 1M ≤ 5M  y 0 ≤ 80M   → ✓
     ▼
4 tarjetas · "Mostrando 4 de 6 productos"
```

Verificado: `ok : rango "Hasta $5.000.000" -> 4 tarjetas (4)`.

### Variante: sin coincidencias

Si ningún producto pasa el filtro, `SimulatorView` pinta el estado vacío en lugar
del grid:

```js
${raw(products.length === 0
  ? this.#alert.render({ variant: 'empty', icon: '🔎',
      message: 'Ningún producto coincide con los filtros aplicados.' })
  : html`<div class="grid-products" data-results>…</div>`)}
```

### Variante: "Limpiar"

```
[P] click en [data-action="clear"] → handlers.onClear()
     ▼
[P] SimulatorController.onClear()
     ├─ #state = { query:'', rangeIndex:0, focusField:null }   ← sin foco forzado
     └─ #renderResults({ initial:false }) → 6 tarjetas, sin contador
```

Verificado: `ok : "Limpiar" restaura las 6 tarjetas`.

---

## 17.5 Simular un crédito

Usuario teclea `10000000` en el campo de monto, con Libre Inversión (18,5 % E.A.)
seleccionado y 36 meses de plazo.

```
[P] SimulatorView — listener 'input' del <input name="amount">
     ├─ #readSimulation(form) → { amount:'10000000', termInMonths:'36' }
     └─ handlers.onSimulate(input, 'amount')            ← INTENCIÓN + campo con foco
     ▼
[P] SimulatorController.onSimulate({ amount, termInMonths }, 'amount')
     ├─ #form = { ...#form, amount:'10000000', termInMonths:'36' }
     ├─ #focusField = 'amount'
     ▼
[P] #runSimulation()
     ▼
[A] SimulateCreditUseCase.execute({ productId:'1', amount:'10000000', termInMonths:'36' })
     ├─► [D] ICreditProductRepository.findById('1')
     │        ▼
     │   [I] InMemoryCreditProductRepository → CreditProduct 'Crédito Libre Inversión'
     │
     ├─► #parse({ amount, termInMonths })            ← forma del dato (aplicación)
     │        ├─ [D] Money.of(10000000)              → valida finito, no negativo
     │        └─ [D] Term.ofMonths(36)               → valida entero > 0
     │        └─ acumula los fallos en un solo ValidationError
     │
     ├─► [D] CreditSimulationService.simulate(product, money, term)
     │        ├─ assertSimulable(...)                ← regla de negocio (dominio)
     │        │    └─ productFieldErrors(...)
     │        │         ├─ [D] product.admitsAmount(money)  → true
     │        │         └─ [D] product.admitsTerm(term)     → true
     │        │
     │        ├─ [D] product.interestRate.monthlyFraction
     │        │       = (1 + 0.185)^(1/12) − 1 = 0.01424575
     │        │
     │        ├─ monthlyInstallmentAmount(10_000_000, 0.01424575, 36)
     │        │       C = P·i / (1 − (1+i)^-n) = 357 000,4…  → Math.round → 357 000
     │        │
     │        ├─ #buildSchedule(...)  ← 36 iteraciones
     │        │    ├─ mes 1:  interés = round(10 000 000 × i) = 142 457
     │        │    │          capital = 357 000 − 142 457     = 214 543
     │        │    │          saldo   = 9 785 457
     │        │    │          [D] Installment.of({...})       → valida cuota = i + k
     │        │    ├─ …
     │        │    └─ mes 36: capital = saldo restante        ← absorbe el residuo
     │        │               pago    = 351 970 + 5 014 = 356 984
     │        │               saldo   = 0
     │        │
     │        └─ [D] AmortizationPlan.of({...})
     │             ├─ ¿36 cuotas?                        sí
     │             ├─ ¿numeradas 1..36 en orden?         sí
     │             ├─ ¿Σ capital = 10 000 000?           sí   ← la invariante del redondeo
     │             ├─ ¿saldo final = 0?                  sí
     │             └─ totalPaid = 12 851 984 · totalInterest = 2 851 984
     │
     ├─► [A] SimulationMapper.toDTO(plan, product)
     │        └─ por cada importe: [D] IMoneyFormatter.format(money)
     │                                  ▼
     │                             [I] IntlMoneyFormatter → '$ 357.000'
     │        └─ freezeSimulationDTO({ …, schedule: 36 filas, yearlySummary: 3 bloques })
     │
     └─ return Result.ok(SimulationDTO)
     ▼
[P] #runSimulation — isSuccess → #simulation = DTO · #errors = {}
     ▼
[P] #render({ initial: false })
     ├─► [A] SearchCreditProductsUseCase.execute(...)   ← el filtro, que no cambió
     ├─ viewModel = { catalog, form, bounds, simulation, errors, schedule, products, … }
     ▼
[P] BaseController.update() → ViewRenderer.refresh(simulatorView, viewModel)
     ├─ simulatorView.destroy()          ← quita TODOS los listeners anteriores
     ├─ root.innerHTML = simulatorView.render(viewModel)
     │    ├─ #simulatorForm(...)   → inputs con min="1000000" max="30000000"
     │    ├─ #simulationResult(...) → 4 métricas + aviso de la última cuota
     │    ├─ #amortization(...)     → plegada: solo el botón
     │    └─ #filters(...)          → el catálogo, intacto
     ├─ simulatorView.afterRender(root, handlers)
     │    ├─ #bindSimulator(handlers)   ← listeners nuevos sobre los nodos nuevos
     │    ├─ #bindFilters(handlers)
     │    └─ #restoreFocus('amount')    ← el foco vuelve al campo que se estaba tecleando
     └─ sin scrollTo: update() no mueve la página
```

**Dónde se decide qué.** Tres validaciones distintas, en tres sitios y por tres
motivos:

| Comprobación | Capa | Si falla |
|---|---|---|
| `'10000000'` es un número | Aplicación (`#parse`) | «Indica cuánto dinero necesitas.» |
| El importe no es negativo | Dominio (`Money`) | `NEGATIVE_MONEY_AMOUNT` |
| Libre Inversión admite ese monto | Dominio (`CreditProduct.admitsAmount`) | «El monto debe estar entre $1.000.000 y $30.000.000…» |

Verificado: `ok : recalcula al teclear el monto ($ 912.498)`,
`ok : foco conservado en el monto (sim-amount)`.

### Variante: monto fuera del rango del producto

Usuario teclea `99000000` con Libre Inversión seleccionado (tope: 30 millones).

```
[D] CreditSimulationService.assertSimulable(...)
     └─ productFieldErrors(...) → { amount: 'El monto debe estar entre $1.000.000 y
                                             $30.000.000 para Crédito Libre Inversión.' }
     └─ throw ValidationError(errors, 'No se puede simular con esos datos.')
     ▼
[A] SimulateCreditUseCase — catch → Result.fromError(err)
     └─ { isFailure: true, fieldErrors: { amount: '…' } }
     ▼
[P] #runSimulation
     ├─ #errors = { amount: '…' }
     ├─ #simulation NO se toca                ← la última cuota válida sigue en pantalla
     └─ hasFieldErrors → no se notifica por toast: el error ya se ve bajo el campo
     ▼
[P] la vista pinta is-invalid + aria-invalid + el mensaje en #sim-amount-error
```

Que `#simulation` no se ponga a `null` es deliberado: borrarla haría parpadear el
panel en cada tecla intermedia mientras se escribe un número largo.

Verificado: `ok : monto fuera de rango marca el campo`,
`ok : se conserva la última cuota válida mientras se corrige`.

### Variante: desplegar la tabla de amortización

```
[P] botón [data-action="toggle-schedule"] → handlers.onToggleSchedule()
     ▼
[P] SimulatorController.onToggleSchedule()
     ├─ #schedule = { open: true, mode: 'yearly' }
     └─ #render({ initial: false })        ← NO se vuelve a simular: el DTO ya lo tiene todo
     ▼
[P] SimulatorView.#yearlyTable(simulation)
     └─ pinta simulation.yearlySummary (3 bloques), ya agregado por el dominio
```

Abrir la tabla **no dispara ningún caso de uso**: el `SimulationDTO` ya trae las
36 filas y los 3 bloques anuales. Cambiar de modo solo cambia cuál de los dos se
pinta.

Verificado: `ok : detalle mensual: 12 filas (12)`,
`ok : la última fila deja el saldo en cero ($ 0)`.

---

## 17.6 Radicar una solicitud (camino de error)

Usuario pulsa "✅ Enviar Solicitud" con el formulario vacío.

```
[P] ApplicationView — listener 'submit'
     ├─ event.preventDefault()
     ├─ #readValues(form) → { fullName:'', idNumber:'', …, monthlyIncome:'' }
     └─ handlers.onSubmit(values)
     ▼
[P] ApplicationController.onSubmit(values)
     ▼
[A] SubmitCreditApplicationUseCase.execute(rawForm)
     ▼
[A] CreditApplicationMapper.toValueObjects(raw)
     ├─ try { [D] new Applicant({...}) }
     │    └─ ValidationError { fullName, idNumber, email, phone }        ← capturado
     ├─ try { [D] new RequestedCredit({...}) }
     │    └─ ValidationError { productName, amount, termInMonths, purpose } ← capturado
     ├─ try { [D] new EmploymentInfo({...}) }
     │    └─ ValidationError { companyName, jobTitle, monthlyIncome }    ← capturado
     └─ throw new ValidationError({ …11 campos… },
                                  'Hay campos obligatorios sin completar o inválidos.')
     ▼
[A] catch en el caso de uso
     ├─ [I] ILogger.warn('Solicitud rechazada en validación', {...})
     └─ return Result.fromError(err)      ← fieldErrors viaja como DATO
     ▼
[P] ApplicationController — result.isFailure
     ├─ #state = { values, errors: result.fieldErrors }    ← conserva lo escrito
     ├─ this.update(#viewModel(), #handlers())
     │    └─ cada campo con error recibe:
     │       · class="control is-invalid"
     │       · aria-invalid="true" aria-describedby="field-X-error"
     │       · <span id="field-X-error" role="alert">mensaje</span>
     └─ [A] INotifier.error(result.error, 'No se pudo enviar la solicitud')
             ▼
        [I] ToastNotifier — toast--error, role="alert", textContent
     ▼
[P] ApplicationView.afterRender
     └─ primer .control.is-invalid → focus() + scrollIntoView()
```

Los tres `try` independientes del mapper son lo que hace que el usuario vea **los
11 errores a la vez** en lugar de descubrirlos sección por sección en tres envíos.

Verificado: `ok : 11 campos invalidos (11)`, `ok : toast de error mostrado`.

---

## 17.7 Radicar una solicitud (camino feliz)

Datos: Juan Carlos Pérez · Crédito Vehículo · $50 000 000 · 60 meses ·
ingreso $3 500 000.

```
[A] SubmitCreditApplicationUseCase.execute(rawForm)
     │
     ├─ 1. [A] CreditApplicationMapper.toValueObjects(raw)
     │       ├─ [D] new Applicant(...)        → email en minúsculas, teléfono sin separadores
     │       ├─ [D] new RequestedCredit(...)  → Money.of(50_000_000), Term.ofMonths(60)
     │       └─ [D] new EmploymentInfo(...)   → Money.of(3_500_000)
     │
     ├─ 2. [D] ICreditApplicationRepository.nextIdentity()
     │       ▼
     │    [I] LocalStorageCreditApplicationRepository
     │         └─► [D] IIdGenerator.generate('app')
     │                  ▼
     │             [I] CryptoIdGenerator → 'app_190ed978…'
     │
     ├─ 3. [D] IClock.now()  →  [I] SystemClock → Date
     │
     ├─ 4. [D] new CreditApplication({ id, applicant, requestedCredit,
     │                                 employmentInfo, createdAt })
     │       └─ status = BORRADOR · copia defensiva de la fecha
     │
     ├─ 5. #findProductByName('Crédito Vehículo')
     │       └─► [D] findByCriteria(new ProductSearchCriteria({ query:'Crédito Vehículo' }))
     │            └─ coincidencia exacta → CreditProduct id 2
     │
     ├─ 6. [D] CreditApplicationPolicy.assertAdmissible(application, product)
     │       ├─ [D] product.admitsAmount(Money.of(50_000_000))
     │       │      └─ AmountRange[5M,120M].contains(50M) → true   ✓
     │       └─ [D] product.admitsTerm(Term.ofMonths(60))
     │              └─ 60 ≤ 84 → true                              ✓
     │       (no lanza)
     │
     ├─ 7. [D] CreditApplicationPolicy.assessAffordability(application, product)
     │       ├─ [D] InterestRate(14.2).monthlyFraction
     │       │      └─ (1 + 0.142)^(1/12) − 1 ≈ 0.011124
     │       ├─ cuota francesa = 50M · i / (1 − (1+i)^−60) ≈ 1 146 680
     │       ├─ [D] EmploymentInfo.maxAffordableInstallment
     │       │      └─ Money(3_500_000).multiply(0.4) → 1 400 000
     │       └─ { affordable: true, estimatedInstallment: 1146680, ceiling: 1400000 }
     │
     ├─ 8. [D] application.submit()
     │       └─ BORRADOR → RADICADA (lanza si ya estaba radicada)
     │
     ├─ 9. [D] ICreditApplicationRepository.save(application)
     │       ▼
     │    [I] LocalStorageCreditApplicationRepository
     │         ├─ #memory.set(id, application)
     │         └─ #persist() → localStorage['creditsmart:applications']
     │                          = JSON de application.toJSON()
     │             (si storage es null: solo memoria, sin fallar)
     │
     ├─ 10. [I] ILogger.info('Solicitud radicada', { reference:'CS-190ED978', … })
     │
     └─ return Result.ok({ reference:'CS-190ED978', status:'RADICADA',
                           applicantFirstName:'Juan', affordability })
     ▼
[P] ApplicationController — result.isSuccess
     ├─ #state = { values:{}, errors:{} }      ← formulario limpio
     ├─ this.update(#viewModel(), #handlers())
     ├─ [A] INotifier.success(
     │        'Juan, tu solicitud quedó radicada con el número CS-190ED978. ' +
     │        'Un asesor se comunicará contigo.', 'Solicitud enviada')
     └─ si !affordability.affordable → INotifier.info(aviso de capacidad de pago)
```

Verificado, con la salida real de la suite en jsdom:

```
ok  : sin errores tras envio valido
ok  : toast de exito mostrado
   toast: Solicitud enviada  Juan, tu solicitud quedó radicada con el número CS-190ED978. …
ok  : solicitud persistida en localStorage
```

Y en la suite de Node:

```
radicado: CS-12DE9788 | estado: RADICADA
cuota estimada: 1146680 | tope: 1400000 | viable: true
```

### Variante: monto fuera de rango

Mismo formulario con `amount: 1000` para Crédito Vehículo:

```
[D] CreditApplicationPolicy.assertAdmissible
     ├─ product.admitsAmount(Money.of(1000)) → AmountRange[5M,120M].contains(1000) → false
     └─ throw ValidationError({
          amount: 'El monto debe estar entre $5.000.000 y $120.000.000 para Crédito Vehículo.'
        })
     ▼
[A] Result.fromError → fieldErrors.amount
     ▼
[P] el input de monto queda is-invalid con ese mensaje exacto
```

Nótese que este error **no** lo produce ningún value object (1000 es un `Money`
perfectamente válido): es una regla **cruzada** entre la solicitud y el producto, y
por eso vive en el servicio de dominio.

Verificado: `ok : monto fuera de rango rechazado por politica de dominio`.

---

## 17.8 Ruta inexistente (404)

```
Usuario entra en /crediSmart/no-existe
     ▼
Apache — .htaccess
     ├─ ¿existe el archivo? no
     ├─ ¿existe el directorio? no
     └─ RewriteRule ^ index.html [L]
     ▼
[C] main.js → router.start() → #resolve('/no-existe')
     ├─ routes.get('/no-existe') → undefined
     └─ → this.#fallback
     ▼
[P] DocumentTitleController → document.title = 'CreditSmart — Página no encontrada'
     ▼
[P] NotFoundController.handle({ path: '/no-existe' })
     └─ present({ requestedPath: 'no-existe' })       ← quita la barra inicial
     ▼
[P] NotFoundView.template
     ├─ paleta slate (distinta al resto del sitio)
     ├─ "404" · regla horizontal · "Page Not Found"
     ├─ 'The page "no-existe" could not be found in this application.'
     └─ botón "Go Home" con el SVG inline del original
```

Verificado: `ok : 404 renderizado`, `ok : 404 muestra la ruta pedida`.

**Sin la reescritura de Apache**, este flujo no llega a `main.js`: Apache devuelve
su propio 404 y la app nunca arranca. Ver
[14 §14.5](./14-enrutado-y-urls.md).

---

## 17.9 Botón atrás del navegador

```
Usuario pulsa atrás
     ▼
[I] window 'popstate' → HistoryRouter.#resolve(currentPath(), { restoreScroll: true })
     ├─ this.#active.dispose()          ← libera la vista actual
     ├─ controller.handle(...)          ← re-ejecuta el caso de uso de esa ruta
     └─ NO llama a #applyHashScroll()   ← el navegador restaura el scroll
```

`restoreScroll: true` es lo que distingue "volver atrás" de "navegar": en el primer
caso el navegador ya sabe a qué altura estaba la página, y el router no interfiere.

Nota: `ViewRenderer.mount()` sí hace `scrollTo` al montar. Es una simplificación
consciente — restaurar la posición exacta exigiría guardar el scroll por entrada de
historial en `history.state`. Queda anotado como mejora posible.

---

## 17.10 Resumen: cuántas capas cruza cada interacción

| Interacción | Capas implicadas | Reglas de negocio ejecutadas |
|---|---|---|
| Arranque | C → I → P | Validación de los 6 productos al construirlos |
| Cargar catálogo | P → A → D → I | Formato monetario |
| Navegar | I → P → A → D → I | según la ruta destino |
| Filtrar | P → A → D → I | `matchesName`, `overlaps` |
| Simular | P → A → D → I | límites del producto + tasa mensual + cuota francesa + 4 invariantes del plan |
| Desplegar la tabla | P | ninguna: el DTO ya la traía |
| Enviar formulario (error) | P → A → D | 11 validaciones de campo |
| Enviar formulario (éxito) | P → A → D → I | 11 validaciones + política + cuota + transición de estado |
| 404 | I → P | ninguna |

En **ninguna** de ellas la vista ejecuta una regla de negocio, y en ninguna el
dominio toca el DOM.

## 17.11 Siguiente lectura

- [18 — Guía de extensión](./18-guia-de-extension.md)
- [19 — Pruebas y verificación](./19-pruebas-y-verificacion.md)
