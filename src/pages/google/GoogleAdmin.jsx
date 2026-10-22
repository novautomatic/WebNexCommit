// /admin?tab=google — Herramientas Google (solo dueños): Google Ads, Analytics 4 y
// Search Console con diagnóstico, cambios con aprobación y análisis con IA.
// Multi-cliente: el cliente activo va en la URL (&cliente=…; sin él, NexCommit).
// Datos: back de Agente-Next /nexcommit/google/:cliente (ver src/hooks/google.js).
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { CLIENTE_DEFECTO, ClienteGoogle, useGooglePanel, useRecargarPanel } from '../../hooks/google';
import { ErrorBox, btnGhost } from '../tareas/ui';
import { VistaAds, VistaPalabras, VistaResumen, VistaSeo, VistaWeb } from './VistasDatos';
import { VistaAnalisis, VistaCambios, VistaConfig } from './VistasGestion';

const PESTANAS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ads', label: 'Google Ads' },
  { id: 'palabras', label: 'Palabras y búsquedas' },
  { id: 'web', label: 'Web (Analytics)' },
  { id: 'seo', label: 'SEO (Search Console)' },
  { id: 'cambios', label: 'Cambios' },
  { id: 'ia', label: 'Análisis con IA' },
  { id: 'config', label: 'Configuración' },
];
const RANGOS = [7, 14, 30, 90];

export default function GoogleAdmin() {
  const [params, setParams] = useSearchParams();
  const cliente = params.get('cliente') || CLIENTE_DEFECTO;
  const elegir = (id) => {
    const n = new URLSearchParams(params);
    if (id === CLIENTE_DEFECTO) n.delete('cliente');
    else n.set('cliente', id);
    setParams(n, { replace: true });
  };
  return (
    <ClienteGoogle.Provider value={cliente}>
      <Panel cliente={cliente} elegir={elegir} />
    </ClienteGoogle.Provider>
  );
}

function Panel({ cliente, elegir }) {
  const [pestana, setPestana] = useState('resumen');
  const [dias, setDias] = useState(30);
  const { data: p, isLoading, error } = useGooglePanel(dias);
  const recargar = useRecargarPanel(dias);
  // La lista de clientes la entrega el back; se recuerda para que el selector no
  // desaparezca mientras carga el cliente siguiente.
  const [clientes, setClientes] = useState([]);
  if (p?.clientes?.length && p.clientes !== clientes) setClientes(p.clientes);
  const porRevisar = (p?.cambios || []).filter((c) => c.estado === 'propuesto').length;
  const irACambios = () => setPestana('cambios');
  const nombre = clientes.find((c) => c.id === cliente)?.nombre;

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-white text-xl font-semibold">Herramientas Google{nombre ? ` · ${nombre}` : ''}</h2>
          <p className="text-xs text-[#9aafc3]">
            Google Ads (se actualiza cada mañana, últimos 30 días) · Analytics y Search Console (rango elegido)
            {p?.generado && ` · leído ${new Date(p.generado).toLocaleTimeString('es-CL', { timeStyle: 'short' })}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clientes.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-[#9aafc3]">
              Cliente
              <select
                id="google-cliente"
                value={cliente}
                onChange={(e) => elegir(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0d1e30] px-2 py-1.5 text-sm text-white"
              >
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
          )}
          <div className="flex rounded-lg border border-white/10 overflow-hidden" role="group" aria-label="Rango de días">
            {RANGOS.map((r) => (
              <button key={r} type="button" onClick={() => setDias(r)} className={`px-3 py-1.5 text-xs ${dias === r ? 'bg-[#1a3050] text-white' : 'text-[#9aafc3] hover:text-white'}`}>{r} días</button>
            ))}
          </div>
          <button type="button" className={btnGhost} disabled={recargar.isPending} onClick={() => recargar.mutate()} title="Volver a leer Google ahora">
            <RefreshCw className={`w-4 h-4 ${recargar.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Secciones de Herramientas Google">
        {PESTANAS.map((t) => (
          <button key={t.id} type="button" onClick={() => setPestana(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${pestana === t.id ? 'border-[#3987e5] text-white' : 'border-transparent text-[#9aafc3] hover:text-white'}`}>
            {t.label}{t.id === 'cambios' && porRevisar > 0 && <span className="ml-1.5 rounded-full bg-[#fab219] px-1.5 text-[10px] font-bold text-[#0a1628]">{porRevisar}</span>}
          </button>
        ))}
      </nav>

      {isLoading && <div className="text-sm text-[#9aafc3] py-10 text-center">Leyendo Google Ads, Analytics y Search Console…</div>}
      {error && <ErrorBox error={error} />}
      {recargar.error && <ErrorBox error={recargar.error} />}
      {p && (
        <>
          {pestana === 'resumen' && <VistaResumen p={p} />}
          {pestana === 'ads' && <VistaAds p={p} />}
          {pestana === 'palabras' && <VistaPalabras p={p} irACambios={irACambios} />}
          {pestana === 'web' && <VistaWeb p={p} />}
          {pestana === 'seo' && <VistaSeo p={p} />}
          {pestana === 'cambios' && <VistaCambios p={p} />}
          {pestana === 'ia' && <VistaAnalisis p={p} dias={dias} irACambios={irACambios} />}
          {pestana === 'config' && <VistaConfig key={`${cliente}:${JSON.stringify(p.config)}`} p={p} />}
        </>
      )}
    </div>
  );
}
