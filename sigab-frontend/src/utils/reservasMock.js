// Reservas de muestra para tunear el dashboard sin depender de la BD sembrada.
// Sesga hacia un "pico" reciente para que el heatmap y el line chart se vean
// poblados (como el dashboard de MiniMax). Las fechas usan formato MySQL
// ("YYYY-MM-DD HH:MM:SS") a propósito, para ejercitar el parseo iOS-safe.

const EQUIPOS = [
  { n: 'Monitor de Signos Vitales', s: 'MON-0421' },
  { n: 'Ventilador Mecánico', s: 'VEN-0188' },
  { n: 'Bomba de Infusión', s: 'BMB-1043' },
  { n: 'Desfibrilador', s: 'DEF-0077' },
  { n: 'Electrocauterio', s: 'ELC-0312' },
  { n: 'Incubadora Neonatal', s: 'INC-0205' },
  { n: 'Rayos X Portátil', s: 'RXP-0019' },
  { n: 'Ultrasonido', s: 'USG-0260' },
];
const AREAS = ['Quirófano 1', 'Quirófano 3', 'UCI', 'UCIN', 'Urgencias', 'Hospitalización', 'Imagenología', 'Pediatría'];
const PISOS = ['Planta baja', '1er piso', '2do piso'];
const SOLICITANTES = ['Dr. Hernández', 'Enf. Martínez', 'Dra. Ramírez', 'Ing. Biomédico', 'Dr. Soto'];
const ESTADOS = ['pendiente', 'activa', 'completada', 'cancelada'];
const MOTIVOS = ['Cirugía programada', 'Traslado de paciente crítico', 'Estudio diagnóstico', 'Mantenimiento preventivo', 'Procedimiento en UCI'];

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function generarReservasMock(n = 160, dias = 120, hoy = new Date()) {
  const PICO = 18; // días atrás donde concentramos el pico de actividad
  const out = [];
  for (let i = 0; i < n; i++) {
    const offset =
      Math.random() < 0.4
        ? Math.max(0, Math.round(PICO + (Math.random() - 0.5) * 10)) // cluster alrededor del pico
        : Math.floor(Math.random() * dias); // disperso
    const ini = new Date(hoy);
    ini.setDate(ini.getDate() - offset);
    ini.setHours(7 + Math.floor(Math.random() * 11), pick([0, 30]), 0, 0);
    const fin = new Date(ini.getTime() + (1 + Math.floor(Math.random() * 4)) * 3600 * 1000);
    const eq = pick(EQUIPOS);
    out.push({
      id: 9000 + i,
      equipo_id: 100 + (i % 40),
      equipo_nombre: eq.n,
      equipo_serie: eq.s,
      area_reserva: pick(AREAS),
      piso_reserva: pick(PISOS),
      solicitante_nombre: pick(SOLICITANTES),
      fecha_inicio: fmt(ini),
      fecha_fin: fmt(fin),
      motivo: pick(MOTIVOS),
      estado: pick(ESTADOS),
      _mock: true,
    });
  }
  return out;
}
