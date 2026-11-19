import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const { data, error } = await supabaseAdmin().rpc("reservar_anuncio_vigente");
    if (error) throw error;
    return NextResponse.json({ announcement: data?.id ? data : null });
  } catch (error) {
    console.error("No se pudo reservar el anuncio vigente:", error);
    return NextResponse.json({ announcement: null, error: "No se pudo consultar el siguiente anuncio." }, { status: 503 });
  }
}
