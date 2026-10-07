import React from 'react';

export default function ClientCard({ name, url, gradient, accent, thumbnail }) {
  const [thumbnailError, setThumbnailError] = React.useState(false);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="client-card group relative overflow-hidden rounded-2xl glass-dark border-white/5 hover:border-white/10 transition-all duration-300 block"
    >
      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradient.replace('/20', '/15')}, rgba(8, 25, 42, 0.8))`,
        }}
      >
        {!thumbnailError && thumbnail ? (
          <img
            src={thumbnail}
            alt={`Vista previa de ${name}`}
            loading="lazy"
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl font-bold text-white/20"
            style={{
              background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
            }}
          >
            {name.charAt(0)}
          </div>
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent}40, transparent 70%)`,
          }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white group-hover:text-brand-light transition-colors">
            {name}
          </h3>
          <span className="w-5 h-5 text-brand-muted group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">↗</span>
        </div>
        <p className="text-sm text-brand-muted mt-1">Visitar sitio</p>
      </div>
    </a>
  );
}
