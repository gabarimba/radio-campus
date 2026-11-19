import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin();
    const playbackQuery = (status: "reproduciendo" | "pendiente") => db.from("cola_reproduccion").select("id,estado,tipo,canciones(id,titulo,artista,duracion_segundos,proveedor,id_proveedor,url_proveedor)").eq("estado", status).eq("tipo", "cancion").order("posicion", { ascending: true }).limit(1).maybeSingle();
    const { data: playing } = await playbackQuery("reproduciendo");
    const { data: queued } = playing ? { data: null } : await playbackQuery("pendiente");
    const currentQueue = playing ?? queued;
    type PublicSong = { id: string; titulo: string; artista: string; duracion_segundos: number | null; proveedor: string | null; id_proveedor: string | null; url_proveedor: string | null };
    const currentRow = currentQueue as unknown as { id: string; estado: string; canciones: PublicSong | PublicSong[] | null } | null;
    const currentSong = Array.isArray(currentRow?.canciones) ? currentRow.canciones[0] : currentRow?.canciones;
    const current = currentSong && currentSong.proveedor === "jamendo" ? { queueId: currentRow?.id, queueStatus: currentRow?.estado, ...currentSong, streamUrl: `/api/public/audio?track=${encodeURIComponent(currentSong.id_proveedor ?? "")}`, attributionUrl: currentSong.url_proveedor } : null;
    const { data: active } = await db.from("rondas").select("*").eq("estado", "abierta").order("creada_en", { ascending: false }).limit(1).maybeSingle();
    if (active && Date.now() >= new Date(active.cierra_en).getTime()) await db.rpc("cerrar_ronda_vencida", { p_ronda: active.id });
    const { data: round } = active && Date.now() < new Date(active.cierra_en).getTime()
      ? { data: active }
      : await db.from("rondas").select("*").in("estado", ["cerrada", "abierta"]).order("creada_en", { ascending: false }).limit(1).maybeSingle();
    if (!round) return NextResponse.json({ serverTime: new Date().toISOString(), round: null, playback: { state: current ? "listo" : "espera", message: current ? "Reproducción Jamendo disponible; inicia el audio en el reproductor principal." : "Esperando una ronda ganadora." , current } });
    const [{ data: choices }, { data: votes }] = await Promise.all([
      db.from("candidatas_ronda").select("posicion,puntuacion,razones,canciones(id,titulo,artista,duracion_segundos,proveedor,id_proveedor,url_proveedor)").eq("ronda_id", round.id).order("posicion"),
      db.from("votos").select("cancion_id").eq("ronda_id", round.id),
    ]);
    const counts = new Map<string, number>();
    for (const vote of votes ?? []) counts.set(vote.cancion_id, (counts.get(vote.cancion_id) ?? 0) + 1);
    type PublicChoiceRow = { posicion: number; puntuacion: number; razones: string[]; canciones: PublicSong | PublicSong[] | null };
    const choiceRows = (choices ?? []) as unknown as PublicChoiceRow[];
    const publicChoices = choiceRows.map((row) => {
      const song = Array.isArray(row.canciones) ? row.canciones[0] : row.canciones;
      return { ...song, position: row.posicion, score: row.puntuacion, reasons: row.razones, votes: counts.get(song?.id ?? "") ?? 0 };
    });
    return NextResponse.json({
      serverTime: new Date().toISOString(),
      round: { id: round.id, status: round.estado, startsAt: round.inicia_en, closesAt: round.cierra_en, winnerId: round.ganador_id, result: round.resultado,
        choices: publicChoices },
      playback: { state: current ? "listo" : "espera", message: current ? "Jamendo · stream por API oficial; pulsa reproducir en el equipo de radio." : "La radio espera la siguiente canción autorizada.", current },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al consultar la programación pública:", error);
    if (error instanceof Error && error.message.includes("Falta configurar Supabase")) return NextResponse.json({ error: "Supabase aún no está configurado en el servidor de Radio Campus." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "No se pudo consultar la programación." }, { status: 503 });
  }
}
