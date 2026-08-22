/**
 * DomainError
 * Error base de la capa de dominio. Todo error de negocio hereda de aquí,
 * lo que permite a las capas externas distinguir fallos de negocio de fallos
 * técnicos sin acoplarse a mensajes concretos.
 *
 * Capa: DOMINIO (núcleo). Sin dependencias externas.
 */
export class DomainError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, details?: Object }} [options]
   */
  constructor(message, { code = 'DOMAIN_ERROR', details = {} } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = Object.freeze({ ...details });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  /** @returns {{ name: string, code: string, message: string, details: Object }} */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
