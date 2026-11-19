import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schemas = {
  evento: z.object({ tipo: z.literal("evento"), nombre: z.string().trim().min(2).max(160), descripcion: z.string().max(1000).optional(), inicia_en: z.string().datetime(), termina_en: z.string().datetime(), prioridad: z.number().int().min(0).max(100).default(50), etiquetas_requeridas: z.array(z.string().max(60)).default([]) }),
  anuncio: z.object({ tipo: z.literal("anuncio"), titulo: z.string().trim().min(2).max(160), texto: z.string().trim().min(5).max(1200), inicia_en: z.string().datetime(), termina_en: z.string().datetime(), frecuencia_minutos: z.number().int().min(5).max(1440).default(60) }),
  regla: z.object({ tipo: z.literal("regla"), nombre: z.string().trim().min(2).max(120), prioridad: z.number().int().min(0).max(1000), condicion: z.record(z.string(), z.unknown()), preferencias: z.record(z.string(), z.unknown()) }),
};

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const type = body?.tipo as keyof typeof schemas;
  if (!type || !(type in schemas)) return NextResponse.json({ error: "Tipo de registro no válido." }, { status: 400 });
  const parsed = schemas[type].safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revisa los campos enviados.", fields: parsed.error.flatten() }, { status: 400 });
  const db = supabaseAdmin();
  if (type === "evento") {
    const value = parsed.data as z.infer<typeof schemas.evento>;
    const { data, error } = await db.from("eventos_calendario").insert({ nombre: value.nombre, descripcion: value.descripcion, inicia_en: value.inicia_en, termina_en: value.termina_en, prioridad: value.prioridad, etiquetas_requeridas: value.etiquetas_requeridas }).select().single();
    if (error) return NextResponse.json({ error: "No se pudo guardar el evento." }, { status: 400 });
    return NextResponse.json({ item: data }, { status: 201 });
  }
  if (type === "anuncio") {
    const value = parsed.data as z.infer<typeof schemas.anuncio>;
    const { data, error } = await db.from("anuncios").insert({ titulo: value.titulo, texto: value.texto, inicia_en: value.inicia_en, termina_en: value.termina_en, frecuencia_minutos: value.frecuencia_minutos, estado: "programado" }).select().single();
    if (error) return NextResponse.json({ error: "No se pudo programar el anuncio." }, { status: 400 });
    return NextResponse.json({ item: data }, { status: 201 });
  }
  const value = parsed.data as z.infer<typeof schemas.regla>;
  const { data, error } = await db.from("reglas_contextuales").upsert({ nombre: value.nombre, prioridad: value.prioridad, condicion: value.condicion, preferencias: value.preferencias, activa: true }, { onConflict: "nombre" }).select().single();
  if (error) return NextResponse.json({ error: "No se pudo guardar la regla." }, { status: 400 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { tipo?: string; id?: string; changes?: Record<string, unknown> } | null;
  if (!body?.id || !body.changes || !["evento", "anuncio", "regla"].includes(body.tipo ?? "")) return NextResponse.json({ error: "Solicitud incompleta." }, { status: 400 });
  const table = body.tipo === "evento" ? "eventos_calendario" : body.tipo === "anuncio" ? "anuncios" : "reglas_contextuales";
  const allowed = body.tipo === "anuncio" ? ["titulo", "texto", "estado", "inicia_en", "termina_en", "frecuencia_minutos"] : ["nombre", "descripcion", "inicia_en", "termina_en", "prioridad", "activa", "condicion", "preferencias"];
  const changes = Object.fromEntries(Object.entries(body.changes).filter(([key]) => allowed.includes(key)));
  if (body.tipo === "anuncio" && changes.estado === "aprobado") Object.assign(changes, { aprobado_por: admin.id, aprobado_en: new Date().toISOString() });
  const { data, error } = await supabaseAdmin().from(table).update(changes).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: "No se pudo actualizar el registro." }, { status: 400 });
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: `actualizar_${body.tipo}`, entidad: table, entidad_id: body.id });
  return NextResponse.json({ item: data });
}
