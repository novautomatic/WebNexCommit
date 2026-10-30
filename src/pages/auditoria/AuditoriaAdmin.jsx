// /admin?tab=auditoria-chatbots — Chatbots → Auditoría (solo dueños): lo que se hizo en cada
// chatbot, la auditoría de cada mes, lo que se presenta a la clienta y los pendientes, con
// indicadores en vivo. Datos: back de Agente-Next /nexcommit/auditoria (src/hooks/auditoria.js).
import { useState } from 'react';
import { useAuditoriaDatos } from '../../hooks/auditoria';
import { ErrorBox } from '../tareas/ui';
import { claveMes } from './contenido';
import { VistaCambios, VistaMes, VistaPendientes, VistaReunion, VistaResumen } from './VistasAuditoria';

const PESTANAS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'cambios', label: 'Qué hicimos' },
  { id: 'mes', label: 'Cada mes' },
  { id: 'reunion', label: 'Reunión con la clienta' },
  { id: 'pendientes', label: 'Pendientes' },
];

export default function AuditoriaAdmin() {
  const [pestana, setPestana] = useState('resumen');
  const [chatbot, setChatbot] = useState('sofia-v2');
  const [mes, setMes] = useState(() => claveMes());
  const { data: datos, isLoading, error } = useAuditoriaDatos(chatbot);
  const abiertos = (datos?.pendientes || []).filter((p) => !p.hecho).length;
  // Notas de «Qué hicimos» con al menos un comentario sin resolver.
  const porIterar = new Set((datos?.comentarios || []).filter((k) => !k.resuelto).map((k) => k.cambio_id)).size;

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-white text-xl font-semibold">Auditoría de chatbots</h2>
          <p className="text-xs text-[#9aafc3]">Lo que hicimos, la revisión de cada mes y lo que se presenta a la clienta. Cifras en vivo desde la base del chatbot.</p>
        </div>
        {(datos?.chatbots?.length || 0) > 1 && (
          <select value={chatbot} onChange={(e) => setChatbot(e.target.value)} aria-label="Chatbot"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {datos.chatbots.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
        {(datos?.chatbots?.length || 0) === 1 && <span className="text-sm text-[#9aafc3]">{datos.chatbots[0].nombre}</span>}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Secciones de la auditoría">
        {PESTANAS.map((t) => (
          <button key={t.id} type="button" onClick={() => setPestana(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${pestana === t.id ? 'border-[#3987e5] text-white' : 'border-transparent text-[#9aafc3] hover:text-white'}`}>
            {t.label}
            {t.id === 'pendientes' && abiertos > 0 && <span className="ml-1.5 rounded-full bg-[#fab219] px-1.5 text-[10px] font-bold text-[#0a1628]">{abiertos}</span>}
            {t.id === 'cambios' && porIterar > 0 && <span className="ml-1.5 rounded-full bg-[#fab219] px-1.5 text-[10px] font-bold text-[#0a1628]" title="Notas con comentarios sin resolver">{porIterar}</span>}
          </button>
        ))}
      </nav>

      {isLoading && <div className="text-sm text-[#9aafc3] py-10 text-center">Cargando la auditoría…</div>}
      {error && <ErrorBox error={error} />}
      {datos && (
        <>
          {pestana === 'resumen' && <VistaResumen chatbot={chatbot} datos={datos} mes={mes} irA={setPestana} />}
          {pestana === 'cambios' && <VistaCambios chatbot={chatbot} datos={datos} />}
          {pestana === 'mes' && <VistaMes chatbot={chatbot} datos={datos} mes={mes} setMes={setMes} />}
          {pestana === 'reunion' && <VistaReunion chatbot={chatbot} datos={datos} mes={mes} setMes={setMes} />}
          {pestana === 'pendientes' && <VistaPendientes chatbot={chatbot} datos={datos} />}
        </>
      )}
    </div>
  );
}
