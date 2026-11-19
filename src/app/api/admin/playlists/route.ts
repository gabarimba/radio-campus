import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const playlistSchema = z.object({ nombre: z.string().trim().min(2).max(120), descripcion: z.string().max(500).optional(), activa: z.boolean().default(true), autorizada: z.boolean().default(false), canciones: z.array(z.string().uuid()).max(500).default([]) });
export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("listas_reproduccion").select("*,lista_canciones(posicion,canciones(id,titulo,artista))").order("nombre");
  if (error) return NextResponse.json({ error: "No se pudieron cargar listas." }, { status: 503 });
  return NextResponse.json({ playlists: data });
}
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = playlistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lista inválida." }, { status: 400 });
  const { canciones, ...playlistData } = parsed.data;
  const db = supabaseAdmin();
  const { data, error } = await db.from("listas_reproduccion").insert(playlistData).select().single();
  if (error) return NextResponse.json({ error: "No se pudo crear la lista." }, { status: 400 });
  if (canciones.length) {
    const { error: linksError } = await db.from("lista_canciones").insert(canciones.map((cancion_id, index) => ({ lista_id: data.id, cancion_id, posicion: index + 1 })));
    if (linksError) { await db.from("listas_reproduccion").delete().eq("id", data.id); return NextResponse.json({ error: "No se pudo asignar el catálogo a la lista." }, { status: 400 }); }
  }
  await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "crear_lista", entidad: "listas_reproduccion", entidad_id: data.id });
  return NextResponse.json({ playlist: data }, { status: 201 });
}
export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; changes?: unknown } | null;
  if (!body?.id || !z.string().uuid().safeParse(body.id).success) return NextResponse.json({ error: "Falta identificador de lista." }, { status: 400 });
  const parsed = playlistSchema.partial().safeParse(body.changes);
  if (!parsed.success) return NextResponse.json({ error: "Cambios inválidos." }, { status: 400 });
  const { canciones, ...changes } = parsed.data;
  const db = supabaseAdmin();
  const { data, error } = await db.from("listas_reproduccion").update({ ...changes, actualizada_en: new Date().toISOString() }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: "No se pudo actualizar la lista." }, { status: 400 });
  if (canciones) {
    await db.from("lista_canciones").delete().eq("lista_id", body.id);
    if (canciones.length) {
      const { error: linksError } = await db.from("lista_canciones").insert(canciones.map((cancion_id, index) => ({ lista_id: body.id!, cancion_id, posicion: index + 1 })));
      if (linksError) return NextResponse.json({ error: "Lista guardada, pero no se pudo actualizar su catálogo." }, { status: 400 });
    }
  }
  await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "actualizar_lista", entidad: "listas_reproduccion", entidad_id: body.id });
  return NextResponse.json({ playlist: data });
}
export async function DELETE(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const { error } = await supabaseAdmin().from("listas_reproduccion").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar la lista." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
