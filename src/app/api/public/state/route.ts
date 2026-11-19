import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data: active } = await db.from("rondas").select("*").eq("estado", "abierta").order("creada_en", { ascending: false }).limit(1).maybeSingle();
    if (active && Date.now() >= new Date(active.cierra_en).getTime()) await db.rpc("cerrar_ronda_vencida", { p_ronda: active.id });
    const { data: round } = active && Date.now() < new Date(active.cierra_en).getTime()
      ? { data: active }
      : await db.from("rondas").select("*").in("estado", ["cerrada", "abierta"]).order("creada_en", { ascending: false }).limit(1).maybeSingle();
    if (!round) return NextResponse.json({ serverTime: new Date().toISOString(), round: null, playback: { state: "deshabilitado", message: "No hay una fuente de reproducción autorizada configurada." } });
    const [{ data: choices }, { data: votes }] = await Promise.all([
      db.from("candidatas_ronda").select("posicion,puntuacion,razones,canciones(id,titulo,artista,duracion_segundos,proveedor,id_proveedor,url_proveedor)").eq("ronda_id", round.id).order("posicion"),
      db.from("votos").select("cancion_id").eq("ronda_id", round.id),
    ]);
    const counts = new Map<string, number>();
    for (const vote of votes ?? []) counts.set(vote.cancion_id, (counts.get(vote.cancion_id) ?? 0) + 1);
    type PublicChoiceRow = { posicion: number; puntuacion: number; razones: string[]; canciones: { id: string; titulo: string; artista: string; duracion_segundos: number | null; proveedor: string | null; id_proveedor: string | null; url_proveedor: string | null } | null };
    const choiceRows = (choices ?? []) as unknown as PublicChoiceRow[];
    return NextResponse.json({
      serverTime: new Date().toISOString(),
      round: { id: round.id, status: round.estado, startsAt: round.inicia_en, closesAt: round.cierra_en, winnerId: round.ganador_id, result: round.resultado,
        choices: choiceRows.map((row) => ({ ...row.canciones, position: row.posicion, score: row.puntuacion, reasons: row.razones, votes: counts.get(row.canciones?.id ?? "") ?? 0 })) },
      playback: { state: "deshabilitado", message: "La reproducción permanece detenida hasta configurar un proveedor autorizado para el campus." },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al consultar la programación pública:", error);
    return NextResponse.json({ error: "No se pudo consultar la programación." }, { status: 503 });
  }
}
