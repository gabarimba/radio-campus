import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const patchSchema = z.object({
  ciudad: z.string().trim().min(2).max(120).optional(),
  latitud: z.number().min(-90).max(90).optional(),
  longitud: z.number().min(-180).max(180).optional(),
  duracion_ronda_segundos: z.number().int().min(30).max(3600).optional(),
  regla_desempate: z.enum(["aleatorio", "prioridad", "primera_opcion"]).optional(),
  limite_votos_ip_minuto: z.number().int().min(1).max(100).optional(),
  ventana_repeticion: z.number().int().min(0).max(100).optional(),
  temperatura_simulada: z.number().min(-50).max(60).nullable().optional(),
  programacion_pausada: z.boolean().optional(),
  proveedor_reproduccion: z.enum(["deshabilitado", "youtube-iframe"]).optional(),
});

export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseAdmin();
  const [settings, events, announcements, rules] = await Promise.all([
    db.from("configuracion").select("clave,valor,actualizada_en").order("clave"),
    db.from("eventos_calendario").select("*").order("inicia_en", { ascending: false }).limit(50),
    db.from("anuncios").select("*").order("creado_en", { ascending: false }).limit(50),
    db.from("reglas_contextuales").select("*").order("prioridad", { ascending: false }),
  ]);
  return NextResponse.json({ settings: settings.data ?? [], events: events.data ?? [], announcements: announcements.data ?? [], rules: rules.data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Hay valores de configuración inválidos." }, { status: 400 });
  const values = parsed.data;
  const settings: Record<string, unknown> = {};
  if (values.ciudad !== undefined) settings.ciudad = values.ciudad;
  if (values.latitud !== undefined || values.longitud !== undefined) {
    const { data: old } = await supabaseAdmin().from("configuracion").select("valor").eq("clave", "coordenadas").maybeSingle();
    const coordinates = old?.valor as { lat?: number; lon?: number } | null;
    settings.coordenadas = { lat: values.latitud ?? Number(coordinates?.lat ?? 19.4326), lon: values.longitud ?? Number(coordinates?.lon ?? -99.1332) };
  }
  for (const key of ["duracion_ronda_segundos", "regla_desempate", "limite_votos_ip_minuto", "ventana_repeticion", "temperatura_simulada", "programacion_pausada", "proveedor_reproduccion"] as const) if (values[key] !== undefined) settings[key] = values[key];
  const rows = Object.entries(settings).map(([clave, valor]) => ({ clave, valor: JSON.stringify(valor), actualizada_en: new Date().toISOString(), actualizada_por: admin.id }));
  if (rows.length) {
    const { error } = await supabaseAdmin().from("configuracion").upsert(rows, { onConflict: "clave" });
    if (error) return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 503 });
  }
  await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "actualizar_configuracion", entidad: "configuracion", detalle: { claves: Object.keys(settings) } });
  return NextResponse.json({ ok: true });
}
