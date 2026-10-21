// Reseñas aprobadas de clientes (RPC resenas_publicas, migración 20261021130400).
// Se cargan en el navegador: el HTML prerenderizado no las trae y la sección
// no aparece hasta que hay al menos una, así no queda un bloque vacío.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Quote } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SERVICIO_RESENA } from '../data/RESENAS';
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

function Tarjeta({ r }) {
  const [abierta, setAbierta] = useState(false);
  const larga = r.texto.length > 320;
  const firma = [r.nombre, r.cargo].filter(Boolean).join(' · ');
  return (
    <figure className="rs-card">
      <Quote className="rs-comillas" aria-hidden="true" />
      <blockquote className={`rs-texto${larga && !abierta ? ' rs-corta' : ''}`}>{r.texto}</blockquote>
      {larga && (
        <button type="button" className="rs-mas" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
          {abierta ? 'Ver menos' : 'Leer completa'}
        </button>
      )}
      <figcaption className="rs-autor">
        <span className="rs-avatar" aria-hidden="true">{(r.nombre || r.empresa || 'N').trim().charAt(0).toUpperCase()}</span>
        <span>
          <b>{firma || r.empresa}</b>
          {firma && r.empresa && <span className="rs-empresa">{r.empresa}</span>}
          {SERVICIO_RESENA[r.servicio] && <span className="rs-servicio">{SERVICIO_RESENA[r.servicio].label}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * servicio: slug cuyas reseñas van primero (o las únicas, con soloServicio).
 * variante 'nh' = home y landings (clases nh-*); 'servicio' = /servicios/:slug.
 */
export default function ResenasSeccion({ servicio, soloServicio = false, limite = 6, variante = 'nh' }) {
  const { data } = useResenasPublicas();
  const todas = data ?? [];
  const lista = (soloServicio ? todas.filter((r) => r.servicio === servicio) : [...todas].sort((a, b) =>
    Number(b.servicio === servicio) - Number(a.servicio === servicio))).slice(0, limite);
  if (!lista.length) return null;

  const titulo = 'Lo que dicen nuestros clientes';
  const sub = 'Reseñas reales de empresas con las que trabajamos, publicadas con su autorización.';
  const grilla = <div className="rs-grid">{lista.map((r) => <Tarjeta key={r.id} r={r} />)}</div>;

  if (variante === 'servicio') {
    return (
      <section className="mb-14" aria-labelledby="resenas-titulo">
        <h2 id="resenas-titulo" className="text-2xl md:text-3xl font-semibold text-white mb-2">{titulo}</h2>
        <p className="text-brand-muted mb-6">{sub}</p>
        {grilla}
      </section>
    );
  }
  return (
    <section id="resenas" className="nh-block" aria-labelledby="resenas-titulo">
      <div className="nh-wrap">
        <div className="nh-kicker">Reseñas</div>
        <h2 id="resenas-titulo">{titulo}</h2>
        <p className="nh-sub">{sub}</p>
        {grilla}
      </div>
    </section>
  );
}
