// «Resumen claro»: convierte los datos del back (/resumen) en indicadores con
// semáforo, comparación, metas y frases simples. Todo por reglas (sin IA): el
// analista con IA es aparte y se pide con un botón.
import { clp, entero, pct, dec1 } from './formato';

// ── Fechas (zona Santiago) ───────────────────────────────────────────────────
export const hoy = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
export const sumarDias = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const diasEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5) + 1;
const sumarMeses = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate();
  f.setUTCDate(Math.min(d, ultimo));
  return f.toISOString().slice(0, 10);
};
export const fechaLarga = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const fechaCorta = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');

export const PERIODOS = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mes_pasado', label: 'Mes pasado' },
  { id: '90d', label: '90 días' },
  { id: 'propio', label: 'Elegir fechas' },
];
export const COMPARACIONES = [
  { id: 'anterior', label: 'Periodo anterior' },
  { id: 'mes_anterior', label: 'Mismas fechas del mes anterior' },
  { id: 'anio', label: 'Mismas fechas del año pasado' },
  { id: 'propio', label: 'Elegir fechas' },
  { id: 'nada', label: 'No comparar' },
];

// Los rangos terminan AYER: hoy todavía está a medias (Ads se actualiza cada mañana).
export function calcularRango(periodo, propio = {}) {
  const ayer = sumarDias(hoy(), -1);
  if (periodo === 'propio' && propio.desde && propio.hasta) return { desde: propio.desde, hasta: propio.hasta };
  if (periodo === '7d') return { desde: sumarDias(ayer, -6), hasta: ayer };
  if (periodo === '90d') return { desde: sumarDias(ayer, -89), hasta: ayer };
  if (periodo === 'mes') {
    const desde = `${hoy().slice(0, 8)}01`;
    return { desde, hasta: ayer < desde ? desde : ayer };
  }
  if (periodo === 'mes_pasado') {
    const primero = sumarMeses(`${hoy().slice(0, 8)}01`, -1);
    return { desde: primero, hasta: sumarDias(`${hoy().slice(0, 8)}01`, -1) };
  }
  return { desde: sumarDias(ayer, -29), hasta: ayer };
}

export function calcularComparacion(modo, rango, propio = {}) {
  if (modo === 'nada') return null;
  if (modo === 'propio') return propio.desde && propio.hasta ? { desde: propio.desde, hasta: propio.hasta } : null;
  if (modo === 'mes_anterior') return { desde: sumarMeses(rango.desde, -1), hasta: sumarMeses(rango.hasta, -1) };
  if (modo === 'anio') return { desde: sumarMeses(rango.desde, -12), hasta: sumarMeses(rango.hasta, -12) };
  const n = diasEntre(rango.desde, rango.hasta);
  return { desde: sumarDias(rango.desde, -n), hasta: sumarDias(rango.desde, -1) };
}

// Serie diaria completa (días sin datos = 0) para alinear periodos de distinto origen.
export function serieRango(filas, campoFecha, campoValor, desde, hasta) {
  const m = new Map();
  for (const f of filas || []) {
    let k = String(f[campoFecha]);
    if (/^\d{8}$/.test(k)) k = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
    const v = typeof campoValor === 'function' ? campoValor(f) : Number(f[campoValor]) || 0;
    m.set(k, (m.get(k) || 0) + v);
  }
  const out = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) out.push({ x: d, v: m.get(d) || 0 });
  return out;
}

// ── Traducciones ─────────────────────────────────────────────────────────────
export const CANAL = {
  'Paid Search': 'Anuncios de Google', 'Organic Search': 'Google gratis', Direct: 'Directo (escribió tu dirección)',
  'Organic Social': 'Redes sociales', 'Paid Social': 'Redes sociales pagadas', Referral: 'Otros sitios web',
  'Paid Shopping': 'Shopping pagado', 'Organic Shopping': 'Shopping gratis', Email: 'Correo',
  Unassigned: 'Sin identificar', 'Cross-network': 'Varias redes de Google', 'Organic Video': 'Video', Display: 'Display',
};
export const DISPOSITIVO = { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet', smart_tv: 'TV', MOBILE: 'Celular', DESKTOP: 'Computador', TABLET: 'Tablet', CONNECTED_TV: 'TV', OTHER: 'Otro' };
export const GENERO = { male: 'Hombres', female: 'Mujeres' };
export const NUEVOS = { new: 'Primera visita', returning: 'Volvieron' };

// ── Indicadores ──────────────────────────────────────────────────────────────
// Qué es cada número y cómo leerlo, en simple.
const EXPLICA = {
  contactos: { que: 'Personas que te escribieron por WhatsApp, llamaron o enviaron un formulario desde tu web.', leer: 'Es el número más importante: cada contacto es un posible cliente. Si sube, vas bien aunque lo demás baje.' },
  compras: { que: 'Pedidos pagados en tu tienda.', leer: 'Junto con las ventas, es el resultado que importa. Lo demás (clics, visitas) sirve para entender por qué sube o baja.' },
  ventas: { que: 'Plata vendida en la tienda en el periodo (todas las fuentes).', leer: 'Si sube, el negocio crece. Compáralo con el gasto en anuncios para saber si los anuncios se pagan solos.' },
  costo_contacto: { que: 'Lo que pagaste en anuncios por cada contacto que llegó desde un anuncio (gasto ÷ contactos de Ads).', leer: 'Mientras más bajo, mejor. Si está bajo tu meta, los anuncios son rentables; si está muy arriba, hay búsquedas o páginas que gastan sin traer clientes.' },
  roas: { que: 'Cuánto vendiste por cada $1 que pusiste en anuncios (ventas de Ads ÷ gasto). 4× = vendiste $4 por cada $1.', leer: 'Mientras más alto, mejor. Bajo tu meta, los anuncios no se están pagando solos.' },
  gasto: { que: 'Lo que costaron tus anuncios de Google en el periodo.', leer: 'No es bueno ni malo solo: se mira junto al resultado. Gastar más está bien si los contactos o ventas suben en la misma proporción.' },
  clics: { que: 'Veces que alguien hizo clic en tu anuncio y llegó a tu web.', leer: 'Más clics = más oportunidades. Pero si los clics suben y los contactos no, la gente llega y no encuentra lo que busca.' },
  visitas: { que: 'Visitas a tu web desde cualquier lugar (Google, anuncios, redes, directo).', leer: 'Muestra cuánta gente te conoce. Lo ideal es que suban junto con los contactos.' },
  seo: { que: 'Clics que te llegaron GRATIS desde los resultados normales de Google (sin anuncio).', leer: 'Crece lento (semanas o meses), pero no cuesta por clic. Si sube, tu web está ganando lugar en Google.' },
};

const delta = (v, a) => (a == null || v == null ? null : a === 0 ? (v === 0 ? 0 : null) : (v - a) / a);

// Semáforo de un indicador: por meta si existe; si no, por la comparación.
function estadoDe({ valor, anterior, meta, metaTipo, mejorSi, pocos }) {
  if (valor == null) return 'sin_dato';
  if (meta != null && meta > 0) {
    const r = valor / meta;
    // Un tope (gasto) no «va súper» por no gastar: solo avisa si se pasa.
    if (metaTipo === 'maximo') return r <= 1 ? (mejorSi === 'neutro' ? 'tope_ok' : 'bien') : r <= 1.2 ? 'regular' : 'mal';
    return r >= 1 ? 'bien' : r >= 0.7 ? 'regular' : 'mal';
  }
  const d = delta(valor, anterior);
  if (d == null || pocos || mejorSi === 'neutro' || (valor === 0 && anterior === 0)) return 'neutro';
  const mejora = mejorSi === 'baja' ? -d : d;
  return mejora > 0.05 ? 'bien' : mejora < -0.15 ? 'mal' : 'regular';
}

export function armarIndicadores(r) {
  const tienda = r.tipo === 'tienda';
  const dias = r.rango.dias;
  const prorrata = (m) => (m == null ? null : (m * dias) / 30.4);
  const M = r.metas?.valores || {};
  // Sin anuncios en ninguno de los dos periodos, los indicadores de Ads no dicen nada.
  const conAnuncios = r.ads && !r.ads.error && (r.ads.actual?.total?.impr > 0 || r.ads.anterior?.total?.impr > 0);
  const ads = conAnuncios ? r.ads : null;
  const A = ads?.actual?.total;
  const B = ads?.anterior?.total;
  const ga = r.ga4?.error ? null : r.ga4;
  const sc = r.search_console?.error ? null : r.search_console;
  const sh = r.shopify && !r.shopify.error ? r.shopify : null;
  const shA = sh?.actual && !sh.actual.error ? sh.actual : null;
  const shB = sh?.anterior && !sh.anterior.error ? sh.anterior : null;
  const c = r.comparar;
  const serie = (src, fecha, campo, rng) => (rng ? serieRango(src, fecha, campo, rng.desde, rng.hasta) : null);

  const lista = [];
  const add = (o) => {
    const d = delta(o.valor, o.anterior);
    lista.push({ ...o, delta: d, estado: o.forzarEstado || estadoDe(o), ...EXPLICA[o.explica || o.id] });
  };

  if (tienda) {
    const ventas = shA ? shA.total.ventas : ga?.actual?.total?.ingresos ?? A?.valor ?? null;
    add({
      id: 'ventas', titulo: 'Ventas', formato: clp, mejorSi: 'sube', valor: ventas,
      anterior: shB ? shB.total.ventas : ga?.anterior?.total?.ingresos ?? B?.valor ?? null,
      meta: prorrata(M.ventas_mes), metaTipo: 'minimo',
      fuente: shA ? `Shopify${shA.limitado ? ' (solo últimos 60 días)' : ''}` : ga ? 'Analytics' : 'Google Ads',
      serie: shA ? serie(shA.por_dia, 'fecha', 'ventas', r.rango) : ga ? serie(ga.actual.por_dia, 'date', 'purchaseRevenue', r.rango) : serie(ads?.actual?.por_dia, 'fecha', 'valor', r.rango),
      serieAnt: shB ? serie(shB.por_dia, 'fecha', 'ventas', c)
        : ga ? (ga.anterior ? serie(ga.anterior.por_dia, 'date', 'purchaseRevenue', c) : null)
          : ads?.anterior ? serie(ads.anterior.por_dia, 'fecha', 'valor', c) : null,
    });
    add({
      id: 'compras', titulo: 'Compras', formato: entero, mejorSi: 'sube',
      valor: shA ? shA.total.pedidos : ga?.actual?.total?.compras ?? A?.conv ?? null,
      anterior: shB ? shB.total.pedidos : ga ? ga.anterior?.total?.compras ?? null : B?.conv ?? null,
      meta: prorrata(M.compras_mes), metaTipo: 'minimo', fuente: shA ? 'Shopify' : ga ? 'Analytics' : 'Google Ads',
      detalle: A ? `${dec1(A.conv)} desde anuncios` : null,
      serie: shA ? serie(shA.por_dia, 'fecha', 'pedidos', r.rango) : ga ? serie(ga.actual.por_dia, 'date', 'ecommercePurchases', r.rango) : serie(ads?.actual?.por_dia, 'fecha', 'conv', r.rango),
      serieAnt: shB ? serie(shB.por_dia, 'fecha', 'pedidos', c) : ga?.anterior ? serie(ga.anterior.por_dia, 'date', 'ecommercePurchases', c) : null,
    });
    if (A) add({
      id: 'roas', titulo: 'Retorno de los anuncios', formato: (v) => (v == null ? '—' : `${dec1(v)}×`), mejorSi: 'sube',
      valor: A.costo ? A.valor / A.costo : null, anterior: B?.costo ? B.valor / B.costo : null,
      meta: M.roas ?? null, metaTipo: 'minimo', fuente: 'Google Ads', pocos: A.costo < 10000,
      detalle: `${clp(A.valor)} vendidos con ${clp(A.costo)}`,
    });
  } else {
    const contactosWeb = ga?.actual?.total?.contactos;
    add({
      id: 'contactos', titulo: 'Contactos', formato: entero, mejorSi: 'sube',
      valor: contactosWeb ?? A?.conv ?? null, anterior: ga ? ga.anterior?.total?.contactos ?? null : B?.conv ?? null,
      meta: prorrata(M.contactos_mes), metaTipo: 'minimo', fuente: ga ? 'Analytics (toda la web)' : 'Google Ads',
      detalle: A ? `${dec1(A.conv)} desde anuncios` : null,
      serie: ga ? serie(ga.actual.por_dia, 'date', 'keyEvents', r.rango) : serie(ads?.actual?.por_dia, 'fecha', 'conv', r.rango),
      serieAnt: ga ? (ga.anterior ? serie(ga.anterior.por_dia, 'date', 'keyEvents', c) : null) : ads?.anterior ? serie(ads.anterior.por_dia, 'fecha', 'conv', c) : null,
    });
    if (A) add({
      id: 'costo_contacto', titulo: 'Costo por contacto', formato: clp, mejorSi: 'baja',
      valor: A.conv ? A.costo / A.conv : null, anterior: B?.conv ? B.costo / B.conv : null,
      meta: M.costo_contacto ?? null, metaTipo: 'maximo', fuente: 'Google Ads', pocos: (A.conv || 0) < 3,
      // Gastar más que el costo aceptable de un contacto sin conseguir ninguno ya es una mala señal.
      forzarEstado: !A.conv && M.costo_contacto && A.costo > M.costo_contacto ? 'mal' : null,
      detalle: A.conv ? `${clp(A.costo)} ÷ ${dec1(A.conv)} contactos` : `Sin contactos desde anuncios (${clp(A.costo)} gastados)`,
    });
  }
  if (A) {
    add({
      id: 'gasto', titulo: 'Gasto en anuncios', formato: clp, mejorSi: 'neutro', valor: A.costo, anterior: B?.costo ?? null,
      meta: prorrata(M.gasto_mes), metaTipo: 'maximo', fuente: 'Google Ads',
      detalle: `CPC promedio ${clp(A.cpc)}`,
      serie: serie(ads.actual.por_dia, 'fecha', 'costo', r.rango),
      serieAnt: ads.anterior ? serie(ads.anterior.por_dia, 'fecha', 'costo', c) : null,
    });
    add({
      id: 'clics', titulo: 'Clics en el anuncio', formato: entero, mejorSi: 'sube', valor: A.clics, anterior: B?.clics ?? null,
      meta: prorrata(M.clics_mes), metaTipo: 'minimo', fuente: 'Google Ads',
      detalle: `${pct(A.ctr, 1)} de quienes lo vieron hizo clic`,
      serie: serie(ads.actual.por_dia, 'fecha', 'clics', r.rango),
      serieAnt: ads.anterior ? serie(ads.anterior.por_dia, 'fecha', 'clics', c) : null,
    });
  }
  if (ga) add({
    id: 'visitas', titulo: 'Visitas a la web', formato: entero, mejorSi: 'sube', valor: ga.actual.total.sesiones, anterior: ga.anterior?.total?.sesiones ?? null,
    meta: prorrata(M.visitas_mes), metaTipo: 'minimo', fuente: 'Analytics',
    detalle: `${entero(ga.actual.total.usuarios)} personas · ${entero(ga.actual.total.sesiones_ads)} desde anuncios`,
    serie: serie(ga.actual.por_dia, 'date', 'sessions', r.rango),
    serieAnt: ga.anterior ? serie(ga.anterior.por_dia, 'date', 'sessions', c) : null,
  });
  if (sc) add({
    id: 'seo', titulo: 'Clics gratis de Google', formato: entero, mejorSi: 'sube', valor: sc.actual.total.clics, anterior: sc.anterior?.total?.clics ?? null,
    meta: prorrata(M.clics_seo_mes), metaTipo: 'minimo', fuente: 'Search Console',
    detalle: `${entero(sc.actual.total.impr)} veces apareciste · posición ${dec1(sc.actual.total.pos)}`,
    serie: serie(sc.actual.por_dia, 'fecha', 'clics', r.rango),
    serieAnt: sc.anterior ? serie(sc.anterior.por_dia, 'fecha', 'clics', c) : null,
  });
  return lista;
}

// Frase de cómo cambió un indicador.
export function fraseCambio(k) {
  if (k.valor == null) return k.detalle || 'Sin datos en este periodo.';
  const partes = [];
  if (k.anterior != null) {
    if (k.delta == null) partes.push(`antes ${k.formato(k.anterior)}`);
    else if (Math.abs(k.delta) < 0.03) partes.push(`igual que antes (${k.formato(k.anterior)})`);
    else partes.push(`${k.delta > 0 ? 'subió' : 'bajó'} ${pct(Math.abs(k.delta))} (antes ${k.formato(k.anterior)})`);
  }
  if (k.meta != null) {
    const r = k.valor / k.meta;
    if (k.metaTipo === 'maximo') partes.push(r <= 1 ? `bajo tu tope de ${k.formato(k.meta)}` : `${pct(r - 1)} sobre tu tope de ${k.formato(k.meta)}`);
    else partes.push(`${pct(Math.min(r, 9.99))} de tu meta (${k.formato(k.meta)})`);
  }
  return partes.join(' · ') || k.detalle || '';
}

// ── Titular ──────────────────────────────────────────────────────────────────
export function titular(r, indicadores) {
  const principal = indicadores[0];
  if (!principal) return { texto: 'Todavía no hay datos para este periodo.', estado: 'neutro' };
  const malos = indicadores.filter((k) => k.estado === 'mal').length;
  const buenos = indicadores.filter((k) => k.estado === 'bien').length;
  const estado = principal.estado === 'mal' || malos > buenos + 1 ? 'mal' : principal.estado === 'bien' && malos === 0 ? 'bien' : 'regular';
  const texto = `${principal.titulo}: ${principal.formato(principal.valor)}${principal.valor != null ? ` — ${fraseCambio(principal)}` : ''}.`;
  return { texto, estado, buenos, malos };
}

// ── Señales: qué va súper, qué va mal, qué mejorar y cómo ────────────────────
export function armarSenales(r, indicadores) {
  const superBien = [];
  const mal = [];
  const mejorar = [];
  for (const k of indicadores) {
    if (k.estado === 'bien') superBien.push({ titulo: `${k.titulo}: ${k.formato(k.valor)}`, detalle: fraseCambio(k) });
    if (k.estado === 'mal') mal.push({ titulo: k.valor == null ? k.titulo : `${k.titulo}: ${k.formato(k.valor)}`, detalle: fraseCambio(k) });
  }
  const ads = r.ads?.error ? null : r.ads?.actual;
  const A = ads?.total;
  const cpa = r.negocio?.cpa_objetivo || 20000;
  if (A) {
    if (A.perd_presupuesto > 0.3) mejorar.push({
      titulo: `Te quedas sin presupuesto: tu anuncio no salió en ${pct(A.perd_presupuesto)} de las búsquedas`,
      como: 'Antes de subir el presupuesto, saca las búsquedas que gastan sin resultado (abajo, en «Palabras»). Si ya están limpias y hay contactos, sube el presupuesto diario de a poco (20–30%) en la pestaña Cambios.',
      porque: 'Hay gente buscando lo que vendes y no te ve porque el dinero del día se acaba temprano.',
    });
    if (A.perd_ranking > 0.4) mejorar.push({
      titulo: `Pierdes ${pct(A.perd_ranking)} de las búsquedas por la calidad o la puja del anuncio`,
      como: 'Mejora los títulos para que repitan lo que la gente busca y que la página de destino hable de eso mismo. El analista te puede proponer títulos.',
      porque: 'Google premia a los anuncios relevantes: con mejor calidad sales más arriba y pagas menos por clic.',
    });
    if (A.impr >= 100 && A.ctr < 0.03) mejorar.push({
      titulo: `Pocas personas hacen clic: ${pct(A.ctr, 1)} de quienes ven tu anuncio`,
      como: 'Prueba títulos con precio, plazo o una ventaja concreta («Desde $300.000 + IVA», «Lista en 7 días»).',
      porque: 'Lo normal en búsqueda es 4–6%. Más clics por la misma plata = más oportunidades.',
    });
    const gastanSinNada = (ads.terminos || []).filter((t) => t.costo >= cpa * 0.3 && !t.conv).slice(0, 4);
    if (gastanSinNada.length) mejorar.push({
      titulo: `Búsquedas que gastan sin traer contactos: ${gastanSinNada.map((t) => `«${t.texto}»`).join(', ')}`,
      como: 'Si no son tu cliente (quieren algo gratis, un curso, otro producto), agrégalas como negativas. Si sí lo son, dales más tiempo o revisa la página a la que llegan.',
      porque: `Juntas gastaron ${clp(gastanSinNada.reduce((a, t) => a + t.costo, 0))} sin un solo contacto.`,
    });
    const contactos = r.tipo === 'tienda' ? A.conv : r.ga4?.actual?.total?.contactos ?? A.conv;
    if (A.clics >= 20 && !contactos) mejorar.push({
      titulo: `${A.clics} clics y ningún ${r.tipo === 'tienda' ? 'pedido' : 'contacto'}`,
      como: 'Revisa la página a la que llega el anuncio desde el celular: ¿se ve el precio? ¿el botón de WhatsApp está a la vista? ¿carga rápido?',
      porque: 'Los anuncios traen gente, pero la web no la convence. Es el paso que más rinde arreglar.',
    });
    const sesAds = r.ga4?.actual?.total?.sesiones_ads;
    if (sesAds != null && A.clics >= 20 && sesAds < A.clics * 0.6) mejorar.push({
      titulo: `Analytics ve ${entero(sesAds)} visitas de anuncios de ${entero(A.clics)} clics`,
      como: 'Puede ser gente que se va antes de que cargue la página (web lenta) o que bloquea la medición. Revisa la velocidad en celular.',
      porque: 'Si se pierde la medición, no sabes qué anuncio trae clientes.',
    });
  }
  const sc = r.search_console?.error ? null : r.search_console?.actual;
  const casi = (sc?.consultas || []).filter((q) => q.pos >= 4 && q.pos <= 15 && q.impr >= 20).sort((a, b) => b.impr - a.impr).slice(0, 3);
  if (casi.length) mejorar.push({
    titulo: `Casi en primera página gratis: ${casi.map((q) => `«${q.texto}» (pos. ${dec1(q.pos)})`).join(', ')}`,
    como: 'Escribe o mejora una página o artículo que responda justo esa búsqueda (título con esas palabras, precios, preguntas frecuentes) y enlázala desde tu inicio.',
    porque: 'Subir a las primeras 3 posiciones multiplica los clics gratis.',
  });
  const disp = r.ga4?.actual?.dispositivos || [];
  const cel = disp.find((d) => d.deviceCategory === 'mobile');
  const pc = disp.find((d) => d.deviceCategory === 'desktop');
  const totalSes = disp.reduce((a, d) => a + d.sessions, 0);
  if (cel && pc && totalSes >= 50 && cel.sessions / totalSes > 0.5 && pc.sessions >= 10) {
    const tc = cel.keyEvents / cel.sessions;
    const tp = pc.keyEvents / pc.sessions;
    if (tp > 0 && tc < tp / 2) mejorar.push({
      titulo: `En celular convierte la mitad que en computador (${pct(tc, 1)} vs ${pct(tp, 1)})`,
      como: 'La mayoría te visita desde el celular: revisa que el botón de contacto esté siempre a la vista y que nada tape el contenido.',
      porque: `${pct(cel.sessions / totalSes)} de tus visitas son desde celular.`,
    });
  }
  return { superBien, mal, mejorar };
}

// ── Camino del cliente (embudo) ──────────────────────────────────────────────
export function armarEmbudo(r) {
  const A = r.ads?.error ? null : r.ads?.actual?.total;
  if (!A || !A.impr) return null;
  const tienda = r.tipo === 'tienda';
  const visitas = r.ga4?.actual?.total?.sesiones_ads;
  const pasos = [
    { etiqueta: 'Vieron tu anuncio', v: A.impr },
    { etiqueta: 'Hicieron clic', v: A.clics, nota: `${pct(A.ctr, 1)} de quienes lo vieron · normal 4–6%` },
  ];
  if (visitas != null) pasos.push({ etiqueta: 'Llegaron a la web (medido)', v: visitas, nota: A.clics ? `${pct(Math.min(visitas / A.clics, 1))} de los clics` : '' });
  pasos.push({
    etiqueta: tienda ? 'Compraron' : 'Te contactaron',
    v: A.conv,
    nota: A.clics ? `${pct(A.conv / A.clics, 1)} de los clics · ${tienda ? 'normal 1–3%' : 'normal 3–10%'}` : '',
  });
  return pasos;
}
