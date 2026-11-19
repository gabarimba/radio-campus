import { avisarActualizacionPublica, supabaseAdmin } from "@/lib/supabase-admin";

/** El servidor persistente revisa vencimientos; el cierre también se valida al leer o votar. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Cierre automático inactivo: configura Supabase en el entorno servidor.");
    return;
  }
  const interval = setInterval(async () => {
    try {
      const db = supabaseAdmin();
      const { data: abiertas } = await db.from("rondas").select("id").eq("estado", "abierta").lte("cierra_en", new Date().toISOString()).limit(20);
      for (const ronda of abiertas ?? []) {
        const { data } = await db.rpc("cerrar_ronda_vencida", { p_ronda: ronda.id });
        if (data?.cerrada) await avisarActualizacionPublica();
      }
    } catch (error) { console.error("No se pudo revisar el cierre de rondas:", error); }
  }, 5000);
  interval.unref?.();
}
