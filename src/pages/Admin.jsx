import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import SEO from '../components/SEO';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Calculator,
  Contact,
  FileText,
  FolderKanban,
  LayoutGrid,
  Link2,
  List,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from 'lucide-react';
import { BlogAdmin } from './blog/BlogAdmin';
import Cotizador from './Cotizador';
import TareasAdmin from './tareas/TareasAdmin';
import { ClientesPagina, EquipoPagina, ProyectosPagina } from './tareas/GestionPaginas';
import ConfiguracionAdmin from './configuracion/ConfiguracionAdmin';
import AccesosMenu from './configuracion/AccesosMenu';

const GRUPOS = [
  {
    titulo: 'Tareas',
    items: [
      { id: 'resumen', label: 'Resumen', icon: BarChart3 },
      { id: 'tablero', label: 'Tablero', icon: LayoutGrid },
      { id: 'lista', label: 'Lista', icon: List },
      { id: 'calendario', label: 'Calendario', icon: CalendarDays },
      { id: 'areas', label: 'Por área', icon: Briefcase },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
      { id: 'clientes', label: 'Clientes', icon: Contact },
      { id: 'equipo', label: 'Equipo', icon: Users },
      { id: 'accesos', label: 'Accesos', icon: Link2 },
    ],
  },
  {
    titulo: 'Sitio web',
    items: [
      { id: 'blog', label: 'Blog', icon: FileText },
      { id: 'cotizador', label: 'Cotizador', icon: Calculator },
    ],
  },
];
const SECCIONES = GRUPOS.flatMap((g) => g.items);
const VISTAS_TAREAS = ['resumen', 'tablero', 'lista', 'calendario', 'areas'];
const CLAVE_BARRA = 'nc_panel_barra_contraida';

function leerContraida() {
  try {
    return window.localStorage.getItem(CLAVE_BARRA) === '1';
  } catch {
    return false;
  }
}

// Old links (`?tab=tareas&vista=x`, the WhatsApp notice) still land in the right place.
function seccionDe(params) {
  const tab = params.get('tab');
  if (SECCIONES.some((s) => s.id === tab)) return tab;
  const vista = params.get('vista');
  if (tab === 'tareas') return SECCIONES.some((s) => s.id === vista) ? vista : 'tablero';
  return 'resumen';
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const [contraida, setContraida] = useState(leerContraida);
  const [menuMovil, setMenuMovil] = useState(false);
  const seccion = seccionDe(params);
  const actual = SECCIONES.find((s) => s.id === seccion);

  const irA = (id, extra = {}) => {
    setParams({ tab: id, ...extra }, { replace: true });
    setMenuMovil(false);
  };

  const alternarBarra = () => {
    setContraida((c) => {
      try {
        window.localStorage.setItem(CLAVE_BARRA, c ? '0' : '1');
      } catch {
        /* storage unavailable — the choice lasts only for this visit */
      }
      return !c;
    });
  };

  const navegacion = (compacta) => (
    <nav className="flex flex-col gap-5" aria-label="Secciones del panel">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          {compacta ? (
            <div className="mx-auto mb-2 w-6 border-t border-white/10" aria-hidden="true" />
          ) : (
            <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5f7891]">{g.titulo}</div>
          )}
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const Icon = item.icon;
              const activa = item.id === seccion;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => irA(item.id)}
                  title={compacta ? item.label : undefined}
                  aria-current={activa ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                    compacta ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5'
                  } ${activa ? 'bg-[#1a3050] text-white' : 'text-[#9aafc3] hover:text-white hover:bg-white/5'}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activa ? 'text-[#67c8f3]' : ''}`} />
                  {!compacta && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <SEO title="Panel — NexCommit" noIndex />
      <div className="h-screen bg-[#0a1628] flex flex-col">
        <header className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d1e30] shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuMovil(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-[#9aafc3] hover:text-white hover:bg-white/5"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#248bde] to-[#67c8f3] flex items-center justify-center text-white font-bold text-sm shrink-0">NC</div>
            <span className="text-white font-semibold text-lg hidden sm:inline">Panel</span>
            <span className="text-[#9aafc3] text-sm truncate md:hidden">· {actual?.label}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <AccesosMenu />
            <span className="text-sm text-[#9aafc3] hidden lg:inline truncate max-w-[220px]">{user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all"
              aria-label="Salir"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Desktop sidebar: expanded or icons only. */}
          <aside
            className={`hidden md:flex flex-col shrink-0 bg-[#0c1a2c] border-r border-white/5 transition-[width] duration-200 ${
              contraida ? 'w-16' : 'w-60'
            }`}
          >
            <div className="flex-1 overflow-y-auto py-4 px-2">{navegacion(contraida)}</div>
            <button
              type="button"
              onClick={alternarBarra}
              className={`m-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9aafc3] hover:text-white hover:bg-white/5 ${
                contraida ? 'justify-center' : ''
              }`}
              aria-label={contraida ? 'Expandir menú' : 'Contraer menú'}
              title={contraida ? 'Expandir menú' : 'Contraer menú'}
            >
              {contraida ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Contraer</>}
            </button>
          </aside>

          {/* Mobile drawer. */}
          {menuMovil && (
            <div className="md:hidden fixed inset-0 z-[65] flex" role="dialog" aria-modal="true" aria-label="Menú del panel">
              <aside className="w-72 max-w-[85%] h-full bg-[#0c1a2c] border-r border-white/10 flex flex-col">
                <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
                  <span className="text-white font-semibold">Panel</span>
                  <button
                    type="button"
                    onClick={() => setMenuMovil(false)}
                    className="p-2 rounded-lg text-[#9aafc3] hover:text-white hover:bg-white/5"
                    aria-label="Cerrar menú"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-2">{navegacion(false)}</div>
                <div className="px-4 py-3 border-t border-white/10 text-xs text-[#9aafc3] truncate">{user?.email}</div>
              </aside>
              <button type="button" className="flex-1 bg-black/60" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú" />
            </div>
          )}

          <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
            {VISTAS_TAREAS.includes(seccion) && <TareasAdmin vista={seccion} irA={irA} />}
            {seccion === 'proyectos' && <ProyectosPagina irA={irA} />}
            {seccion === 'clientes' && <ClientesPagina irA={irA} />}
            {seccion === 'equipo' && <EquipoPagina />}
            {seccion === 'accesos' && <ConfiguracionAdmin />}
            {seccion === 'blog' && <BlogAdmin />}
            {seccion === 'cotizador' && <Cotizador />}
          </main>
        </div>
      </div>
    </>
  );
}
