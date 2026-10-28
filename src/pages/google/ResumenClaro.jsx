// /admin?tab=google → «Resumen claro»: lo importante de un vistazo, para cualquier
// rango de fechas, comparado con otro rango y con las metas del dueño; qué va súper,
// qué va mal, qué mejorar y cómo; y el analista de resultados (IA, con botón).
// Datos: GET /nexcommit/google/:cliente/resumen (back de Agente-Next).
import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange, CheckCircle2, Flag, Info, Lightbulb,
  MessageCircle, Minus, RefreshCw, Search, Send, ShoppingBag, Sparkles, Target, TrendingUp, Users, XCircle,
} from 'lucide-react';
import {
  useAnalizarResultados, useGuardarMetas, useHistorialAnalista, usePreguntarAnalista, useRecargarResumen, useResumenClaro,
} from '../../hooks/google';
import { ErrorBox, Modal, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';
import { BarrasH, MapaCalor, Seccion, Vacio } from './graficos';
import { BarraMeta, Embudo, LineasComparadas, Sparkline } from './graficosClaro';
import { ESTADO, clp, dec1, entero, pct } from './formato';
import {
  CANAL, COMPARACIONES, DISPOSITIVO, GENERO, NUEVOS, PERIODOS, armarEmbudo, armarIndicadores, armarSenales,
  calcularComparacion, calcularRango, diasEntre, fechaLarga, fraseCambio, titular,
} from './resumenLectura';

const COLOR_ESTADO = { bien: ESTADO.bien, regular: ESTADO.mejorar, mal: ESTADO.alerta };
const TEXTO_ESTADO = { bien: 'Va bien', regular: 'Atento', mal: 'Va mal', neutro: 'Sin meta', sin_dato: 'Sin datos', tope_ok: 'Dentro del tope' };
const ICONO_ESTADO = { bien: CheckCircle2, regular: AlertTriangle, mal: XCircle, tope_ok: CheckCircle2 };

function leerLocal(k, defecto) {
  try { return localStorage.getItem(k) || defecto; } catch { return defecto; }
}
function guardarLocal(k, v) {
  try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: no pasa nada */ }
}

export default function ResumenClaro({ irACambios }) {
  const [periodo, setPeriodoRaw] = useState(() => leerLocal('gclaro_periodo', '30d'));
  const [modo, setModoRaw] = useState(() => leerLocal('gclaro_comparar', 'anterior'));
  const [propio, setPropio] = useState({ desde: '', hasta: '' });
  const [compPropio, setCompPropio] = useState({ desde: '', hasta: '' });
  const [metasAbiertas, setMetasAbiertas] = useState(false);
  const setPeriodo = (v) => { setPeriodoRaw(v); guardarLocal('gclaro_periodo', v); };
  const setModo = (v) => { setModoRaw(v); guardarLocal('gclaro_comparar', v); };

  const rango = calcularRango(periodo, propio);
  const comp = calcularComparacion(modo, rango, compPropio);
  const params = useMemo(
    () => ({ desde: rango.desde, hasta: rango.hasta, cdesde: comp?.desde || '', chasta: comp?.hasta || '' }),
    [rango.desde, rango.hasta, comp?.desde, comp?.hasta],
  );
  const { data: r, isLoading, isFetching, error } = useResumenClaro(params);
  const recargar = useRecargarResumen(params);

  const indicadores = useMemo(() => (r ? armarIndicadores(r) : []), [r]);
  const senales = useMemo(() => (r ? armarSenales(r, indicadores) : null), [r, indicadores]);
  const cabeza = useMemo(() => (r ? titular(r, indicadores) : null), [r, indicadores]);

  return (
    <div className="space-y-4">
      {/* ── Periodo y comparación ── */}
      <section className={`${card} p-3 flex flex-wrap items-end gap-3`}>
        <div>
          <div className={labelClass}><CalendarRange className="inline w-3.5 h-3.5 mr-1" />Periodo</div>
          <div className="flex flex-wrap rounded-lg border border-white/10 overflow-hidden" role="group" aria-label="Periodo">
            {PERIODOS.map((x) => (
              <button key={x.id} type="button" onClick={() => setPeriodo(x.id)}
                className={`px-3 py-1.5 text-xs ${periodo === x.id ? 'bg-[#1a3050] text-white' : 'text-[#9aafc3] hover:text-white'}`}>{x.label}</button>
            ))}
          </div>
        </div>
        {periodo === 'propio' && (
          <div className="flex gap-2">
            <label className="text-xs text-[#9aafc3]">Desde<input type="date" className={inputClass} value={propio.desde} onChange={(e) => setPropio((p) => ({ ...p, desde: e.target.value }))} /></label>
            <label className="text-xs text-[#9aafc3]">Hasta<input type="date" className={inputClass} value={propio.hasta} onChange={(e) => setPropio((p) => ({ ...p, hasta: e.target.value }))} /></label>
          </div>
        )}
        <label className="text-xs text-[#9aafc3]">
          Comparar con
          <select className={`${inputClass} mt-1`} value={modo} onChange={(e) => setModo(e.target.value)}>
            {COMPARACIONES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        {modo === 'propio' && (
          <div className="flex gap-2">
            <label className="text-xs text-[#9aafc3]">Desde<input type="date" className={inputClass} value={compPropio.desde} onChange={(e) => setCompPropio((p) => ({ ...p, desde: e.target.value }))} /></label>
            <label className="text-xs text-[#9aafc3]">Hasta<input type="date" className={inputClass} value={compPropio.hasta} onChange={(e) => setCompPropio((p) => ({ ...p, hasta: e.target.value }))} /></label>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" className={btnGhost} onClick={() => setMetasAbiertas(true)} disabled={!r}><Flag className="w-4 h-4" /> Mis metas</button>
          <button type="button" className={btnGhost} disabled={recargar.isPending} onClick={() => recargar.mutate()} title="Volver a leer Google ahora">
            <RefreshCw className={`w-4 h-4 ${recargar.isPending || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="w-full text-[11px] text-[#5f7891]">
          Mirando del <b className="text-[#cfe0f0]">{fechaLarga(rango.desde)}</b> al <b className="text-[#cfe0f0]">{fechaLarga(rango.hasta)}</b> ({diasEntre(rango.desde, rango.hasta)} días)
          {comp ? <> · comparado con <span style={{ color: '#f0a07c' }}>{fechaLarga(comp.desde)} – {fechaLarga(comp.hasta)}</span></> : ' · sin comparar'}
          {' '}· Los periodos terminan ayer: Google Ads se actualiza cada mañana.
        </p>
      </section>

      {isLoading && <div className="text-sm text-[#9aafc3] py-10 text-center">Leyendo Google Ads, Analytics y Search Console…</div>}
      {error && <ErrorBox error={error} />}
      {recargar.error && <ErrorBox error={recargar.error} />}

      {r && (
        <>
          <Avisos r={r} irACambios={irACambios} />

          {/* ── Titular ── */}
          {cabeza && (
            <section className={`${card} p-4 flex flex-wrap items-center gap-4`} style={{ borderColor: `${COLOR_ESTADO[cabeza.estado] || '#ffffff'}55` }}>
              <EstadoChip estado={cabeza.estado} grande />
              <div className="flex-1 min-w-[220px]">
                <div className="text-white text-lg font-semibold leading-snug">{cabeza.texto}</div>
                <div className="text-xs text-[#9aafc3] mt-1">
                  {cabeza.buenos} indicador{cabeza.buenos === 1 ? '' : 'es'} van bien · {cabeza.malos} van mal.
                  {' '}El semáforo usa tus metas cuando existen; si no, la comparación con el otro periodo.
                </div>
              </div>
            </section>
          )}

          {/* ── Indicadores ── */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {indicadores.map((k) => <TarjetaIndicador key={k.id} k={k} />)}
          </div>

          {/* ── Va súper / va mal / mejorar ── */}
          {senales && (
            <div className="grid lg:grid-cols-3 gap-4">
              <Seccion titulo="Lo que va súper" icon={CheckCircle2}>
                <ListaSenal items={senales.superBien} estado="bien" vacio="Todavía nada destaca. Con más días de datos aparecerá aquí." />
              </Seccion>
              <Seccion titulo="Lo que va mal" icon={XCircle}>
                <ListaSenal items={senales.mal} estado="mal" vacio="Nada va mal contra tus metas o el periodo anterior. 👌" />
              </Seccion>
              <Seccion titulo="Qué mejorar y cómo" icon={Lightbulb} extra="toca para ver cómo">
                <ListaMejorar items={senales.mejorar} />
              </Seccion>
            </div>
          )}

          <Analista params={params} irACambios={irACambios} tablasOk={r.tablas_ok} />

          <Tendencia indicadores={indicadores} r={r} />

          <div className="grid lg:grid-cols-5 gap-4">
            <Seccion titulo="El camino de tus clientes" icon={TrendingUp} className="lg:col-span-2" extra="desde el anuncio hasta el contacto">
              <Embudo pasos={armarEmbudo(r)} />
              <Lectura>
                Cada paso pierde gente; lo normal es que el salto más grande sea entre «vieron» y «clic». Si el salto grande está entre «clic» y
                {r.tipo === 'tienda' ? ' «compraron»' : ' «te contactaron»'}, el problema está en la web, no en el anuncio. (Barras en escala comprimida para que se vean los pasos chicos.)
              </Lectura>
            </Seccion>
            <ResultadosPorFuente r={r} className="lg:col-span-3" />
          </div>

          <Publico r={r} />
          <Palabras r={r} />
        </>
      )}

      {metasAbiertas && r && <EditorMetas r={r} onClose={() => setMetasAbiertas(false)} />}
    </div>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function EstadoChip({ estado, grande = false }) {
  const Icon = ICONO_ESTADO[estado] || Minus;
  const color = COLOR_ESTADO[estado] || '#9aafc3';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${grande ? 'py-1 text-sm' : 'py-0.5 text-[11px]'}`} style={{ borderColor: `${color}66`, color }}>
      <Icon className={grande ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" /> {TEXTO_ESTADO[estado] || estado}
    </span>
  );
}

function Lectura({ children }) {
  return (
    <p className="mt-3 text-[11px] leading-relaxed text-[#9aafc3] flex gap-1.5">
      <Info className="w-3.5 h-3.5 shrink-0 mt-px text-[#67c8f3]" aria-hidden="true" /><span>{children}</span>
    </p>
  );
}

function CambioChip({ k }) {
  if (k.delta == null || k.anterior == null) return null;
  const sube = k.delta > 0.03;
  const baja = k.delta < -0.03;
  const bueno = k.mejorSi === 'neutro' ? null : (k.mejorSi === 'baja' ? baja : sube);
  const malo = k.mejorSi === 'neutro' ? null : (k.mejorSi === 'baja' ? sube : baja);
  const color = bueno ? ESTADO.bien : malo ? ESTADO.alerta : '#9aafc3';
  const Icon = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium tabular-nums" style={{ color }} title="Contra el periodo de comparación">
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />{sube || baja ? pct(Math.abs(k.delta)) : 'igual'}
    </span>
  );
}

function TarjetaIndicador({ k }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={`${card} px-4 py-3 flex flex-col`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-[#9aafc3]">{k.titulo}</div>
        <EstadoChip estado={k.estado} />
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-white text-2xl font-semibold tabular-nums">{k.formato(k.valor)}</span>
        <CambioChip k={k} />
      </div>
      <div className="text-[11px] text-[#9aafc3] mt-0.5">{fraseCambio(k)}</div>
      {k.detalle && k.valor != null && <div className="text-[11px] text-[#5f7891]">{k.detalle}</div>}
      {k.serie && <div className="mt-2"><Sparkline actual={k.serie} anterior={k.serieAnt} /></div>}
      <BarraMeta valor={k.valor} meta={k.meta} tipo={k.metaTipo} formato={k.formato} />
      <button type="button" className="mt-2 self-start text-[11px] text-[#67c8f3] hover:text-white" onClick={() => setAbierto((a) => !a)}>
        {abierto ? 'Cerrar' : '¿Qué significa y cómo leerlo?'}
      </button>
      {abierto && (
        <dl className="mt-1 text-xs space-y-1.5">
          <div><dt className="text-[#67c8f3]">Qué es</dt><dd className="text-[#cfe0f0]">{k.que}</dd></div>
          <div><dt className="text-[#67c8f3]">Cómo leerlo</dt><dd className="text-[#cfe0f0]">{k.leer}</dd></div>
          <div className="text-[10px] text-[#5f7891]">Fuente: {k.fuente}</div>
        </dl>
      )}
    </div>
  );
}

function ListaSenal({ items, estado, vacio }) {
  if (!items.length) return <Vacio>{vacio}</Vacio>;
  const Icon = ICONO_ESTADO[estado];
  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.titulo} className="flex gap-2 text-sm">
          <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: COLOR_ESTADO[estado] }} aria-hidden="true" />
          <div><div className="text-white">{s.titulo}</div><div className="text-xs text-[#9aafc3]">{s.detalle}</div></div>
        </li>
      ))}
    </ul>
  );
}

function ListaMejorar({ items }) {
  const [abierto, setAbierto] = useState(null);
  if (!items.length) return <Vacio>Sin alertas por reglas. Pídele al analista una revisión a fondo.</Vacio>;
  return (
    <ul className="space-y-2">
      {items.map((m, i) => (
        <li key={m.titulo} className="rounded-lg border border-white/10 bg-white/[0.02]">
          <button type="button" className="w-full text-left px-3 py-2 flex gap-2 items-start" onClick={() => setAbierto(abierto === i ? null : i)}>
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-[#fab219]" aria-hidden="true" />
            <span className="text-sm text-white flex-1">{m.titulo}</span>
          </button>
          {abierto === i && (
            <dl className="px-9 pb-3 text-xs space-y-1.5">
              <div><dt className="text-[#67c8f3]">Cómo</dt><dd className="text-[#cfe0f0]">{m.como}</dd></div>
              <div><dt className="text-[#67c8f3]">Por qué importa</dt><dd className="text-[#cfe0f0]">{m.porque}</dd></div>
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

function Avisos({ r, irACambios }) {
  const avisos = [];
  if (!r.tablas_ok) avisos.push('Falta correr el SQL de «Resumen claro» en Supabase: sin él no se guarda la historia de Ads, las metas ni el analista.');
  if (r.ads && !r.ads.error && !r.ads.script_v3) avisos.push('El script de Google Ads de esta cuenta es la versión anterior (30 días): pega la versión nueva para tener 180 días de historia y el detalle por palabra.');
  if (r.ads?.anterior_incompleto) avisos.push(`La comparación de Google Ads está incompleta: hay historia desde el ${fechaLarga(r.ads.historia_desde)}.`);
  if (r.shopify?.actual?.limitado) avisos.push('Shopify solo entrega los últimos 60 días: las ventas de antes no se cuentan.');
  return (
    <>
      {avisos.map((a) => (
        <div key={a} className="rounded-lg border border-[#fab219]/40 bg-[#fab219]/10 px-3 py-2 text-xs text-[#fde1a0] flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />{a}
        </div>
      ))}
      {r.cambios_por_revisar > 0 && (
        <button type="button" onClick={irACambios} className="w-full rounded-lg border border-[#3987e5]/40 bg-[#3987e5]/10 px-3 py-2 text-xs text-[#cfe0f0] flex items-center gap-2 hover:bg-[#3987e5]/20">
          <Target className="w-4 h-4 text-[#67c8f3]" aria-hidden="true" />
          Tienes {r.cambios_por_revisar} cambio{r.cambios_por_revisar === 1 ? '' : 's'} propuesto{r.cambios_por_revisar === 1 ? '' : 's'} esperando tu aprobación
          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
        </button>
      )}
    </>
  );
}

// ── Tendencia ────────────────────────────────────────────────────────────────
function Tendencia({ indicadores, r }) {
  const conSerie = indicadores.filter((k) => k.serie);
  const [id, setId] = useState(null);
  const k = conSerie.find((x) => x.id === id) || conSerie[0];
  if (!k) return null;
  const metaDia = k.meta != null && k.metaTipo === 'minimo' && !['roas'].includes(k.id) ? k.meta / r.rango.dias : null;
  return (
    <Seccion titulo="Cómo se movió día a día" icon={TrendingUp} extra="elige qué mirar">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {conSerie.map((x) => (
          <button key={x.id} type="button" onClick={() => setId(x.id)}
            className={`rounded-full border px-3 py-1 text-xs ${x.id === k.id ? 'border-[#3987e5] bg-[#3987e5]/15 text-white' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}>{x.titulo}</button>
        ))}
      </div>
      <LineasComparadas actual={k.serie} anterior={k.serieAnt} formato={k.formato} etiqueta={k.titulo} meta={metaDia} />
      <Lectura>
        Mira la forma más que un día suelto: una semana completa arriba o abajo dice más que un pico. La línea punteada es el periodo de comparación, alineado día por día (día 1 con día 1).
      </Lectura>
    </Seccion>
  );
}

// ── Resultados por fuente ────────────────────────────────────────────────────
function ResultadosPorFuente({ r, className }) {
  const tienda = r.tipo === 'tienda';
  const sh = r.shopify?.actual && !r.shopify.actual.error ? r.shopify.actual : null;
  const ga = r.ga4?.error ? null : r.ga4?.actual;
  if (tienda) {
    return (
      <Seccion titulo="Tus ventas" icon={ShoppingBag} className={className} extra={sh ? 'Shopify' : 'sin datos de Shopify'}>
        {!sh ? <Vacio>{r.shopify?.actual?.error || r.shopify?.error || 'Sin ventas en este periodo.'}</Vacio> : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#9aafc3] mb-2">De dónde vinieron las ventas</div>
              <BarrasH filas={sh.por_origen.map((o) => ({ etiqueta: o.clave, v: o.ventas, detalle: `${o.pedidos} pedidos` }))} formato={clp} max={7} />
            </div>
            <div>
              <div className="text-xs text-[#9aafc3] mb-2">Productos que más venden</div>
              <BarrasH filas={sh.productos.map((p) => ({ etiqueta: p.titulo, v: p.ventas, detalle: `${p.unidades} u.` }))} formato={clp} max={7} />
            </div>
          </div>
        )}
        {sh && <Lectura>Ticket promedio {clp(sh.total.ticket)} · {sh.total.nuevas} clientas nuevas y {sh.total.recurrentes} que volvieron. Si «Google Ads» vende poco comparado con lo que gasta, revisa los productos de Shopping que se llevan el gasto.</Lectura>}
      </Seccion>
    );
  }
  const canales = (ga?.canales || []).filter((c) => c.keyEvents > 0);
  const paginas = (ga?.landing || []).filter((p) => p.keyEvents > 0);
  const mejor = [...canales].sort((a, b) => b.keyEvents - a.keyEvents)[0];
  return (
    <Seccion titulo="De dónde salen tus contactos" icon={Target} className={className} extra="Analytics, toda la web">
      {!ga ? <Vacio>{r.ga4?.error || 'Analytics no está conectado.'}</Vacio> : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#9aafc3] mb-2">Contactos por origen</div>
            {canales.length ? <BarrasH filas={canales.map((c) => ({ etiqueta: CANAL[c.sessionDefaultChannelGroup] || c.sessionDefaultChannelGroup, v: c.keyEvents, detalle: `${entero(c.sessions)} visitas` }))} max={7} /> : <Vacio>Sin contactos en este periodo.</Vacio>}
          </div>
          <div>
            <div className="text-xs text-[#9aafc3] mb-2">Páginas donde empezaron los que te contactaron</div>
            {paginas.length ? <BarrasH filas={paginas.map((p) => ({ etiqueta: p.landingPage || '/', v: p.keyEvents, detalle: `${entero(p.sessions)} visitas` }))} max={7} /> : <Vacio>Sin contactos en este periodo.</Vacio>}
          </div>
        </div>
      )}
      {mejor && <Lectura>Tu mejor fuente de contactos es «{CANAL[mejor.sessionDefaultChannelGroup] || mejor.sessionDefaultChannelGroup}» ({pct(mejor.keyEvents / Math.max(mejor.sessions, 1), 1)} de sus visitas te contacta). Cuida lo que funciona antes de invertir en lo nuevo.</Lectura>}
    </Seccion>
  );
}

// ── Público ──────────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function Publico({ r }) {
  const ga = r.ga4?.error ? null : r.ga4?.actual;
  const adsDisp = r.ads?.error ? [] : r.ads?.actual?.dispositivos || [];
  if (!ga && !adsDisp.length) return null;
  const sesiones = ga?.total?.sesiones || 0;
  const ciudades = ga?.ciudades?.filter((c) => c.city !== '(not set)') || [];
  const topCiudad = ciudades[0];
  const disp = ga?.dispositivos || [];
  const topDisp = [...disp].sort((a, b) => b.sessions - a.sessions)[0];
  const horario = ga?.horario || [];
  const mejorHora = [...horario].sort((a, b) => b.sessions - a.sessions)[0];
  const sinSignals = ga && !ga.edad?.length && !ga.genero?.length;
  return (
    <Seccion titulo="Tu público" icon={Users} extra="quién te visita, desde dónde y cuándo">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        <Bloque titulo="Ciudades">
          <BarrasH filas={ciudades.map((c) => ({ etiqueta: c.city, v: c.sessions, detalle: c.keyEvents ? `${entero(c.keyEvents)} contactos` : '' }))} max={6} />
          {topCiudad && sesiones > 0 && <Mini>{pct(topCiudad.sessions / sesiones)} de tus visitas vienen de {topCiudad.city}. Si vendes en todo Chile y casi todo es de una ciudad, prueba textos que digan «a todo Chile».</Mini>}
        </Bloque>
        <Bloque titulo="Dispositivo">
          {disp.length
            ? <BarrasH filas={disp.map((d) => ({ etiqueta: DISPOSITIVO[d.deviceCategory] || d.deviceCategory, v: d.sessions, detalle: `${pct(d.keyEvents / Math.max(d.sessions, 1), 1)} contacta` }))} />
            : <BarrasH filas={adsDisp.map((d) => ({ etiqueta: DISPOSITIVO[d.clave] || d.clave, v: d.clics, detalle: 'clics en anuncios' }))} />}
          {topDisp && sesiones > 0 && <Mini>{pct(topDisp.sessions / sesiones)} entra desde {String(DISPOSITIVO[topDisp.deviceCategory] || topDisp.deviceCategory).toLowerCase()}: revisa tu web primero en ese formato.</Mini>}
        </Bloque>
        <Bloque titulo="Primera vez o vuelven">
          <BarrasH filas={(ga?.nuevos || []).filter((n) => NUEVOS[n.newVsReturning]).map((n) => ({ etiqueta: NUEVOS[n.newVsReturning], v: n.activeUsers, detalle: `${entero(n.keyEvents)} contactos` }))} />
          <Mini>Si casi todos son «primera visita», la gente no vuelve: un buen correo o WhatsApp de seguimiento ayuda a cerrar.</Mini>
        </Bloque>
        <Bloque titulo="Cuándo te visitan" className="md:col-span-2">
          <MapaCalor celdas={horario.map((h) => ({ dia: (Number(h.dayOfWeek) + 6) % 7, hora: Number(h.hour), v: h.sessions }))} etiqueta="Visitas" />
          {mejorHora && <Mini>Tu momento más fuerte: los {DIAS_SEMANA[Number(mejorHora.dayOfWeek)]} a las {mejorHora.hour}:00. Ten el WhatsApp atendido en esas horas; si la campaña tiene horario, que cubra esos bloques.</Mini>}
        </Bloque>
        <Bloque titulo="De dónde llegan">
          <BarrasH filas={(ga?.canales || []).map((c) => ({ etiqueta: CANAL[c.sessionDefaultChannelGroup] || c.sessionDefaultChannelGroup, v: c.sessions }))} max={6} />
        </Bloque>
        <Bloque titulo="Edad">
          {ga?.edad?.length ? <BarrasH filas={ga.edad.map((e) => ({ etiqueta: `${e.userAgeBracket} años`, v: e.activeUsers, detalle: e.keyEvents ? `${entero(e.keyEvents)} contactos` : '' }))} /> : <SinSignals />}
        </Bloque>
        <Bloque titulo="Género">
          {ga?.genero?.length ? <BarrasH filas={ga.genero.map((g) => ({ etiqueta: GENERO[g.userGender] || g.userGender, v: g.activeUsers, detalle: g.keyEvents ? `${entero(g.keyEvents)} contactos` : '' }))} /> : <SinSignals />}
        </Bloque>
        <Bloque titulo="Intereses">
          {ga?.intereses?.length ? <BarrasH filas={ga.intereses.map((i) => ({ etiqueta: String(i.brandingInterest).split('/').pop().trim(), v: i.activeUsers }))} max={6} /> : <SinSignals />}
        </Bloque>
      </div>
      {sinSignals && <Lectura>Edad, género e intereses vienen de Google Signals. Google oculta los grupos con pocas personas para proteger su privacidad, así que aparecen solo con más visitas y unos días después de activarlo.</Lectura>}
    </Seccion>
  );
}
function Bloque({ titulo, children, className = '' }) {
  return <div className={className}><div className="text-xs font-medium text-[#cfe0f0] mb-2">{titulo}</div>{children}</div>;
}
function Mini({ children }) {
  return <p className="mt-2 text-[11px] text-[#9aafc3]">{children}</p>;
}
function SinSignals() {
  return <Vacio>Aún sin datos suficientes.</Vacio>;
}

// ── Palabras ─────────────────────────────────────────────────────────────────
function Palabras({ r }) {
  const ads = r.ads?.error ? null : r.ads?.actual;
  const sc = r.search_console?.error ? null : r.search_console;
  const terminos = ads?.terminos || [];
  const ganan = terminos.filter((t) => t.conv > 0).sort((a, b) => b.conv - a.conv);
  const gastan = terminos.filter((t) => !t.conv && t.costo > 0).sort((a, b) => b.costo - a.costo);
  const masClics = [...terminos].sort((a, b) => b.clics - a.clics).filter((t) => t.clics > 0);
  const posAnt = new Map((sc?.anterior?.consultas || []).map((q) => [q.texto, q]));
  const gratis = (sc?.actual?.consultas || []).filter((q) => q.clics > 0).slice(0, 8);
  const casi = (sc?.actual?.consultas || []).filter((q) => q.pos >= 4 && q.pos <= 20 && q.impr >= 10).sort((a, b) => b.impr - a.impr).slice(0, 8);
  return (
    <Seccion titulo="Lo que la gente busca" icon={Search} extra="búsquedas reales que activaron tu anuncio y las que te encuentran gratis">
      {ads && !ads.con_detalle && (
        <div className="mb-3 text-xs text-[#9aafc3]">El detalle de búsquedas por fecha llega con el script nuevo de Google Ads. Mientras tanto, la pestaña «Palabras y búsquedas» muestra los últimos 30 días.</div>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        <Bloque titulo={ganan.length ? 'Búsquedas que te traen resultados' : 'Búsquedas con más clics'}>
          <ListaPalabras filas={(ganan.length ? ganan : masClics).slice(0, 8)} col={(t) => (ganan.length ? `${dec1(t.conv)} ${r.tipo === 'tienda' ? 'compras' : 'contactos'} · ${clp(t.costo)}` : `${entero(t.clics)} clics · ${clp(t.costo)}`)} />
          <Mini>{ganan.length ? 'Estas son tu oro: si alguna está en concordancia de frase, pásala a exacta para pagar menos por ella.' : 'Aún no hay búsquedas con resultados. Mira cuáles traen más clics y si de verdad son tu cliente.'}</Mini>
        </Bloque>
        <Bloque titulo="Búsquedas que gastan sin resultado">
          <ListaPalabras filas={gastan.slice(0, 8)} col={(t) => `${clp(t.costo)} · ${entero(t.clics)} clics`} vacio="Ninguna búsqueda gasta sin resultado. 👌" />
          <Mini>Si una de estas no es tu cliente (busca gratis, cursos, empleo, otro producto), agrégala como negativa en «Palabras y búsquedas». Si sí lo es, dale más tiempo.</Mini>
        </Bloque>
        <Bloque titulo="Te encuentran gratis en Google">
          {sc ? (
            <ListaPalabras filas={gratis} col={(q) => {
              const a = posAnt.get(q.texto);
              const mov = a ? a.pos - q.pos : null;
              return `${entero(q.clics)} clics · pos. ${dec1(q.pos)}${mov != null && Math.abs(mov) >= 1 ? ` (${mov > 0 ? '↑' : '↓'}${dec1(Math.abs(mov))})` : ''}`;
            }} vacio="Todavía sin clics gratis en este periodo." />
          ) : <Vacio>{r.search_console?.error || 'Search Console no está conectado.'}</Vacio>}
          <Mini>«pos.» es el lugar promedio en Google (1 = primero). La flecha dice si subiste o bajaste contra el otro periodo.</Mini>
        </Bloque>
        <Bloque titulo="Casi en primera página (oportunidades)">
          {sc ? <ListaPalabras filas={casi} col={(q) => `${entero(q.impr)} veces · pos. ${dec1(q.pos)}`} vacio="Sin oportunidades claras todavía." /> : <Vacio />}
          <Mini>Búsquedas donde apareces entre el lugar 4 y 20. Un artículo o página que responda justo eso puede subirte a los primeros lugares y traer clics gratis.</Mini>
        </Bloque>
      </div>
    </Seccion>
  );
}
function ListaPalabras({ filas, col, vacio = 'Sin datos en este periodo.' }) {
  if (!filas.length) return <Vacio>{vacio}</Vacio>;
  return (
    <ul className="divide-y divide-white/5">
      {filas.map((f) => (
        <li key={f.texto} className="flex justify-between gap-3 py-1.5 text-xs">
          <span className="text-[#cfe0f0] truncate" title={f.texto}>{f.texto}</span>
          <span className="text-white tabular-nums shrink-0">{col(f)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Metas ────────────────────────────────────────────────────────────────────
function EditorMetas({ r, onClose }) {
  const guardar = useGuardarMetas();
  const campos = Object.keys(r.metas.valores);
  const [v, setV] = useState(() => Object.fromEntries(campos.map((k) => [k, r.metas.valores[k] ?? ''])));
  const enviar = (e) => {
    e.preventDefault();
    guardar.mutate(v, { onSuccess: onClose });
  };
  return (
    <Modal titulo="Mis metas (por mes)" onClose={onClose} ancho="max-w-lg">
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-xs text-[#9aafc3]">
          Escribe lo que esperas lograr en un mes. El resumen las ajusta solo al largo del periodo (en 7 días espera ~¼ de la meta). Deja vacío lo que no quieras medir.
          {!r.metas.personalizadas && ' Los valores de ahora son sugeridos a partir de tu presupuesto y costo por contacto de Configuración.'}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {campos.map((k) => (
            <label key={k} className="text-xs text-[#9aafc3]">
              {r.campos_meta?.[k] || k}
              <input type="number" min="0" step="any" className={`${inputClass} mt-1`} value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} />
            </label>
          ))}
        </div>
        {guardar.error && <ErrorBox error={guardar.error} />}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar metas'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Analista de resultados ───────────────────────────────────────────────────
const IMPACTO = { alto: '#0ca30c', medio: '#fab219', bajo: '#9aafc3' };
function Analista({ params, irACambios, tablasOk }) {
  const historial = useHistorialAnalista();
  const analizar = useAnalizarResultados();
  const [elegido, setElegido] = useState(null);
  const lista = Array.isArray(historial.data) ? historial.data : [];
  const a = lista.find((x) => x.id === elegido) || lista[0] || null;
  const otroPeriodo = a && (a.desde !== params.desde || a.hasta !== params.hasta);
  const p = a?.plan || {};

  return (
    <section className={`${card} p-4 border-[#3987e5]/40`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#67c8f3]" /> Tu analista de resultados</h3>
          <p className="text-xs text-[#9aafc3] mt-0.5 max-w-2xl">
            Mira los resultados del periodo elegido contra el de comparación y tus metas, te explica en simple qué pasó y te deja un plan de máximo 3 acciones.
            Los cambios que propone para Google Ads quedan en «Cambios» esperando tu aprobación. Después puedes hacerle preguntas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lista.length > 1 && (
            <select className={inputClass} value={a?.id || ''} onChange={(e) => setElegido(e.target.value)} aria-label="Análisis anteriores">
              {lista.map((x) => (
                <option key={x.id} value={x.id}>{new Date(x.created_at).toLocaleDateString('es-CL')} · {x.desde} → {x.hasta}</option>
              ))}
            </select>
          )}
          <button type="button" className={btnPrimary} disabled={analizar.isPending || !tablasOk}
            onClick={() => analizar.mutate(params, { onSuccess: (n) => setElegido(n.id) })}>
            <Sparkles className="w-4 h-4" /> {analizar.isPending ? 'Analizando (~30 s)…' : 'Analizar este periodo'}
          </button>
        </div>
      </div>
      <div className="text-[10px] text-[#5f7891] mt-1">Cada análisis cuesta ~US$0,03 en OpenAI; cada pregunta, menos de US$0,01.</div>
      {analizar.error && <div className="mt-2"><ErrorBox error={analizar.error} /></div>}
      {historial.error && tablasOk && <div className="mt-2"><ErrorBox error={historial.error} /></div>}

      {!a && !analizar.isPending && <Vacio>Todavía no hay análisis. Elige el periodo arriba y aprieta «Analizar este periodo».</Vacio>}

      {a && (
        <div className="mt-4 space-y-4">
          {otroPeriodo && (
            <div className="text-[11px] text-[#fde1a0]">Este análisis es del {fechaLarga(a.desde)} al {fechaLarga(a.hasta)}, no del periodo que estás mirando. Aprieta «Analizar este periodo» para uno nuevo.</div>
          )}
          <div className="flex flex-wrap items-start gap-3">
            {p.estado && <EstadoChip estado={p.estado} grande />}
            <div className="flex-1 min-w-[240px]">
              <div className="text-white text-base font-semibold">{p.titular}</div>
              <p className="text-sm text-[#cfe0f0] mt-1 leading-relaxed">{p.explicacion}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-[#cfe0f0] mb-1.5">Lo que va súper</div>
              <ListaSenal estado="bien" vacio="—" items={(p.va_super || []).map((x) => ({ titulo: x.titulo, detalle: [x.dato, x.por_que_importa].filter(Boolean).join(' · ') }))} />
            </div>
            <div>
              <div className="text-xs font-medium text-[#cfe0f0] mb-1.5">Lo que va mal</div>
              <ListaSenal estado="mal" vacio="—" items={(p.va_mal || []).map((x) => ({ titulo: x.titulo, detalle: [x.dato, x.causa_probable && `Causa probable: ${x.causa_probable}`].filter(Boolean).join(' · ') }))} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {[
              ['Tu público', <Users key="i" className="w-3.5 h-3.5" />, p.publico],
              ['Las búsquedas', <Search key="i" className="w-3.5 h-3.5" />, p.palabras],
              ['Contactos y ventas', <ShoppingBag key="i" className="w-3.5 h-3.5" />, p.ventas],
            ].map(([t, icono, txt]) => txt && (
              <div key={t} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs font-medium text-[#67c8f3] flex items-center gap-1.5">{icono} {t}</div>
                <p className="text-xs text-[#cfe0f0] mt-1 leading-relaxed">{txt}</p>
              </div>
            ))}
          </div>

          {(p.plan || []).length > 0 && (
            <div>
              <div className="text-sm font-medium text-white mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-[#67c8f3]" /> Tu plan</div>
              <div className="grid lg:grid-cols-3 gap-3">
                {p.plan.map((x, i) => (
                  <div key={x.titulo} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex flex-col">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-[#3987e5] text-white w-5 h-5 grid place-items-center font-semibold">{i + 1}</span>
                      {x.impacto && <span style={{ color: IMPACTO[x.impacto] }}>Impacto {x.impacto}</span>}
                      {x.esfuerzo && <span className="text-[#9aafc3]">· esfuerzo {x.esfuerzo}</span>}
                    </div>
                    <div className="text-sm text-white font-medium mt-1.5">{x.titulo}</div>
                    <p className="text-xs text-[#9aafc3] mt-1">{x.por_que}</p>
                    {(x.pasos || []).length > 0 && (
                      <ol className="mt-2 space-y-1 text-xs text-[#cfe0f0] list-decimal pl-4">{x.pasos.map((s) => <li key={s}>{s}</li>)}</ol>
                    )}
                    <div className="mt-auto pt-2 text-[11px] space-y-0.5">
                      {x.esperar && <div className="text-[#cfe0f0]"><span className="text-[#67c8f3]">Qué esperar:</span> {x.esperar}</div>}
                      {x.metrica && <div className="text-[#9aafc3]">{x.metrica}: {x.hoy} → <b className="text-white">{x.meta}</b></div>}
                      {x.revisar_el && <div className="text-[#9aafc3]">Revisar el {fechaLarga(x.revisar_el)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.cambios_creados > 0 && (
            <button type="button" onClick={irACambios} className={btnGhost}>
              <ArrowRight className="w-4 h-4" /> Revisar {a.cambios_creados} cambio{a.cambios_creados === 1 ? '' : 's'} propuesto{a.cambios_creados === 1 ? '' : 's'} en «Cambios»
            </button>
          )}

          {(p.aprende || []).length > 0 && (
            <details className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <summary className="cursor-pointer text-xs font-medium text-[#cfe0f0]"><Lightbulb className="inline w-3.5 h-3.5 mr-1 text-[#fab219]" />Para entender mejor tus datos</summary>
              <dl className="mt-2 grid md:grid-cols-3 gap-3 text-xs">
                {p.aprende.map((x) => <div key={x.concepto}><dt className="text-[#67c8f3]">{x.concepto}</dt><dd className="text-[#cfe0f0]">{x.explicacion}</dd></div>)}
              </dl>
            </details>
          )}

          <Conversacion a={a} />
        </div>
      )}
    </section>
  );
}

function Conversacion({ a }) {
  const preguntar = usePreguntarAnalista();
  const [texto, setTexto] = useState('');
  const conversacion = a.conversacion || [];
  const enviar = (t) => {
    const q = (t ?? texto).trim();
    if (!q) return;
    preguntar.mutate({ id: a.id, texto: q }, { onSuccess: () => setTexto('') });
  };
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-xs font-medium text-[#cfe0f0] mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-[#67c8f3]" /> Pregúntale al analista</div>
      {conversacion.length > 0 && (
        <div className="space-y-2 mb-3 max-h-96 overflow-y-auto pr-1">
          {conversacion.map((m, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 text-xs whitespace-pre-line ${m.rol === 'dueno' ? 'bg-[#1a3050] text-white ml-8' : 'bg-white/[0.04] text-[#cfe0f0] mr-8'}`}>
              {m.texto}
              {m.cambios_creados > 0 && <div className="mt-1 text-[11px] text-[#67c8f3]">→ Dejó {m.cambios_creados} cambio(s) en «Cambios» para que los apruebes.</div>}
            </div>
          ))}
        </div>
      )}
      {!conversacion.length && (a.plan?.preguntas_sugeridas || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {a.plan.preguntas_sugeridas.map((q) => (
            <button key={q} type="button" disabled={preguntar.isPending} onClick={() => enviar(q)} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-[#9aafc3] hover:text-white text-left">{q}</button>
          ))}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <input className={inputClass} placeholder="Ej: ¿por qué bajaron los clics? ¿qué hago con las búsquedas de precio?" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={800} />
        <button type="submit" className={btnPrimary} disabled={preguntar.isPending || !texto.trim()} aria-label="Enviar pregunta">
          {preguntar.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      {preguntar.error && <div className="mt-2"><ErrorBox error={preguntar.error} /></div>}
    </div>
  );
}
