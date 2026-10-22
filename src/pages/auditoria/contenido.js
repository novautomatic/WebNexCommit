// Contenido GENÉRICO de «Chatbots → Auditoría»: la estructura de la auditoría mensual, el
// guion de la reunión con la clienta y las cifras que se presentan. No lleva datos de ningún
// cliente (este repo es público): los hallazgos, cifras y decisiones viven en la base.

// ── Auditoría mensual: lo que se revisa cada mes, en orden ───────────────────
export const CHECKLIST_MENSUAL = [
  {
    id: 'prep', titulo: '1. Preparación',
    items: [
      { id: 'prep_cifras', texto: 'Mirar los indicadores del mes (pestaña «Reunión con la clienta») y guardar la foto de cifras.' },
      { id: 'prep_comparar', texto: 'Compararlos con el mes anterior y con la línea base.' },
      { id: 'prep_version', texto: 'Comprobar que producción corre la última versión (dirección /health del back: commit y rama).' },
    ],
  },
  {
    id: 'avisos', titulo: '2. Que lleguen los avisos de derivación',
    items: [
      { id: 'av_reglas', texto: '¿Cuántas derivaciones hubo y por qué reglas? ¿Alguna regla deriva casos que no lo necesitaban?' },
      { id: 'av_entrega', texto: 'Estado real de entrega: si hay «fallido», ver el motivo en la conversación.' },
      { id: 'av_prueba', texto: 'Pulsar «Enviar prueba» (Agentes → Derivar a un humano) y confirmar que llegan el correo y el WhatsApp.' },
      { id: 'av_pago', texto: 'La cuenta de WhatsApp tiene método de pago al día (si no, Meta bloquea los avisos iniciados por el negocio: error 141006).' },
      { id: 'av_plantilla', texto: 'La plantilla de WhatsApp sigue «Activa» en Meta.' },
      { id: 'av_clienta', texto: 'Preguntar a la clienta si recibió los avisos del mes y si llegaron a tiempo.' },
    ],
  },
  {
    id: 'respuestas', titulo: '3. Que el bot no deje de responder',
    items: [
      { id: 'resp_revisar', texto: '«Mensaje real sin respuesta» debería estar cerca de 0: abrir cada caso y ver por qué.' },
      { id: 'resp_credito', texto: 'Errores de OpenAI: ¿hubo «sin crédito»? (debe ser 0). Revisar el saldo en OpenAI → Billing.' },
      { id: 'resp_limite', texto: 'Errores de límite de velocidad: si se repiten, pedir subir el límite.' },
      { id: 'resp_token', texto: 'Instagram: el token se renovó solo (renovación semanal) y no llegó ninguna alerta de vencimiento.' },
      { id: 'resp_correos', texto: 'Llegaron los correos de alerta y el resumen diario de clientas sin respuesta.' },
      { id: 'resp_bucles', texto: 'Bucles con otros bots: debe haber 0; si aparece una cuenta nueva, agregarla a la lista negra.' },
    ],
  },
  {
    id: 'calidad', titulo: '4. Calidad de las respuestas',
    items: [
      { id: 'cal_voseo', texto: 'Voseo / argentinismos: debe ser 0.' },
      { id: 'cal_promesas', texto: 'Promesas de «le aviso a la persona» sin derivación real: debe ser 0.' },
      { id: 'cal_leer', texto: 'Leer 15 conversaciones al azar, completas: tono, datos inventados, respuestas largas, repeticiones.' },
      { id: 'cal_precios', texto: 'Revisar precios y stock que dijo el bot contra la tienda actual.' },
      { id: 'cal_costo', texto: 'Costo por respuesta: ¿subió respecto del mes anterior?' },
    ],
  },
  {
    id: 'ventas', titulo: '5. Ventas',
    items: [
      { id: 'ven_carritos', texto: 'Carritos «cancelado» o «expirado» con productos: ver por qué (link no enviado, precio, arrepentimiento).' },
      { id: 'ven_total', texto: 'Total pagado del mes y cuántos pedidos vienen del bot.' },
      { id: 'ven_prueba', texto: 'Hacer una compra de prueba completa (al menos hasta el link de pago) y anotar si algo falló.' },
    ],
  },
  {
    id: 'cierre', titulo: '6. Cierre',
    items: [
      { id: 'cie_cambios', texto: 'Anotar en «Qué hicimos» cada cosa que se corrigió (fecha, qué, por qué, dónde).' },
      { id: 'cie_conclusiones', texto: 'Escribir 3 conclusiones del mes en las notas.' },
      { id: 'cie_siguiente', texto: 'Definir qué se hace el mes siguiente (pendientes).' },
    ],
  },
];

// ── Reunión con la clienta ───────────────────────────────────────────────────
export const GUION_REUNION = [
  { titulo: 'Cómo está el bot hoy', texto: 'En simple: a cuántas personas atendió, por qué canales y cuántas ventas salieron por el bot.' },
  { titulo: 'Qué problemas encontramos y cómo los resolvimos', texto: 'Usar «Qué hicimos», en palabras de la clienta y no técnicas. Solo cambios ya verificados.' },
  { titulo: 'Qué sigue pendiente o se vigila', texto: 'Los pendientes abiertos, con honestidad sobre lo que aún no funciona o no se ha podido probar.' },
  { titulo: 'Lo que necesito de ti', texto: 'Decisiones, accesos y pruebas que dependen de la clienta (por ejemplo, tarjeta de la cuenta de WhatsApp).' },
];

export const CHECKLIST_REUNION = [
  {
    id: 'antes', titulo: 'Antes de la reunión',
    items: [
      { id: 'r_informe', texto: 'Cifras del mes revisadas y foto guardada.' },
      { id: 'r_tres', texto: 'Tres números clave elegidos, con su comparación contra el mes anterior y la línea base.' },
      { id: 'r_cambios', texto: '«Qué hicimos» al día: mostrar solo cambios verificados.' },
      { id: 'r_ejemplos', texto: 'Una conversación real (sin datos personales) donde el bot ayudó bien y otra donde falló y se corrigió.' },
      { id: 'r_decisiones', texto: 'Lista de decisiones que se necesitan de la clienta.' },
    ],
  },
  {
    id: 'durante', titulo: 'Cuidado al presentar',
    items: [
      { id: 'r_aceptados', texto: 'No presentar «avisos aceptados» como si fueran «avisos entregados»: usar el estado real de entrega.' },
      { id: 'r_costos', texto: 'Aclarar antes de mostrar los gastos de IA si se traspasan a la clienta o no.' },
      { id: 'r_privacidad', texto: 'No mencionar nombres ni mensajes de clientas finales: usar ejemplos genéricos.' },
    ],
  },
  {
    id: 'despues', titulo: 'Después de la reunión',
    items: [
      { id: 'r_anotar', texto: 'Anotar las decisiones de la clienta (cuadro de abajo).' },
      { id: 'r_guardar', texto: 'Guardar la foto de cifras presentada.' },
      { id: 'r_agendar', texto: 'Agendar la próxima auditoría.' },
    ],
  },
];

// ── Cifras que se presentan ──────────────────────────────────────────────────
// `valor(m)` saca el número del objeto de indicadores del back. `mejor`: hacia dónde es bueno.
const entregados = (m) => (m.derivaciones?.entrega?.entregado ?? 0) + (m.derivaciones?.entrega?.leido ?? 0);

export const CIFRAS = [
  { id: 'conv', label: 'Conversaciones atendidas', valor: (m) => m.conversaciones?.activas, mejor: 'mayor' },
  { id: 'resp', label: 'Respuestas del bot', valor: (m) => m.mensajes?.bot, mejor: 'mayor' },
  { id: 'sinresp', label: 'Clientas sin respuesta (por revisar)', valor: (m) => m.sinRespuesta?.porCausa?.['REVISAR: mensaje real sin respuesta'] ?? 0, mejor: 'menor', meta: 0 },
  { id: 'deriv', label: 'Derivaciones a una persona', valor: (m) => m.derivaciones?.total, mejor: null },
  { id: 'entreg', label: 'Avisos con entrega confirmada', valor: entregados, mejor: 'mayor' },
  { id: 'fallidos', label: 'Avisos fallidos', valor: (m) => m.derivaciones?.entrega?.fallido ?? 0, mejor: 'menor', meta: 0 },
  { id: 'errores', label: 'Errores de IA', valor: (m) => m.erroresIA?.total, mejor: 'menor', meta: 0 },
  { id: 'bucles', label: 'Conversaciones en bucle', valor: (m) => m.bucles?.total, mejor: 'menor', meta: 0 },
  { id: 'promesas', label: 'Promesas sin derivación real', valor: (m) => m.calidad?.promesasSinDerivacion, mejor: 'menor', meta: 0 },
  { id: 'costo', label: 'Gasto de IA (USD)', valor: (m) => m.costo?.usd, mejor: 'menor', formato: 'usd' },
  { id: 'ventas', label: 'Total pagado por el bot (CLP)', valor: (m) => m.ventas?.totalPagadoCLP, mejor: 'mayor', formato: 'clp' },
];

// Las tres que más pesan en la conversación con la clienta.
export const CIFRAS_CLAVE = ['conv', 'sinresp', 'entreg'];

// ── Fechas ───────────────────────────────────────────────────────────────────
export const claveMes = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function mesAnterior(clave) {
  const [a, m] = clave.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

const NOMBRES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function nombreMes(clave) {
  if (clave === 'linea-base') return 'Línea base';
  const [a, m] = clave.split('-').map(Number);
  return `${NOMBRES[m - 1]} ${a}`;
}

// Los últimos `n` meses terminando en el actual, del más nuevo al más viejo.
export function ultimosMeses(n = 12, desde = new Date()) {
  const out = [];
  let c = claveMes(desde);
  for (let i = 0; i < n; i += 1) { out.push(c); c = mesAnterior(c); }
  return out;
}

export function progreso(secciones, checks = {}) {
  const ids = secciones.flatMap((s) => s.items.map((i) => i.id));
  const hechos = ids.filter((id) => checks[id] === true).length;
  return { hechos, total: ids.length };
}
