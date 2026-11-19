import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ categoria: z.enum(["genero", "energia", "ambiente", "tematica", "restriccion"]), nombre: z.string().trim().min(1).max(60) });
export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("etiquetas").select("*,cancion_etiquetas(cancion_id)").order("categoria").order("nombre");
  if (error) return NextResponse.json({ error: "No se pudieron cargar etiquetas." }, { status: 503 });
  return NextResponse.json({ tags: data });
}
export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Etiqueta inválida." }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("etiquetas").upsert(parsed.data, { onConflict: "categoria,nombre" }).select().single();
  if (error) return NextResponse.json({ error: "No se pudo guardar la etiqueta." }, { status: 400 });
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "crear_etiqueta", entidad: "etiquetas", entidad_id: data.id });
  return NextResponse.json({ tag: data }, { status: 201 });
}
export async function DELETE(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const { error } = await supabaseAdmin().from("etiquetas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar la etiqueta." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
