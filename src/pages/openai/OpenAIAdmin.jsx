// Panel → OpenAI: todo el gasto de OpenAI en un solo lugar (chats de los
// clientes de Agente-Next + Creador de páginas). Los datos los arma el backend
// de Agente-Next (GET /nexcommit/openai/panel), que cruza tres fuentes:
//   - la factura real de OpenAI (Costs API) y los tokens por API key (Usage API)
//   - nuestro registro de los chats (tabla trazas, Supabase de Agente-Next)
//   - nuestro registro del Creador (creador_consumo, Supabase de NexCommit)
// Solo los dueños: el backend responde 403 al resto.
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bot, Coins, KeyRound, MessagesSquare, Receipt, Save, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { CREADOR_API } from '../../config/creador';
import { ErrorBox, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const API = CREADOR_API.replace(/\/creador$/, '');

// Paleta validada (scripts/validate_palette.js, modo oscuro sobre #0d1e30).
const COLOR = { chats: '#3987e5', creador: '#c98500', factura: '#cfe0f0' };

const TIPOS_CHAT = {
  llm: 'Conversación',
  embedding: 'Búsqueda en documentos',
  audio: 'Audios',
  vision: 'Imágenes',
  documento: 'Documentos (PDF)',
};
const TIPOS_CREADOR = { generacion: 'Crear página', edicion: 'Edición por chat', descartada: 'Descartada (se pagó, no se guardó)' };
const ORIGEN = { chats: 'Chats', creador: 'Creador', otra: 'Otra key' };

const fmtTokens = (n) => Math.round(Number(n) || 0).toLocaleString('es-CL');
const fmtUsd = (n) => {
  const v = Number(n) || 0;
  const dec = v > 0 && v < 1 ? 4 : 2;
  return `US$ ${v.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};
const fmtClp = (usd, tasa) => {
  const v = (Number(usd) || 0) * tasa;
  return `$${v.toLocaleString('es-CL', { maximumFractionDigits: v > 0 && v < 10 ? 1 : 0 })}`;
};
const diaCorto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// ─── Rango ───────────────────────────────────────────────────────────────────
const inicioDiaUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const RANGOS = [
  { id: 'hoy', label: 'Hoy', calc: (a) => [inicioDiaUTC(a), a] },
  { id: '7d', label: '7 días', calc: (a) => [new Date(inicioDiaUTC(a).getTime() - 6 * 864e5), a] },
  { id: 'mes', label: 'Este mes', calc: (a) => [new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1)), a] },
  {
    id: 'mes_ant',
    label: 'Mes anterior',
    calc: (a) => [new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1)), new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1))],
  },
  { id: '30d', label: '30 días', calc: (a) => [new Date(inicioDiaUTC(a).getTime() - 29 * 864e5), a] },
  { id: '90d', label: '90 días', calc: (a) => [new Date(inicioDiaUTC(a).getTime() - 89 * 864e5), a] },
];

function usePanel(rangoId) {
  return useQuery({
    queryKey: ['openai-panel', rangoId],
    queryFn: async () => {
      const [desde, hasta] = RANGOS.find((r) => r.id === rangoId).calc(new Date());
      const { data: { session } } = await supabase.auth.getSession();
      const qs = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() });
      const res = await fetch(`${API}/nexcommit/openai/panel?${qs}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.error || `El servidor respondió ${res.status}`);
      return cuerpo;
    },
    refetchInterval: 5 * 60_000,
  });
}

// ─── Piezas ──────────────────────────────────────────────────────────────────
function Titulo({ icon, color = '#67c8f3', children, extra }) {
  const Icon = icon;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <h3 className="text-white font-medium flex items-center gap-2"><Icon className="w-4 h-4" style={{ color }} /> {children}</h3>
      {extra && <span className="text-[11px] text-[#5f7891]">{extra}</span>}
    </div>
  );
}

function Aviso({ children }) {
  return (
    <div className="flex gap-2 rounded-lg border border-[#fbbf24]/30 bg-[#fbbf24]/5 px-3 py-2 text-xs text-[#f5d58a]">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Tile({ titulo, usd, tasa, detalle, marca }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <div className="text-xs text-[#9aafc3] flex items-center gap-1.5">
        {marca && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: marca }} />}
        {titulo}
      </div>
      {usd == null ? (
        <div className="text-[#5f7891] text-xl font-semibold mt-1">—</div>
      ) : (
        <>
          <div className="text-white text-xl font-semibold mt-1">{fmtUsd(usd)}</div>
          <div className="text-[11px] text-[#9aafc3] mt-0.5">≈ {fmtClp(usd, tasa)} CLP</div>
        </>
      )}
      {detalle && <div className="text-[11px] text-[#5f7891] mt-1">{detalle}</div>}
    </div>
  );
}

function Tabla({ columnas, filas, vacio = 'Sin datos en este período.', minWidth = 640 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="text-left text-xs text-[#9aafc3]">
            {columnas.map((c) => (
              <th key={c.titulo} className={`px-3 py-2 font-medium whitespace-nowrap ${c.num ? 'text-right' : ''}`}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-white/5">
              {columnas.map((c) => (
                <td key={c.titulo} className={`px-3 py-2 ${c.num ? 'text-right tabular-nums whitespace-nowrap text-[#cfe0f0]' : 'text-[#cfe0f0]'}`}>{c.valor(f)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <p className="text-sm text-[#5f7891] text-center py-6">{vacio}</p>}
    </div>
  );
}

// ─── Gráfico diario: barras apiladas (estimado) + línea (factura real) ───────
function diasDelRango(desde, hasta) {
  const out = [];
  for (let t = inicioDiaUTC(new Date(desde)).getTime(); t < new Date(hasta).getTime(); t += 864e5) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function GraficoDiario({ data, tasa }) {
  const [activo, setActivo] = useState(null);
  const conFactura = Boolean(data.openai?.factura?.por_dia);
  const dias = useMemo(() => {
    const m = (arr) => new Map((arr || []).map((d) => [d.dia, d.usd]));
    const chats = m(data.chats?.por_dia);
    const creador = m(data.creador?.por_dia);
    const factura = m(data.openai?.factura?.por_dia);
    return diasDelRango(data.desde, data.hasta).map((dia) => ({
      dia,
      chats: chats.get(dia) || 0,
      creador: creador.get(dia) || 0,
      factura: conFactura ? factura.get(dia) || 0 : null,
    }));
  }, [data, conFactura]);

  if (dias.length < 2) return null;

  const W = 800;
  const H = 220;
  const pad = { l: 56, r: 12, t: 12, b: 26 };
  const max = Math.max(...dias.map((d) => Math.max(d.chats + d.creador, d.factura || 0)), 0.0001);
  const tope = max * 1.1;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / tope);
  const banda = (W - pad.l - pad.r) / dias.length;
  const ancho = Math.max(Math.min(banda * 0.62, 28), 2);
  const x = (i) => pad.l + banda * i + banda / 2;
  const cadaN = Math.ceil(dias.length / 10);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => tope * p);
  const d = activo != null ? dias[activo] : null;

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-[#cfe0f0] mb-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR.chats }} /> Chats (estimado)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR.creador }} /> Creador (estimado)</span>
        {conFactura && (
          <span className="flex items-center gap-1.5">
            <svg width="22" height="10" aria-hidden="true"><line x1="0" y1="5" x2="22" y2="5" stroke={COLOR.factura} strokeWidth="2" strokeDasharray="4 3" /><circle cx="11" cy="5" r="3.5" fill={COLOR.factura} /></svg>
            Facturado por OpenAI
          </span>
        )}
      </div>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[560px]" role="img" aria-label="Gasto diario de OpenAI en dólares: chats y creador estimados, y lo facturado por OpenAI">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" />
              <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#5f7891">{v === 0 ? '0' : `$${v.toLocaleString('es-CL', { maximumFractionDigits: v < 1 ? 3 : 2 })}`}</text>
            </g>
          ))}
          {dias.map((dd, i) => {
            const hChats = y(0) - y(dd.chats);
            const hCreador = y(0) - y(dd.creador);
            const gap = hChats > 0 && hCreador > 0 ? 2 : 0;
            return (
              <g key={dd.dia} opacity={activo == null || activo === i ? 1 : 0.45}>
                {hChats > 0 && <rect x={x(i) - ancho / 2} y={y(dd.chats)} width={ancho} height={hChats} rx={Math.min(3, ancho / 2)} fill={COLOR.chats} />}
                {hCreador > 0 && (
                  <rect x={x(i) - ancho / 2} y={y(dd.chats + dd.creador)} width={ancho} height={Math.max(hCreador - gap, 1)} rx={Math.min(3, ancho / 2)} fill={COLOR.creador} />
                )}
                {i % cadaN === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#5f7891">{diaCorto(dd.dia)}</text>}
              </g>
            );
          })}
          {conFactura && (
            <>
              <polyline
                points={dias.map((dd, i) => `${x(i)},${y(dd.factura)}`).join(' ')}
                fill="none"
                stroke={COLOR.factura}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              {dias.map((dd, i) => (
                <circle key={dd.dia} cx={x(i)} cy={y(dd.factura)} r={activo === i ? 5 : 3.5} fill={COLOR.factura} stroke="#0d1e30" strokeWidth="2" />
              ))}
            </>
          )}
          {/* Zonas de hover más anchas que la barra. */}
          {dias.map((dd, i) => (
            <rect
              key={dd.dia}
              x={pad.l + banda * i}
              y={pad.t}
              width={banda}
              height={H - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onClick={() => setActivo(i)}
            />
          ))}
        </svg>
        {d && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-white/15 bg-[#071b31] px-3 py-2 text-xs shadow-xl"
            style={{ left: `${(x(activo) / W) * 100}%`, transform: `translateX(${activo > dias.length / 2 ? '-105%' : '5%'})` }}
          >
            <div className="text-white font-medium mb-1">{diaCorto(d.dia)}</div>
            <div className="text-[#cfe0f0]">Chats: {fmtUsd(d.chats)}</div>
            <div className="text-[#cfe0f0]">Creador: {fmtUsd(d.creador)}</div>
            {d.factura != null && <div className="text-[#cfe0f0]">Facturado: {fmtUsd(d.factura)}</div>}
            <div className="text-[#5f7891] mt-1">≈ {fmtClp(d.factura ?? d.chats + d.creador, tasa)} CLP</div>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-[#9aafc3] hover:text-white">Ver como tabla</summary>
        <Tabla
          minWidth={420}
          columnas={[
            { titulo: 'Día', valor: (f) => diaCorto(f.dia) },
            { titulo: 'Chats', num: true, valor: (f) => fmtUsd(f.chats) },
            { titulo: 'Creador', num: true, valor: (f) => fmtUsd(f.creador) },
            ...(conFactura ? [{ titulo: 'Facturado', num: true, valor: (f) => fmtUsd(f.factura) }] : []),
          ]}
          filas={dias}
        />
      </details>
    </div>
  );
}

// ─── Tipo de cambio (vive en creador_config.usd_clp) ─────────────────────────
function TipoCambio({ tasa }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(tasa);
  const guardar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('creador_config').update({ usd_clp: Number(valor) }).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['openai-panel'] }),
  });
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className={labelClass}>Dólar (CLP)</label>
        <input type="number" min={1} max={99999} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className={`${inputClass} !w-28 !py-1.5`} />
      </div>
      <button type="button" className={`${btnPrimary} !py-1.5`} onClick={() => guardar.mutate()} disabled={guardar.isPending || Number(valor) === tasa}>
        <Save className="w-4 h-4" /> Guardar
      </button>
      <ErrorBox error={guardar.error} />
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function OpenAIAdmin() {
  const [rangoId, setRangoId] = useState('mes');
  const { data, isLoading, error, isFetching } = usePanel(rangoId);
  const tasa = data?.usd_clp || 950;

  const resumen = useMemo(() => {
    if (!data) return null;
    const chats = data.chats?.total?.costo_usd ?? null;
    const creador = data.creador?.total?.costo_usd ?? null;
    const factura = data.openai?.factura?.total_usd ?? null;
    const estimado = (chats || 0) + (creador || 0);
    return { chats, creador, factura, estimado, diferencia: factura != null ? factura - estimado : null };
  }, [data]);

  const keys = useMemo(() => (Array.isArray(data?.openai?.keys) ? data.openai.keys : []), [data]);
  const keysPorOrigen = useMemo(() => {
    const acc = {};
    for (const k of keys) {
      const o = (acc[k.origen] ||= { tokens_in: 0, tokens_out: 0, tokens_cache: 0, solicitudes: 0 });
      o.tokens_in += k.tokens_in;
      o.tokens_out += k.tokens_out;
      o.tokens_cache += k.tokens_cache;
      o.solicitudes += k.solicitudes;
    }
    return acc;
  }, [keys]);

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-white font-medium flex items-center gap-2"><Bot className="w-4 h-4 text-[#67c8f3]" /> OpenAI</h2>
          <p className="text-sm text-[#9aafc3] max-w-3xl">
            Todo el gasto de OpenAI: los chats de los clientes de Agente-Next y el Creador de páginas. «Facturado» es lo que cobra
            OpenAI; «estimado» es nuestro registro de cada llamada (tokens × tarifa). Días en hora UTC.
          </p>
        </div>
        {data && <TipoCambio key={tasa} tasa={tasa} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRangoId(r.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${rangoId === r.id ? 'border-[#67c8f3] text-white bg-[#1a3050]' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}
          >
            {r.label}
          </button>
        ))}
        {isFetching && <span className="text-xs text-[#5f7891]">Actualizando…</span>}
      </div>

      <ErrorBox error={error} />
      {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}

      {data && (
        <>
          {!data.openai?.configurado && (
            <Aviso>
              Falta la <b>Admin key</b> de OpenAI (<code>OPENAI_ADMIN_KEY</code> en el backend): por ahora solo se ve nuestro estimado, no lo que OpenAI factura.
            </Aviso>
          )}
          {data.openai?.factura?.error && <Aviso>No se pudo leer la factura de OpenAI: {data.openai.factura.error}</Aviso>}
          {data.openai?.keys?.error && <Aviso>No se pudo leer el uso por API key: {data.openai.keys.error}</Aviso>}
          {!data.creador_con_key_propia && (
            <Aviso>
              El Creador todavía usa la misma key que los chats (<code>OPENAI_API_KEY_CREADOR</code> sin cargar): en «Tokens reales por API key» aparece todo junto.
            </Aviso>
          )}
          {data.chats?.error && <Aviso>{data.chats.error}</Aviso>}
          {data.creador?.error && <Aviso>{data.creador.error}</Aviso>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile titulo="Facturado por OpenAI" usd={resumen.factura} tasa={tasa} detalle={resumen.factura == null ? 'Requiere Admin key' : 'Costs API, cifra oficial'} />
            <Tile
              titulo="Chats (estimado)"
              marca={COLOR.chats}
              usd={resumen.chats}
              tasa={tasa}
              detalle={data.chats?.total ? `${fmtTokens(data.chats.total.conversaciones)} conversaciones · ${fmtTokens(data.chats.total.solicitudes)} llamadas` : null}
            />
            <Tile
              titulo="Creador (estimado)"
              marca={COLOR.creador}
              usd={resumen.creador}
              tasa={tasa}
              detalle={data.creador?.total ? `${data.creador.paginas_creadas} páginas · ${fmtTokens(data.creador.total.solicitudes)} llamadas` : null}
            />
            <Tile
              titulo="Sin registrar"
              usd={resumen.diferencia}
              tasa={tasa}
              detalle={resumen.diferencia == null ? 'Facturado − estimado' : 'Facturado − estimado: llamadas que no registramos o tarifas mal cargadas'}
            />
          </div>

          <div className={`${card} p-4 md:p-5`}>
            <Titulo icon={Coins} color="#fbbf24">Gasto por día</Titulo>
            <GraficoDiario data={data} tasa={tasa} />
          </div>

          {data.openai?.configurado && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className={`${card} p-4 md:p-5 lg:col-span-2 min-w-0`}>
                <Titulo icon={KeyRound} extra="Usage API: tokens reales que OpenAI contó en cada key">Tokens reales por API key</Titulo>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {['chats', 'creador', 'otra'].filter((o) => keysPorOrigen[o]).map((o) => (
                    <div key={o} className="rounded-lg border border-white/10 px-3 py-2">
                      <div className="text-xs text-[#9aafc3] flex items-center gap-1.5">
                        {COLOR[o] && <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR[o] }} />}
                        {ORIGEN[o]}
                      </div>
                      <div className="text-white font-semibold mt-0.5">{fmtTokens(keysPorOrigen[o].tokens_in + keysPorOrigen[o].tokens_out)} tokens</div>
                      <div className="text-[11px] text-[#5f7891]">{fmtTokens(keysPorOrigen[o].solicitudes)} solicitudes</div>
                    </div>
                  ))}
                </div>
                <Tabla
                  columnas={[
                    { titulo: 'Key', valor: (f) => <span>{f.nombre} <span className="text-[#5f7891]">· {ORIGEN[f.origen]}</span></span> },
                    { titulo: 'Modelo', valor: (f) => f.modelo || '—' },
                    { titulo: 'Entrada', num: true, valor: (f) => fmtTokens(f.tokens_in) },
                    { titulo: 'En caché', num: true, valor: (f) => fmtTokens(f.tokens_cache) },
                    { titulo: 'Salida', num: true, valor: (f) => (f.tipo === 'audio' ? `${fmtTokens(f.segundos)} s` : fmtTokens(f.tokens_out)) },
                    { titulo: 'Solicitudes', num: true, valor: (f) => fmtTokens(f.solicitudes) },
                  ]}
                  filas={keys}
                />
              </div>
              <div className={`${card} p-4 md:p-5 min-w-0`}>
                <Titulo icon={Receipt}>Factura por concepto</Titulo>
                {(data.openai.factura?.por_linea || []).length === 0 && <p className="text-sm text-[#5f7891]">Sin cargos en este período.</p>}
                <div className="space-y-1.5 text-sm">
                  {(data.openai.factura?.por_linea || []).map((l) => (
                    <div key={l.linea} className="flex justify-between gap-3 text-[#cfe0f0]">
                      <span className="truncate">{l.linea}</span>
                      <span className="shrink-0 tabular-nums">{fmtUsd(l.usd)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data.chats?.total && (
            <div className={`${card} p-4 md:p-5 space-y-4`}>
              <Titulo
                icon={MessagesSquare}
                color={COLOR.chats}
                extra={`Entrada ${fmtTokens(data.chats.total.tokens_in)} (${fmtTokens(data.chats.total.tokens_cache)} en caché) · Salida ${fmtTokens(data.chats.total.tokens_out)}`}
              >
                Chats por cliente
              </Titulo>
              {data.chats.total.sin_tarifa > 0 && (
                <Aviso>{fmtTokens(data.chats.total.sin_tarifa)} llamadas de chats sin tarifa cargada: su costo no está sumado. Cárgala en Agente-Next → Precios.</Aviso>
              )}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {data.chats.por_tipo.map((t) => (
                  <div key={t.tipo} className="rounded-lg border border-white/10 px-3 py-2">
                    <div className="text-xs text-[#9aafc3]">{TIPOS_CHAT[t.tipo] || t.tipo}</div>
                    <div className="text-white font-semibold mt-0.5">{fmtUsd(t.costo_usd)}</div>
                    <div className="text-[11px] text-[#5f7891]">{fmtTokens(t.solicitudes)} llamadas · {fmtTokens(t.tokens_in + t.tokens_out)} tk</div>
                  </div>
                ))}
              </div>
              <Tabla
                minWidth={860}
                columnas={[
                  { titulo: 'Cliente', valor: (f) => <span className="text-white">{f.nombre}</span> },
                  { titulo: 'Total', num: true, valor: (f) => <span className="text-white font-medium">{fmtUsd(f.costo_usd)}</span> },
                  { titulo: 'CLP', num: true, valor: (f) => fmtClp(f.costo_usd, tasa) },
                  { titulo: 'Conversación', num: true, valor: (f) => fmtUsd(f.por_tipo.llm) },
                  { titulo: 'Docs + búsqueda', num: true, valor: (f) => fmtUsd((f.por_tipo.embedding || 0) + (f.por_tipo.documento || 0)) },
                  { titulo: 'Audio + imagen', num: true, valor: (f) => fmtUsd((f.por_tipo.audio || 0) + (f.por_tipo.vision || 0)) },
                  { titulo: 'Conversaciones', num: true, valor: (f) => fmtTokens(f.conversaciones) },
                  { titulo: 'Por conversación', num: true, valor: (f) => (f.conversaciones ? fmtUsd(f.costo_usd / f.conversaciones) : '—') },
                  { titulo: 'Tokens', num: true, valor: (f) => fmtTokens(f.tokens_in + f.tokens_out) },
                ]}
                filas={data.chats.por_empresa}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[#9aafc3] mb-1">Por modelo</div>
                  <Tabla
                    minWidth={360}
                    columnas={[
                      { titulo: 'Modelo', valor: (f) => f.modelo },
                      { titulo: 'Costo', num: true, valor: (f) => fmtUsd(f.costo_usd) },
                      { titulo: 'Tokens', num: true, valor: (f) => fmtTokens(f.tokens_in + f.tokens_out) },
                    ]}
                    filas={data.chats.por_modelo}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#9aafc3] mb-1">Últimas llamadas</div>
                  <Tabla
                    minWidth={360}
                    columnas={[
                      { titulo: 'Hora', valor: (f) => new Date(f.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) },
                      { titulo: 'Cliente', valor: (f) => f.cliente_nombre },
                      { titulo: 'Modelo', valor: (f) => f.modelo },
                      { titulo: 'Costo', num: true, valor: (f) => (f.costo_total_usd == null ? 'sin tarifa' : fmtUsd(f.costo_total_usd)) },
                    ]}
                    filas={data.chats.ultimas}
                  />
                </div>
              </div>
            </div>
          )}

          {data.creador?.total && (
            <div className={`${card} p-4 md:p-5 space-y-4`}>
              <Titulo
                icon={Wand2}
                color={COLOR.creador}
                extra={`Entrada ${fmtTokens(data.creador.total.tokens_in)} (${fmtTokens(data.creador.total.tokens_cache)} en caché) · Salida ${fmtTokens(data.creador.total.tokens_out)}`}
              >
                Creador de páginas
              </Titulo>
              {data.creador.total.sin_tarifa > 0 && (
                <Aviso>{fmtTokens(data.creador.total.sin_tarifa)} llamadas del Creador sin tarifa cargada: su costo no está sumado.</Aviso>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/10 px-3 py-2">
                  <div className="text-xs text-[#9aafc3]">Promedio por página</div>
                  <div className="text-white font-semibold mt-0.5">{fmtUsd(data.creador.promedio_por_pagina_usd)}</div>
                  <div className="text-[11px] text-[#5f7891]">≈ {fmtClp(data.creador.promedio_por_pagina_usd, tasa)} CLP · {data.creador.paginas_creadas} páginas</div>
                </div>
                {data.creador.por_tipo.map((t) => (
                  <div key={t.tipo} className="rounded-lg border border-white/10 px-3 py-2">
                    <div className="text-xs text-[#9aafc3]">{TIPOS_CREADOR[t.tipo] || t.tipo}</div>
                    <div className="text-white font-semibold mt-0.5">{fmtUsd(t.costo_usd)}</div>
                    <div className="text-[11px] text-[#5f7891]">
                      {fmtTokens(t.solicitudes)} llamadas · {fmtUsd(t.solicitudes ? t.costo_usd / t.solicitudes : 0)} c/u
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-[#9aafc3] mb-1">Páginas que más consumen</div>
                <Tabla
                  minWidth={520}
                  columnas={[
                    { titulo: 'Página', valor: (f) => <span>/{f.slug || '—'}{!f.viva && <span className="text-[#5f7891]"> (borrada)</span>}</span> },
                    { titulo: 'Llamadas', num: true, valor: (f) => fmtTokens(f.solicitudes) },
                    { titulo: 'Tokens', num: true, valor: (f) => fmtTokens(f.tokens_in + f.tokens_out) },
                    { titulo: 'Costo', num: true, valor: (f) => fmtUsd(f.costo_usd) },
                    { titulo: 'CLP', num: true, valor: (f) => fmtClp(f.costo_usd, tasa) },
                  ]}
                  filas={data.creador.top_paginas}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
