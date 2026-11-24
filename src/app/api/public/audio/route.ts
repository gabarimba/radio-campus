import { NextRequest, NextResponse } from "next/server";
import { permiteEmisionNoComercial, resolverStreamJamendo } from "@/lib/jamendo";
import { extraerLicenciaCreativeCommons } from "@/lib/licencias";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("track") ?? "";
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ error: "Pista inválida." }, { status: 400 });
  try {
    const { data: song } = await supabaseAdmin().from("canciones").select("id,autorizada,autorizacion_verificada,activa,explicita,proveedor,id_proveedor,notas_derechos").eq("proveedor", "jamendo").eq("id_proveedor", id).maybeSingle();
    if (!song || !song.activa || !song.autorizada || !song.autorizacion_verificada || song.explicita) return NextResponse.json({ error: "La pista no tiene autorización activa." }, { status: 403 });
    const licenseUrl = extraerLicenciaCreativeCommons(song.notas_derechos ?? undefined);
    if (!permiteEmisionNoComercial(licenseUrl ?? undefined)) return NextResponse.json({ error: "La pista no tiene una licencia admitida registrada." }, { status: 403 });
    const streamUrl = await resolverStreamJamendo(id);
    const range = request.headers.get("range");
    const upstream = await fetch(streamUrl, {
      ...(range ? { headers: { Range: range } } : {}),
      cache: "no-store",
    });
    if (!upstream.ok && upstream.status !== 416) throw new Error(`El stream Jamendo respondió ${upstream.status}.`);

    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Fallo al resolver stream Jamendo:", error);
    return NextResponse.json({ error: "No se pudo resolver el stream musical." }, { status: 503 });
  }
}
