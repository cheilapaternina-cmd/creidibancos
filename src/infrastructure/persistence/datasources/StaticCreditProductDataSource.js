/**
 * StaticCreditProductDataSource — FUENTE DE DATOS (detalle de infraestructura).
 *
 * Réplica literal del catálogo de CreditSmart: mismos nombres, descripciones,
 * montos, tasas, plazos, requisitos, emojis y paletas de color que el sitio
 * original. Es el único archivo que hay que sustituir para pasar de datos
 * estáticos a una API real.
 *
 * Formato crudo a propósito (números y strings): el mapeo a entidades del
 * dominio ocurre en `CreditProductFactory`.
 *
 * Capa: INFRAESTRUCTURA (datasource).
 */
export const STATIC_CREDIT_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 1,
    nombre: 'Crédito Libre Inversión',
    descripcion:
      'Usa el dinero como quieras: viajes, remodelaciones, gastos imprevistos o lo que necesites.',
    montoMin: 1_000_000,
    montoMax: 30_000_000,
    tasa: 18.5,
    plazo: 60,
    requisitos: 'Mayor de 18 años, cédula, extractos bancarios últimos 3 meses.',
    icon: '💳',
    palette: 'blue',
  }),
  Object.freeze({
    id: 2,
    nombre: 'Crédito Vehículo',
    descripcion:
      'Financia tu carro nuevo o usado con las mejores tasas del mercado y plazos flexibles.',
    montoMin: 5_000_000,
    montoMax: 120_000_000,
    tasa: 14.2,
    plazo: 84,
    requisitos: 'Mayor de 21 años, licencia de conducción, carta laboral.',
    icon: '🚗',
    palette: 'emerald',
  }),
  Object.freeze({
    id: 3,
    nombre: 'Crédito Vivienda',
    descripcion:
      'Haz realidad el sueño de tu casa propia con financiación hasta el 80% del valor del inmueble.',
    montoMin: 20_000_000,
    montoMax: 500_000_000,
    tasa: 11.8,
    plazo: 240,
    requisitos: 'Mayor de 25 años, ingresos demostrables, promesa de compraventa.',
    icon: '🏠',
    palette: 'violet',
  }),
  Object.freeze({
    id: 4,
    nombre: 'Crédito Educativo',
    descripcion:
      'Invierte en tu futuro. Cubre matrículas, posgrados y certificaciones en Colombia o el exterior.',
    montoMin: 500_000,
    montoMax: 50_000_000,
    tasa: 10.5,
    plazo: 72,
    requisitos: 'Mayor de 16 años (con codeudor), carta de admisión de institución educativa.',
    icon: '🎓',
    palette: 'amber',
  }),
  Object.freeze({
    id: 5,
    nombre: 'Crédito Empresarial',
    descripcion:
      'Capital de trabajo, expansión o maquinaria. Soluciones financieras para tu empresa.',
    montoMin: 10_000_000,
    montoMax: 1_000_000_000,
    tasa: 16,
    plazo: 120,
    requisitos: 'Empresa constituida mínimo 2 años, estados financieros, RUT.',
    icon: '🏢',
    palette: 'rose',
  }),
  Object.freeze({
    id: 6,
    nombre: 'Crédito de Libranza',
    descripcion:
      'Descuento directo de tu nómina o pensión: la tasa más baja del portafolio y sin codeudor.',
    montoMin: 1_000_000,
    montoMax: 80_000_000,
    tasa: 13.5,
    plazo: 96,
    requisitos:
      'Empleado o pensionado de entidad con convenio de libranza, certificación laboral o de pensión, autorización de descuento por nómina.',
    icon: '🧾',
    palette: 'teal',
  }),
]);

/**
 * Rangos de monto del filtro del simulador — idénticos al original.
 * `max: null` representa "sin límite superior".
 */
export const STATIC_AMOUNT_RANGES = Object.freeze([
  Object.freeze({ label: 'Todos los montos', min: 0, max: null }),
  Object.freeze({ label: 'Hasta $5.000.000', min: 0, max: 5_000_000 }),
  Object.freeze({ label: '$5.000.001 – $20.000.000', min: 5_000_001, max: 20_000_000 }),
  Object.freeze({ label: '$20.000.001 – $100.000.000', min: 20_000_001, max: 100_000_000 }),
  Object.freeze({ label: 'Más de $100.000.000', min: 100_000_001, max: null }),
]);

/**
 * Plazos ofrecidos en el `<select>` del formulario de solicitud.
 */
export const STATIC_TERM_OPTIONS = Object.freeze([12, 24, 36, 48, 60]);
