import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseAdmin();
  const [rounds, votes, songs, queue, history] = await Promise.all([
    db.from("rondas").select("id,estado,inicia_en,cierra_en,ganador_id,resultado,creada_en").order("creada_en", { ascending: false }).limit(25),
    db.from("votos").select("ronda_id,cancion_id,creado_en").order("creado_en", { ascending: false }).limit(1000),
    db.from("canciones").select("id,titulo,artista,autorizada,activa,explicita,autorizacion_verificada").order("titulo"),
    db.from("cola_reproduccion").select("id,tipo,estado,creada_en,canciones(id,titulo,artista),rondas(id)").order("posicion", { ascending: false }).limit(30),
    db.from("historial_reproduccion").select("id,tipo,detalle,ocurrido_en,canciones(titulo,artista),anuncios(titulo)").order("ocurrido_en", { ascending: false }).limit(50),
  ]);
  if ([rounds, votes, songs, queue, history].some((result) => result.error)) return NextResponse.json({ error: "No se pudieron cargar las estadísticas." }, { status: 503 });
  const voteCounts = new Map<string, number>();
  for (const vote of votes.data ?? []) voteCounts.set(vote.ronda_id, (voteCounts.get(vote.ronda_id) ?? 0) + 1);
  return NextResponse.json({
    rounds: (rounds.data ?? []).map((round) => ({ ...round, totalVotos: voteCounts.get(round.id) ?? 0 })),
    songs: songs.data ?? [], queue: queue.data ?? [], history: history.data ?? [],
    totals: { canciones: songs.data?.length ?? 0, cancionesAutorizadas: songs.data?.filter((song) => song.activa && song.autorizada && song.autorizacion_verificada && !song.explicita).length ?? 0, rondas: rounds.data?.length ?? 0, votos: votes.data?.length ?? 0 },
  });
}
