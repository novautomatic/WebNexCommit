// Client-side crypto for the password vault (panel → Bóveda).
//
// Design: a random data key (DEK, AES-GCM 256) encrypts every entry. The DEK is stored
// only wrapped by a key derived from the master password (PBKDF2-SHA256). Changing the
// master password re-wraps the DEK, so entries never need re-encrypting. Supabase only
// ever sees ciphertext; the master password and the DEK never leave the browser.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const ITERACIONES = 600000;
export const MIN_PASSWORD = 10;

const aB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n));

async function derivarKek(password, sal, iteraciones) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// "iv.ciphertext" in base64. A fresh random IV per message.
async function sellar(llave, bytes) {
  const iv = aleatorio(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, bytes);
  return `${aB64(iv)}.${aB64(ct)}`;
}

async function abrir(llave, texto) {
  const [iv, ct] = texto.split('.');
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, llave, deB64(ct));
}

const importarDek = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

async function desenvolver(password, config) {
  try {
    const kek = await derivarKek(password, deB64(config.sal), config.iteraciones);
    return new Uint8Array(await abrir(kek, config.clave_envuelta));
  } catch {
    // AES-GCM authentication fails when the password is wrong.
    throw new Error('Contraseña maestra incorrecta.');
  }
}

async function envolver(password, rawDek, iteraciones = ITERACIONES) {
  const sal = aleatorio(16);
  const kek = await derivarKek(password, sal, iteraciones);
  return { sal: aB64(sal), iteraciones, clave_envuelta: await sellar(kek, rawDek) };
}

// New vault: returns the row for `boveda_config` and the in-memory data key.
export async function crearBoveda(password) {
  const raw = aleatorio(32);
  const config = await envolver(password, raw);
  const llave = await importarDek(raw);
  raw.fill(0);
  return { config, llave };
}

export async function abrirBoveda(password, config) {
  const raw = await desenvolver(password, config);
  const llave = await importarDek(raw);
  raw.fill(0);
  return llave;
}

// Returns the new `boveda_config` fields; entries stay untouched.
export async function cambiarPassword(config, actual, nueva) {
  const raw = await desenvolver(actual, config);
  const nuevo = await envolver(nueva, raw);
  raw.fill(0);
  return nuevo;
}

export async function cifrarDatos(llave, obj) {
  return sellar(llave, enc.encode(JSON.stringify(obj)));
}

export async function descifrarDatos(llave, texto) {
  return JSON.parse(dec.decode(await abrir(llave, texto)));
}

const SIMBOLOS = '!#$%&*+-=?@^_';
const ALFABETO = `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789${SIMBOLOS}`;

// Random password; rejection sampling avoids modulo bias.
export function generarClave(largo = 20) {
  const tope = 256 - (256 % ALFABETO.length);
  let out = '';
  while (out.length < largo) {
    for (const b of aleatorio(largo * 2)) {
      if (b < tope && out.length < largo) out += ALFABETO[b % ALFABETO.length];
    }
  }
  return out;
}
