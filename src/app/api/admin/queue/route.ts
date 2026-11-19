import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { avisarActualizacionPublica, supabaseAdmin } from "@/lib/supabase-admin";

const actionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("forzar_cancion"), cancion_id: z.string().uuid() }),
  z.object({ accion: z.literal("saltar"), queue_id: z.string().uuid() }),
]);
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acción de cola inválida." }, { status: 400 });
  const db = supabaseAdmin();
  if (parsed.data.accion === "forzar_cancion") {
    const { data: song } = await db.from("canciones").select("id").eq("id", parsed.data.cancion_id).eq("activa", true).eq("autorizada", true).eq("autorizacion_verificada", true).eq("explicita", false).maybeSingle();
    if (!song) return NextResponse.json({ error: "La canción no está activa y autorizada." }, { status: 409 });
    const { data, error } = await db.from("cola_reproduccion").insert({ cancion_id: song.id, tipo: "cancion", estado: "pendiente" }).select().single();
    if (error) return NextResponse.json({ error: "No se pudo agregar a la cola." }, { status: 503 });
    await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "forzar_cancion", entidad: "cola_reproduccion", entidad_id: data.id, detalle: { cancion_id: song.id } });
  } else {
    const { data: item } = await db.from("cola_reproduccion").select("id,cancion_id").eq("id", parsed.data.queue_id).eq("estado", "pendiente").maybeSingle();
    if (!item) return NextResponse.json({ error: "El elemento no está pendiente en la cola." }, { status: 409 });
    const { error } = await db.from("cola_reproduccion").update({ estado: "omitido" }).eq("id", item.id);
    if (error) return NextResponse.json({ error: "No se pudo omitir el elemento." }, { status: 503 });
    await db.from("historial_reproduccion").insert({ tipo: "omitida", cancion_id: item.cancion_id, detalle: { queue_id: item.id } });
    await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "saltar_cola", entidad: "cola_reproduccion", entidad_id: item.id });
  }
  await avisarActualizacionPublica();
  return NextResponse.json({ ok: true });
}
