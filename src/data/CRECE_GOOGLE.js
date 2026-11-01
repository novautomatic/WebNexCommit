// /crece_en_google: gestión del perfil de empresa en Google (Google Maps).
// Precios propuestos (CLP + IVA, por local). Cambiarlos solo aquí.

export const PLANES_GOOGLE = [
  {
    slug: 'presencia',
    nombre: 'Presencia',
    mensual: 89990,
    implementacion: 150000,
    incluye: ['4 publicaciones al mes', 'Respuesta a reseñas en 48 h', 'Informe mensual'],
  },
  {
    slug: 'crecimiento',
    nombre: 'Crecimiento',
    mensual: 149990,
    implementacion: 190000,
    destacado: true,
    incluye: ['8 publicaciones al mes', 'Respuesta a reseñas en 24 h', 'Campaña mensual de reseñas', 'Comparación con 3 competidores'],
  },
  {
    slug: 'dominio',
    nombre: 'Dominio',
    mensual: 249990,
    implementacion: 250000,
    incluye: ['12 publicaciones al mes', 'Respuesta a reseñas el mismo día', 'Posición medida en 10 búsquedas', 'Reunión mensual de estrategia'],
  },
];

// BrightLocal, Local Consumer Review Survey 2026 (1.002 consumidores de EE.UU., feb-2026).
export const FUENTE_DATOS = 'https://www.brightlocal.com/research/local-consumer-review-survey/';
export const DATOS_RESENAS = [
  { valor: '97%', texto: 'lee reseñas' },
  { valor: '68%', texto: 'solo elige 4★ o más' },
  { valor: '47%', texto: 'descarta si hay menos de 20 reseñas' },
  { valor: '89%', texto: 'espera que respondas' },
];

export const BUSQUEDAS = ['gasfiter en Ñuñoa', 'sushi cerca de mí', 'ferretería abierta', 'cerrajero urgente', 'café en Providencia'];

export const FAQ_GOOGLE = [
  {
    question: '¿No lo puedo hacer yo gratis?',
    answer: 'Crear el perfil, sí. Mantenerlo activo cada semana es lo que cuesta, y por eso la mayoría queda abandonado.',
  },
  {
    question: '¿Me aseguran el primer lugar?',
    answer: 'Nadie puede: Google no lo vende. Te aseguramos un perfil completo y avances que se miden mes a mes.',
  },
  {
    question: '¿Pueden borrar mis reseñas malas?',
    answer: 'Solo las que rompen las reglas de Google. Al resto se le responde bien y se suman reseñas nuevas.',
  },
];
