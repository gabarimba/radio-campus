export type JamendoTrack = {
  id: string; name: string; artist_name: string; duration: string;
  license_ccurl?: string; audio?: string; image?: string; album_name?: string;
  shorturl?: string; shareurl?: string; musicinfo?: { tags?: { genres?: string[]; vartags?: string[] } };
};

function clientId() {
  const value = process.env.JAMENDO_CLIENT_ID;
  if (!value) throw new Error("Configura JAMENDO_CLIENT_ID para usar el catálogo musical.");
  return value;
}

export async function buscarJamendo(params: { query?: string; id?: string; limit?: number }) {
  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  const search = new URLSearchParams({
    client_id: clientId(), format: "json",
    audioformat: "mp32", ccnc: "false", limit: String(params.limit ?? 20),
    ...(params.query ? { search: params.query } : {}), ...(params.id ? { id: params.id } : {}),
  });
  search.append("include", "licenses");
  search.append("include", "musicinfo");
  url.search = search.toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!response.ok) throw new Error(`Jamendo respondió ${response.status}.`);
  const body = await response.json() as { headers?: { status?: string; error_message?: string }; results?: JamendoTrack[] };
  if (body.headers?.status !== "success") throw new Error(body.headers?.error_message || "La búsqueda en Jamendo falló.");
  return body.results ?? [];
}

/** Solo licencia CC con BY y sin condición NC; cada alta requiere revisión institucional. */
export function permiteEmisionNoComercial(url: string | undefined): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  return /\/licenses\/by(?:-sa|-nd)?\//.test(normalized) && !normalized.includes("-nc");
}
