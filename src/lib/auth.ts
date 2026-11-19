import { NextRequest } from "next/server";
import { supabaseAdmin, supabasePublic } from "@/lib/supabase-admin";

export async function getAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = await supabasePublic().auth.getUser(token);
  if (auth.error || !auth.data.user) return null;
  const { data: profile } = await supabaseAdmin().from("perfiles_admin").select("id, rol, activo").eq("id", auth.data.user.id).maybeSingle();
  if (!profile?.activo || !["admin", "operador"].includes(profile.rol)) return null;
  return { id: auth.data.user.id, rol: profile.rol as string };
}
