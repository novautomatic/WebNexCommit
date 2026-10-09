// Servidor MCP del tablero de tareas (Streamable HTTP, sin estado).
//
// URL del conector:  https://<proyecto>.supabase.co/functions/v1/mcp-tareas?key=<token>
// Despliegue:        supabase functions deploy mcp-tareas --no-verify-jwt
// (Las Edge Functions aún no soportan auth MCP, por eso el token va en la URL;
// cada socio tiene el suyo, ver `mcp_crear_token` en la migración mcp_tareas.)
//
// Toda la lógica de negocio vive en las funciones mcp_* de Postgres, que
// reutilizan las RPC del panel (tarea_actualizar, tarea_crear…).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const VERSIONES = ["2025-06-18", "2025-03-26", "2024-11-05"];

const COLUMNAS = [
  { columna: "Pendiente", estado: "pendiente", en_github: "issue abierto, sin etiqueta de estado" },
  { columna: "En progreso", estado: "en_progreso", en_github: "issue abierto + etiqueta «en progreso»" },
  { columna: "En revisión", estado: "en_revision", en_github: "issue abierto + etiqueta «en revisión»" },
  { columna: "Bloqueada", estado: "bloqueada", en_github: "issue abierto + etiqueta «bloqueada»" },
  { columna: "Completada", estado: "completada", en_github: "issue cerrado (completed); al sacarla de aquí se reabre" },
];
const NOMBRES_COLUMNA = COLUMNAS.map((c) => c.columna);

type Args = Record<string, unknown>;
type Quien = { equipo_id: string; nombre: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const numero = (v: unknown) => {
  const n = Number(String(v ?? "").replace("#", ""));
  if (!Number.isInteger(n) || n <= 0) throw new Error("`numero` debe ser el número de la tarea, por ejemplo 12.");
  return n;
};

const TOOLS = [
  {
    name: "listar_columnas",
    description: "Lista las columnas del tablero y cómo se refleja cada una en GitHub.",
    inputSchema: { type: "object", properties: {} },
    run: async (_q: Quien, _a: Args) => COLUMNAS,
  },
  {
    name: "mis_tareas",
    description:
      "Tareas del usuario (asignadas a él, más las sin responsable de las áreas que lidera), ordenadas por prioridad y fecha límite. Por defecto solo abiertas; con `columna` filtra esa columna (incluida Completada).",
    inputSchema: {
      type: "object",
      properties: {
        columna: { type: "string", enum: NOMBRES_COLUMNA, description: "Filtrar por columna." },
        prioridad: { type: "string", enum: ["urgente", "alta", "media", "baja"] },
        solo_vencidas: { type: "boolean", description: "Solo las que pasaron su fecha límite." },
      },
    },
    run: async (q: Quien, a: Args) =>
      rpc("mcp_mis_tareas", {
        p_equipo: q.equipo_id,
        p_columna: str(a.columna),
        p_prioridad: str(a.prioridad),
        p_solo_vencidas: a.solo_vencidas === true,
      }),
  },
  {
    name: "ver_tarea",
    description: "Detalle de una tarea por su número (#): descripción, comentarios, historial y estado de sincronización con GitHub.",
    inputSchema: {
      type: "object",
      properties: { numero: { type: "integer", description: "Número de la tarea (#)." } },
      required: ["numero"],
    },
    run: async (q: Quien, a: Args) => rpc("mcp_ver_tarea", { p_equipo: q.equipo_id, p_numero: numero(a.numero) }),
  },
  {
    name: "buscar_tarea",
    description:
      "Busca tareas por texto (título o descripción) o por número (#). Filtros opcionales por proyecto/área, responsable y columna. Por defecto excluye las cerradas.",
    inputSchema: {
      type: "object",
      properties: {
        texto: { type: "string" },
        proyecto: { type: "string", description: "Parte del nombre del proyecto o área." },
        responsable: { type: "string", description: "Parte del nombre del responsable." },
        columna: { type: "string", enum: NOMBRES_COLUMNA },
        incluir_cerradas: { type: "boolean" },
      },
    },
    run: async (q: Quien, a: Args) =>
      rpc("mcp_buscar", {
        p_equipo: q.equipo_id,
        p_texto: str(a.texto),
        p_proyecto: str(a.proyecto),
        p_responsable: str(a.responsable),
        p_columna: str(a.columna),
        p_incluir_cerradas: a.incluir_cerradas === true,
      }),
  },
  {
    name: "mover_tarea",
    description:
      "Mueve una tarea a otra columna. En áreas el cambio es inmediato; en proyectos se envía a GitHub (etiqueta, cierre o reapertura del issue) y se confirma en ~1 minuto. Queda registrado quién la movió.",
    inputSchema: {
      type: "object",
      properties: {
        numero: { type: "integer", description: "Número de la tarea (#)." },
        columna: { type: "string", enum: NOMBRES_COLUMNA },
      },
      required: ["numero", "columna"],
    },
    run: async (q: Quien, a: Args) =>
      rpc("mcp_mover", { p_equipo: q.equipo_id, p_numero: numero(a.numero), p_columna: str(a.columna) }),
  },
  {
    name: "crear_tarea",
    description:
      "Crea una tarea en un ÁREA (las tareas de proyecto nacen en GitHub y no se crean aquí). Si no indicas `area` y lideras una sola, se usa esa. Queda asignada al responsable del área.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        area: { type: "string", description: "Nombre (o parte) del área, p. ej. «RRHH»." },
        descripcion: { type: "string" },
        prioridad: { type: "string", enum: ["urgente", "alta", "media", "baja"] },
        columna: { type: "string", enum: NOMBRES_COLUMNA.filter((c) => c !== "Completada"), description: "Por defecto Pendiente." },
        fecha_limite: { type: "string", description: "AAAA-MM-DD." },
      },
      required: ["titulo"],
    },
    run: async (q: Quien, a: Args) => {
      const fecha = str(a.fecha_limite);
      if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("`fecha_limite` debe ser AAAA-MM-DD.");
      return rpc("mcp_crear_tarea_area", {
        p_equipo: q.equipo_id,
        p_area: str(a.area),
        p_titulo: str(a.titulo),
        p_descripcion: str(a.descripcion),
        p_prioridad: str(a.prioridad) ?? "media",
        p_columna: str(a.columna) ?? "pendiente",
        p_fecha: fecha,
      });
    },
  },
];

async function rpc(fn: string, params: Args) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw new Error(error.message);
  // mover/crear devuelven {ok:false,error} en vez de lanzar, para quedar en el registro.
  if (data && typeof data === "object" && !Array.isArray(data) && (data as Args).ok === false) {
    throw new Error(String((data as Args).error));
  }
  return data;
}

async function sha256Hex(texto: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function autenticar(req: Request): Promise<Quien | null> {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key.length < 20 || key.length > 200) return null;
  const { data, error } = await supabase.rpc("mcp_resolver_token", { p_hash: await sha256Hex(key) });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Quien;
}

const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const rpcError = (id: unknown, code: number, message: string) =>
  json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function manejar(msg: any, quien: Quien) {
  const { id, method, params } = msg;
  if (id === undefined) return null; // notificación (p. ej. notifications/initialized)

  switch (method) {
    case "initialize": {
      const pedida = params?.protocolVersion;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "nexcommit-tareas", version: "1.0.0" },
          instructions:
            `Tablero de tareas de NexCommit. Estás conectado como ${quien.nombre}. ` +
            "Las tareas se identifican por su número (#). Columnas: " + NOMBRES_COLUMNA.join(", ") + ".",
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
      };
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return { jsonrpc: "2.0", id, error: { code: -32602, message: `Herramienta desconocida: ${params?.name}` } };
      try {
        const out = await tool.run(quien, (params?.arguments ?? {}) as Args);
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: message }] } };
      }
    }
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Método no soportado: ${method}` } };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Usa POST (MCP Streamable HTTP)." }, 405);

  const quien = await autenticar(req);
  if (!quien) return json({ error: "No autorizado." }, 401);

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return rpcError(null, -32700, "JSON inválido.");
  }

  if (Array.isArray(cuerpo)) {
    const respuestas = (await Promise.all(cuerpo.map((m) => manejar(m, quien)))).filter((r) => r !== null);
    return respuestas.length ? json(respuestas) : json(null, 202);
  }
  if (!cuerpo || cuerpo.jsonrpc !== "2.0" || typeof cuerpo.method !== "string") {
    return rpcError(cuerpo?.id, -32600, "Solicitud JSON-RPC inválida.");
  }
  const respuesta = await manejar(cuerpo, quien);
  return respuesta ? json(respuesta) : json(null, 202);
});
