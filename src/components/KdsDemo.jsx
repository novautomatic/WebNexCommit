import { useEffect, useRef, useState } from 'react';
import './kds.css';

// Illustrative kitchen display: tickets with live timers that change colour
// as they age, one channel badge per order, and "Listo" clearing the oldest.
// Renders a complete static board first (prerender / reduced motion).
const POOL = [
  { channel: 'Salón · Mesa 4', items: ['2× Lomo a lo pobre', '1× Ensalada chilena'], note: 'Lomo término medio' },
  { channel: 'Uber Eats', items: ['1× Hamburguesa doble', '1× Papas grandes'], note: 'Sin cebolla' },
  { channel: 'Web · Retiro', items: ['3× Empanada de pino', '1× Bebida 1,5 L'] },
  { channel: 'Salón · Mesa 9', items: ['1× Pastel de choclo', '2× Jugo natural'] },
  { channel: 'Uber Eats', items: ['2× Sushi roll acevichado', '1× Gyozas'], note: 'Extra jengibre' },
  { channel: 'Web · Delivery', items: ['1× Pizza napolitana', '1× Pizza pepperoni'] },
];

const WARN_AT = 8 * 60;
const LATE_AT = 12 * 60;

const initial = [
  { id: 1, ...POOL[0], age: 13 * 60 + 5 },
  { id: 2, ...POOL[1], age: 9 * 60 + 40 },
  { id: 3, ...POOL[2], age: 4 * 60 + 12 },
  { id: 4, ...POOL[3], age: 38 },
];

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tone(age) {
  if (age >= LATE_AT) return 'late';
  if (age >= WARN_AT) return 'warn';
  return 'ok';
}

function channelClass(channel) {
  if (channel.startsWith('Uber')) return 'uber';
  if (channel.startsWith('Web')) return 'web';
  return 'salon';
}

export default function KdsDemo({ station = 'Cocina caliente' }) {
  const [tickets, setTickets] = useState(initial);
  const [leaving, setLeaving] = useState(null);
  const ticketsRef = useRef(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let next = 5;
    let pool = 4;
    // Ticket clocks run 20× faster than real time so the colours visibly change.
    const clock = setInterval(() => {
      setTickets((ts) => ts.map((t) => ({ ...t, age: t.age + 20 })));
    }, 1000);
    let swap;
    const done = setInterval(() => {
      const ts = ticketsRef.current;
      const oldest = ts.reduce((a, b) => (b.age > a.age ? b : a), ts[0]);
      setLeaving(oldest.id);
      swap = setTimeout(() => {
        const fresh = { id: next, ...POOL[pool % POOL.length], age: 0 };
        next += 1;
        pool += 1;
        setLeaving(null);
        setTickets((cur) => [...cur.filter((t) => t.id !== oldest.id), fresh]);
      }, 650);
    }, 4200);
    return () => {
      clearInterval(clock);
      clearInterval(done);
      clearTimeout(swap);
    };
  }, []);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  return (
    <div className="kds" role="img" aria-label="Ejemplo de pantalla de cocina con pedidos del salón, la web y Uber Eats">
      <div className="kds-top">
        <span className="kds-station">{station}</span>
        <span className="kds-legend">
          <i className="ok" /> a tiempo <i className="warn" /> demorando <i className="late" /> atrasado
        </span>
      </div>
      <div className="kds-board">
        {tickets.map((t, idx) => (
          <div
            key={t.id}
            className={`kds-ticket ${tone(t.age)} ${leaving === t.id ? 'is-leaving' : ''}`}
          >
            <div className="kds-head">
              <b>#{100 + t.id}</b>
              <span className="kds-time">{fmt(t.age)}</span>
            </div>
            <span className={`kds-channel ${channelClass(t.channel)}`}>{t.channel}</span>
            <ul>
              {t.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
            {t.note && <p className="kds-note">{t.note}</p>}
            <span className="kds-done">{leaving === t.id ? '✓ Listo' : idx === 0 ? 'Tocar para marcar listo' : 'Listo'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
