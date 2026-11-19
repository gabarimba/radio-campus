/** Tipos y reglas puras para seleccionar candidatas según contexto. */
export type Cancion = {
  id: string; titulo: string; artista: string; prioridad: number; explicita: boolean;
  autorizada: boolean; activa: boolean; etiquetas: string[];
};
export type Regla = {
  nombre: string; prioridad: number; condicion: Record<string, unknown>;
  preferencias: Record<string, unknown>; activa: boolean;
};
export type Contexto = { hora: number; temperatura: number | null; eventos: string[] };
export type Candidata = { cancion: Cancion; puntuacion: number; razones: string[] };

function aplica(regla: Regla, contexto: Contexto): boolean {
  const c = regla.condicion;
  if (c.predeterminada === true) return true;
  if (typeof c.evento === "string" && !contexto.eventos.includes(c.evento)) return false;
  const inicio = Number(c.hora_inicio);
  const fin = Number(c.hora_fin);
  if (Number.isFinite(inicio) && Number.isFinite(fin) && (contexto.hora < inicio || contexto.hora >= fin)) return false;
  if (typeof c.temp_max === "number" && (contexto.temperatura === null || contexto.temperatura > c.temp_max)) return false;
  if (typeof c.temp_min === "number" && (contexto.temperatura === null || contexto.temperatura < c.temp_min)) return false;
  return true;
}

/** Selecciona hasta dos canciones autorizadas y explica cada puntuación. */
export function elegirCandidatas(input: {
  canciones: Cancion[]; reglas: Regla[]; contexto: Contexto; recientes: string[]; respaldo: string[];
}): Candidata[] {
  const { canciones, contexto } = input;
  const regla = input.reglas.filter((r) => r.activa && aplica(r, contexto)).sort((a, b) => b.prioridad - a.prioridad)[0];
  const preferencias = regla?.preferencias ?? {};
  const permitidas = canciones.filter((c) => c.activa && c.autorizada && !c.explicita);
  const ineditas = permitidas.filter((c) => !input.recientes.includes(c.id));
  const base = ineditas;
  const ranking = base.map((c) => {
    let puntuacion = c.prioridad;
    const razones = ["Autorización vigente y contenido no explícito."];
    for (const [key, value] of Object.entries(preferencias)) {
      if (key === "ventana_repeticion") continue;
      if (c.etiquetas.includes(`${key}:${String(value)}`)) { puntuacion += 20; razones.push(`Coincide con ${key}: ${String(value)} (${regla?.nombre ?? "contexto base"}).`); }
    }
    if (contexto.temperatura !== null) razones.push(`Contexto meteorológico: ${contexto.temperatura} °C.`);
    puntuacion += 8; razones.push("No se reprodujo recientemente.");
    return { cancion: c, puntuacion, razones };
  }).sort((a, b) => b.puntuacion - a.puntuacion || a.cancion.id.localeCompare(b.cancion.id));
  const result = ranking.slice(0, 2);
  if (result.length < 2) {
    const respaldo = input.respaldo.map((id) => permitidas.find((c) => c.id === id)).filter((c): c is Cancion => Boolean(c));
    for (const cancion of respaldo) {
      if (result.some((r) => r.cancion.id === cancion.id)) continue;
      result.push({ cancion, puntuacion: cancion.prioridad, razones: ["Selección de respaldo aprobada por administración."] });
      if (result.length === 2) break;
    }
  }
  return result;
}
