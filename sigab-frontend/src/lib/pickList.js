// ============================================================
// pickList.js — Tolerancia de shape para respuestas de API paginadas.
//
// Varios endpoints SIGAH devuelven la lista envuelta en una clave
// (`{reservas: [...]}`, `{hospitales: [...]}`, etc.) y otros la
// devuelven como array crudo (`[...]`). El patrón histórico era
// `data.x ?? data ?? []`, pero ese patrón NO tolera la respuesta
// vacía `{}`: cuando `data.x` es `undefined` y `data` es `{}`
// (objeto truthy), el fallback entrega `{}` y el siguiente
// `.filter()` / `.map()` / `.length` rompe con TypeError.
//
// Esta helper centraliza el shape-tolerante:
//
//   pickList(data)              → array
//   pickList(data, 'reservas')  → array
//
// Acepta:
//   {x: [...]}     → [...]
//   [...]          → [...]   (la API a veces suelta la envoltura)
//   {x: null}      → []
//   {x: undefined} → []
//   null           → []
//   undefined      → []
//   {}             → []      ← antes crasheaba
//   {x: 'foo'}     → []      (defensivo: la clave no es array)
//
// Cualquier consumidor que llame `.filter()` o `.length` sobre el
// resultado queda blindado contra respuestas de backend vacías o
// mal formadas.
// ============================================================
export function pickList(data, key) {
  if (key !== undefined && data != null && Array.isArray(data[key])) {
    return data[key];
  }
  return Array.isArray(data) ? data : [];
}
