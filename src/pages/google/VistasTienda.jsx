// Vistas solo para clientes con tienda (p.tipo === 'tienda'): Productos (Google
// Shopping, desde la Hoja del script de Ads) y Ventas (Shopify, solo agregados:
// el back nunca entrega datos de compradoras).
import { BarChart3, Globe2, Package, ShoppingBag, Target } from 'lucide-react';
import { BarrasH, BarrasTiempo, Kpi, Seccion, Tabla, Vacio } from './graficos';
import { clp, dec1, entero, pct, serieDiaria } from './formato';

const roasTxt = (r) => (r == null ? '—' : `${r.toLocaleString('es-CL', { maximumFractionDigits: 1 })}×`);
// Meta de ROAS = ticket / costo por compra aceptable (configuración del cliente).
const metaRoas = (config) => (config?.cpa_objetivo ? (config.ticket_promedio || 0) / config.cpa_objetivo : 4);

// ── Productos (Google Shopping) ──────────────────────────────────────────────
export function VistaProductos({ p }) {
  const a = p.ads;
  if (a.error) return <Vacio>Google Ads: {a.error}</Vacio>;
  const prods = a.productos || [];
  const meta = metaRoas(p.config);
  const gasto = prods.reduce((s, x) => s + x.costo, 0);
  const valor = prods.reduce((s, x) => s + x.valor, 0);
  const sinVenta = prods.filter((x) => x.costo > 0 && !x.conv);
  const excluidos = (a.grupos_productos || []).filter((g) => g.excluido);
  if (!prods.length) {
    return <Vacio>Aún no hay datos de Shopping. Aparecen al día siguiente de que la campaña de Shopping empiece a mostrarse.</Vacio>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi titulo="Gasto en Shopping" valor={clp(gasto)} detalle={`${entero(prods.length)} productos con impresiones`} />
        <Kpi titulo="Ventas medidas" valor={clp(valor)} detalle="valor de las compras (Ads)" />
        <Kpi titulo="ROAS" valor={roasTxt(gasto ? valor / gasto : null)} estado={gasto >= 10000 ? (valor / gasto >= meta ? 'bien' : 'mejorar') : undefined} detalle={`meta ${roasTxt(meta)}`} />
        <Kpi titulo="Gastan sin vender" valor={entero(sinVenta.length)} estado={sinVenta.length ? 'mejorar' : undefined} detalle={clp(sinVenta.reduce((s, x) => s + x.costo, 0))} />
      </div>

      <Seccion titulo="Rendimiento por producto" icon={Package} extra="30 días · ordena por gasto, ventas o ROAS">
        <Tabla
          buscar={(x) => x.titulo}
          minWidth={900}
          filas={prods}
          columnas={[
            { titulo: 'Producto', valor: (x) => x.titulo },
            { titulo: 'Tipo', valor: (x) => x.tipo || '—' },
            { titulo: 'Impr.', num: true, valor: (x) => x.impr, render: (x) => entero(x.impr) },
            { titulo: 'Clics', num: true, valor: (x) => x.clics, render: (x) => entero(x.clics) },
            { titulo: 'CTR', num: true, valor: (x) => x.ctr, render: (x) => pct(x.ctr, 1) },
            { titulo: 'Gasto', num: true, valor: (x) => x.costo, render: (x) => clp(x.costo) },
            { titulo: 'Compras', num: true, valor: (x) => x.conv, render: (x) => dec1(x.conv) },
            { titulo: 'Ventas', num: true, valor: (x) => x.valor, render: (x) => clp(x.valor) },
            { titulo: 'ROAS', num: true, valor: (x) => x.roas ?? -1, render: (x) => roasTxt(x.roas) },
          ]}
        />
        <p className="text-[11px] text-[#5f7891] mt-2">
          ROAS = ventas ÷ gasto. Un producto con poco gasto todavía no dice nada: espera ~{clp(p.config.cpa_objetivo)} de gasto antes de juzgarlo.
        </p>
      </Seccion>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Por tipo de producto" icon={BarChart3}>
          <Tabla minWidth={420} filas={a.productos_tipo || []} columnas={[
            { titulo: 'Tipo', valor: (x) => x.clave },
            { titulo: 'Gasto', num: true, valor: (x) => x.costo, render: (x) => clp(x.costo) },
            { titulo: 'Ventas', num: true, valor: (x) => x.valor, render: (x) => clp(x.valor) },
            { titulo: 'ROAS', num: true, valor: (x) => x.roas ?? -1, render: (x) => roasTxt(x.roas) },
          ]} />
        </Seccion>
        <Seccion titulo="Grupos de productos de la campaña" icon={Target} extra={excluidos.length ? `${excluidos.length} excluido(s)` : ''}>
          <Tabla minWidth={420} filas={a.grupos_productos || []} vacio="Sin grupos de productos." columnas={[
            { titulo: 'Grupo', valor: (x) => `${x.grupo}${x.tipo === 'SUBDIVISION' ? ' (división)' : ''}` },
            { titulo: 'Estado', valor: (x) => (x.excluido ? 'Excluido' : 'Incluido') },
            { titulo: 'Oferta', num: true, valor: (x) => x.cpc ?? -1, render: (x) => clp(x.cpc) },
            { titulo: 'Gasto', num: true, valor: (x) => x.costo, render: (x) => clp(x.costo) },
            { titulo: 'Ventas', num: true, valor: (x) => x.valor, render: (x) => clp(x.valor) },
          ]} />
        </Seccion>
      </div>
    </div>
  );
}

// ── Ventas (Shopify) ─────────────────────────────────────────────────────────
export function VistaVentas({ p }) {
  const s = p.shopify;
  if (!s) return <Vacio>Este cliente no tiene Shopify conectado.</Vacio>;
  if (s.error) return <Vacio>Shopify: {s.error}</Vacio>;
  const t = s.total;
  const gastoAds = p.ads.total?.costo || 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Kpi titulo="Ventas de la tienda" valor={clp(t.ventas)} detalle={`${s.dias} días · todas las fuentes`} />
        <Kpi titulo="Pedidos" valor={entero(t.pedidos)} detalle={`ticket ${clp(t.ticket)}`} />
        <Kpi titulo="Clientas nuevas" valor={entero(t.nuevas)} detalle={`${entero(t.recurrentes)} vuelven a comprar`} />
        <Kpi titulo="Desde Google Ads" valor={entero(t.desde_ads)} detalle={`${clp(t.ventas_ads)} según Shopify`} />
        <Kpi titulo="Gasto en Ads" valor={clp(gastoAds)} detalle={t.ventas ? `${pct(gastoAds / t.ventas, 1)} de las ventas` : ''} />
        <Kpi titulo="Envío cobrado" valor={clp(t.envio_cobrado)} detalle={`descuentos ${clp(t.descuentos)}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Ventas por día" icon={ShoppingBag} extra={`${s.dias} días`}>
          <BarrasTiempo datos={serieDiaria(s.por_dia, 'fecha', 'ventas', s.dias)} etiqueta="Ventas" formato={clp} />
        </Seccion>
        <Seccion titulo="Pedidos por día" icon={ShoppingBag} extra={`${s.dias} días`}>
          <BarrasTiempo datos={serieDiaria(s.por_dia, 'fecha', 'pedidos', s.dias)} etiqueta="Pedidos" />
        </Seccion>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Seccion titulo="De dónde llegó quien compró" icon={Globe2} extra="última visita antes de comprar">
          <BarrasH filas={s.por_origen.map((x) => ({ etiqueta: x.clave, v: x.ventas, detalle: `${x.pedidos} pedidos` }))} formato={clp} />
        </Seccion>
        <Seccion titulo="Región de despacho" icon={Globe2}>
          {s.por_region.length
            ? <BarrasH filas={s.por_region.slice(0, 10).map((x) => ({ etiqueta: x.clave, v: x.ventas, detalle: `${x.pedidos} pedidos` }))} formato={clp} />
            : <Vacio>Shopify no entrega la región con el permiso actual.</Vacio>}
        </Seccion>
        <Seccion titulo="Canal de venta" icon={ShoppingBag}>
          <BarrasH filas={s.por_canal.map((x) => ({ etiqueta: x.clave, v: x.ventas, detalle: `${x.pedidos} pedidos` }))} formato={clp} />
        </Seccion>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Productos más vendidos" icon={Package}>
          <Tabla buscar={(x) => x.titulo} minWidth={480} filas={s.productos} columnas={[
            { titulo: 'Producto', valor: (x) => x.titulo },
            { titulo: 'Unidades', num: true, valor: (x) => x.unidades, render: (x) => entero(x.unidades) },
            { titulo: 'Pedidos', num: true, valor: (x) => x.pedidos, render: (x) => entero(x.pedidos) },
            { titulo: 'Ventas', num: true, valor: (x) => x.ventas, render: (x) => clp(x.ventas) },
          ]} />
        </Seccion>
        <Seccion titulo="Por tipo de producto" icon={BarChart3}>
          <Tabla minWidth={420} filas={s.por_tipo} columnas={[
            { titulo: 'Tipo', valor: (x) => x.clave },
            { titulo: 'Unidades', num: true, valor: (x) => x.unidades, render: (x) => entero(x.unidades) },
            { titulo: 'Ventas', num: true, valor: (x) => x.ventas, render: (x) => clp(x.ventas) },
          ]} />
        </Seccion>
      </div>
      <p className="text-[11px] text-[#5f7891]">
        Ventas reales de Shopify (sin pedidos cancelados ni de prueba), máximo 60 días. Solo totales: el panel no recibe nombres, correos ni direcciones de compradoras.
        «Sin dato» = Shopify no registró de dónde venía la visita.
      </p>
    </div>
  );
}
