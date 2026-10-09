// Pestaña "Asistente IA" del editor: pedidos de cambio en lenguaje natural,
// con tope de ediciones y de caracteres (cuestan tokens; las ediciones
// manuales no tienen tope).
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';

export default function ChatIA({ mensajes, disponibles, maximas, maxCaracteres, enviando, error, onEnviar, agotado }) {
  const [texto, setTexto] = useState('');
  const lista = useRef(null);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, enviando]);

  const enviar = async (e) => {
    e.preventDefault();
    const m = texto.trim();
    if (m.length < 3 || enviando) return;
    const ok = await onEnviar(m);
    if (ok) setTexto('');
  };

  return (
    <div className="ed-panel-cuerpo ed-chat">
      <div className="ed-panel-tit">
        <h3><Sparkles className="ed-ic-tit" /> Asistente IA</h3>
        <span className="ed-pill">{disponibles}/{maximas} pedidos</span>
      </div>
      <p className="ed-nota">Pídele cambios grandes de una vez: reescribir textos, cambiar el tono o los colores. Los ajustes pequeños hazlos tú directo en la página.</p>
      <div className="ed-msgs" ref={lista}>
        {mensajes.map((m, i) => <div key={i} className={`cr-msg ${m.rol}`}>{m.texto}</div>)}
        {enviando && <div className="cr-msg asistente escribiendo"><i /><i /><i /></div>}
      </div>
      {disponibles > 0 ? (
        <form className="ed-chat-form" onSubmit={enviar}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, maxCaracteres))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) enviar(e); }}
            placeholder="Ej: haz los textos más cercanos y destaca que hacemos envíos"
            rows={3}
            maxLength={maxCaracteres}
            disabled={enviando}
            aria-label="Pedido para la IA"
          />
          <div className="ed-chat-pie">
            <span className="cr-cont">{texto.length}/{maxCaracteres}</span>
            <button type="submit" className="cr-enviar" disabled={enviando || texto.trim().length < 3} aria-label="Enviar">
              {enviando ? <Loader2 className="cr-gira" /> : <Send />}
            </button>
          </div>
        </form>
      ) : agotado}
      {error && <div className="cr-aviso error">{error}</div>}
    </div>
  );
}
