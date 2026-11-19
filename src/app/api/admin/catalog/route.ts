import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const songSchema = z.object({ titulo: z.string().trim().min(1).max(160), artista: z.string().trim().min(1).max(160), album: z.string().trim().max(160).optional(), duracion_segundos: z.number().int().positive().optional(), proveedor: z.string().trim().max(40).optional(), id_proveedor: z.string().trim().max(200).optional(), url_proveedor: z.string().url().optional().or(z.literal("")), autorizacion_verificada: z.boolean().default(false), notas_derechos: z.string().max(1000).optional(), autorizada: z.boolean().default(false), explicita: z.boolean().default(false), prioridad: z.number().int().min(-100).max(100).default(0), activa: z.boolean().default(true), etiquetas: z.array(z.object({ categoria: z.enum(["genero", "energia", "ambiente", "tematica", "restriccion"]), nombre: z.string().trim().min(1).max(60) })).max(20).default([]) }).refine((song) => !song.autorizada || song.autorizacion_verificada, { message: "Para habilitar una canción debe verificarse su autorización." });

async function saveTags(songId: string, tags: { categoria: string; nombre: string }[], replace: boolean) {
  const db = supabaseAdmin();
  const unique = [...new Map(tags.map((tag) => [`${tag.categoria}:${tag.nombre.toLowerCase()}`, { categoria: tag.categoria, nombre: tag.nombre }])).values()];
  if (replace) await db.from("cancion_etiquetas").delete().eq("cancion_id", songId);
  for (const tag of unique) {
    const { data: label, error } = await db.from("etiquetas").upsert(tag, { onConflict: "categoria,nombre" }).select("id").single();
    if (error) throw error;
    const { error: relationError } = await db.from("cancion_etiquetas").upsert({ cancion_id: songId, etiqueta_id: label.id });
    if (relationError) throw relationError;
  }
}

export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("canciones").select("*,cancion_etiquetas(etiquetas(id,categoria,nombre))").order("creada_en", { ascending: false });
  if (error) return NextResponse.json({ error: "No se pudo cargar el catálogo." }, { status: 503 });
  return NextResponse.json({ songs: data });
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = songSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los campos de la canción.", fields: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.autorizada && parsed.data.proveedor !== "jamendo") return NextResponse.json({ error: "Solo se puede habilitar reproducción para el adaptador Jamendo conectado." }, { status: 400 });
  const { etiquetas, ...songData } = parsed.data;
  const { data, error } = await supabaseAdmin().from("canciones").insert(songData).select().single();
  if (error) return NextResponse.json({ error: "No se pudo guardar la canción." }, { status: 400 });
  try { await saveTags(data.id, etiquetas, false); } catch (tagError) { await supabaseAdmin().from("canciones").delete().eq("id", data.id); console.error("No se pudieron guardar etiquetas:", tagError); return NextResponse.json({ error: "No se pudieron guardar las etiquetas." }, { status: 400 }); }
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "crear_cancion", entidad: "canciones", entidad_id: data.id, detalle: { titulo: data.titulo } });
  return NextResponse.json({ song: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; changes?: Record<string, unknown> } | null;
  if (!body?.id || !z.string().uuid().safeParse(body.id).success || !body.changes) return NextResponse.json({ error: "Falta un identificador y cambios válidos." }, { status: 400 });
  const parsed = songSchema.partial().safeParse(body.changes);
  if (!parsed.success) return NextResponse.json({ error: "Hay cambios inválidos." }, { status: 400 });
  if (parsed.data.autorizada === true) {
    const { data: current } = await supabaseAdmin().from("canciones").select("proveedor").eq("id", body.id).maybeSingle();
    if ((parsed.data.proveedor ?? current?.proveedor) !== "jamendo") return NextResponse.json({ error: "Solo se puede habilitar reproducción para el adaptador Jamendo conectado." }, { status: 400 });
  }
  const { etiquetas, ...changes } = parsed.data;
  const { data, error } = await supabaseAdmin().from("canciones").update({ ...changes, actualizada_en: new Date().toISOString() }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: "No se pudo actualizar la canción." }, { status: 400 });
  if (etiquetas) try { await saveTags(data.id, etiquetas, true); } catch (tagError) { console.error("No se pudieron actualizar etiquetas:", tagError); return NextResponse.json({ error: "La canción se guardó, pero falló la actualización de etiquetas." }, { status: 400 }); }
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "actualizar_cancion", entidad: "canciones", entidad_id: data.id });
  return NextResponse.json({ song: data });
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const { error } = await supabaseAdmin().from("canciones").update({ activa: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo desactivar la canción." }, { status: 400 });
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "desactivar_cancion", entidad: "canciones", entidad_id: id });
  return NextResponse.json({ ok: true });
}
