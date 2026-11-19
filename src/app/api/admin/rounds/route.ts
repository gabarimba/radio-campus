import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { obtenerTemperatura } from "@/lib/clima";
import { elegirCandidatas, type Cancion, type Regla } from "@/lib/seleccion";
import { avisarActualizacionPublica, supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "Se requiere acceso de administración." }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const body = await request.json().catch(() => ({})) as { force?: boolean };
    const { data: existing } = await db.from("rondas").select("id").eq("estado", "abierta").maybeSingle();
    if (existing) return NextResponse.json({ error: "Ya hay una ronda abierta." }, { status: 409 });
    const [{ data: config }, { data: songs }, { data: rules }, { data: events }, { data: recentRows }] = await Promise.all([
      db.from("configuracion").select("clave,valor"),
      db.from("canciones").select("id,titulo,artista,prioridad,explicita,autorizada,activa,cancion_etiquetas(etiquetas(categoria,nombre))").eq("activa", true).eq("autorizada", true).eq("autorizacion_verificada", true).eq("explicita", false),
      db.from("reglas_contextuales").select("nombre,prioridad,condicion,preferencias,activa").eq("activa", true).order("prioridad", { ascending: false }),
      db.from("eventos_calendario").select("nombre,inicia_en,termina_en,prioridad").eq("activo", true).lte("inicia_en", new Date().toISOString()).gte("termina_en", new Date().toISOString()).order("prioridad", { ascending: false }),
      db.from("historial_reproduccion").select("cancion_id").eq("tipo", "finalizada").not("cancion_id", "is", null).order("ocurrido_en", { ascending: false }).limit(100),
    ]);
    const settings = Object.fromEntries((config ?? []).map((item) => [item.clave, item.valor]));
    if (settings.programacion_pausada === true) return NextResponse.json({ error: "La programación está pausada." }, { status: 409 });
    const coordinates = settings.coordenadas as { lat?: number; lon?: number } | undefined;
    const lat = Number(coordinates?.lat ?? process.env.DEFAULT_LATITUDE ?? 19.4326);
    const lon = Number(coordinates?.lon ?? process.env.DEFAULT_LONGITUDE ?? -99.1332);
    const temperature = await obtenerTemperatura(lat, lon);
    const timezone = String(settings.zona_horaria ?? process.env.DEFAULT_TIMEZONE ?? "America/Mexico_City");
    const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date()));
    type SongRow = Omit<Cancion, "etiquetas"> & { cancion_etiquetas: { etiquetas: { categoria: string; nombre: string } | null }[] };
    const eventRows = (events ?? []) as unknown as { nombre: string }[];
    const songRows = (songs ?? []) as unknown as SongRow[];
    const historyRows = (recentRows ?? []) as unknown as { cancion_id: string | null }[];
    const context = { hora: hour, temperatura: temperature, eventos: eventRows.map((e) => e.nombre) };
    const candidates: Cancion[] = songRows.map((song) => ({ ...song, etiquetas: (song.cancion_etiquetas ?? []).map((x) => `${x.etiquetas?.categoria}:${x.etiquetas?.nombre}`) }));
    const repeatWindow = Number(settings.ventana_repeticion ?? 12);
    const selection = elegirCandidatas({ canciones: candidates, reglas: (rules ?? []) as unknown as Regla[], contexto: context, recientes: historyRows.slice(0, repeatWindow).map((x) => x.cancion_id).filter((id): id is string => id !== null), respaldo: (settings.canciones_respaldo as string[]) ?? [] });
    if (selection.length < 2) return NextResponse.json({ error: "No hay dos canciones autorizadas y elegibles. Configura catálogo y selección de respaldo." }, { status: 422 });
    const seconds = Number(settings.duracion_ronda_segundos ?? 240);
    const started = new Date();
    const closes = new Date(started.getTime() + seconds * 1000);
    const { data: round, error } = await db.from("rondas").insert({ estado: "abierta", inicia_en: started.toISOString(), cierra_en: closes.toISOString(), duracion_segundos: seconds, regla_desempate: settings.regla_desempate ?? "prioridad", contexto: { ...context, weatherFallback: temperature === null, regla: rules?.[0]?.nombre ?? "contexto base" } }).select("id").single();
    if (error) throw error;
    const { error: candidateError } = await db.from("candidatas_ronda").insert(selection.map((item, i) => ({ ronda_id: round.id, cancion_id: item.cancion.id, posicion: i + 1, puntuacion: item.puntuacion, razones: item.razones })));
    if (candidateError) { await db.from("rondas").delete().eq("id", round.id); throw candidateError; }
    await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "crear_ronda", entidad: "rondas", entidad_id: round.id, detalle: { force: Boolean(body.force), canciones: selection.map((x) => x.cancion.id) } });
    await avisarActualizacionPublica();
    return NextResponse.json({ ok: true, roundId: round.id, closesAt: closes.toISOString(), choices: selection.map((x) => ({ id: x.cancion.id, title: x.cancion.titulo, artist: x.cancion.artista, reasons: x.razones })) }, { status: 201 });
  } catch (error) {
    console.error("Error al iniciar ronda:", error);
    return NextResponse.json({ error: "No se pudo iniciar la ronda." }, { status: 503 });
  }
}
