// Vistas de solo lectura del panel Herramientas Google: Resumen, Google Ads,
// Palabras y búsquedas, Web (GA4) y SEO (Search Console).
import {
  Activity, BarChart3, Clock, Globe2, Megaphone, MousePointerClick, Search, Smartphone, Target, Users,
} from 'lucide-react';
import { useCrearCambio, useOcultarAviso } from '../../hooks/google';
import { BarrasH, BarrasTiempo, Hallazgo, Kpi, MapaCalor, Seccion, Tabla, Vacio } from './graficos';
import { clp, dec1, entero, pct, serieDiaria, textos, tr } from './formato';

const DIA_ADS = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };

const errorDe = (x) => (x && !Array.isArray(x) && x.error ? x.error : null);
const arr = (x) => (Array.isArray(x) ? x : []);

// ── Resumen ──────────────────────────────────────────────────────────────────
export function VistaResumen({ p }) {
  const ocultar = useOcultarAviso();
  const a = p.ads.error ? null : p.ads;
  const g = p.ga4?.error ? null : p.ga4;
  const s = p.search_console?.error ? null : p.search_console;
  const t = a?.total;
  const camp = a?.campanas?.[0];
  const valorContacto = p.config.ticket_promedio * p.config.tasa_cierre;
  const clicsMes = camp?.presupuesto && t?.cpc ? (camp.presupuesto * 30.4) / t.cpc : null;
  const conv = t?.clics ? t.conv / t.clics : null;
  const grupos = { alerta: [], mejorar: [], bien: [] };
  for (const h of p.diagnostico || []) grupos[h.nivel]?.push(h);

  return (
    <div className="space-y-4">
      {p.ads.error && <Vacio>Google Ads: {p.ads.error}</Vacio>}
      {t && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <Kpi titulo="Gasto en Ads" valor={clp(t.costo)} detalle={`${t.dias_activos} días con anuncios`} />
          <Kpi titulo="Clics" valor={entero(t.clics)} detalle={`${entero(t.impr)} impresiones`} />
          <Kpi titulo="CTR" valor={pct(t.ctr, 1)} estado={t.impr >= 50 ? (t.ctr >= 0.06 ? 'bien' : t.ctr < 0.03 ? 'mejorar' : undefined) : undefined} detalle="promedio búsqueda 4–6%" />
          <Kpi titulo="CPC promedio" valor={clp(t.cpc)} detalle={camp?.cpc_tope ? `tope ${clp(camp.cpc_tope)}` : tr(camp?.puja)} />
          <Kpi titulo="Contactos (Ads)" valor={dec1(t.conv)} estado={t.clics >= 15 && !t.conv ? 'alerta' : t.conv ? 'bien' : undefined} detalle={t.conv ? `${pct(conv, 1)} de los clics` : 'clic en WhatsApp o llamada'} />
          <Kpi titulo="Costo por contacto" valor={t.costo_conv ? clp(t.costo_conv) : '—'} estado={t.costo_conv ? (t.costo_conv <= p.config.cpa_objetivo ? 'bien' : 'mejorar') : undefined} detalle={`objetivo ${clp(p.config.cpa_objetivo)}`} />
          <Kpi titulo="Te mostraste en" valor={pct(t.cuota)} detalle="de las búsquedas posibles" />
          <Kpi titulo="Perdido por presupuesto" valor={pct(t.perd_presupuesto)} estado={t.perd_presupuesto > 0.3 ? 'mejorar' : undefined} />
          <Kpi titulo="Perdido por ranking" valor={pct(t.perd_ranking)} estado={t.perd_ranking > 0.4 ? 'mejorar' : undefined} />
          <Kpi titulo="Visitas a la web" valor={entero(g?.total.sesiones)} detalle={`${entero(g?.total.usuarios)} personas · ${entero(g?.total.sesiones_ads)} de anuncios`} />
          <Kpi titulo="Contactos en la web" valor={entero(g?.total.contactos)} detalle="todas las fuentes (GA4)" />
          <Kpi titulo="Google gratis (SEO)" valor={entero(s?.total.clics)} detalle={`${entero(s?.total.impr)} apariciones · pos. ${dec1(s?.total.pos)}`} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Seccion titulo="Qué hacer ahora" icon={Target} className="lg:col-span-2" extra="Toca cada punto para ver cómo, por qué y qué esperar">
          <div className="space-y-2">
            {[...grupos.alerta, ...grupos.mejorar].map((h) => (
              <Hallazgo key={h.clave || h.titulo} h={h} onOcultar={(clave, dias) => ocultar.mutate({ clave, dias })} />
            ))}
            {!grupos.alerta.length && !grupos.mejorar.length && <Vacio>Nada urgente. 👌</Vacio>}
          </div>
          {ocultar.error && <div className="text-xs text-[#f3a3a3] mt-2">{ocultar.error.message}</div>}
          {(p.ocultos || []).length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-[#9aafc3] hover:text-white">Avisos ocultos ({p.ocultos.length}): vuelven solos al vencer si el problema sigue</summary>
              <div className="space-y-2 mt-2">
                {p.ocultos.map((h) => <Hallazgo key={h.clave} h={h} onMostrar={(clave) => ocultar.mutate({ clave, dias: 0 })} />)}
              </div>
            </details>
          )}
        </Seccion>
        <Seccion titulo="Lo que va bien" icon={Activity}>
          <div className="space-y-2">
            {grupos.bien.map((h) => <Hallazgo key={h.titulo} h={h} />)}
            {!grupos.bien.length && <Vacio>Aún sin datos suficientes.</Vacio>}
          </div>
        </Seccion>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Clics del anuncio por día" icon={MousePointerClick} extra="últimos 30 días">
          <BarrasTiempo datos={serieDiaria(a?.por_dia, 'fecha', 'clics', 30)} etiqueta="Clics" />
        </Seccion>
        <Seccion titulo="Visitas a la web por día" icon={Users} extra={`últimos ${p.dias} días`}>
          <BarrasTiempo datos={serieDiaria(arr(g?.por_dia), 'date', 'sessions', p.dias)} etiqueta="Visitas" />
        </Seccion>
      </div>

      <Seccion titulo="Qué esperar con la configuración actual" icon={BarChart3} extra="estimación con tus datos y tu configuración">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Kpi titulo="Presupuesto al mes" valor={clp((camp?.presupuesto || 0) * 30.4)} detalle={`${clp(camp?.presupuesto)}/día × 30,4`} />
          <Kpi titulo="Clics al mes" valor={clicsMes ? `~${entero(clicsMes)}` : '—'} detalle={`con CPC ${clp(t?.cpc)}`} />
          <Kpi titulo="Contactos al mes" valor={clicsMes ? `${entero(clicsMes * (conv || 0.05))}` : '—'} detalle={conv ? `a tu tasa real ${pct(conv, 1)}` : 'supuesto 5% de los clics (sin datos aún)'} />
          <Kpi titulo="Valor de un contacto" valor={clp(valorContacto)} detalle={`ticket ${clp(p.config.ticket_promedio)} × cierre ${pct(p.config.tasa_cierre)}`} />
        </div>
      </Seccion>
    </div>
  );
}

// ── Google Ads ───────────────────────────────────────────────────────────────
export function VistaAds({ p }) {
  const a = p.ads;
  if (a.error) return <Vacio>Google Ads: {a.error}</Vacio>;
  const filasEstado = (a.estado || []).slice(2);
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        {a.campanas.map((c) => (
          <Seccion key={c.nombre} titulo={c.nombre} icon={Megaphone} className="md:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi titulo="Estado" valor={tr(c.estado)} />
              <Kpi titulo="Estrategia" valor={tr(c.puja)} />
              <Kpi titulo="Tope de CPC" valor={clp(c.cpc_tope)} />
              <Kpi titulo="Presupuesto diario" valor={clp(c.presupuesto)} detalle={`~${clp(c.presupuesto * 30.4)} al mes`} />
              <Kpi titulo="Primer lugar" valor={pct(a.total.abs_top)} detalle={`parte superior ${pct(a.total.top)}`} />
            </div>
          </Seccion>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Seccion titulo="Impresiones por día" extra="30 días"><BarrasTiempo datos={serieDiaria(a.por_dia, 'fecha', 'impr', 30)} etiqueta="Impresiones" alto={140} /></Seccion>
        <Seccion titulo="Gasto por día" extra="30 días"><BarrasTiempo datos={serieDiaria(a.por_dia, 'fecha', 'costo', 30)} etiqueta="Gasto" formato={clp} alto={140} /></Seccion>
        <Seccion titulo="Contactos por día" extra="30 días"><BarrasTiempo datos={serieDiaria(a.por_dia, 'fecha', 'conv', 30)} etiqueta="Contactos" formato={dec1} alto={140} /></Seccion>
      </div>

      <Seccion titulo="¿Por qué no te mostraste más?" icon={Target} extra="cuota de impresiones de búsqueda, por día">
        <Tabla
          minWidth={560}
          filas={[...a.por_dia].reverse()}
          columnas={[
            { titulo: 'Día', valor: (d) => d.fecha },
            { titulo: 'Impresiones', num: true, valor: (d) => d.impr, render: (d) => entero(d.impr) },
            { titulo: 'Te mostraste', num: true, valor: (d) => d.cuota ?? -1, render: (d) => pct(d.cuota) },
            { titulo: 'Perdido por presupuesto', num: true, valor: (d) => d.perd_presupuesto ?? -1, render: (d) => pct(d.perd_presupuesto) },
            { titulo: 'Perdido por ranking', num: true, valor: (d) => d.perd_ranking ?? -1, render: (d) => pct(d.perd_ranking) },
            { titulo: 'Gasto', num: true, valor: (d) => d.costo, render: (d) => clp(d.costo) },
          ]}
        />
      </Seccion>

      <Seccion titulo="¿A qué hora y qué día se ven los anuncios?" icon={Clock} extra="clics por día de la semana y hora (30 días)">
        <MapaCalor etiqueta="Clics" celdas={a.hora.map((h) => ({ dia: DIA_ADS[h.dia], hora: h.hora, v: h.clics }))} />
        <div className="mt-4"><MapaCalor etiqueta="Impresiones" celdas={a.hora.map((h) => ({ dia: DIA_ADS[h.dia], hora: h.hora, v: h.impr }))} /></div>
      </Seccion>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Seccion titulo="Dispositivo" icon={Smartphone}><BarrasH filas={a.dispositivos.map((d) => ({ etiqueta: tr(d.clave), v: d.clics, detalle: `${entero(d.impr)} impr.` }))} /></Seccion>
        <Seccion titulo="Dónde hicieron clic" icon={MousePointerClick}><BarrasH filas={a.tipo_clic.map((d) => ({ etiqueta: tr(d.clave), v: d.clics }))} /></Seccion>
        <Seccion titulo="Edad" icon={Users}><BarrasH filas={a.edad.map((d) => ({ etiqueta: tr(d.clave), v: d.impr, detalle: `${entero(d.clics)} clics` }))} /></Seccion>
        <Seccion titulo="Género" icon={Users}><BarrasH filas={a.genero.map((d) => ({ etiqueta: tr(d.clave), v: d.impr, detalle: `${entero(d.clics)} clics` }))} /></Seccion>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Seccion titulo="Regiones" icon={Globe2} extra="impresiones"><BarrasH filas={a.regiones.map((d) => ({ etiqueta: d.clave, v: d.impr, detalle: `${entero(d.clics)} clics · ${clp(d.costo)}` }))} /></Seccion>
        <Seccion titulo="Ciudades" icon={Globe2} extra="impresiones"><BarrasH filas={a.ciudades.filter((c) => c.clave !== '—').map((d) => ({ etiqueta: d.clave, v: d.impr, detalle: `${entero(d.clics)} clics` }))} /></Seccion>
      </div>

      <Seccion titulo="Anuncios" icon={Megaphone}>
        {a.anuncios.length ? a.anuncios.map((ad) => (
          <div key={ad.id} className="mb-4 last:mb-0">
            <div className="flex flex-wrap gap-3 text-xs text-[#9aafc3] mb-2">
              <span>Grupo: <b className="text-white">{ad.grupo}</b></span>
              <span>Fuerza: <b className="text-white">{tr(ad.fuerza)}</b></span>
              <span>{tr(ad.aprobacion)}</span>
              <span>{entero(ad.impr)} impr. · {entero(ad.clics)} clics · {clp(ad.costo)}</span>
              <span className="truncate">→ {textos(ad.url).join(', ')}</span>
            </div>
          </div>
        )) : <Vacio />}
        <Tabla
          minWidth={560}
          filas={a.titulos}
          vacio="Aún sin datos de rendimiento por título (aparecen tras ~1 semana de impresiones)."
          columnas={[
            { titulo: 'Tipo', valor: (x) => tr(x.tipo) },
            { titulo: 'Texto', valor: (x) => x.texto },
            { titulo: 'Rendimiento', valor: (x) => tr(x.rendimiento) },
            { titulo: 'Impr.', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
          ]}
        />
      </Seccion>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Recursos (enlaces, textos destacados, llamada)" icon={Megaphone}>
          <Tabla minWidth={420} filas={a.recursos} columnas={[
            { titulo: 'Tipo', valor: (x) => tr(x.tipo) },
            { titulo: 'Texto', valor: (x) => x.texto || '—' },
            { titulo: 'Nivel', valor: (x) => x.nivel },
            { titulo: 'Impr.', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
          ]} />
        </Seccion>
        <Seccion titulo="Páginas de destino" icon={Globe2}>
          <Tabla minWidth={420} filas={a.paginas_destino} columnas={[
            { titulo: 'URL', valor: (x) => String(x.url || '').replace('https://www.nexcommit.com', '') || '/' },
            { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
            { titulo: 'Contactos', num: true, valor: (x) => x.conv, render: (x) => dec1(x.conv) },
            { titulo: 'Apta celular', num: true, valor: (x) => x.movil_ok ?? -1, render: (x) => pct(x.movil_ok) },
          ]} />
        </Seccion>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Medición de conversiones" icon={Target}>
          <Tabla minWidth={420} filas={a.acciones_conversion} columnas={[
            { titulo: 'Acción', valor: (x) => x.nombre },
            { titulo: 'Estado', valor: (x) => tr(x.estado) },
            { titulo: 'Principal', valor: (x) => (x.principal ? 'Sí' : 'No') },
            { titulo: 'Contadas', num: true, valor: (x) => a.conversiones[x.nombre] || 0, render: (x) => dec1(a.conversiones[x.nombre] || 0) },
          ]} />
        </Seccion>
        <Seccion titulo="Historial de cambios en la cuenta" icon={Clock} extra="14 días">
          <Tabla minWidth={420} limite={30} filas={a.historial} vacio="Sin cambios en los últimos 14 días." columnas={[
            { titulo: 'Cuándo', valor: (x) => String(x.fecha).slice(0, 16) },
            { titulo: 'Qué', valor: (x) => `${x.operacion} · ${x.recurso}` },
            { titulo: 'Quién', valor: (x) => x.quien || x.desde },
          ]} />
        </Seccion>
      </div>

      <Seccion titulo="Estado de la exportación diaria (script de Google Ads)" icon={Activity} extra={String(a.estado?.[0]?.[0] || '')}>
        <div className="flex flex-wrap gap-2 text-xs">
          {filasEstado.map(([n, r, f]) => (
            <span key={n} className={`rounded px-2 py-1 border ${String(r).startsWith('ok') ? 'border-white/10 text-[#9aafc3]' : 'border-[#d03b3b]/40 text-[#f3a3a3]'}`}>{n}: {String(r).startsWith('ok') ? `${f} filas` : r}</span>
          ))}
        </div>
      </Seccion>
    </div>
  );
}

// ── Palabras y búsquedas ─────────────────────────────────────────────────────
export function VistaPalabras({ p, irACambios }) {
  const a = p.ads;
  const crear = useCrearCambio();
  if (a.error) return <Vacio>Google Ads: {a.error}</Vacio>;
  const campana = a.campanas[0]?.nombre;
  const proponer = async (tipo, datos, motivo) => {
    await crear.mutateAsync({ tipo, datos: { campana, ...datos }, motivo });
    irACambios();
  };
  const btn = 'text-[11px] rounded border border-white/15 px-2 py-0.5 text-[#9aafc3] hover:text-white hover:border-white/30 whitespace-nowrap';
  return (
    <div className="space-y-4">
      <Seccion titulo="Palabras clave" icon={Target} extra="30 días · el nivel de calidad aparece con suficientes impresiones">
        <Tabla
          buscar={(x) => x.texto}
          minWidth={980}
          filas={a.palabras}
          columnas={[
            { titulo: 'Palabra', valor: (x) => x.texto },
            { titulo: 'Concord.', valor: (x) => tr(x.concordancia) },
            { titulo: 'Estado', valor: (x) => `${tr(x.estado)}${x.servicio && x.servicio !== 'ELIGIBLE' ? ` · ${tr(x.servicio)}` : ''}` },
            { titulo: 'QS', num: true, valor: (x) => x.qs ?? -1, render: (x) => x.qs ?? '—' },
            { titulo: 'Anuncio · Landing · CTR esp.', valor: (x) => [x.qs_anuncio, x.qs_landing, x.qs_ctr].map(tr).join(' · '), render: (x) => <span className="text-[11px]">{[x.qs_anuncio, x.qs_landing, x.qs_ctr].map(tr).join(' · ')}</span> },
            { titulo: 'Impr.', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
            { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
            { titulo: 'CTR', num: true, valor: (x) => x.ctr, render: (x) => pct(x.ctr, 1) },
            { titulo: 'CPC', num: true, valor: (x) => x.cpc, render: (x) => clp(x.cpc) },
            { titulo: 'Gasto', num: true, valor: (x) => x.costo, render: (x) => clp(x.costo) },
            { titulo: 'Contactos', num: true, valor: (x) => x.conv, render: (x) => dec1(x.conv) },
            { titulo: '', sinOrden: true, valor: () => '', render: (x) => (x.estado === 'PAUSED'
              ? <button type="button" className={btn} onClick={() => proponer('activar_palabra', { texto: x.texto, concordancia: x.concordancia, grupo: x.grupo }, 'Propuesto desde la tabla de palabras.')}>Proponer activar</button>
              : <button type="button" className={btn} onClick={() => proponer('pausar_palabra', { texto: x.texto, concordancia: x.concordancia, grupo: x.grupo }, `${x.impr} impr., ${x.clics} clics, ${clp(x.costo)} sin contactos.`)}>Proponer pausar</button>) },
          ]}
        />
      </Seccion>

      <Seccion titulo="Lo que la gente buscó de verdad" icon={Search} extra="términos de búsqueda · 30 días">
        <Tabla
          buscar={(x) => x.termino}
          minWidth={900}
          filas={a.terminos}
          columnas={[
            { titulo: 'Búsqueda', valor: (x) => x.termino },
            { titulo: 'Activada por', valor: (x) => x.palabras.join(', ') },
            { titulo: 'Impr.', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
            { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
            { titulo: 'Gasto', num: true, valor: (x) => x.costo, render: (x) => clp(x.costo) },
            { titulo: 'Contactos', num: true, valor: (x) => x.conv, render: (x) => dec1(x.conv) },
            { titulo: '', sinOrden: true, valor: () => '', render: (x) => (
              <div className="flex gap-1">
                <button type="button" className={btn} onClick={() => proponer('negativa', { texto: x.termino, concordancia: 'PHRASE' }, `Búsqueda sin intención de compra (${clp(x.costo)}).`)}>Negativa</button>
                <button type="button" className={btn} onClick={() => proponer('palabra_nueva', { texto: x.termino, concordancia: 'PHRASE', grupo: x.grupo }, `Búsqueda real con ${x.clics} clics.`)}>Palabra</button>
              </div>
            ) },
          ]}
        />
        {crear.error && <div className="text-xs text-[#f3a3a3] mt-2">{crear.error.message}</div>}
        <p className="text-[11px] text-[#5f7891] mt-2">Los botones crean una propuesta en <b>Cambios</b>: ahí la revisas, editas y apruebas. Nada se aplica sin aprobar.</p>
      </Seccion>

      <Seccion titulo={`Palabras negativas (${a.negativas.length})`} icon={Search}>
        {a.negativas.length ? (
          <div className="flex flex-wrap gap-1.5">
            {a.negativas.map((n) => <span key={`${n.texto}${n.concordancia}`} className="rounded bg-white/5 px-2 py-0.5 text-xs text-[#cfe0f0]">{n.concordancia === 'PHRASE' ? `"${n.texto}"` : n.concordancia === 'EXACT' ? `[${n.texto}]` : n.texto}</span>)}
          </div>
        ) : <Vacio>Aparecen cuando el script de Ads v2 corra (pestaña "negativas").</Vacio>}
      </Seccion>
    </div>
  );
}

// ── Web (Google Analytics 4) ─────────────────────────────────────────────────
export function VistaWeb({ p }) {
  const g = p.ga4;
  if (g?.error) return <Vacio>Google Analytics: {g.error}</Vacio>;
  const eventosClave = ['generate_lead', 'click_whatsapp', 'click_call', 'cta_click', 'creador_contacto', 'scroll', 'click'];
  const nombreEvento = { generate_lead: 'Contacto (WhatsApp o llamada)', click_whatsapp: 'Clic en WhatsApp', click_call: 'Clic en Llamar', cta_click: 'Clic en botones de navegación', scroll: 'Bajó hasta el 90%', click: 'Clic a otro sitio', page_view: 'Páginas vistas', session_start: 'Visitas', first_visit: 'Primera visita', user_engagement: 'Interacción' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi titulo="Personas" valor={entero(g.total.usuarios)} />
        <Kpi titulo="Visitas" valor={entero(g.total.sesiones)} />
        <Kpi titulo="Contactos" valor={entero(g.total.contactos)} />
        <Kpi titulo="Visitas desde anuncios" valor={entero(g.total.sesiones_ads)} detalle={p.ads.total ? `de ${entero(p.ads.total.clics)} clics pagados` : ''} />
      </div>
      <Seccion titulo="Visitas por día" icon={Users} extra={`${p.dias} días`}>
        <BarrasTiempo datos={serieDiaria(arr(g.por_dia), 'date', 'sessions', p.dias)} etiqueta="Visitas" />
      </Seccion>
      <Seccion titulo="¿Cuándo entra la gente a la web?" icon={Clock} extra="visitas por día de la semana y hora (hora de Chile)">
        <MapaCalor etiqueta="Visitas" celdas={arr(g.hora).map((h) => ({ dia: (Number(h.dayOfWeek) + 6) % 7, hora: Number(h.hour), v: h.sessions }))} />
      </Seccion>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="De dónde llegan" icon={Globe2}>
          <Tabla minWidth={420} filas={arr(g.fuentes)} columnas={[
            { titulo: 'Fuente / medio', valor: (x) => x.sessionSourceMedium },
            { titulo: 'Visitas', num: true, valor: (x) => x.sessions, render: (x) => entero(x.sessions) },
            { titulo: 'Contactos', num: true, valor: (x) => x.keyEvents, render: (x) => entero(x.keyEvents) },
            { titulo: 'Interacción', num: true, valor: (x) => x.engagementRate, render: (x) => pct(x.engagementRate) },
          ]} />
        </Seccion>
        <Seccion titulo="Desde qué botón escriben" icon={MousePointerClick}>
          {errorDe(g.botones) ? (
            <div className="text-xs text-[#f5d58a] space-y-1">
              <p>Falta registrar el parámetro <b>placement</b> en Analytics (una vez):</p>
              <p>Administrar → Visualización de datos → <b>Definiciones personalizadas</b> → Crear dimensión personalizada → Nombre <b>Botón</b>, Alcance <b>Evento</b>, Parámetro <b>placement</b> → Guardar.</p>
              <p className="text-[#9aafc3]">Aparece desde el día siguiente.</p>
            </div>
          ) : <BarrasH filas={arr(g.botones).map((b) => ({ etiqueta: b['customEvent:placement'], v: b.eventCount }))} />}
        </Seccion>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Páginas de entrada" icon={Globe2}>
          <Tabla minWidth={420} filas={arr(g.landing)} columnas={[
            { titulo: 'Página', valor: (x) => x.landingPage || '(no definida)' },
            { titulo: 'Visitas', num: true, valor: (x) => x.sessions, render: (x) => entero(x.sessions) },
            { titulo: 'Contactos', num: true, valor: (x) => x.keyEvents, render: (x) => entero(x.keyEvents) },
            { titulo: 'Rebote', num: true, valor: (x) => x.bounceRate, render: (x) => pct(x.bounceRate) },
          ]} />
        </Seccion>
        <Seccion titulo="Páginas más vistas" icon={BarChart3}>
          <Tabla minWidth={420} filas={arr(g.paginas)} columnas={[
            { titulo: 'Página', valor: (x) => x.pagePath },
            { titulo: 'Vistas', num: true, valor: (x) => x.screenPageViews, render: (x) => entero(x.screenPageViews) },
            { titulo: 'Tiempo prom.', num: true, valor: (x) => x.userEngagementDuration / Math.max(x.activeUsers, 1), render: (x) => `${Math.round(x.userEngagementDuration / Math.max(x.activeUsers, 1))} s` },
          ]} />
        </Seccion>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Seccion titulo="Lo que hacen en la web" icon={Activity}>
          <BarrasH filas={arr(g.eventos).filter((e) => eventosClave.includes(e.eventName) || ['page_view', 'session_start'].includes(e.eventName)).map((e) => ({ etiqueta: nombreEvento[e.eventName] || e.eventName, v: e.eventCount }))} />
        </Seccion>
        <Seccion titulo="Dispositivo" icon={Smartphone}><BarrasH filas={arr(g.dispositivos).map((d) => ({ etiqueta: { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet' }[d.deviceCategory] || d.deviceCategory, v: d.sessions }))} /></Seccion>
        <Seccion titulo="Ciudad" icon={Globe2}><BarrasH filas={arr(g.ciudades).map((d) => ({ etiqueta: d.city === '(not set)' ? 'Desconocida' : d.city, v: d.sessions }))} /></Seccion>
        <Seccion titulo="Nuevas vs. que vuelven" icon={Users}><BarrasH filas={arr(g.nuevos).map((d) => ({ etiqueta: { new: 'Nuevas', returning: 'Vuelven' }[d.newVsReturning] || 'Sin dato', v: d.sessions }))} /></Seccion>
      </div>
      {arr(g.palabras_ads).length > 0 && (
        <Seccion titulo="Qué palabra del anuncio trajo cada visita" icon={Target}>
          <Tabla minWidth={420} filas={arr(g.palabras_ads)} columnas={[
            { titulo: 'Palabra clave', valor: (x) => x.sessionGoogleAdsKeyword },
            { titulo: 'Visitas', num: true, valor: (x) => x.sessions, render: (x) => entero(x.sessions) },
            { titulo: 'Contactos', num: true, valor: (x) => x.keyEvents, render: (x) => entero(x.keyEvents) },
            { titulo: 'Interacción', num: true, valor: (x) => x.engagementRate, render: (x) => pct(x.engagementRate) },
          ]} />
        </Seccion>
      )}
    </div>
  );
}

// ── SEO (Search Console) ─────────────────────────────────────────────────────
export function VistaSeo({ p }) {
  const s = p.search_console;
  if (s?.error) return <Vacio>Search Console: {s.error}</Vacio>;
  const corta = (u) => String(u).replace(/^https?:\/\/(www\.)?nexcommit\.com/, '') || '/';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi titulo="Clics gratis desde Google" valor={entero(s.total.clics)} />
        <Kpi titulo="Apariciones" valor={entero(s.total.impr)} />
        <Kpi titulo="CTR" valor={pct(s.total.ctr, 1)} />
        <Kpi titulo="Posición promedio" valor={dec1(s.total.pos)} detalle="1 = primer resultado" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Apariciones por día" icon={Search} extra="Search Console tarda 2–3 días"><BarrasTiempo datos={serieDiaria(arr(s.por_dia).map((r) => ({ d: r.keys[0], v: r.impr })), 'd', 'v', p.dias)} etiqueta="Apariciones" alto={140} /></Seccion>
        <Seccion titulo="Clics por día" icon={MousePointerClick}><BarrasTiempo datos={serieDiaria(arr(s.por_dia).map((r) => ({ d: r.keys[0], v: r.clics })), 'd', 'v', p.dias)} etiqueta="Clics" alto={140} /></Seccion>
      </div>
      <Seccion titulo="Con qué búsquedas apareces gratis" icon={Search}>
        <Tabla buscar={(x) => x.keys[0]} minWidth={560} filas={arr(s.consultas)} vacio="Google aún no muestra consultas (pocas apariciones o anonimizadas)." columnas={[
          { titulo: 'Búsqueda', valor: (x) => x.keys[0] },
          { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
          { titulo: 'Apariciones', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
          { titulo: 'Posición', num: true, valor: (x) => x.pos, render: (x) => dec1(x.pos) },
        ]} />
      </Seccion>
      <Seccion titulo="Páginas en Google" icon={Globe2} extra="posición 4–15 = cerca de la primera página: oportunidad">
        <Tabla minWidth={560} filas={arr(s.paginas)} columnas={[
          { titulo: 'Página', valor: (x) => corta(x.keys[0]) },
          { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
          { titulo: 'Apariciones', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
          { titulo: 'Posición', num: true, valor: (x) => x.pos, render: (x) => dec1(x.pos) },
        ]} />
      </Seccion>
    </div>
  );
}
