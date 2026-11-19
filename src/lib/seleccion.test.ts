import { describe, expect, it } from "vitest";
import { elegirCandidatas, type Cancion, type Regla } from "./seleccion";

const songs: Cancion[] = [
  { id: "a", titulo: "A", artista: "Artista A", prioridad: 1, explicita: false, autorizada: true, activa: true, etiquetas: ["energia:baja", "genero:instrumental"] },
  { id: "b", titulo: "B", artista: "Artista B", prioridad: 3, explicita: false, autorizada: true, activa: true, etiquetas: ["energia:moderada"] },
  { id: "c", titulo: "C", artista: "Artista C", prioridad: 8, explicita: false, autorizada: true, activa: true, etiquetas: [] },
  { id: "x", titulo: "X", artista: "Artista X", prioridad: 99, explicita: true, autorizada: true, activa: true, etiquetas: [] },
  { id: "y", titulo: "Y", artista: "Artista Y", prioridad: 99, explicita: false, autorizada: false, activa: true, etiquetas: [] },
];
const baseRule: Regla = { nombre: "base", prioridad: 1, condicion: { predeterminada: true }, preferencias: {}, activa: true };

describe("elegirCandidatas", () => {
  it("excluye canciones no autorizadas, inactivas y explícitas", () => {
    const result = elegirCandidatas({ canciones: songs, reglas: [baseRule], contexto: { hora: 8, temperatura: null, eventos: [] }, recientes: [], respaldo: [] });
    expect(result).toHaveLength(2);
    expect(result.map((x) => x.cancion.id)).not.toContain("x");
    expect(result.map((x) => x.cancion.id)).not.toContain("y");
  });
  it("usa la regla de mayor prioridad que corresponda al evento y etiqueta", () => {
    const examenes: Regla = { nombre: "Exámenes", prioridad: 100, condicion: { evento: "Exámenes" }, preferencias: { energia: "baja" }, activa: true };
    const result = elegirCandidatas({ canciones: songs, reglas: [baseRule, examenes], contexto: { hora: 13, temperatura: null, eventos: ["Exámenes"] }, recientes: [], respaldo: [] });
    expect(result[0]?.cancion.id).toBe("a");
    expect(result[0]?.razones.join(" ")).toContain("Exámenes");
  });
  it("evalúa condiciones de temperatura y hora", () => {
    const fresca: Regla = { nombre: "Fresco", prioridad: 50, condicion: { temp_max: 15, hora_inicio: 6, hora_fin: 12 }, preferencias: { energia: "baja" }, activa: true };
    const cold = elegirCandidatas({ canciones: songs, reglas: [baseRule, fresca], contexto: { hora: 8, temperatura: 10, eventos: [] }, recientes: [], respaldo: [] });
    const warm = elegirCandidatas({ canciones: songs, reglas: [baseRule, fresca], contexto: { hora: 8, temperatura: 23, eventos: [] }, recientes: [], respaldo: [] });
    expect(cold[0]?.cancion.id).toBe("a");
    expect(warm[0]?.cancion.id).toBe("c");
  });
  it("omite la ventana reciente y utiliza respaldo aprobado solo si hace falta", () => {
    const result = elegirCandidatas({ canciones: songs, reglas: [baseRule], contexto: { hora: 8, temperatura: null, eventos: [] }, recientes: ["a", "b", "c"], respaldo: ["a"] });
    expect(result.map((x) => x.cancion.id)).toEqual(["a"]);
    expect(result[0]?.razones[0]).toContain("respaldo");
  });
  it("no reutiliza canciones recientes sin respaldo autorizado", () => {
    const result = elegirCandidatas({ canciones: songs.slice(0, 3), reglas: [baseRule], contexto: { hora: 8, temperatura: null, eventos: [] }, recientes: ["a", "b", "c"], respaldo: [] });
    expect(result).toEqual([]);
  });
});
