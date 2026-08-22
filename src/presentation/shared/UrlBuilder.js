/**
 * UrlBuilder — construye URLs respetando el prefijo de despliegue.
 *
 * La app puede vivir en la raíz del dominio (`/`) o en un subdirectorio
 * (`/crediSmart/`, típico en Laragon/XAMPP). Todas las vistas y el router
 * pasan por aquí, de modo que ningún `href` queda cableado a la raíz.
 *
 * Capa: PRESENTACIÓN (shared).
 */
export class UrlBuilder {
  #basePath;

  /**
   * @param {{ basePath?: string }} [options]
   */
  constructor({ basePath = '/' } = {}) {
    this.#basePath = UrlBuilder.normalizeBase(basePath);
  }

  /** @returns {string} Prefijo normalizado, siempre con `/` inicial y final. */
  get basePath() {
    return this.#basePath;
  }

  /**
   * Ruta interna → href navegable.
   * @param {string} path Ruta de aplicación, ej. "/simulador".
   * @returns {string} Ej. "/crediSmart/simulador"
   */
  href(path) {
    const clean = String(path ?? '/').replace(/^\/+/, '');
    return `${this.#basePath}${clean}`;
  }

  /**
   * URL del navegador → ruta interna de aplicación.
   * @param {string} pathname `window.location.pathname`
   * @returns {string} Ej. "/simulador"
   */
  toRoutePath(pathname) {
    let path = String(pathname ?? '/');

    if (this.#basePath !== '/' && path.startsWith(this.#basePath)) {
      path = path.slice(this.#basePath.length - 1);
    }

    if (!path.startsWith('/')) path = `/${path}`;
    // Normaliza la barra final salvo en la raíz.
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    return path === '' ? '/' : path;
  }

  /**
   * Deduce el prefijo de despliegue a partir de la URL del documento.
   * Toma el directorio de `document.baseURI`, que en un subdirectorio de
   * Apache resuelve a `/crediSmart/`.
   *
   * @returns {string}
   */
  static detectBasePath() {
    try {
      const url = new URL(document.baseURI);
      const dir = url.pathname.replace(/[^/]*$/, '');
      return UrlBuilder.normalizeBase(dir);
    } catch {
      return '/';
    }
  }

  /**
   * @param {string} base
   * @returns {string}
   */
  static normalizeBase(base) {
    let value = String(base ?? '/');
    if (!value.startsWith('/')) value = `/${value}`;
    if (!value.endsWith('/')) value = `${value}/`;
    return value;
  }
}
