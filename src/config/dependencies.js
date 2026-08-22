import { Container } from './Container.js';
import { AppConfig } from './AppConfig.js';

/* ---------- Dominio (contratos) ---------- */
import { assertImplements } from '../domain/contracts/Contract.js';
import { ICreditProductRepository } from '../domain/contracts/ICreditProductRepository.js';
import { ICreditApplicationRepository } from '../domain/contracts/ICreditApplicationRepository.js';
import { IAmountRangeProvider } from '../domain/contracts/IAmountRangeProvider.js';
import { IMoneyFormatter } from '../domain/contracts/IMoneyFormatter.js';
import { IClock } from '../domain/contracts/IClock.js';
import { IIdGenerator } from '../domain/contracts/IIdGenerator.js';

/* ---------- Aplicación ---------- */
import { ILogger } from '../application/contracts/ILogger.js';
import { INotifier } from '../application/contracts/INotifier.js';
import { CreditProductMapper } from '../application/mappers/CreditProductMapper.js';
import { SimulationMapper } from '../application/mappers/SimulationMapper.js';
import { ListCreditProductsUseCase } from '../application/usecases/ListCreditProductsUseCase.js';
import { SearchCreditProductsUseCase } from '../application/usecases/SearchCreditProductsUseCase.js';
import { GetAmountRangeFiltersUseCase } from '../application/usecases/GetAmountRangeFiltersUseCase.js';
import { GetCreditProductNamesUseCase } from '../application/usecases/GetCreditProductNamesUseCase.js';
import { SimulateCreditUseCase } from '../application/usecases/SimulateCreditUseCase.js';
import { SubmitCreditApplicationUseCase } from '../application/usecases/SubmitCreditApplicationUseCase.js';

/* ---------- Infraestructura (adaptadores) ---------- */
import { InMemoryCreditProductRepository } from '../infrastructure/persistence/InMemoryCreditProductRepository.js';
import { LocalStorageCreditApplicationRepository } from '../infrastructure/persistence/LocalStorageCreditApplicationRepository.js';
import { StaticAmountRangeProvider } from '../infrastructure/persistence/StaticAmountRangeProvider.js';
import { IntlMoneyFormatter } from '../infrastructure/formatters/IntlMoneyFormatter.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { CryptoIdGenerator } from '../infrastructure/identity/CryptoIdGenerator.js';
import { ConsoleLogger } from '../infrastructure/logging/ConsoleLogger.js';
import { ToastNotifier } from '../infrastructure/notification/ToastNotifier.js';
import { HistoryRouter } from '../infrastructure/routing/HistoryRouter.js';
import { STATIC_TERM_OPTIONS } from '../infrastructure/persistence/datasources/StaticCreditProductDataSource.js';

/* ---------- Presentación ---------- */
import { IRouter } from '../presentation/contracts/IRouter.js';
import { UrlBuilder } from '../presentation/shared/UrlBuilder.js';
import { ViewRenderer } from '../presentation/shared/ViewRenderer.js';
import { NavbarComponent } from '../presentation/components/NavbarComponent.js';
import { FooterComponent } from '../presentation/components/FooterComponent.js';
import { ProductCardComponent } from '../presentation/components/ProductCardComponent.js';
import { AlertComponent } from '../presentation/components/AlertComponent.js';
import { CatalogView } from '../presentation/views/CatalogView.js';
import { SimulatorView } from '../presentation/views/SimulatorView.js';
import { ApplicationView } from '../presentation/views/ApplicationView.js';
import { NotFoundView } from '../presentation/views/NotFoundView.js';
import { AccessRestrictedView } from '../presentation/views/AccessRestrictedView.js';
import { CatalogController } from '../presentation/controllers/CatalogController.js';
import { SimulatorController } from '../presentation/controllers/SimulatorController.js';
import { ApplicationController } from '../presentation/controllers/ApplicationController.js';
import { NotFoundController } from '../presentation/controllers/NotFoundController.js';

/**
 * buildContainer — COMPOSITION ROOT.
 *
 * El único lugar del proyecto donde se hace `new` de una clase concreta y donde
 * se conocen simultáneamente las cuatro capas. Cambiar un adaptador (por
 * ejemplo, pasar de `InMemoryCreditProductRepository` a uno HTTP) es cambiar
 * una línea AQUÍ; ni el dominio ni la presentación se enteran.
 *
 * El grafo se declara de dentro hacia fuera:
 *   dominio ← infraestructura ← aplicación ← presentación
 *
 * @param {{ config?: typeof AppConfig, rootElement: HTMLElement }} options
 * @returns {Container}
 */
export function buildContainer({ config = AppConfig, rootElement }) {
  const container = new Container();

  /* ============================================================
     0. Valores de arranque
     ============================================================ */
  container.registerValue('config', config);
  container.registerValue('rootElement', rootElement);

  /* ============================================================
     1. Adaptadores técnicos (infraestructura)
     ============================================================ */
  container.register('logger', (c) =>
    assertImplements(
      new ConsoleLogger({ level: c.resolve('config').logLevel, prefix: c.resolve('config').appName }),
      ILogger,
    ),
  );

  container.register('notifier', (c) =>
    assertImplements(
      new ToastNotifier({
        container: document.querySelector(c.resolve('config').selectors.notifications),
        timeoutMs: c.resolve('config').toastTimeoutMs,
      }),
      INotifier,
    ),
  );

  container.register('clock', () => assertImplements(new SystemClock(), IClock));

  container.register('idGenerator', () =>
    assertImplements(new CryptoIdGenerator(), IIdGenerator),
  );

  container.register('moneyFormatter', (c) =>
    assertImplements(
      new IntlMoneyFormatter({
        locale: c.resolve('config').locale,
        currency: c.resolve('config').currency,
      }),
      IMoneyFormatter,
    ),
  );

  /* ============================================================
     2. Persistencia (adaptadores de puertos del dominio)
     ============================================================ */
  container.register('productRepository', () =>
    assertImplements(new InMemoryCreditProductRepository(), ICreditProductRepository),
  );

  container.register('amountRangeProvider', () =>
    assertImplements(new StaticAmountRangeProvider(), IAmountRangeProvider),
  );

  container.register('applicationRepository', (c) =>
    assertImplements(
      new LocalStorageCreditApplicationRepository({ idGenerator: c.resolve('idGenerator') }),
      ICreditApplicationRepository,
    ),
  );

  /* ============================================================
     3. Aplicación (mappers + casos de uso)
     ============================================================ */
  container.register('productMapper', (c) =>
    new CreditProductMapper({ moneyFormatter: c.resolve('moneyFormatter') }),
  );

  container.register('simulationMapper', (c) =>
    new SimulationMapper({ moneyFormatter: c.resolve('moneyFormatter') }),
  );

  container.register('listCreditProductsUseCase', (c) =>
    new ListCreditProductsUseCase({
      productRepository: c.resolve('productRepository'),
      productMapper: c.resolve('productMapper'),
    }),
  );

  container.register('searchCreditProductsUseCase', (c) =>
    new SearchCreditProductsUseCase({
      productRepository: c.resolve('productRepository'),
      productMapper: c.resolve('productMapper'),
    }),
  );

  container.register('getAmountRangeFiltersUseCase', (c) =>
    new GetAmountRangeFiltersUseCase({
      amountRangeProvider: c.resolve('amountRangeProvider'),
    }),
  );

  container.register('getCreditProductNamesUseCase', (c) =>
    new GetCreditProductNamesUseCase({
      productRepository: c.resolve('productRepository'),
    }),
  );

  container.register('simulateCreditUseCase', (c) =>
    new SimulateCreditUseCase({
      productRepository: c.resolve('productRepository'),
      simulationMapper: c.resolve('simulationMapper'),
    }),
  );

  container.register('submitCreditApplicationUseCase', (c) =>
    new SubmitCreditApplicationUseCase({
      applicationRepository: c.resolve('applicationRepository'),
      productRepository: c.resolve('productRepository'),
      clock: c.resolve('clock'),
      logger: c.resolve('logger'),
    }),
  );

  /* ============================================================
     4. Presentación (shared + componentes)
     ============================================================ */
  container.register('urlBuilder', (c) => {
    const configured = c.resolve('config').basePath;
    return new UrlBuilder({ basePath: configured ?? UrlBuilder.detectBasePath() });
  });

  container.register('viewRenderer', (c) =>
    new ViewRenderer({ root: c.resolve('rootElement') }),
  );

  container.register('navbarComponent', (c) =>
    new NavbarComponent({ urlBuilder: c.resolve('urlBuilder') }),
  );

  container.register('footerComponent', () => new FooterComponent());

  container.register('alertComponent', () => new AlertComponent());

  container.register('productCardComponent', (c) =>
    new ProductCardComponent({ urlBuilder: c.resolve('urlBuilder') }),
  );

  /* ============================================================
     5. Vistas
     ============================================================ */
  container.register('catalogView', (c) =>
    new CatalogView({
      navbar: c.resolve('navbarComponent'),
      footer: c.resolve('footerComponent'),
      productCard: c.resolve('productCardComponent'),
      urlBuilder: c.resolve('urlBuilder'),
    }),
  );

  container.register('simulatorView', (c) =>
    new SimulatorView({
      navbar: c.resolve('navbarComponent'),
      footer: c.resolve('footerComponent'),
      productCard: c.resolve('productCardComponent'),
      alert: c.resolve('alertComponent'),
    }),
  );

  container.register('applicationView', (c) =>
    new ApplicationView({
      navbar: c.resolve('navbarComponent'),
      footer: c.resolve('footerComponent'),
    }),
  );

  container.register('notFoundView', (c) =>
    new NotFoundView({ urlBuilder: c.resolve('urlBuilder') }),
  );

  container.register('accessRestrictedView', () => new AccessRestrictedView());

  /* ============================================================
     6. Controladores
     ============================================================ */
  container.register('catalogController', (c) =>
    new CatalogController({
      view: c.resolve('catalogView'),
      renderer: c.resolve('viewRenderer'),
      listCreditProductsUseCase: c.resolve('listCreditProductsUseCase'),
      notifier: c.resolve('notifier'),
    }),
  );

  container.register('simulatorController', (c) =>
    new SimulatorController({
      view: c.resolve('simulatorView'),
      renderer: c.resolve('viewRenderer'),
      searchCreditProductsUseCase: c.resolve('searchCreditProductsUseCase'),
      listCreditProductsUseCase: c.resolve('listCreditProductsUseCase'),
      simulateCreditUseCase: c.resolve('simulateCreditUseCase'),
      getAmountRangeFiltersUseCase: c.resolve('getAmountRangeFiltersUseCase'),
      amountRangeProvider: c.resolve('amountRangeProvider'),
      notifier: c.resolve('notifier'),
    }),
  );

  container.register('applicationController', (c) =>
    new ApplicationController({
      view: c.resolve('applicationView'),
      renderer: c.resolve('viewRenderer'),
      submitCreditApplicationUseCase: c.resolve('submitCreditApplicationUseCase'),
      getCreditProductNamesUseCase: c.resolve('getCreditProductNamesUseCase'),
      notifier: c.resolve('notifier'),
      termOptions: STATIC_TERM_OPTIONS,
    }),
  );

  container.register('notFoundController', (c) =>
    new NotFoundController({
      view: c.resolve('notFoundView'),
      renderer: c.resolve('viewRenderer'),
    }),
  );

  /* ============================================================
     7. Router
     ============================================================ */
  container.register('router', (c) =>
    assertImplements(
      new HistoryRouter({
        urlBuilder: c.resolve('urlBuilder'),
        logger: c.resolve('logger'),
      }),
      IRouter,
    ),
  );

  return container;
}
