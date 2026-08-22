import { BaseView } from './BaseView.js';
import { html, raw } from '../shared/Html.js';
import { ROUTES } from '../../config/routes.js';

/**
 * ApplicationView — vista de la ruta `/solicitar`.
 *
 * Réplica del formulario original en tres secciones
 * (Datos Personales · Datos del Crédito · Datos Laborales), con los mismos
 * labels, placeholders, tipos de campo y botones.
 *
 * Las secciones se declaran como datos (`#sections`) y se renderizan con un
 * único método: añadir un campo es añadir una entrada, no duplicar marcado.
 *
 * Capa: PRESENTACIÓN (vista).
 */
export class ApplicationView extends BaseView {
  #navbar;
  #footer;

  /**
   * @param {{
   *   navbar: import('../components/NavbarComponent.js').NavbarComponent,
   *   footer: import('../components/FooterComponent.js').FooterComponent
   * }} deps
   */
  constructor({ navbar, footer }) {
    super();
    this.#navbar = navbar;
    this.#footer = footer;
  }

  /**
   * @param {{
   *   productNames: string[],
   *   termOptions: number[],
   *   values: Record<string, string>,
   *   errors: Record<string, string>
   * }} viewModel
   * @returns {string}
   */
  template({ productNames, termOptions, values = {}, errors = {} }) {
    const sections = this.#sections({ productNames, termOptions });

    return html`
      <div class="page">
        ${raw(this.#navbar.render({ activePath: ROUTES.APPLICATION }))}

        <main class="page__main form-page">
          <h1 class="section__title section__title--page">Solicitar Crédito</h1>
          <p class="section__subtitle">
            Completa el formulario y un asesor se comunicará contigo.
          </p>

          <form class="form" data-application-form novalidate>
            ${raw(
              sections
                .map((section) => this.#section({ section, values, errors }))
                .join(''),
            )}

            <div class="form-actions">
              <button type="submit" class="btn btn--primary btn--block">✅ Enviar Solicitud</button>
              <button type="reset" class="btn btn--outline-gray btn--block">
                🗑️ Limpiar Formulario
              </button>
            </div>

            <p class="form-note">
              Los campos marcados con <span class="t-required">*</span> son obligatorios.
              La validación se ejecuta en el navegador y la solicitud se guarda localmente.
            </p>
          </form>
        </main>

        ${raw(this.#footer.render({ variant: 'compact' }))}
      </div>
    `;
  }

  /**
   * Definición declarativa del formulario. Es la única fuente de verdad de
   * labels, placeholders y tipos: la vista no repite marcado por campo.
   *
   * @param {{ productNames: string[], termOptions: number[] }} options
   * @returns {Array<Object>}
   */
  #sections({ productNames, termOptions }) {
    return [
      {
        id: 'personal',
        icon: '👤',
        iconClass: 'form__section-icon--personal',
        title: 'Datos Personales',
        hint: 'Información básica del solicitante',
        fields: [
          { name: 'fullName', label: 'Nombre completo', type: 'text', placeholder: 'Ej: Juan Carlos Pérez', autocomplete: 'name' },
          { name: 'idNumber', label: 'Cédula', type: 'number', placeholder: 'Ej: 1234567890' },
          { name: 'email', label: 'Email', type: 'email', placeholder: 'Ej: juan@correo.com', autocomplete: 'email' },
          { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Ej: 3001234567', autocomplete: 'tel' },
        ],
      },
      {
        id: 'credit',
        icon: '💰',
        iconClass: 'form__section-icon--credit',
        title: 'Datos del Crédito',
        hint: 'Información sobre el crédito que desea solicitar',
        fields: [
          {
            name: 'productName',
            label: 'Tipo de crédito',
            type: 'select',
            full: true,
            placeholderOption: '-- Seleccione un tipo --',
            options: productNames.map((name) => ({ value: name, label: name })),
          },
          { name: 'amount', label: 'Monto solicitado ($)', type: 'number', placeholder: 'Ej: 5000000', min: 0 },
          {
            name: 'termInMonths',
            label: 'Plazo en meses',
            type: 'select',
            placeholderOption: '-- Seleccione --',
            options: termOptions.map((months) => ({ value: months, label: `${months} meses` })),
          },
          {
            name: 'purpose',
            label: 'Destino del crédito',
            type: 'textarea',
            full: true,
            rows: 3,
            placeholder: 'Describe el destino o uso que le darás al crédito...',
          },
        ],
      },
      {
        id: 'work',
        icon: '🏢',
        iconClass: 'form__section-icon--work',
        title: 'Datos Laborales',
        hint: 'Información sobre tu situación laboral actual',
        fields: [
          { name: 'companyName', label: 'Empresa donde trabaja', type: 'text', placeholder: 'Ej: Empresa ABC S.A.S', autocomplete: 'organization' },
          { name: 'jobTitle', label: 'Cargo', type: 'text', placeholder: 'Ej: Analista de Sistemas', autocomplete: 'organization-title' },
          { name: 'monthlyIncome', label: 'Ingresos mensuales ($)', type: 'number', placeholder: 'Ej: 3500000', full: true, min: 0 },
        ],
      },
    ];
  }

  /**
   * @param {{ section: Object, values: Object, errors: Object }} props
   * @returns {string}
   */
  #section({ section, values, errors }) {
    return html`
      <section class="form__section" aria-labelledby="section-${section.id}">
        <h2 class="panel__title" id="section-${section.id}">
          <span class="${section.iconClass}" aria-hidden="true">${section.icon}</span>
          ${section.title}
        </h2>
        <p class="panel__hint">${section.hint}</p>

        <div class="grid-form">
          ${raw(section.fields.map((field) => this.#field({ field, values, errors })).join(''))}
        </div>
      </section>
    `;
  }

  /**
   * @param {{ field: Object, values: Object, errors: Object }} props
   * @returns {string}
   */
  #field({ field, values, errors }) {
    const value = values[field.name] ?? '';
    const error = errors[field.name] ?? '';
    const id = `field-${field.name}`;
    const errorId = `${id}-error`;

    return html`
      <div class="field ${field.full ? 'grid-form__full' : ''}">
        <label class="label" for="${id}">
          ${field.label} <span class="t-required" aria-hidden="true">*</span>
        </label>
        ${raw(this.#control({ field, id, value, error, errorId }))}
        <span class="field__error" id="${errorId}" role="alert">${error}</span>
      </div>
    `;
  }

  /**
   * @param {{ field: Object, id: string, value: string, error: string, errorId: string }} props
   * @returns {string}
   */
  #control({ field, id, value, error, errorId }) {
    const invalid = error ? 'is-invalid' : '';
    const aria = error ? `aria-invalid="true" aria-describedby="${errorId}"` : '';

    if (field.type === 'select') {
      return html`
        <select id="${id}" name="${field.name}" class="control control--select ${invalid}" ${raw(aria)}>
          <option value="">${field.placeholderOption}</option>
          ${raw(
            field.options
              .map(
                (option) => html`
                  <option
                    value="${option.value}"
                    ${raw(String(option.value) === String(value) ? 'selected' : '')}
                  >${option.label}</option>
                `,
              )
              .join(''),
          )}
        </select>
      `;
    }

    if (field.type === 'textarea') {
      return html`
        <textarea
          id="${id}"
          name="${field.name}"
          class="control control--textarea ${invalid}"
          rows="${field.rows ?? 3}"
          placeholder="${field.placeholder}"
          ${raw(aria)}
        >${value}</textarea>
      `;
    }

    return html`
      <input
        id="${id}"
        name="${field.name}"
        type="${field.type}"
        class="control ${invalid}"
        placeholder="${field.placeholder}"
        value="${value}"
        ${raw(field.min !== undefined ? `min="${field.min}"` : '')}
        ${raw(field.autocomplete ? `autocomplete="${field.autocomplete}"` : '')}
        ${raw(aria)}
      />
    `;
  }

  /**
   * @param {HTMLElement} root
   * @param {{
   *   onSubmit?: (values: Record<string,string>) => void,
   *   onReset?: () => void
   * }} handlers
   */
  afterRender(root, handlers = {}) {
    super.afterRender(root, handlers);

    const form = this.query('[data-application-form]');
    if (!form) return;

    this.on(form, 'submit', (event) => {
      event.preventDefault();
      handlers.onSubmit?.(this.#readValues(form));
    });

    this.on(form, 'reset', () => {
      // El reset nativo limpia los controles; el controlador limpia los errores.
      window.setTimeout(() => handlers.onReset?.(), 0);
    });

    // Foco en el primer campo con error, para no obligar a buscarlo.
    const firstInvalid = form.querySelector('.control.is-invalid');
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {Record<string,string>}
   */
  #readValues(form) {
    const data = new FormData(form);
    /** @type {Record<string,string>} */
    const values = {};
    for (const [key, value] of data.entries()) {
      values[key] = String(value);
    }
    return values;
  }
}
