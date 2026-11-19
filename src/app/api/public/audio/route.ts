import { NextRequest, NextResponse } from "next/server";
import { buscarJamendo, permiteEmisionNoComercial } from "@/lib/jamendo";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("track") ?? "";
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ error: "Pista inválida." }, { status: 400 });
  try {
    const { data: song } = await supabaseAdmin().from("canciones").select("id,autorizada,autorizacion_verificada,activa,explicita,proveedor,id_proveedor").eq("proveedor", "jamendo").eq("id_proveedor", id).maybeSingle();
    if (!song || !song.activa || !song.autorizada || !song.autorizacion_verificada || song.explicita) return NextResponse.json({ error: "La pista no tiene autorización activa." }, { status: 403 });
    const track = (await buscarJamendo({ id, limit: 1 }))[0];
    if (!track?.audio || !permiteEmisionNoComercial(track.license_ccurl)) return NextResponse.json({ error: "La pista ya no ofrece una licencia admitida o un stream disponible." }, { status: 403 });
    return NextResponse.redirect(track.audio, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fallo al resolver stream Jamendo:", error);
    return NextResponse.json({ error: "No se pudo resolver el stream musical." }, { status: 503 });
  }
}
