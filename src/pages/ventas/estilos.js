// Clases y formatos compartidos del CRM de vendedores (panel y /ventas).
export const ui = {
  card: 'rounded-xl border border-white/10 bg-[#0d1e30] p-4',
  input: 'w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2 text-sm text-white placeholder:text-[#5f7891] focus:border-[#248bde] focus:outline-none',
  label: 'block text-xs font-medium text-[#9aafc3] mb-1',
  btn: 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#248bde] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7cc7] disabled:opacity-50',
  btnSec: 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-[#cfe0f0] hover:bg-white/5 disabled:opacity-50',
  btnPeligro: 'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50',
  h2: 'text-lg font-semibold text-white',
  muted: 'text-sm text-[#9aafc3]',
  error: 'text-sm text-red-300',
  ok: 'text-sm text-emerald-300',
};

export const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—');
export const hoyISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
