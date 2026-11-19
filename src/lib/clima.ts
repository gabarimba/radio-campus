export async function obtenerTemperatura(lat: number, lon: number): Promise<number | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "temperature_2m", timezone: "auto" }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 900 } });
    if (!response.ok) return null;
    const body = await response.json() as { current?: { temperature_2m?: number } };
    const value = body.current?.temperature_2m;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch { return null; }
}
