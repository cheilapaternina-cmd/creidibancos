import { ValidationError } from '../errors/ValidationError.js';

/**
 * Applicant — VALUE OBJECT inmutable (Datos Personales).
 *
 * Corresponde a la sección "👤 Datos Personales" del formulario de solicitud.
 * Valida sus propias invariantes en el constructor: una instancia existente
 * es, por definición, un solicitante válido (always-valid domain model).
 *
 * Capa: DOMINIO.
 */
export class Applicant {
  #fullName;
  #idNumber;
  #email;
  #phone;

  /**
   * @param {{ fullName: string, idNumber: string, email: string, phone: string }} props
   */
  constructor({ fullName, idNumber, email, phone }) {
    const errors = {};

    const name = String(fullName ?? '').trim();
    if (name === '') errors.fullName = 'El nombre completo es obligatorio.';
    else if (name.length < 5) errors.fullName = 'Ingresa el nombre completo (mínimo 5 caracteres).';

    const document = String(idNumber ?? '').trim();
    if (document === '') errors.idNumber = 'La cédula es obligatoria.';
    else if (!/^\d{6,12}$/.test(document))
      errors.idNumber = 'La cédula debe tener entre 6 y 12 dígitos.';

    const mail = String(email ?? '').trim();
    if (mail === '') errors.email = 'El email es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail))
      errors.email = 'Ingresa un email válido.';

    const tel = String(phone ?? '').replace(/[\s()-]/g, '');
    if (tel === '') errors.phone = 'El teléfono es obligatorio.';
    else if (!/^\+?\d{7,15}$/.test(tel))
      errors.phone = 'Ingresa un teléfono válido (7 a 15 dígitos).';

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors, 'Revisa los datos personales.');
    }

    this.#fullName = name;
    this.#idNumber = document;
    this.#email = mail.toLowerCase();
    this.#phone = tel;

    Object.freeze(this);
  }

  get fullName() { return this.#fullName; }
  get idNumber() { return this.#idNumber; }
  get email() { return this.#email; }
  get phone() { return this.#phone; }

  /** @returns {string} Primer nombre, para saludos en la confirmación. */
  get firstName() {
    return this.#fullName.split(/\s+/)[0];
  }

  /** @returns {Object} */
  toJSON() {
    return {
      fullName: this.#fullName,
      idNumber: this.#idNumber,
      email: this.#email,
      phone: this.#phone,
    };
  }
}
