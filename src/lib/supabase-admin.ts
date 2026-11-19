import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdmin() {
  if (!url || !serviceKey) throw new Error("Falta configurar Supabase en las variables de entorno.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function supabasePublic() {
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publicKey) throw new Error("Falta configurar Supabase en las variables de entorno.");
  return createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function avisarActualizacionPublica() {
  try {
    await supabaseAdmin().channel("radio-publica").send({ type: "broadcast", event: "estado_actualizado", payload: { instante: new Date().toISOString() } });
  } catch (error) { console.error("No se pudo publicar la actualización en tiempo real:", error); }
}
