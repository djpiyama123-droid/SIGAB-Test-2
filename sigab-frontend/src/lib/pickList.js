// Devuelve siempre un array, defendiendo contra respuestas del backend mal formadas.
//
// Caso típico que rompe: el backend devuelve `{}` (objeto vacío) en lugar de un
// array o de `{ equipos: [] }`. Con el patrón viejo:
//
//   setEquipos(data.equipos ?? data ?? [])   // → data es truthy → {} → .filter revienta
//
// Con pickList:
//   setEquipos(pickList(data, 'equipos'))    // → [] limpio
//
// Orden de preferencia:
//   1. data[key]        si es array
//   2. data             si es array
//   3. []               en cualquier otro caso (objeto, null, undefined, número, etc.)
export function pickList(data, key) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (key != null) {
    const inner = data[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}