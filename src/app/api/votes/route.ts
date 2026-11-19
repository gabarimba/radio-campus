import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { avisarActualizacionPublica, supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ roundId: z.string().uuid(), songId: z.string().uuid(), deviceToken: z.string().uuid() });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud de voto inválida." }, { status: 400 });
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return NextResponse.json({ error: "El servidor no está configurado para recibir votos." }, { status: 503 });
  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  const ipHash = createHmac("sha256", secret).update(rawIp).digest("hex");
  const deviceHash = createHmac("sha256", secret).update(parsed.data.deviceToken).digest("hex");
  try {
    const db = supabaseAdmin();
    const { data: configuredLimit } = await db.from("configuracion").select("valor").eq("clave", "limite_votos_ip_minuto").maybeSingle();
    const maxVotes = Number(configuredLimit?.valor ?? process.env.VOTE_RATE_LIMIT_PER_MINUTE ?? 10);
    const { data, error } = await db.rpc("registrar_voto", {
      p_ronda: parsed.data.roundId, p_cancion: parsed.data.songId,
      p_dispositivo_hash: deviceHash, p_ip_hash: ipHash,
      p_limite_ip: maxVotes,
    });
    if (error) throw error;
    if (!data?.ok) {
      const messages: Record<string, string> = { ronda_cerrada: "La votación ya cerró.", opcion_invalida: "Esa opción no pertenece a la ronda.", limite_ip: "Se alcanzó el límite temporal de votos.", voto_duplicado: "Este dispositivo ya votó en esta ronda." };
      const key = String(data?.error ?? "");
      const status = key === "ronda_cerrada" ? 409 : key === "limite_ip" ? 429 : 400;
      return NextResponse.json({ error: messages[key] ?? "No fue posible registrar el voto." }, { status });
    }
    await avisarActualizacionPublica();
    return NextResponse.json({ ok: true, message: "Tu voto quedó registrado." }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar voto:", error);
    return NextResponse.json({ error: "No se pudo registrar el voto. Intenta de nuevo." }, { status: 503 });
  }
}
