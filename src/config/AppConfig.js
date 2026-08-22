/**
 * AppConfig — configuración de la aplicación en un solo lugar.
 *
 * Todo valor ajustable (locale, moneda, nivel de log, duración de los avisos,
 * prefijo de despliegue) se declara aquí. Ninguna clase lee configuración
 * global por su cuenta: la recibe por constructor.
 *
 * Capa: CONFIGURACIÓN.
 */
export const AppConfig = Object.freeze({
  appName: 'CreditSmart',
  company: 'FinTech Solutions S.A.S',

  /** Localización monetaria — idéntica al original. */
  locale: 'es-CO',
  currency: 'COP',

  /** `null` = autodetectar desde `document.baseURI` (soporta subdirectorios). */
  basePath: null,

  /** Nivel mínimo de log: 'debug' | 'info' | 'warn' | 'error' | 'silent'. */
  logLevel: 'info',

  /** Milisegundos que permanece visible un aviso. */
  toastTimeoutMs: 6000,

  /** Selectores del documento anfitrión. */
  selectors: Object.freeze({
    root: '#root',
    notifications: '#notifications',
  }),
});
