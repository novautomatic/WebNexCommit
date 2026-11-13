// CRM de vendedores: datos de /admin?tab=ventas (jefatura = dueños) y de /ventas
// (vendedores y captadores). Las tablas se leen directo (RLS filtra qué ve cada uno);
// toda escritura de vendedores y captadores pasa por las funciones ventas_* de SQL,
// que aplican las reglas (migraciones 20261112120100…120700).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { funcionPortal } from './tareasCliente';

const tabla = async (consulta) => {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data;
};
const rpc = (fn, args) => tabla(supabase.rpc(fn, args));

export const ETAPAS = [
  { id: 'nuevo', label: 'Nuevo', color: '#9aafc3' },
  { id: 'contactado', label: 'Contactado', color: '#67c8f3' },
  { id: 'reunion', label: 'Reunión', color: '#248bde' },
  { id: 'propuesta', label: 'Propuesta', color: '#e0a64b' },
  { id: 'ganado', label: 'Ganado', color: '#4cc38a' },
  { id: 'perdido', label: 'Perdido', color: '#e5484d' },
];
export const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));

export const ESTADOS_VENTA = {
  propuesta: 'En revisión',
  aprobada: 'Aprobada · esperando pago',
  rechazada: 'Rechazada',
  en_curso: '1.er pago recibido',
  pagada: 'Pagada completa',
  cancelada: 'Cancelada',
};

export const CONCEPTOS = {
  comision_1: 'Comisión (1.ª mitad)',
  comision_2: 'Comisión (2.ª mitad)',
  jornada: 'Jornada en terreno',
  inscrito: 'Inscrito válido',
  bono: 'Bono por meta',
};

export const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
export const wspLink = (numero, texto = '') =>
  `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

/** Misma regla que ventas_comision() en SQL, para la vista previa (el monto final lo fija SQL). */
export function calcularComision(total, tablaTipo, tramos = [], config) {
  const t = [...tramos].sort((a, b) => b.desde - a.desde)
    .find((x) => total >= x.desde && (x.hasta == null || total <= x.hasta));
  if (!t || !config) return 0;
  const pa = Number(config.pct_asignado);
  if (t.monto != null) {
    return tablaTipo === 'asignado' ? Math.round((t.monto * pa) / 100 / 5000) * 5000 : Number(t.monto);
  }
  const pct = tablaTipo === 'asignado' ? Math.round((Number(t.pct) * pa) / 100) : Number(t.pct);
  return Math.round((total * pct) / 100);
}

export function precioSegunNivel(lista, nivel, config) {
  if (!config) return lista;
  const d = nivel === 'oferta' ? config.pct_oferta : nivel === 'ultima' ? config.pct_ultima : 0;
  return Math.round(lista * (1 - Number(d) / 100));
}

// ─── Lecturas ───
export function useSoyVendedor(activo = true) {
  return useQuery({
    queryKey: ['ventas-yo'],
    enabled: activo,
    queryFn: async () => {
      const { data: id } = await supabase.rpc('mi_vendedor_id');
      if (!id) return null;
      return tabla(supabase.from('ventas_personas').select('*').eq('id', id).single());
    },
  });
}

export function useEsJefeVentas() {
  return useQuery({ queryKey: ['ventas-jefe'], queryFn: () => rpc('ventas_jefe') });
}

export function usePersonasVentas() {
  return useQuery({
    queryKey: ['ventas-personas'],
    queryFn: () => tabla(supabase.from('ventas_personas').select('*').order('activo', { ascending: false }).order('nombre')),
  });
}

export function useConfigVentas() {
  return useQuery({
    queryKey: ['ventas-config'],
    queryFn: async () => {
      const [config, tramos] = await Promise.all([
        tabla(supabase.from('ventas_config').select('*').eq('id', 1).maybeSingle()),
        tabla(supabase.from('ventas_tramos').select('*').order('desde')),
      ]);
      return { config, tramos };
    },
    staleTime: 5 * 60_000,
  });
}

export function useProspectos() {
  return useQuery({
    queryKey: ['ventas-prospectos'],
    queryFn: () => tabla(supabase.from('ventas_prospectos').select('*').order('created_at', { ascending: false })),
    refetchInterval: 60_000,
  });
}

export function useNotasProspecto(id) {
  return useQuery({
    queryKey: ['ventas-notas', id],
    enabled: Boolean(id),
    queryFn: () => tabla(supabase.from('ventas_notas').select('*').eq('prospecto_id', id).order('created_at', { ascending: false })),
  });
}

export function useVentas() {
  return useQuery({
    queryKey: ['ventas-ventas'],
    queryFn: () => tabla(supabase.from('ventas_ventas').select('*').order('created_at', { ascending: false })),
    refetchInterval: 60_000,
  });
}

export function useJornadas() {
  return useQuery({
    queryKey: ['ventas-jornadas'],
    queryFn: () => tabla(supabase.from('ventas_jornadas').select('*').order('inicio', { ascending: false }).limit(300)),
    refetchInterval: 60_000,
  });
}

export function usePagosVentas() {
  return useQuery({
    queryKey: ['ventas-pagos'],
    queryFn: () => tabla(supabase.from('ventas_pagos').select('*').order('created_at', { ascending: false })),
  });
}

// ─── Escrituras ───
const TODO = ['ventas-prospectos', 'ventas-notas', 'ventas-ventas', 'ventas-jornadas', 'ventas-pagos', 'ventas-personas', 'ventas-config'];

function useMutar(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => TODO.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export const useInscribir = () => useMutar((f) => rpc('ventas_inscribir', {
  p_contacto: f.contacto, p_negocio: f.negocio, p_rubro: f.rubro, p_comuna: f.comuna,
  p_whatsapp: f.whatsapp, p_email: f.email, p_interes: f.interes, p_acepta: f.acepta,
}));
export const useIniciarJornada = () => useMutar((zona) => rpc('ventas_jornada_iniciar', { p_zona: zona }));
export const useTerminarJornada = () => useMutar(() => rpc('ventas_jornada_terminar'));
export const useMoverProspecto = () => useMutar(({ id, etapa, motivo }) => rpc('ventas_mover', { p_id: id, p_etapa: etapa, p_motivo: motivo ?? null }));
export const useProximoPaso = () => useMutar(({ id, texto, fecha }) => rpc('ventas_proximo_paso', { p_id: id, p_texto: texto, p_fecha: fecha || null }));
export const useNotaProspecto = () => useMutar(({ id, tipo, texto }) => rpc('ventas_nota', { p_id: id, p_tipo: tipo, p_texto: texto }));
export const useProponer = () => useMutar((f) => rpc('ventas_proponer', {
  p_prospecto: f.prospecto, p_descripcion: f.descripcion, p_lista: f.lista,
  p_nivel: f.nivel, p_mensualidad: f.mensualidad, p_meses: f.meses,
}));

// Jefatura
export const useAsignar = () => useMutar(({ id, vendedor }) => rpc('ventas_asignar', { p_id: id, p_vendedor: vendedor || null }));
export const useValidarInscrito = () => useMutar(({ id, valido }) => rpc('ventas_validar', { p_id: id, p_valido: valido }));
export const useRevisarJornada = () => useMutar(({ id, aprobar }) => rpc('ventas_jornada_revisar', { p_id: id, p_aprobar: aprobar }));
export const useRevisarVenta = () => useMutar(({ id, aprobar, nota }) => rpc('ventas_revisar', { p_venta: id, p_aprobar: aprobar, p_nota: nota ?? null }));
export const useRegistrarPagoCliente = () => useMutar(({ id, numero }) => rpc('ventas_registrar_pago', { p_venta: id, p_numero: numero }));
export const useCancelarVenta = () => useMutar(({ id, nota }) => rpc('ventas_cancelar', { p_venta: id, p_nota: nota }));
export const useCalcularBonos = () => useMutar((mes) => rpc('ventas_calcular_bonos', { p_mes: mes }));
export const useMarcarPagado = () => useMutar(({ ids, pagado }) => rpc('ventas_marcar_pagado', { p_ids: ids, p_pagado: pagado }));
export const useBorrarProspecto = () => useMutar((id) => tabla(supabase.from('ventas_prospectos').delete().eq('id', id)));

export const useGuardarPersona = () => useMutar(({ id, ...campos }) => tabla(
  id ? supabase.from('ventas_personas').update(campos).eq('id', id).select().single()
    : supabase.from('ventas_personas').insert(campos).select().single(),
));
export const useDarAccesoVendedor = () => useMutar((personaId) => funcionPortal({ accion: 'dar_acceso_vendedor', persona_id: personaId }));
export const useGuardarConfigVentas = () => useMutar((campos) => tabla(supabase.from('ventas_config').update(campos).eq('id', 1)));
export const useGuardarTramo = () => useMutar(({ id, ...campos }) => tabla(supabase.from('ventas_tramos').update(campos).eq('id', id)));
