// Utilidades de fecha + agregación para el dashboard de Reservas.
// iOS-safe: Safari rechaza new Date("2026-06-25 14:00:00") (espacio en vez de "T")
// → Invalid Date → pantalla blanca. Normalizamos a ISO antes de parsear.

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function parseFecha(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS"; deja intactas las ISO con "T".
  const d = new Date(String(s).trim().replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

// "YYYY-MM-DD" en hora local (clave estable para agrupar por día).
export function ymd(value) {
  const d = value instanceof Date ? value : parseFecha(value);
  if (!d) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// "25 Jun" para ejes/etiquetas cortas.
export function etiquetaCorta(value) {
  const d = value instanceof Date ? value : parseFecha(value);
  if (!d) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

// { 'YYYY-MM-DD': nº reservas } usando fecha_inicio.
export function agruparPorDia(reservas) {
  const map = {};
  for (const r of reservas || []) {
    const key = ymd(r.fecha_inicio);
    if (key) map[key] = (map[key] || 0) + 1;
  }
  return map;
}

// total reservas, día pico (máx en un solo día), días con al menos 1 reserva.
export function statsReservas(reservas) {
  const counts = Object.values(agruparPorDia(reservas));
  return {
    total: (reservas || []).length,
    diaPico: counts.length ? Math.max(...counts) : 0,
    diasActivos: counts.length,
  };
}

// Serie de los últimos `dias` días: [{ fecha:'YYYY-MM-DD', count }] (incluye días en 0).
export function serieDiaria(reservas, dias = 30, hoy = new Date()) {
  const porDia = agruparPorDia(reservas);
  const out = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    out.push({ fecha: key, count: porDia[key] || 0 });
  }
  return out;
}

// Reservas de un día concreto (key 'YYYY-MM-DD'), ordenadas por hora de inicio.
export function reservasDelDia(reservas, key) {
  return (reservas || [])
    .filter((r) => ymd(r.fecha_inicio) === key)
    .sort((a, b) => String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)));
}
