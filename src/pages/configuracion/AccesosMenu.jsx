import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, Link2 } from 'lucide-react';
import { useAccesosDirectos } from '../../hooks/tareas';
import { hostDe } from './utils';

// Header dropdown with the team's shortcuts; managed in Configuración.
export default function AccesosMenu() {
  const { data: accesos = [] } = useAccesosDirectos();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false);
    const tecla = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const grupos = accesos.reduce((acc, a) => {
    (acc[a.categoria || 'General'] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#9aafc3] hover:text-white hover:bg-white/5 border border-white/10 transition-all"
      >
        <Link2 className="w-4 h-4 text-[#67c8f3]" />
        <span className="hidden sm:inline">Accesos</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0d1e30] shadow-2xl z-50 py-2">
          {accesos.length === 0 && <p className="px-4 py-3 text-xs text-[#9aafc3]">Aún no hay accesos directos.</p>}
          {Object.entries(grupos).map(([cat, items]) => (
            <div key={cat} className="pb-1">
              <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[#9aafc3]">{cat}</div>
              {items.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.descripcion || a.url}
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#67c8f3] shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{a.titulo}</span>
                  <span className="text-[10px] text-[#9aafc3] truncate max-w-[6rem]">{hostDe(a.url)}</span>
                </a>
              ))}
            </div>
          ))}
          <div className="border-t border-white/10 mt-1 pt-1">
            <Link
              to="/admin?tab=accesos"
              onClick={() => setAbierto(false)}
              className="block px-4 py-2 text-xs text-[#67c8f3] hover:bg-white/5"
            >
              Administrar accesos…
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
