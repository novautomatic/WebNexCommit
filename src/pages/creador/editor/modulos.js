// El editor pinta la vista previa con la MISMA plantilla que publica el
// backend (Agente-Next/back/src/creador/plantilla.js): la importa en vivo desde
// GET /creador/modulos/*. Así lo que el cliente edita es exactamente lo que
// ven sus visitas, sin mantener dos copias del diseño.
import { CREADOR_API } from '../../../config/creador';

let carga;

export function cargarModulos() {
  if (!carga) {
    carga = Promise.all([
      import(/* @vite-ignore */ `${CREADOR_API}/modulos/plantilla.js`),
      import(/* @vite-ignore */ `${CREADOR_API}/modulos/esquema.js`),
    ])
      .then(([plantilla, esquema]) => ({ plantilla, esquema }))
      .catch((e) => {
        carga = null;
        throw e;
      });
  }
  return carga;
}

/** Copia `obj` cambiando el valor en `ruta` ("hero.titulo", "servicios.0.texto"). */
export function setRuta(obj, ruta, valor) {
  const claves = ruta.split('.');
  const raiz = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = raiz;
  for (let i = 0; i < claves.length - 1; i += 1) {
    const hijo = cur[claves[i]];
    cur[claves[i]] = Array.isArray(hijo) ? [...hijo] : { ...(hijo ?? {}) };
    cur = cur[claves[i]];
  }
  cur[claves[claves.length - 1]] = valor;
  return raiz;
}

export function getRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Lee un archivo como data URL validando tipo y peso (500 KB). */
export function leerImagen(file) {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('La imagen debe ser PNG, JPG o WEBP.'));
      return;
    }
    if (file.size > 500 * 1024) {
      reject(new Error('La imagen pesa más de 500 KB. Prueba con una versión más liviana.'));
      return;
    }
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No pudimos leer la imagen.'));
    lector.readAsDataURL(file);
  });
}
