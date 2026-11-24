/** Extrae únicamente los enlaces Creative Commons BY admitidos para atribución pública. */
export function extraerLicenciaCreativeCommons(notas: string | null | undefined): string | null {
  if (!notas) return null;
  const match = notas.match(/https:\/\/creativecommons\.org\/licenses\/(?:by|by-sa|by-nd)\/3\.0\/?/i);
  return match?.[0] ?? null;
}
