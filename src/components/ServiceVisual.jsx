import { useEffect, useState } from 'react';
import { Check, GraduationCap, Lock, MessageCircle, ShoppingCart } from 'lucide-react';
import KdsDemo from './KdsDemo';
import './service-visual.css';

// One animated illustration per service page (keyed by slug). Each renders a
// complete static frame first (prerender / reduced motion) and animates after.

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Cycles 0..count-1 every `ms` after mount; returns `count - 1` (everything shown) before that. */
function useStep(count, ms) {
  const [step, setStep] = useState(count - 1);
  useEffect(() => {
    if (reducedMotion()) return undefined;
    // Starts from the complete frame; the first tick wraps to step 0.
    const t = setInterval(() => setStep((s) => (s + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, ms]);
  return step;
}

function Browser({ url, children }) {
  return (
    <div className="sv-browser">
      <div className="sv-chrome">
        <span className="sv-dots"><i /><i /><i /></span>
        <span className="sv-url"><Lock aria-hidden="true" />{url}</span>
      </div>
      <div className="sv-viewport">{children}</div>
    </div>
  );
}

/* ---------- Páginas web: the NexCommit video ---------- */
function WebVisual() {
  return (
    <div className="sv-stage">
      <Browser url="tuempresa.cl">
        <video
          className="sv-cover"
          src="/home/nexcommit-hero.mp4"
          poster="/home/nexcommit-hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Video: diseño y programación de sitios web"
        />
      </Browser>
      <div className="sv-float sv-float-a"><span className="sv-pill ok">SEO</span> Lista para Google</div>
      <div className="sv-float sv-float-b"><MessageCircle aria-hidden="true" /> WhatsApp integrado</div>
    </div>
  );
}

/* ---------- Tiendas online ---------- */
const ORDERS = [
  { id: '#2041', text: 'Pagado con Webpay', amount: '$34.990' },
  { id: '#2042', text: 'Pagado con Mercado Pago', amount: '$18.500' },
  { id: '#2043', text: 'Despacho Starken asignado', amount: 'En camino' },
];
function ShopVisual() {
  const step = useStep(ORDERS.length, 2600);
  const o = ORDERS[step];
  return (
    <div className="sv-stage">
      <Browser url="tutienda.cl">
        <img className="sv-cover" src="/home/dyetales.jpg" alt="Tienda online desarrollada por NexCommit" loading="lazy" />
      </Browser>
      <div className="sv-cart" aria-hidden="true"><ShoppingCart /><b key={step}>{step + 1}</b></div>
      <div className="sv-toast" key={o.id}>
        <span className="sv-toast-ic"><Check aria-hidden="true" /></span>
        <div><small>Pedido {o.id}</small><p>{o.text}</p></div>
        <strong>{o.amount}</strong>
      </div>
    </div>
  );
}

/* ---------- Chatbots ---------- */
const CHAT = [
  { me: false, text: 'Hola! ¿Tienen hora para mañana en la tarde?' },
  { me: true, text: 'Hola Camila 👋 Mañana tengo libre 15:30 y 17:00. ¿Cuál te acomoda?' },
  { me: false, text: '17:00 por favor' },
  { me: true, text: 'Listo ✅ Quedaste agendada mañana a las 17:00. Te recordaré 2 horas antes.' },
];
function ChatVisual() {
  const step = useStep(CHAT.length + 2, 1800);
  const shown = Math.min(step + 1, CHAT.length);
  const typing = step < CHAT.length - 1 && CHAT[step + 1]?.me;
  return (
    <div className="sv-phone" role="img" aria-label="Ejemplo de chatbot agendando una hora por WhatsApp">
      <div className="sv-phone-top">
        <span className="sv-avatar">IA</span>
        <div><b>Asistente de tu negocio</b><small>en línea · responde al instante</small></div>
      </div>
      <div className="sv-chat">
        {CHAT.slice(0, shown).map((m, i) => (
          <div key={i} className={`sv-bubble ${m.me ? 'me' : 'in'}`}>{m.text}</div>
        ))}
        {typing && <div className="sv-bubble me sv-typing"><i /><i /><i /></div>}
      </div>
    </div>
  );
}

/* ---------- Pagos ---------- */
const PAYMENTS = [
  { via: 'Webpay', detail: 'Tarjeta de crédito', amount: '$24.990', tag: 'Aprobado' },
  { via: 'TUU', detail: 'Pago en local · boleta emitida', amount: '$8.900', tag: 'Aprobado' },
  { via: 'Mercado Pago', detail: 'Checkout online', amount: '$12.500', tag: 'Aprobado' },
  { via: 'Flow', detail: 'Link de pago por WhatsApp', amount: '$45.000', tag: 'Pagado' },
];
function PaymentsVisual() {
  const step = useStep(PAYMENTS.length, 2200);
  const list = [0, 1, 2, 3].map((k) => PAYMENTS[(step - k + PAYMENTS.length) % PAYMENTS.length]);
  return (
    <div className="sv-panel" role="img" aria-label="Ejemplo de pagos entrando desde distintos medios">
      <div className="sv-panel-head"><b>Pagos de hoy</b><span className="sv-live"><i />en vivo</span></div>
      <div className="sv-feed">
        {list.map((p, k) => (
          <div key={`${step}-${k}`} className={`sv-row ${k === 0 ? 'is-new' : ''}`}>
            <span className="sv-chip">{p.via}</span>
            <div className="sv-row-txt"><b>{p.amount}</b><small>{p.detail}</small></div>
            <span className="sv-pill ok">{p.tag}</span>
          </div>
        ))}
      </div>
      <p className="sv-foot">Ejemplo ilustrativo · cada pago se registra solo en tu sistema</p>
    </div>
  );
}

/* ---------- APIs e integraciones ---------- */
const NODES = [
  { label: 'Pagos', x: 70, y: 60 },
  { label: 'Uber Direct', x: 330, y: 50 },
  { label: 'CRM', x: 380, y: 170 },
  { label: 'WhatsApp', x: 320, y: 290 },
  { label: 'ERP', x: 80, y: 290 },
  { label: 'Facturación', x: 30, y: 175 },
];
function ApiVisual() {
  const cx = 210;
  const cy = 170;
  return (
    <div className="sv-panel sv-graph-wrap">
      <svg viewBox="0 0 440 340" className="sv-graph" role="img" aria-label="Tu sistema conectado por API con pagos, delivery, CRM, WhatsApp, ERP y facturación">
        {NODES.map((n, i) => {
          const d = `M${cx} ${cy} L${n.x + 40} ${n.y + 16}`;
          return (
            <g key={n.label}>
              <path d={d} className="sv-link" />
              <circle r="4" className="sv-packet">
                <animateMotion dur={`${2.4 + (i % 3) * 0.5}s`} repeatCount="indefinite" path={i % 2 ? d : `M${n.x + 40} ${n.y + 16} L${cx} ${cy}`} begin={`${i * 0.3}s`} />
              </circle>
            </g>
          );
        })}
        <g className="sv-hub">
          <circle cx={cx} cy={cy} r="54" className="sv-hub-ring" />
          <circle cx={cx} cy={cy} r="42" className="sv-hub-core" />
          <text x={cx} y={cy - 3} textAnchor="middle" className="sv-hub-t">Tu</text>
          <text x={cx} y={cy + 15} textAnchor="middle" className="sv-hub-t">sistema</text>
        </g>
        {NODES.map((n) => (
          <g key={`n-${n.label}`}>
            <rect x={n.x} y={n.y} width="80" height="32" rx="10" className="sv-node" />
            <text x={n.x + 40} y={n.y + 20} textAnchor="middle" className="sv-node-t">{n.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Aulas virtuales ---------- */
const MODULES = ['Bienvenida y diagnóstico', 'Módulo 1 · Fundamentos', 'Módulo 2 · Práctica guiada', 'Evaluación final'];
function CourseVisual() {
  const step = useStep(MODULES.length + 1, 1700);
  const done = Math.min(step, MODULES.length);
  const pct = Math.round((done / MODULES.length) * 100);
  return (
    <div className="sv-panel" role="img" aria-label="Ejemplo de curso con módulos, avance y certificado">
      <div className="sv-panel-head"><b>Curso de ejemplo</b><span className="sv-pct">{pct}%</span></div>
      <div className="sv-bar"><span style={{ width: `${pct}%` }} /></div>
      <ul className="sv-modules">
        {MODULES.map((m, i) => (
          <li key={m} className={i < done ? 'is-done' : i === done ? 'is-now' : ''}>
            <span className="sv-mod-ic">{i < done ? <Check aria-hidden="true" /> : i + 1}</span>{m}
          </li>
        ))}
      </ul>
      <div className={`sv-cert ${done === MODULES.length ? 'is-on' : ''}`}>
        <span className="sv-cert-ic"><GraduationCap aria-hidden="true" /></span><div><b>Certificado emitido</b><small>Listo para descargar</small></div>
      </div>
    </div>
  );
}

/* ---------- Automatización ---------- */
const FLOW = [
  { t: 'Llega un nuevo contacto', s: 'Formulario web o WhatsApp' },
  { t: 'Se registra en tu CRM', s: 'Con su origen y lo que pidió' },
  { t: 'Recibe respuesta al instante', s: 'Mensaje por WhatsApp y correo' },
  { t: 'Seguimiento en 2 días', s: 'Si no ha respondido' },
  { t: 'Aviso a tu equipo', s: 'Cuando está listo para comprar' },
];
function FlowVisual() {
  const step = useStep(FLOW.length + 1, 1400);
  return (
    <div className="sv-panel" role="img" aria-label="Ejemplo de flujo automático de seguimiento de clientes">
      <div className="sv-panel-head"><b>Flujo automático</b><span className="sv-live"><i />activo</span></div>
      <ol className="sv-flow">
        {FLOW.map((f, i) => (
          <li key={f.t} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
            <span className="sv-flow-dot">{i < step ? <Check aria-hidden="true" /> : i + 1}</span>
            <div><b>{f.t}</b><small>{f.s}</small></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Sistemas y dashboards ---------- */
const BARS = [42, 58, 51, 66, 72, 64, 88];
function DashVisual() {
  return (
    <div className="sv-panel" role="img" aria-label="Ejemplo de dashboard con indicadores y gráfico de ventas">
      <div className="sv-panel-head"><b>Panel de tu negocio</b><span className="sv-live"><i />tiempo real</span></div>
      <div className="sv-kpis">
        <div><small>Ventas del mes</small><b>+18%</b></div>
        <div><small>Pedidos hoy</small><b>124</b></div>
        <div><small>Stock crítico</small><b className="warn">3</b></div>
      </div>
      <div className="sv-chart">
        {BARS.map((h, i) => <span key={i} style={{ '--h': `${h}%`, '--d': `${i * 0.12}s` }} />)}
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="sv-line" aria-hidden="true">
          <polyline points="0,30 16,24 33,27 50,18 66,14 83,17 100,6" />
        </svg>
      </div>
      <p className="sv-foot">Datos de ejemplo</p>
    </div>
  );
}

const VISUALS = {
  'desarrollo-web': WebVisual,
  'tiendas-online': ShopVisual,
  restaurantes: KdsDemo,
  'inteligencia-artificial': ChatVisual,
  pagos: PaymentsVisual,
  integraciones: ApiVisual,
  'aulas-virtuales': CourseVisual,
  automatizacion: FlowVisual,
  dashboards: DashVisual,
};

export default function ServiceVisual({ slug }) {
  const Visual = VISUALS[slug];
  if (!Visual) return null;
  return <div className="sv-visual"><Visual /></div>;
}
