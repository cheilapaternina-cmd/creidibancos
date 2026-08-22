/**
 * main.js — BOOTSTRAP de la aplicación.
 *
 * Responsabilidad única: construir el grafo de dependencias, registrar las
 * rutas y arrancar el router. No contiene lógica de negocio ni marcado.
 *
 * Flujo:
 *   1. Localiza el elemento raíz declarado en `AppConfig.selectors.root`.
 *   2. Construye el contenedor (Composition Root) y valida los contratos.
 *   3. Registra cada ruta con su controlador, decorado con el título de página.
 *   4. Arranca el router, que resuelve la URL actual.
 *
 * Capa: ARRANQUE.
 */
import { AppConfig } from './config/AppConfig.js';
import { buildContainer } from './config/dependencies.js';
import { ROUTE_TABLE, FALLBACK_CONTROLLER } from './config/routes.js';
import { DocumentTitleController } from './presentation/decorators/DocumentTitleController.js';

/**
 * @returns {Promise<void>}
 */
async function bootstrap() {
  const rootElement = document.querySelector(AppConfig.selectors.root);

  if (!rootElement) {
    throw new Error(
      `No se encontró el contenedor raíz "${AppConfig.selectors.root}" en el documento.`,
    );
  }

  const container = buildContainer({ config: AppConfig, rootElement });

  // Construye todo el grafo ahora: cualquier adaptador que no cumpla su
  // contrato falla aquí, no a mitad de una navegación del usuario.
  container.eagerResolveAll();

  const logger = container.resolve('logger');
  const router = container.resolve('router');

  for (const route of ROUTE_TABLE) {
    router.register(
      route.path,
      new DocumentTitleController({
        controller: container.resolve(route.controller),
        title: route.title,
      }),
    );
  }

  router.setFallback(
    new DocumentTitleController({
      controller: container.resolve(FALLBACK_CONTROLLER),
      title: `${AppConfig.appName} — Página no encontrada`,
    }),
  );

  await router.start();

  logger.info('Aplicación iniciada', {
    basePath: container.resolve('urlBuilder').basePath,
    routes: ROUTE_TABLE.map((route) => route.path),
  });
}

bootstrap().catch((error) => {
  console.error('[CreditSmart] Fallo en el arranque:', error);

  const root = document.querySelector(AppConfig.selectors.root);
  if (root) {
    root.innerHTML = `
      <div class="sys-page">
        <div class="sys-page__inner">
          <div class="sys-block">
            <div>
              <h1 class="sys-code">!</h1>
              <div class="sys-rule"></div>
            </div>
            <div>
              <h2 class="sys-title">No se pudo iniciar la aplicación</h2>
              <p class="sys-text">Revisa la consola del navegador para ver el detalle técnico.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});
