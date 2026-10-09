// Ventana para elegir una foto: buscar en el banco de imágenes con licencia
// (Unsplash/Pexels, vía el backend) o subir una propia. Para el logo solo se
// permite subir.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Upload, X } from 'lucide-react';
import { api } from '../../../config/creador';
import { leerImagen } from './modulos';

export default function SelectorFoto({ titulo, soloSubir = false, sugerencia = '', token, onElegir, onCerrar, onQuitar }) {
  const [pestana, setPestana] = useState(soloSubir ? 'subir' : 'buscar');
  const [q, setQ] = useState(sugerencia);
  const [fotos, setFotos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const archivo = useRef(null);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const buscar = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setCargando(true);
    setError('');
    try {
      const r = await api(`/fotos?q=${encodeURIComponent(q.trim())}`, { token });
      setFotos(r.fotos);
      if (!r.fotos.length) setError('No encontramos fotos con esa búsqueda. Prueba en inglés (ej: "coffee shop") o sube una tuya.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const elegir = (f) => {
    const { descarga, ...foto } = f;
    if (descarga) api('/fotos/usar', { metodo: 'POST', cuerpo: { descarga }, token }).catch(() => {});
    onElegir({ ...foto, manual: true });
  };

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCargando(true);
    setError('');
    try {
      const dataUrl = await leerImagen(file);
      await onElegir(null, dataUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="ed-modal-caja">
        <div className="ed-modal-top">
          <h3>{titulo}</h3>
          <button type="button" className="ed-icono" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>
        {!soloSubir && (
          <div className="ed-tabs ed-tabs-sm">
            <button type="button" className={pestana === 'buscar' ? 'on' : ''} onClick={() => setPestana('buscar')}><Search /> Buscar fotos</button>
            <button type="button" className={pestana === 'subir' ? 'on' : ''} onClick={() => setPestana('subir')}><Upload /> Subir la mía</button>
          </div>
        )}

        {pestana === 'buscar' ? (
          <>
            <form className="ed-buscar" onSubmit={buscar}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: coffee shop, hair salon, bakery" maxLength={60} autoFocus />
              <button type="submit" className="ed-btn" disabled={cargando}>{cargando ? <Loader2 className="cr-gira" /> : <Search />} Buscar</button>
            </form>
            <p className="ed-nota">Fotos con licencia libre de Unsplash. Funcionan mejor las búsquedas en inglés.</p>
            {fotos?.length > 0 && (
              <div className="ed-fotos">
                {fotos.map((f) => (
                  <button type="button" key={f.url} onClick={() => elegir(f)} title={f.alt}>
                    <img src={f.url_chica} alt={f.alt} loading="lazy" />
                    {f.autor && <span>{f.autor}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="ed-subir">
            <button type="button" className="ed-subir-zona" onClick={() => archivo.current?.click()} disabled={cargando}>
              {cargando ? <Loader2 className="cr-gira" /> : <Upload />}
              <b>{cargando ? 'Subiendo…' : 'Elegir una imagen de tu equipo'}</b>
              <span>PNG, JPG o WEBP · máximo 500 KB</span>
            </button>
            <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" onChange={subir} hidden />
            <p className="ed-nota">Sube solo imágenes tuyas o que tengas derecho a usar.</p>
          </div>
        )}

        {error && <div className="cr-aviso error">{error}</div>}
        {onQuitar && (
          <button type="button" className="ed-link ed-quitar" onClick={onQuitar}>Quitar la imagen actual</button>
        )}
      </div>
    </div>
  );
}
