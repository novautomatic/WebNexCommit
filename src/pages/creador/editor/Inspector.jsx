// Panel derecho del editor: formularios de cada sección, estilo de la sección,
// diseño general de la página y la lista de secciones (estructura).
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Trash2 } from 'lucide-react';

// ─── Campos ─────────────────────────────────────────────────────────────────
export function Campo({ label, valor, onCambio, max, multi = false, ayuda, placeholder, tipo = 'text' }) {
  const v = valor ?? '';
  return (
    <label className="ed-campo">
      <span>{label}{max ? <em>{v.length}/{max}</em> : null}</span>
      {multi ? (
        <textarea value={v} maxLength={max} rows={4} placeholder={placeholder} onChange={(e) => onCambio(e.target.value)} />
      ) : (
        <input type={tipo} value={v} maxLength={max} placeholder={placeholder} onChange={(e) => onCambio(e.target.value)} />
      )}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

function Opciones({ label, valor, opciones, onCambio }) {
  return (
    <div className="ed-campo">
      <span>{label}</span>
      <div className="ed-segmento">
        {opciones.map((o) => (
          <button key={o.v} type="button" className={valor === o.v ? 'on' : ''} onClick={() => onCambio(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function SelectorIcono({ valor, iconos, svg, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="ed-ic-wrap">
      <button type="button" className="ed-ic-actual" onClick={() => setAbierto((a) => !a)} title="Cambiar ícono"
        dangerouslySetInnerHTML={{ __html: svg(valor) }} />
      {abierto && (
        <div className="ed-ic-grid">
          {iconos.map((i) => (
            <button key={i} type="button" className={i === valor ? 'on' : ''} title={i}
              onClick={() => { onCambio(i); setAbierto(false); }} dangerouslySetInnerHTML={{ __html: svg(i) }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Lista editable de ítems (servicios, ventajas, pasos, preguntas). */
function Lista({ titulo, items, max, nuevo, campos, onCambio, iconos, svg }) {
  const cambiarItem = (i, patch) => onCambio(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copia = [...items];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onCambio(copia);
  };
  return (
    <div className="ed-lista">
      <div className="ed-lista-top"><span>{titulo}</span><em>{items.length}/{max}</em></div>
      {items.map((it, i) => (
        <div className="ed-item" key={i}>
          <div className="ed-item-top">
            {iconos && <SelectorIcono valor={it.icono} iconos={iconos} svg={svg} onCambio={(v) => cambiarItem(i, { icono: v })} />}
            <b>#{i + 1}</b>
            <div className="ed-item-acc">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp /></button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === items.length - 1} aria-label="Bajar"><ArrowDown /></button>
              <button type="button" onClick={() => onCambio(items.filter((_, j) => j !== i))} aria-label="Eliminar" className="rojo"><Trash2 /></button>
            </div>
          </div>
          {campos.map((c) => (
            <Campo key={c.k} label={c.l} valor={it[c.k]} max={c.max} multi={c.multi} onCambio={(v) => cambiarItem(i, { [c.k]: v })} />
          ))}
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="ed-agregar" onClick={() => onCambio([...items, nuevo()])}><Plus /> Agregar</button>
      )}
    </div>
  );
}

function BotonFoto({ foto, texto, onClick }) {
  return (
    <button type="button" className="ed-foto-btn" onClick={onClick}>
      {foto ? <img src={foto.url_chica || foto.url} alt="" /> : <span className="ed-foto-vacia"><ImagePlus /></span>}
      <span>{texto}</span>
    </button>
  );
}

// ─── Estilo de la sección ───────────────────────────────────────────────────
function Estilo({ seccion, colores, onCambio }) {
  const est = seccion.estilo || {};
  const set = (patch) => onCambio({ ...est, ...patch });
  const fondos = [
    { v: 'auto', l: 'Automático', muestra: 'repeating-conic-gradient(#d7dee7 0% 25%, #fff 0% 50%) 50% / 10px 10px' },
    { v: 'claro', l: 'Claro', muestra: colores.modo === 'oscuro' ? '#0d1117' : '#ffffff' },
    { v: 'alterno', l: 'Suave', muestra: colores.modo === 'oscuro' ? '#151b24' : '#f6f7f9' },
    { v: 'primario', l: 'Tu color', muestra: colores.primario },
    { v: 'oscuro', l: 'Oscuro', muestra: '#0f172a' },
  ];
  const esHero = seccion.tipo === 'hero';
  return (
    <div className="ed-estilo">
      <p className="ed-sub">Estilo de la sección</p>
      {!esHero && (
        <div className="ed-campo">
          <span>Fondo</span>
          <div className="ed-muestras">
            {fondos.map((f) => (
              <button key={f.v} type="button" className={(est.fondo || 'auto') === f.v ? 'on' : ''} onClick={() => set({ fondo: f.v })} title={f.l}>
                <i style={{ background: f.muestra }} /><span>{f.l}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Opciones label={esHero ? 'Alto' : 'Espaciado'} valor={est.espaciado || 'normal'} onCambio={(v) => set({ espaciado: v })}
        opciones={[{ v: 'compacto', l: esHero ? 'Bajo' : 'Poco' }, { v: 'normal', l: 'Normal' }, { v: 'amplio', l: esHero ? 'Alto' : 'Mucho' }]} />
      <Opciones label="Alineación" valor={est.alineacion || 'izquierda'} onCambio={(v) => set({ alineacion: v })}
        opciones={[{ v: 'izquierda', l: 'Izquierda' }, { v: 'centro', l: 'Centro' }]} />
    </div>
  );
}

// ─── Formulario por tipo de sección ─────────────────────────────────────────
export function FormSeccion({ seccion, indice, contenido, mod, campo, set, abrirFoto }) {
  const L = mod.esquema.LIMITES;
  const iconos = mod.esquema.ICONOS;
  const svg = mod.plantilla.svgIcono;
  const ruta = (r) => `secciones.${indice}.props.${r}`;
  const p = seccion.props || {};
  const itemIcono = () => ({ titulo: 'Nuevo', texto: '', icono: 'check' });

  switch (seccion.tipo) {
    case 'hero':
      return (
        <>
          <BotonFoto foto={contenido.fotos?.portada} texto="Foto de portada" onClick={() => abrirFoto('portada')} />
          {campo('eslogan', 'Frase sobre el título', L.eslogan)}
          {campo('hero.titulo', 'Título', L.heroTitulo)}
          {campo('hero.subtitulo', 'Subtítulo', L.heroSubtitulo, true)}
          {campo('hero.boton', 'Texto del botón', L.boton)}
        </>
      );
    case 'servicios':
      return (
        <>
          {campo('servicios_titulo', 'Título de la sección', L.tituloSeccion)}
          <Lista titulo="Servicios" items={contenido.servicios} max={L.servicios} nuevo={itemIcono} iconos={iconos} svg={svg}
            campos={[{ k: 'titulo', l: 'Nombre', max: L.itemTitulo }, { k: 'texto', l: 'Descripción', max: L.itemTexto, multi: true }]}
            onCambio={(v) => set('servicios', v)} />
        </>
      );
    case 'nosotros':
      return (
        <>
          <BotonFoto foto={contenido.fotos?.nosotros} texto="Foto de la sección" onClick={() => abrirFoto('nosotros')} />
          {campo('nosotros.titulo', 'Título', L.tituloSeccion)}
          {campo('nosotros.texto', 'Texto', L.nosotros, true)}
        </>
      );
    case 'ventajas':
      return (
        <Lista titulo="Ventajas" items={contenido.ventajas} max={L.ventajas} nuevo={itemIcono} iconos={iconos} svg={svg}
          campos={[{ k: 'titulo', l: 'Título', max: L.itemTitulo }, { k: 'texto', l: 'Detalle', max: L.itemTexto, multi: true }]}
          onCambio={(v) => set('ventajas', v)} />
      );
    case 'cta':
      return (
        <>
          {campo('cta.titulo', 'Título', L.tituloSeccion)}
          {campo('cta.texto', 'Texto', L.cta, true)}
          <p className="ed-nota">El botón usa el mismo texto que el de la portada.</p>
        </>
      );
    case 'contacto':
      return (
        <>
          <p className="ed-nota">Estos datos aparecen en tu página y en los botones de WhatsApp. Los mensajes del formulario te llegan al correo con el que te registraste.</p>
          {campo('contacto.whatsapp', 'WhatsApp', 20, false, 'Ej: +56 9 1234 5678')}
          {campo('contacto.telefono', 'Teléfono', 20)}
          {campo('contacto.email', 'Correo', 120)}
          {campo('contacto.instagram', 'Instagram', 60, false, '@tunegocio')}
          {campo('contacto.direccion', 'Dirección', 140)}
          {campo('contacto.horario', 'Horario', 120)}
        </>
      );
    case 'texto':
      return (
        <>
          {campo(ruta('titulo'), 'Título', L.tituloSeccion)}
          {campo(ruta('texto'), 'Texto', L.texto, true)}
        </>
      );
    case 'pasos':
      return (
        <>
          {campo(ruta('titulo'), 'Título', L.tituloSeccion)}
          <Lista titulo="Pasos" items={p.items || []} max={L.pasos} nuevo={() => ({ titulo: 'Nuevo paso', texto: '' })}
            campos={[{ k: 'titulo', l: 'Paso', max: L.itemTitulo }, { k: 'texto', l: 'Detalle', max: L.itemTexto, multi: true }]}
            onCambio={(v) => set(ruta('items'), v)} />
        </>
      );
    case 'faq':
      return (
        <>
          {campo(ruta('titulo'), 'Título', L.tituloSeccion)}
          <Lista titulo="Preguntas" items={p.items || []} max={L.faq} nuevo={() => ({ p: 'Nueva pregunta', r: '' })}
            campos={[{ k: 'p', l: 'Pregunta', max: L.pregunta }, { k: 'r', l: 'Respuesta', max: L.respuesta, multi: true }]}
            onCambio={(v) => set(ruta('items'), v)} />
        </>
      );
    case 'galeria':
      return (
        <>
          {campo(ruta('titulo'), 'Título', L.tituloSeccion)}
          <div className="ed-galeria">
            {(p.fotos || []).map((f, i) => (
              <div key={f.url} className="ed-galeria-item">
                <img src={f.url_chica || f.url} alt={f.alt} />
                <button type="button" aria-label="Quitar foto" onClick={() => set(ruta('fotos'), p.fotos.filter((_, j) => j !== i))}><Trash2 /></button>
              </div>
            ))}
            {(p.fotos || []).length < L.galeria && (
              <button type="button" className="ed-galeria-mas" onClick={() => abrirFoto('galeria', seccion.id)}><ImagePlus /><span>Agregar foto</span></button>
            )}
          </div>
        </>
      );
    case 'banda':
      return (
        <>
          {campo(ruta('titulo'), 'Título', L.tituloSeccion)}
          {campo(ruta('texto'), 'Texto', L.cta, true)}
          {campo(ruta('boton'), 'Texto del botón', L.boton)}
          <p className="ed-nota">El botón abre tu WhatsApp (o el formulario de contacto si no tienes WhatsApp).</p>
        </>
      );
    default:
      return null;
  }
}

export function PanelSeccion({ seccion, indice, contenido, mod, campo, set, abrirFoto, onEstilo, onCerrar }) {
  const etiqueta = mod.esquema.ETIQUETAS[seccion.tipo];
  return (
    <div className="ed-panel-cuerpo">
      <div className="ed-panel-tit">
        <h3><span>{mod.esquema.ICONOS_SECCION[seccion.tipo]}</span> {etiqueta}</h3>
        <button type="button" className="ed-link" onClick={onCerrar}>Ver todas</button>
      </div>
      <p className="ed-nota">También puedes hacer clic en cualquier texto de la página y escribir directo ahí.</p>
      <FormSeccion seccion={seccion} indice={indice} contenido={contenido} mod={mod} campo={campo} set={set} abrirFoto={abrirFoto} />
      <Estilo seccion={seccion} colores={contenido.colores} onCambio={onEstilo} />
    </div>
  );
}

export function Estructura({ secciones, mod, onSeleccionar, onAccion }) {
  return (
    <div className="ed-panel-cuerpo">
      <div className="ed-panel-tit"><h3>Secciones de tu página</h3></div>
      <p className="ed-nota">Haz clic en una sección para editarla, o directamente sobre la página.</p>
      <ul className="ed-estructura">
        {secciones.map((s, i) => (
          <li key={s.id} className={s.visible ? '' : 'oculta'}>
            <button type="button" className="ed-estructura-nombre" onClick={() => onSeleccionar(s.id)}>
              <span>{mod.esquema.ICONOS_SECCION[s.tipo]}</span>{mod.esquema.ETIQUETAS[s.tipo]}
            </button>
            <div className="ed-item-acc">
              <button type="button" onClick={() => onAccion(s.id, 'subir')} disabled={i === 0} aria-label="Subir"><ArrowUp /></button>
              <button type="button" onClick={() => onAccion(s.id, 'bajar')} disabled={i === secciones.length - 1} aria-label="Bajar"><ArrowDown /></button>
              <button type="button" onClick={() => onAccion(s.id, 'ocultar')} aria-label={s.visible ? 'Ocultar' : 'Mostrar'}>{s.visible ? <Eye /> : <EyeOff />}</button>
              {mod.esquema.TIPOS_EXTRA.includes(s.tipo) && (
                <button type="button" onClick={() => onAccion(s.id, 'eliminar')} aria-label="Eliminar" className="rojo"><Trash2 /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PanelDiseno({ contenido, mod, campo, set, logo, abrirLogo }) {
  const estilos = [
    { v: 'moderno', l: 'Moderno' }, { v: 'elegante', l: 'Elegante' }, { v: 'calido', l: 'Cálido' },
    { v: 'minimalista', l: 'Minimalista' }, { v: 'vibrante', l: 'Vibrante' }, { v: 'natural', l: 'Natural' },
  ];
  const L = mod.esquema.LIMITES;
  const ajustado = mod.esquema.primarioLegible(contenido.colores.primario);
  return (
    <div className="ed-panel-cuerpo">
      <div className="ed-panel-tit"><h3>Diseño general</h3></div>
      <BotonFoto foto={logo ? { url: logo } : null} texto={logo ? 'Cambiar logo' : 'Subir logo'} onClick={abrirLogo} />
      {campo('nombre', 'Nombre del negocio', L.nombre)}
      <div className="ed-campo">
        <span>Colores</span>
        <div className="ed-colores">
          <label><input type="color" value={contenido.colores.primario} onChange={(e) => set('colores.primario', e.target.value)} /> Principal</label>
          <label><input type="color" value={contenido.colores.acento} onChange={(e) => set('colores.acento', e.target.value)} /> Acento</label>
        </div>
        {ajustado !== String(contenido.colores.primario).toLowerCase() && (
          <small>Oscurecemos un poco el color principal para que los textos blancos se lean bien.</small>
        )}
      </div>
      <Opciones label="Modo" valor={contenido.colores.modo} onCambio={(v) => set('colores.modo', v)}
        opciones={[{ v: 'claro', l: 'Claro' }, { v: 'oscuro', l: 'Oscuro' }]} />
      <div className="ed-campo">
        <span>Tipografía</span>
        <div className="ed-segmento ed-segmento-3">
          {estilos.map((o) => (
            <button key={o.v} type="button" className={contenido.estilo === o.v ? 'on' : ''} onClick={() => set('estilo', o.v)}>{o.l}</button>
          ))}
        </div>
      </div>
      {campo('seo_descripcion', 'Descripción para Google y WhatsApp', L.seo, true, '', 'Es el texto que aparece al compartir tu link.')}
    </div>
  );
}

export function Paleta({ mod, onAgregar }) {
  const descripciones = {
    texto: 'Un título y un párrafo libre.',
    pasos: 'Cómo trabajas, en pasos numerados.',
    faq: 'Preguntas y respuestas desplegables.',
    galeria: 'Hasta 9 fotos de tu negocio.',
    banda: 'Franja de color con un botón a WhatsApp.',
  };
  return (
    <div className="ed-paleta">
      {mod.esquema.TIPOS_EXTRA.map((t) => (
        <button key={t} type="button" onClick={() => onAgregar(t)}>
          <span className="ed-paleta-ic">{mod.esquema.ICONOS_SECCION[t]}</span>
          <b>{mod.esquema.ETIQUETAS[t]}</b>
          <small>{descripciones[t]}</small>
        </button>
      ))}
    </div>
  );
}
