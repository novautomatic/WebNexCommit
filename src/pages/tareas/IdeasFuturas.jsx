// «Proyectos futuros»: first board column for ideas that aren't tasks yet (only topic + notes).
import React, { useState } from 'react';
import { ArrowRight, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { formatearFecha, useBorrarIdea, useGuardarIdea, useIdeasFuturas } from '../../hooks/tareas';
import { ErrorBox, Modal, btnGhost, btnPrimary, card, inputClass, labelClass } from './ui';

const COLOR = '#d4a72c';

export function ColumnaIdeas({ miembro, onConvertir }) {
  const ideas = useIdeasFuturas();
  const [abierta, setAbierta] = useState(null); // idea being edited, {} for a new one
  const lista = ideas.data ?? [];

  return (
    <section className="snap-start shrink-0 w-[280px] rounded-xl p-2 bg-[#0c1a2c] border border-dashed border-white/10" aria-label="Proyectos futuros">
      <header className="flex items-center justify-between px-2 py-1.5 mb-1">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR }} />
          <Lightbulb className="w-3.5 h-3.5" style={{ color: COLOR }} aria-hidden="true" />
          Proyectos futuros
          <span className="text-[#9aafc3] font-normal">{lista.length}</span>
        </div>
        <button type="button" onClick={() => setAbierta({})} className="text-[#9aafc3] hover:text-white" aria-label="Nueva idea">
          <Plus className="w-4 h-4" />
        </button>
      </header>
      <ErrorBox error={ideas.error} />
      <div className="space-y-2 min-h-[60px]">
        {ideas.isLoading && <p className="px-2 text-xs text-[#9aafc3]">Cargando…</p>}
        {!ideas.isLoading && !lista.length && (
          <button type="button" onClick={() => setAbierta({})} className="w-full px-2 py-3 text-xs text-[#9aafc3] hover:text-white text-left">
            Anota aquí las ideas que no son urgentes para que no se pierdan.
          </button>
        )}
        {lista.map((idea) => (
          <article key={idea.id} className={`${card} p-3 hover:border-white/25 transition-colors`}>
            <button type="button" onClick={() => setAbierta(idea)} className="text-left w-full">
              <h3 className="text-sm text-white leading-snug break-words">{idea.tema}</h3>
              {idea.notas && <p className="mt-1 text-xs text-[#9aafc3] line-clamp-3 whitespace-pre-line break-words">{idea.notas}</p>}
              <p className="mt-2 text-[11px] text-[#9aafc3]">
                {miembro[idea.creado_por]?.nombre || 'Alguien'} · {formatearFecha(idea.created_at)}
              </p>
            </button>
          </article>
        ))}
      </div>
      {abierta && (
        <IdeaModal
          idea={abierta.id ? abierta : null}
          onClose={() => setAbierta(null)}
          onConvertir={(idea) => { setAbierta(null); onConvertir(idea); }}
        />
      )}
    </section>
  );
}

function IdeaModal({ idea, onClose, onConvertir }) {
  const [tema, setTema] = useState(idea?.tema || '');
  const [notas, setNotas] = useState(idea?.notas || '');
  const guardar = useGuardarIdea();
  const borrar = useBorrarIdea();

  const campos = () => ({ tema: tema.trim(), notas: notas.trim() || null });
  const onSubmit = (e) => {
    e.preventDefault();
    guardar.mutate({ id: idea?.id, ...campos() }, { onSuccess: onClose });
  };
  // Save pending edits first so the task form gets the latest text.
  const convertir = () => {
    guardar.mutate({ id: idea.id, ...campos() }, { onSuccess: (guardada) => onConvertir(guardada) });
  };

  return (
    <Modal titulo={idea ? 'Proyecto futuro' : 'Nuevo proyecto futuro'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="idea-tema">Tema</label>
          <input id="idea-tema" className={inputClass} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={200} required autoFocus />
        </div>
        <div>
          <label className={labelClass} htmlFor="idea-notas">Notas</label>
          <textarea
            id="idea-notas"
            className={`${inputClass} min-h-[140px]`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={5000}
            placeholder="Lo que se te ocurrió, links, a quién le serviría… El resto se define cuando pase a tarea."
          />
        </div>
        <ErrorBox error={guardar.error || borrar.error} />
        <div className="flex flex-wrap items-center gap-2">
          {idea && (
            <>
              <button
                type="button"
                className={btnGhost}
                onClick={() => window.confirm('¿Borrar esta idea? No se puede deshacer.') && borrar.mutate(idea.id, { onSuccess: onClose })}
                disabled={borrar.isPending}
              >
                <Trash2 className="w-4 h-4" /> Borrar
              </button>
              <button type="button" className={btnGhost} onClick={convertir} disabled={guardar.isPending || !tema.trim()}>
                <ArrowRight className="w-4 h-4" /> Convertir en tarea
              </button>
            </>
          )}
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
            <button type="submit" className={btnPrimary} disabled={guardar.isPending}>Guardar</button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
