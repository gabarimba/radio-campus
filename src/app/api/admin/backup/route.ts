import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const backupSchema = z.object({
  version: z.literal(1),
  settings: z.array(z.object({ clave: z.string().min(1).max(120), valor: z.unknown() })).max(200),
  rules: z.array(z.object({ nombre: z.string().min(1).max(120), prioridad: z.number().int(), activa: z.boolean(), condicion: z.record(z.string(), z.unknown()), preferencias: z.record(z.string(), z.unknown()) })).max(200),
  events: z.array(z.object({ nombre: z.string().min(1).max(160), descripcion: z.string().nullable().optional(), inicia_en: z.string().datetime(), termina_en: z.string().datetime(), prioridad: z.number().int(), etiquetas_requeridas: z.array(z.string()).optional(), activo: z.boolean() })).max(1000),
});

export async function GET(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseAdmin();
  const [settings, rules, events] = await Promise.all([
    db.from("configuracion").select("clave,valor").order("clave"),
    db.from("reglas_contextuales").select("nombre,prioridad,activa,condicion,preferencias").order("nombre"),
    db.from("eventos_calendario").select("nombre,descripcion,inicia_en,termina_en,prioridad,etiquetas_requeridas,activo").order("inicia_en"),
  ]);
  if (settings.error || rules.error || events.error) return NextResponse.json({ error: "No se pudo crear el respaldo." }, { status: 503 });
  const backup = { version: 1, exportadoEn: new Date().toISOString(), settings: settings.data, rules: rules.data, events: events.data };
  return new NextResponse(JSON.stringify(backup, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=radio-campus-respaldo.json", "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = backupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El respaldo no tiene un formato compatible." }, { status: 400 });
  const db = supabaseAdmin();
  const settings = parsed.data.settings.map(({ clave, valor }) => ({ clave, valor: JSON.stringify(valor), actualizada_en: new Date().toISOString(), actualizada_por: admin.id }));
  if (settings.length) {
    const { error } = await db.from("configuracion").upsert(settings, { onConflict: "clave" });
    if (error) return NextResponse.json({ error: "Falló la restauración de configuración." }, { status: 400 });
  }
  for (const rule of parsed.data.rules) {
    const { error } = await db.from("reglas_contextuales").upsert(rule, { onConflict: "nombre" });
    if (error) return NextResponse.json({ error: "Falló la restauración de reglas." }, { status: 400 });
  }
  for (const event of parsed.data.events) {
    const { error } = await db.from("eventos_calendario").upsert(event, { onConflict: "nombre,inicia_en" });
    if (error) return NextResponse.json({ error: "Falló la restauración de eventos." }, { status: 400 });
  }
  await db.from("registro_auditoria").insert({ admin_id: admin.id, accion: "importar_respaldo", entidad: "configuracion", detalle: { reglas: parsed.data.rules.length, eventos: parsed.data.events.length } });
  return NextResponse.json({ ok: true, rules: parsed.data.rules.length, events: parsed.data.events.length });
}
