// Portal de clientes (/mi-espacio): lo que necesita la service role y por eso
// no puede ir en el navegador ni en SQL.
//
//   POST { accion: "entrar", token }        enlace de un correo (1 día) → token_hash
//                                           para supabase.auth.verifyOtp (sesión real)
//   POST { accion: "dar_acceso", contacto_id }   (sesión de alguien del equipo)
//                                           crea o reinicia el usuario con una
//                                           contraseña fácil y manda la bienvenida
//   POST { accion: "purgar", secreto }      cron de retención: borra de Storage
//                                           los archivos quitados o vencidos
//
// Despliegue: supabase functions deploy portal-clientes --no-verify-jwt
// (cada acción verifica lo suyo: el token del enlace, la sesión del equipo o
// el secreto de Vault portal_cron_secreto). Migraciones 20261019120100…121400.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_SUPABASE, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORIGENES = new Set(["https://www.nexcommit.com", "http://localhost:5173", "http://localhost:4173"]);

function cors(req: Request): Record<string, string> {
  const origen = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.has(origen) ? origen : "https://www.nexcommit.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    Vary: "Origin",
  };
}

// Contraseña fácil de leer y dictar: Palabra-Palabra-NN (~2 millones de
// combinaciones; Supabase limita los intentos de login por IP).
const SUSTANTIVOS = [
  "Sol", "Luna", "Mar", "Rio", "Lago", "Nube", "Flor", "Hoja", "Roca", "Isla", "Bosque", "Monte", "Valle", "Playa",
  "Arena", "Brisa", "Lluvia", "Nieve", "Faro", "Puente", "Camino", "Jardin", "Huerto", "Trigo", "Maiz", "Uva",
  "Pera", "Mango", "Coco", "Kiwi", "Limon", "Cereza", "Tomate", "Canela", "Vainilla", "Cacao", "Miel", "Pan",
  "Queso", "Tigre", "Puma", "Zorro", "Lobo", "Oso", "Gato", "Perro", "Conejo", "Ardilla", "Delfin", "Ballena",
  "Pinguino", "Condor", "Halcon", "Buho", "Loro", "Tucan", "Colibri", "Pato", "Cisne", "Abeja", "Mariposa",
  "Estrella", "Cometa", "Planeta", "Volcan", "Glaciar", "Pino", "Roble", "Cedro", "Palma", "Cactus", "Helecho",
  "Tulipan", "Rosa", "Lirio", "Orquidea", "Girasol", "Barco", "Velero", "Globo", "Tren", "Cohete", "Libro",
  "Lapiz", "Piano", "Guitarra", "Tambor", "Violin", "Reloj", "Llave", "Farol", "Vela", "Taza", "Mesa", "Silla",
];
const ADJETIVOS = [
  "Verde", "Azul", "Rojo", "Dorado", "Plata", "Rosado", "Morado", "Blanco", "Celeste", "Coral", "Turquesa",
  "Feliz", "Alegre", "Veloz", "Tranquilo", "Brillante", "Suave", "Fuerte", "Valiente", "Sabio", "Amable",
  "Gentil", "Noble", "Libre", "Grande", "Alto", "Claro", "Fresco", "Dulce", "Calido", "Sereno", "Curioso",
  "Atento", "Agil", "Firme", "Leal", "Audaz", "Genial", "Magico", "Radiante", "Sonriente", "Jugoso", "Crujiente",
  "Picante", "Salado", "Tibio", "Nuevo", "Bonito", "Lindo", "Chistoso", "Elegante", "Simple", "Rapido", "Lento",
  "Paciente", "Tierno", "Gigante", "Mini", "Brioso", "Lucido", "Optimo", "Pleno", "Sutil", "Vivo", "Epico",
  "Estelar", "Solar", "Lunar", "Polar", "Tropical", "Andino", "Austral", "Costero", "Sureno", "Norteno",
  "Primero", "Ultimo", "Unico", "Real", "Fino", "Puro", "Sano", "Bueno", "Mejor", "Super", "Mega", "Ultra",
  "Astuto", "Bravo", "Cordial", "Digno", "Exacto", "Fiel", "Humilde", "Ideal", "Justo", "Leve", "Manso",
];

function azar(n: number): number {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % n;
}

function claveFacil(): string {
  return `${SUSTANTIVOS[azar(SUSTANTIVOS.length)]}-${ADJETIVOS[azar(ADJETIVOS.length)]}-${10 + azar(90)}`;
}

async function esEquipo(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const comoUsuario = createClient(URL_SUPABASE, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await comoUsuario.rpc("es_equipo");
  return !error && data === true;
}

async function buscarUsuario(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

class Aviso extends Error {}

async function entrar(b: Record<string, unknown>) {
  const token = typeof b.token === "string" ? b.token : "";
  if (!/^[0-9a-f]{48}$/.test(token)) throw new Aviso("Este enlace no es válido.");
  const { data: email, error } = await admin.rpc("portal_canjear_enlace", { p_token: token });
  if (error) throw error;
  if (!email) throw new Aviso("Este enlace ya venció (duran 1 día). Entra con tu correo y contraseña, o espera el próximo correo.");
  const { data, error: e2 } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (e2) throw e2;
  return { token_hash: data.properties.hashed_token };
}

async function darAcceso(req: Request, b: Record<string, unknown>) {
  if (!(await esEquipo(req))) throw new Aviso("No autorizado.");
  const id = typeof b.contacto_id === "string" ? b.contacto_id : "";
  const { data: c, error } = await admin
    .from("cliente_contactos")
    .select("id, email, nombre, user_id, activo, anonimizado_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!c || !c.activo || c.anonimizado_at) throw new Aviso("El contacto no existe o está desactivado.");
  const { data: delEquipo } = await admin.from("equipo").select("id").ilike("email", c.email).maybeSingle();
  if (delEquipo) throw new Aviso("Ese correo es de alguien del equipo.");

  const clave = claveFacil();
  let userId: string | null = c.user_id;
  if (userId) {
    const { error: e } = await admin.auth.admin.updateUserById(userId, { password: clave });
    if (e) userId = null; // el usuario se borró a mano: se crea de nuevo
  }
  if (!userId) {
    const { data: creado, error: e } = await admin.auth.admin.createUser({
      email: c.email,
      password: clave,
      email_confirm: true,
      user_metadata: { tipo: "cliente", nombre: c.nombre },
    });
    if (creado?.user) {
      userId = creado.user.id;
    } else {
      // Ya existía en Auth (por ejemplo, creó una página en el Creador).
      userId = await buscarUsuario(c.email);
      if (!userId) throw e ?? new Error("No se pudo crear el usuario.");
      const { error: e3 } = await admin.auth.admin.updateUserById(userId, { password: clave, email_confirm: true });
      if (e3) throw e3;
    }
  }
  const { error: e4 } = await admin.rpc("portal_acceso_preparar", { p_contacto: c.id, p_user: userId, p_clave: clave });
  if (e4) throw e4;
  return { ok: true, email: c.email };
}

async function purgar(b: Record<string, unknown>) {
  const { data: rutas, error } = await admin.rpc("portal_purga_pendiente", { p_secreto: String(b.secreto ?? "") });
  if (error) throw new Aviso("No autorizado.");
  if (!rutas?.length) return { borrados: 0 };
  const { error: e2 } = await admin.storage.from("tareas-clientes").remove(rutas);
  if (e2) throw e2;
  const { error: e3 } = await admin.rpc("portal_purga_hecha", { p_rutas: rutas });
  if (e3) throw e3;
  return { borrados: rutas.length };
}

Deno.serve(async (req: Request) => {
  const h = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método no permitido." }), { status: 405, headers: h });
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    let r: unknown;
    if (b.accion === "entrar") r = await entrar(b);
    else if (b.accion === "dar_acceso") r = await darAcceso(req, b);
    else if (b.accion === "purgar") r = await purgar(b);
    else throw new Aviso("Acción desconocida.");
    return new Response(JSON.stringify(r), { headers: h });
  } catch (err) {
    // Al navegador solo llegan los mensajes pensados para él (los propios y
    // los RAISE EXCEPTION de SQL, código P0001).
    const aviso = err instanceof Aviso || (err as { code?: string })?.code === "P0001";
    if (!aviso) console.error("[portal-clientes]", err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: aviso ? (err as Error).message : "No pudimos completar la acción. Intenta de nuevo en un rato." }),
      { status: aviso ? 400 : 500, headers: h },
    );
  }
});
