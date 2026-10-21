// Reseñas aprobadas de clientes (RPC resenas_publicas, migración 20261021130400).
// Se cargan en el navegador: el HTML prerenderizado no las trae y la sección
// no aparece hasta que hay al menos una, así no queda un bloque vacío.
// Diseño: una reseña destacada en grande + la captura del sitio que le hicimos
// a ese cliente (SHOWCASE de data/HOME.js, por nombre de empresa); con varias,
// rota sola cada 9 s (se detiene con el cursor encima o con movimiento reducido).
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Quote } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SERVICIO_RESENA } from '../data/RESENAS';
import { SHOWCASE } from '../data/HOME';
import { IrACotizar } from './Conversion';
import './resenas.css';

function useResenasPublicas() {
  return useQuery({
    queryKey: ['resenas-publicas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resenas_publicas');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
    retry: false,
  });
}

const compacto = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// «Francés nomadlexis» ↔ «Frances NomadLexis»; también sirve si escribió solo «NomadLexis».
function proyectoDe(r) {
  for (const texto of [r.empresa, r.nombre]) {
    const a = compacto(texto);
    if (a.length < 4) continue;
    const p = SHOWCASE.find((x) => {
      const b = compacto(x.name);
      return a === b || a.includes(b) || b.includes(a);
    });
    if (p) return p;
  }
  return null;
}

const tamano = (texto) => (texto.length < 180 ? 'rs-xl' : texto.length < 420 ? 'rs-l' : 'rs-m');

function Destacada({ r }) {
  const [abierta, setAbierta] = useState(false);
  const proyecto = proyectoDe(r);
  const larga = r.texto.length > 520;
  const firma = r.nombre || r.empresa;
  const detalle = [r.cargo, r.nombre && r.empresa].filter(Boolean).join(' · ');
  return (
    <div className={`rs-feature${proyecto ? '' : ' rs-solo'}`}>
      <figure className="rs-quote">
        <span className="rs-glyph" aria-hidden="true"><Quote /></span>
        <blockquote className={`${tamano(r.texto)}${larga && !abierta ? ' rs-corta' : ''}`}>{r.texto}</blockquote>
        {larga && (
          <button type="button" className="rs-mas" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
            {abierta ? 'Ver menos' : 'Leer completa'}
          </button>
        )}
        <figcaption className="rs-autor">
          <span className="rs-avatar" aria-hidden="true">{(firma || 'N').trim().charAt(0).toUpperCase()}</span>
          <span className="rs-quien">
            <b>{firma}</b>
            {detalle && <span>{detalle}</span>}
          </span>
          <span className="rs-verif" title="La escribió el cliente desde su enlace personal. No editamos el texto.">
            <BadgeCheck aria-hidden="true" /> Reseña verificada
          </span>
        </figcaption>
      </figure>

      {proyecto && (
        <a className="rs-proyecto" href={proyecto.url} target="_blank" rel="noopener noreferrer">
          <span className="rs-browser">
            <span className="rs-bar"><i /><i /><i /><em>{proyecto.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</em></span>
            <img src={proyecto.img} alt={`Sitio de ${proyecto.name} hecho por NexCommit`} loading="lazy" width="960" height="600" />
          </span>
          <span className="rs-pie">
            <span>
              <small>El proyecto</small>
              <b>{proyecto.name}</b>
            </span>
            <span className="rs-tag">{SERVICIO_RESENA[r.servicio]?.label || proyecto.kind}</span>
            <span className="rs-ver">Ver sitio <ArrowUpRight aria-hidden="true" /></span>
          </span>
        </a>
      )}
    </div>
  );
}

function Carrusel({ lista, placement }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const n = lista.length;
  const actual = lista[i % n];

  useEffect(() => {
    if (n < 2 || pausa) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = window.setInterval(() => setI((v) => (v + 1) % n), 9000);
    return () => window.clearInterval(t);
  }, [n, pausa]);

  return (
    <div
      className="rs-stage"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
    >
      <div key={actual.id} className="rs-anim" aria-live="polite">
        <Destacada r={actual} />
      </div>
      <div className="rs-nav">
        {n > 1 && (
          <div className="rs-ctrl">
            <button type="button" aria-label="Reseña anterior" onClick={() => setI((v) => (v - 1 + n) % n)}><ArrowLeft /></button>
            <span className="rs-dots">
              {lista.map((r, k) => (
                <button key={r.id} type="button" aria-label={`Ver reseña ${k + 1} de ${n}`} aria-current={k === i % n || undefined}
                  className={k === i % n ? 'on' : ''} onClick={() => setI(k)} />
              ))}
            </span>
            <button type="button" aria-label="Reseña siguiente" onClick={() => setI((v) => (v + 1) % n)}><ArrowRight /></button>
          </div>
        )}
        <IrACotizar placement={placement} className="rs-cta">
          Quiero un proyecto así <ArrowRight aria-hidden="true" />
        </IrACotizar>
      </div>
    </div>
  );
}

/**
 * servicio: slug cuyas reseñas van primero (o las únicas, con soloServicio).
 * variante 'nh' = home y landings (clases nh-*); 'servicio' = /servicios/:slug.
 */
export default function ResenasSeccion({ servicio, soloServicio = false, limite = 6, variante = 'nh', placement = 'resenas' }) {
  const { data } = useResenasPublicas();
  const todas = data ?? [];
  const lista = (soloServicio ? todas.filter((r) => r.servicio === servicio) : [...todas].sort((a, b) =>
    Number(b.servicio === servicio) - Number(a.servicio === servicio))).slice(0, limite);
  if (!lista.length) return null;

  const cabeza = (
    <div className="rs-head">
      <div>
        <div className="rs-kicker">Reseñas de clientes</div>
        <h2 id="resenas-titulo">Lo que dicen quienes ya <em>trabajaron con nosotros</em>.</h2>
      </div>
      <p>Escritas por cada cliente desde un enlace personal, publicadas con su autorización y sin editar una coma.</p>
    </div>
  );

  if (variante === 'servicio') {
    return (
      <section className="rs-sec rs-sec-servicio mb-14" aria-labelledby="resenas-titulo">
        {cabeza}
        <Carrusel lista={lista} placement={placement} />
      </section>
    );
  }
  return (
    <section id="resenas" className="nh-block rs-sec" aria-labelledby="resenas-titulo">
      <div className="nh-wrap">
        {cabeza}
        <Carrusel lista={lista} placement={placement} />
      </div>
    </section>
  );
}
