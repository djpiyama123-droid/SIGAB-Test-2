// ponytail: mapa de acentos en español — cubre el caso real (búsquedas del
// personal del piloto). No hace typo-tolerance real (Levenshtein) — agregar
// solo si se pide.
const MAPA_ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

export function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => MAPA_ACENTOS[c])
    .trim();
}
