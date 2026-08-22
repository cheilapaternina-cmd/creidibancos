import { DomainError } from '../errors/DomainError.js';
import { Applicant } from '../valueobjects/Applicant.js';
import { RequestedCredit } from '../valueobjects/RequestedCredit.js';
import { EmploymentInfo } from '../valueobjects/EmploymentInfo.js';

/**
 * Estados del ciclo de vida de una solicitud.
 * @readonly
 */
export const APPLICATION_STATUS = Object.freeze({
  DRAFT: 'BORRADOR',
  SUBMITTED: 'RADICADA',
  UNDER_REVIEW: 'EN_ESTUDIO',
  APPROVED: 'APROBADA',
  REJECTED: 'RECHAZADA',
});

/**
 * CreditApplication — ENTIDAD / RAÍZ DE AGREGADO.
 *
 * Agrega los tres value objects del formulario (solicitante, crédito pedido y
 * datos laborales) y gobierna las transiciones de estado. Las transiciones
 * inválidas se rechazan aquí, no en el controlador.
 *
 * Capa: DOMINIO.
 */
export class CreditApplication {
  #id;
  #applicant;
  #requestedCredit;
  #employmentInfo;
  #status;
  #createdAt;

  /**
   * @param {{
   *   id: string,
   *   applicant: Applicant,
   *   requestedCredit: RequestedCredit,
   *   employmentInfo: EmploymentInfo,
   *   status?: string,
   *   createdAt: Date
   * }} props
   */
  constructor({
    id,
    applicant,
    requestedCredit,
    employmentInfo,
    status = APPLICATION_STATUS.DRAFT,
    createdAt,
  }) {
    if (!id) {
      throw new DomainError('CreditApplication.id es obligatorio.', {
        code: 'APPLICATION_ID_REQUIRED',
      });
    }
    if (!(applicant instanceof Applicant)) {
      throw new DomainError('CreditApplication.applicant debe ser un Applicant.', {
        code: 'APPLICATION_APPLICANT_INVALID',
      });
    }
    if (!(requestedCredit instanceof RequestedCredit)) {
      throw new DomainError('CreditApplication.requestedCredit debe ser un RequestedCredit.', {
        code: 'APPLICATION_CREDIT_INVALID',
      });
    }
    if (!(employmentInfo instanceof EmploymentInfo)) {
      throw new DomainError('CreditApplication.employmentInfo debe ser un EmploymentInfo.', {
        code: 'APPLICATION_EMPLOYMENT_INVALID',
      });
    }
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      throw new DomainError('CreditApplication.createdAt debe ser una fecha válida.', {
        code: 'APPLICATION_DATE_INVALID',
      });
    }
    if (!Object.values(APPLICATION_STATUS).includes(status)) {
      throw new DomainError(`Estado de solicitud desconocido: ${status}.`, {
        code: 'APPLICATION_STATUS_UNKNOWN',
      });
    }

    this.#id = id;
    this.#applicant = applicant;
    this.#requestedCredit = requestedCredit;
    this.#employmentInfo = employmentInfo;
    this.#status = status;
    this.#createdAt = new Date(createdAt.getTime());
  }

  /* ---------------- Getters ---------------- */

  get id() { return this.#id; }
  get applicant() { return this.#applicant; }
  get requestedCredit() { return this.#requestedCredit; }
  get employmentInfo() { return this.#employmentInfo; }
  get status() { return this.#status; }
  get createdAt() { return new Date(this.#createdAt.getTime()); }

  /** @returns {boolean} */
  get isSubmitted() {
    return this.#status !== APPLICATION_STATUS.DRAFT;
  }

  /**
   * Número de radicado legible para el usuario.
   * @returns {string}
   */
  get referenceNumber() {
    return `CS-${String(this.#id).slice(-8).toUpperCase()}`;
  }

  /* ---------------- Comportamiento ---------------- */

  /**
   * Radica la solicitud. Solo válido desde BORRADOR.
   * @returns {CreditApplication} this (fluido)
   * @throws {DomainError} si ya estaba radicada.
   */
  submit() {
    if (this.#status !== APPLICATION_STATUS.DRAFT) {
      throw new DomainError('La solicitud ya fue radicada.', {
        code: 'APPLICATION_ALREADY_SUBMITTED',
        details: { id: this.#id, status: this.#status },
      });
    }
    this.#status = APPLICATION_STATUS.SUBMITTED;
    return this;
  }

  /**
   * Pasa a estudio. Solo válido desde RADICADA.
   * @returns {CreditApplication}
   */
  moveToReview() {
    if (this.#status !== APPLICATION_STATUS.SUBMITTED) {
      throw new DomainError('Solo una solicitud radicada puede pasar a estudio.', {
        code: 'APPLICATION_INVALID_TRANSITION',
        details: { from: this.#status },
      });
    }
    this.#status = APPLICATION_STATUS.UNDER_REVIEW;
    return this;
  }

  /**
   * @param {CreditApplication} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof CreditApplication && other.id === this.#id;
  }

  /** @returns {Object} */
  toJSON() {
    return {
      id: this.#id,
      status: this.#status,
      reference: this.referenceNumber,
      createdAt: this.#createdAt.toISOString(),
      applicant: this.#applicant.toJSON(),
      requestedCredit: this.#requestedCredit.toJSON(),
      employmentInfo: this.#employmentInfo.toJSON(),
    };
  }
}
