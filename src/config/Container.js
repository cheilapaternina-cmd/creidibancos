/**
 * Container — contenedor de inyección de dependencias (Service Locator usado
 * ÚNICAMENTE en el arranque).
 *
 * Registra factorías perezosas y las resuelve una sola vez (singletons por
 * clave). Detecta dependencias circulares y falla con la cadena completa, en
 * lugar de desbordar la pila.
 *
 * Importante: ninguna clase de dominio, aplicación o presentación importa este
 * archivo. El contenedor se usa solo en `main.js` (Composition Root), de modo
 * que las dependencias siguen entrando por constructor — Inversión de
 * Dependencias real, no un localizador disfrazado.
 *
 * Capa: CONFIGURACIÓN.
 */
export class Container {
  /** @type {Map<string, () => any>} */
  #factories = new Map();
  /** @type {Map<string, any>} */
  #instances = new Map();
  /** @type {string[]} */
  #resolving = [];

  /**
   * Registra una factoría perezosa.
   * @param {string} key
   * @param {(container: Container) => any} factory
   * @returns {Container} this (fluido)
   */
  register(key, factory) {
    if (typeof factory !== 'function') {
      throw new TypeError(`La factoría de "${key}" debe ser una función.`);
    }
    if (this.#factories.has(key)) {
      throw new Error(`La dependencia "${key}" ya estaba registrada.`);
    }
    this.#factories.set(key, factory);
    return this;
  }

  /**
   * Registra un valor ya construido (config, elementos del DOM...).
   * @param {string} key
   * @param {any} value
   * @returns {Container}
   */
  registerValue(key, value) {
    this.#instances.set(key, value);
    return this;
  }

  /**
   * Resuelve una dependencia, construyéndola la primera vez.
   * @param {string} key
   * @returns {any}
   */
  resolve(key) {
    if (this.#instances.has(key)) {
      return this.#instances.get(key);
    }

    const factory = this.#factories.get(key);
    if (!factory) {
      throw new Error(`Dependencia no registrada: "${key}".`);
    }

    if (this.#resolving.includes(key)) {
      throw new Error(
        `Dependencia circular detectada: ${[...this.#resolving, key].join(' -> ')}.`,
      );
    }

    this.#resolving.push(key);
    try {
      const instance = factory(this);
      this.#instances.set(key, instance);
      return instance;
    } finally {
      this.#resolving.pop();
    }
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.#instances.has(key) || this.#factories.has(key);
  }

  /**
   * Fuerza la construcción de todas las dependencias registradas.
   * Se usa al arrancar para que cualquier violación de contrato aparezca
   * inmediatamente y no a mitad de una navegación.
   *
   * @returns {Container}
   */
  eagerResolveAll() {
    for (const key of this.#factories.keys()) {
      this.resolve(key);
    }
    return this;
  }

  /** @returns {string[]} Claves registradas (útil para depurar el grafo). */
  keys() {
    return [...new Set([...this.#instances.keys(), ...this.#factories.keys()])];
  }
}
