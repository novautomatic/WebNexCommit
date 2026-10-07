import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Pill, inputClass } from './ui';

// Picks clients as tags: suggests the existing ones and can create a new one.
// `seleccion` is an array of { id?, nombre } (no id = new client to create on save).
export default function ClienteSelector({ clientes, seleccion, onChange }) {
  const [texto, setTexto] = useState('');
  const listaId = useId();
  const elegidos = new Set(seleccion.map((c) => c.nombre.toLowerCase()));
  const sugeridos = clientes.filter((c) => !elegidos.has(c.nombre.toLowerCase()));
  const limpio = texto.trim();
  const existente = clientes.find((c) => c.nombre.toLowerCase() === limpio.toLowerCase());

  const agregar = () => {
    if (!limpio || elegidos.has(limpio.toLowerCase())) return;
    onChange([...seleccion, existente ? { id: existente.id, nombre: existente.nombre } : { nombre: limpio }]);
    setTexto('');
  };

  return (
    <div className="space-y-2">
      {seleccion.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {seleccion.map((c) => (
            <Pill key={c.nombre} color="#e0a64b">
              {c.nombre}
              {!c.id && <span className="opacity-70">(nuevo)</span>}
              <button
                type="button"
                onClick={() => onChange(seleccion.filter((x) => x.nombre !== c.nombre))}
                aria-label={`Quitar ${c.nombre}`}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </Pill>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inputClass}
          list={listaId}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Escribe o elige un cliente…"
        />
        <datalist id={listaId}>
          {sugeridos.map((c) => <option key={c.id} value={c.nombre}>{c.empresa || ''}</option>)}
        </datalist>
        <button
          type="button"
          onClick={agregar}
          disabled={!limpio}
          className="inline-flex items-center gap-1 px-3 rounded-lg text-sm border border-white/10 text-[#9aafc3] hover:text-white disabled:opacity-40 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> {limpio && !existente ? 'Crear' : 'Agregar'}
        </button>
      </div>
      {sugeridos.length > 0 && !limpio && (
        <div className="flex flex-wrap gap-1.5">
          {sugeridos.slice(0, 12).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange([...seleccion, { id: c.id, nombre: c.nombre }])}
              className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-[#9aafc3] hover:text-white hover:border-white/25"
            >
              + {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
