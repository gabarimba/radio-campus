import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { buscarJamendo, permiteEmisionNoComercial } from "@/lib/jamendo";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  if (!await getAdmin(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return NextResponse.json({ error: "Escribe entre 2 y 100 caracteres." }, { status: 400 });
  try {
    const results = await buscarJamendo({ query, limit: 25 });
    return NextResponse.json({ tracks: results.map((track) => ({ id: track.id, title: track.name, artist: track.artist_name, duration: Number(track.duration), licenseUrl: track.license_ccurl ?? null, trackUrl: track.shorturl ?? track.shareurl ?? `https://www.jamendo.com/track/${track.id}`, eligibleLicense: permiteEmisionNoComercial(track.license_ccurl) })) });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = z.object({ id: z.string().regex(/^\d{1,12}$/) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Identificador Jamendo inválido." }, { status: 400 });
  try {
    const track = (await buscarJamendo({ id: parsed.data.id, limit: 1 }))[0];
    if (!track) return NextResponse.json({ error: "No se encontró la pista." }, { status: 404 });
    if (!permiteEmisionNoComercial(track.license_ccurl)) return NextResponse.json({ error: "La licencia de esta pista no es compatible con la selección." }, { status: 403 });
    const { data, error } = await supabaseAdmin().from("canciones").upsert({
      titulo: track.name, artista: track.artist_name, duracion_segundos: Number(track.duration),
      proveedor: "jamendo", id_proveedor: track.id,
      url_proveedor: track.shorturl ?? track.shareurl ?? `https://www.jamendo.com/track/${track.id}`,
      notas_derechos: `Licencia Creative Commons indicada por Jamendo: ${track.license_ccurl ?? "no disponible"}. Revisar derechos del fonograma y uso institucional.`,
      autorizada: false, autorizacion_verificada: false, activa: true, explicita: false,
    }, { onConflict: "proveedor,id_proveedor" }).select().single();
    if (error) throw error;
    const { error: auditError } = await supabaseAdmin().from("registro_auditoria").insert({ admin_id: admin.id, accion: "importar_jamendo", entidad: "canciones", entidad_id: data.id, detalle: { jamendo_id: track.id, licencia: track.license_ccurl, elegible_sin_nc: permiteEmisionNoComercial(track.license_ccurl) } });
    if (auditError) console.error("No se pudo registrar auditoría de importación:", auditError);
    return NextResponse.json({ song: data, eligibleLicense: permiteEmisionNoComercial(track.license_ccurl) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 503 }); }
}
