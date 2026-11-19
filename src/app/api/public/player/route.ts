import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { avisarActualizacionPublica, supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ queueId: z.string().uuid(), action: z.enum(["iniciada", "finalizada", "fallida"]) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Evento de reproducción inválido." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: entry } = await db.from("cola_reproduccion").select("id,cancion_id,estado,tipo,canciones(autorizada,autorizacion_verificada,activa,explicita,proveedor,id_proveedor)").eq("id", parsed.data.queueId).eq("tipo", "cancion").maybeSingle();
  if (!entry) return NextResponse.json({ error: "La entrada ya no existe." }, { status: 404 });
  type PlayerSong = { activa: boolean; autorizada: boolean; autorizacion_verificada: boolean; explicita: boolean; proveedor: string | null; id_proveedor: string | null };
  const relation = entry.canciones as unknown as PlayerSong | PlayerSong[] | null;
  const song = Array.isArray(relation) ? relation[0] : relation;
  if (parsed.data.action === "iniciada" && (!song?.activa || !song.autorizada || !song.autorizacion_verificada || song.explicita)) return NextResponse.json({ error: "La canción dejó de estar autorizada." }, { status: 403 });
  const status = parsed.data.action === "iniciada" ? "reproduciendo" : parsed.data.action === "finalizada" ? "completado" : "fallido";
  if (parsed.data.action === "iniciada" && entry.estado !== "pendiente") return NextResponse.json({ ok: true });
  if (parsed.data.action !== "iniciada" && entry.estado !== "reproduciendo") return NextResponse.json({ ok: true });
  const { error } = await db.from("cola_reproduccion").update({ estado: status }).eq("id", entry.id).eq("estado", entry.estado);
  if (error) return NextResponse.json({ error: "No se pudo guardar el estado del reproductor." }, { status: 503 });
  await db.from("historial_reproduccion").insert({ tipo: parsed.data.action, cancion_id: entry.cancion_id, detalle: { proveedor: song?.proveedor, track_id: song?.id_proveedor } });
  await avisarActualizacionPublica();
  return NextResponse.json({ ok: true });
}
