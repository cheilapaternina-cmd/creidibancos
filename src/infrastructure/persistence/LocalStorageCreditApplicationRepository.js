import { ICreditApplicationRepository } from '../../domain/contracts/ICreditApplicationRepository.js';
import { assertImplements } from '../../domain/contracts/Contract.js';
import { IIdGenerator } from '../../domain/contracts/IIdGenerator.js';

/**
 * LocalStorageCreditApplicationRepository — ADAPTADOR de
 * `ICreditApplicationRepository`.
 *
 * Guarda las solicitudes radicadas en memoria y, de forma best-effort, en
 * `localStorage` para que sobrevivan a un refresco. Si `localStorage` no está
 * disponible (modo privado, cuota llena), degrada a solo-memoria en lugar de
 * romper el flujo del usuario.
 *
 * Persiste la representación serializada (`toJSON`), no la entidad: rehidratar
 * entidades completas requeriría un mapper inverso, innecesario mientras nadie
 * consuma el histórico.
 *
 * Capa: INFRAESTRUCTURA (adaptador de persistencia).
 */
export class LocalStorageCreditApplicationRepository extends ICreditApplicationRepository {
  static #STORAGE_KEY = 'creditsmart:applications';

  /** @type {Map<string, import('../../domain/entities/CreditApplication.js').CreditApplication>} */
  #memory = new Map();
  /** @type {IIdGenerator} */
  #idGenerator;
  /** @type {Storage|null} */
  #storage;

  /**
   * @param {{ idGenerator: IIdGenerator, storage?: Storage|null }} deps
   */
  constructor({ idGenerator, storage = LocalStorageCreditApplicationRepository.#safeStorage() }) {
    super();
    assertImplements(idGenerator, IIdGenerator);
    this.#idGenerator = idGenerator;
    this.#storage = storage;
  }

  /** @returns {string} */
  nextIdentity() {
    return this.#idGenerator.generate('app');
  }

  /**
   * @param {import('../../domain/entities/CreditApplication.js').CreditApplication} application
   * @returns {Promise<import('../../domain/entities/CreditApplication.js').CreditApplication>}
   */
  async save(application) {
    this.#memory.set(application.id, application);
    this.#persist();
    return application;
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../domain/entities/CreditApplication.js').CreditApplication|null>}
   */
  async findById(id) {
    return this.#memory.get(id) ?? null;
  }

  /**
   * @returns {Promise<import('../../domain/entities/CreditApplication.js').CreditApplication[]>}
   */
  async findAll() {
    return [...this.#memory.values()];
  }

  /**
   * Registros serializados que sobrevivieron a recargas previas.
   * @returns {Array<Object>}
   */
  readRawHistory() {
    if (!this.#storage) return [];
    try {
      const raw = this.#storage.getItem(LocalStorageCreditApplicationRepository.#STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  #persist() {
    if (!this.#storage) return;
    try {
      const payload = [...this.#memory.values()].map((app) => app.toJSON());
      this.#storage.setItem(
        LocalStorageCreditApplicationRepository.#STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // Cuota o modo privado: la solicitud sigue viva en memoria.
    }
  }

  /** @returns {Storage|null} */
  static #safeStorage() {
    try {
      const probe = '__creditsmart_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
