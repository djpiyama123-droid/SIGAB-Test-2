/**
 * EquipmentShowcase — ilustraciones SVG line-art de equipos biomédicos
 * que SIGAB gestiona. 100% transparentes, escalables, en paleta de marca
 * (sigah-blue #006CB7). Sin dependencias de imágenes externas ni licencias.
 */

const STROKE = '#006CB7'
const STROKE_SOFT = '#9BC4E2'
const FILL_SOFT = '#EAF3FB'

/* ── Ventilador mecánico ───────────────────────────────── */
function VentiladorSVG() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* carro / base */}
      <rect x="34" y="86" width="52" height="26" rx="3" fill={FILL_SOFT} stroke={STROKE} strokeWidth="2.5" />
      {/* columna */}
      <rect x="56" y="40" width="8" height="48" fill={STROKE_SOFT} />
      {/* pantalla */}
      <rect x="30" y="14" width="60" height="40" rx="4" fill="white" stroke={STROKE} strokeWidth="2.5" />
      {/* waveform en pantalla */}
      <path d="M36 38 L44 38 L48 26 L52 44 L56 32 L60 38 L84 38" stroke={STROKE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* perillas base */}
      <circle cx="46" cy="99" r="4" stroke={STROKE} strokeWidth="2" />
      <circle cx="60" cy="99" r="4" stroke={STROKE} strokeWidth="2" />
      {/* ruedas */}
      <circle cx="42" cy="112" r="4" fill={STROKE_SOFT} />
      <circle cx="78" cy="112" r="4" fill={STROKE_SOFT} />
      {/* tubo respiratorio */}
      <path d="M90 30 q18 6 12 26 q-3 12 -16 14" stroke={STROKE_SOFT} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/* ── Monitor de signos vitales ─────────────────────────── */
function MonitorSVG() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <rect x="16" y="22" width="88" height="62" rx="5" fill="white" stroke={STROKE} strokeWidth="2.5" />
      <rect x="22" y="28" width="76" height="50" rx="2" fill={FILL_SOFT} />
      {/* ECG */}
      <path d="M26 50 L40 50 L44 40 L49 62 L54 46 L58 50 L72 50" stroke={STROKE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* SpO2 onda */}
      <path d="M26 68 q4 -8 8 0 t8 0 t8 0 t8 0" stroke={STROKE_SOFT} strokeWidth="2" fill="none" />
      {/* lecturas numéricas */}
      <rect x="78" y="34" width="14" height="6" rx="1" fill={STROKE} opacity="0.85" />
      <rect x="78" y="46" width="14" height="6" rx="1" fill={STROKE_SOFT} />
      <rect x="78" y="58" width="14" height="6" rx="1" fill={STROKE_SOFT} />
      {/* pie */}
      <rect x="52" y="84" width="16" height="10" fill={STROKE_SOFT} />
      <rect x="40" y="94" width="40" height="6" rx="2" stroke={STROKE} strokeWidth="2.5" fill="white" />
    </svg>
  )
}

/* ── Desfibrilador ─────────────────────────────────────── */
function DesfibriladorSVG() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* cuerpo */}
      <rect x="20" y="36" width="60" height="58" rx="5" fill="white" stroke={STROKE} strokeWidth="2.5" />
      {/* pantalla */}
      <rect x="27" y="44" width="46" height="24" rx="2" fill={FILL_SOFT} />
      <path d="M31 58 L41 58 L45 49 L49 66 L53 54 L57 58 L69 58" stroke={STROKE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* botones */}
      <circle cx="33" cy="80" r="4" fill={STROKE} />
      <circle cx="48" cy="80" r="4" stroke={STROKE} strokeWidth="2" />
      <circle cx="63" cy="80" r="4" stroke={STROKE} strokeWidth="2" />
      {/* paleta / electrodo */}
      <rect x="84" y="30" width="20" height="14" rx="3" fill={STROKE_SOFT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M90 44 q-2 16 -14 22" stroke={STROKE_SOFT} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* rayo */}
      <path d="M58 24 L50 36 L56 36 L48 48 L66 32 L59 32 Z" fill={STROKE} />
    </svg>
  )
}

/* ── Bomba de infusión ─────────────────────────────────── */
function BombaSVG() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* cuerpo */}
      <rect x="26" y="24" width="68" height="46" rx="5" fill="white" stroke={STROKE} strokeWidth="2.5" />
      {/* display */}
      <rect x="33" y="31" width="34" height="20" rx="2" fill={FILL_SOFT} />
      <rect x="37" y="37" width="20" height="4" rx="1" fill={STROKE} />
      <rect x="37" y="44" width="14" height="3" rx="1" fill={STROKE_SOFT} />
      {/* botonera */}
      <circle cx="78" cy="36" r="3.5" stroke={STROKE} strokeWidth="2" />
      <circle cx="88" cy="36" r="3.5" stroke={STROKE} strokeWidth="2" />
      <circle cx="78" cy="47" r="3.5" fill={STROKE} />
      <circle cx="88" cy="47" r="3.5" stroke={STROKE_SOFT} strokeWidth="2" />
      {/* poste IV */}
      <rect x="58" y="6" width="4" height="18" fill={STROKE_SOFT} />
      {/* bolsa de suero */}
      <path d="M70 6 h16 v14 q0 6 -8 7 q-8 -1 -8 -7 Z" fill={FILL_SOFT} stroke={STROKE} strokeWidth="2.5" />
      {/* línea / tubo */}
      <path d="M60 70 q0 18 -14 24" stroke={STROKE_SOFT} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* base */}
      <rect x="40" y="92" width="40" height="6" rx="2" stroke={STROKE} strokeWidth="2.5" fill="white" />
      <rect x="56" y="70" width="8" height="22" fill={STROKE_SOFT} />
    </svg>
  )
}

const EQUIPOS = [
  { Comp: VentiladorSVG,     nombre: 'Ventiladores',      desc: 'UCI · Quirófano' },
  { Comp: MonitorSVG,        nombre: 'Monitores de signos', desc: 'Urgencias · Hospitalización' },
  { Comp: DesfibriladorSVG,  nombre: 'Desfibriladores',   desc: 'Carros rojos · UCI' },
  { Comp: BombaSVG,          nombre: 'Bombas de infusión', desc: 'Todas las áreas' },
]

export default function EquipmentShowcase() {
  return (
    <section className="py-16 px-6 bg-white border-y border-border/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            EQUIPOS BAJO CONTROL
          </p>
          <h2 className="font-sans font-medium text-2xl sm:text-3xl text-slate-900 mb-3">
            Cada activo biomédico, trazable y bajo resguardo
          </h2>
          <p className="font-data font-normal text-base text-slate-500 leading-relaxed">
            Desde equipos de soporte vital hasta dispositivos de diagnóstico —
            SIGAB lleva el inventario, mantenimiento y trazabilidad de todo el parque tecnológico.
          </p>
        </div>

        {/* Galería de fotos reales del entorno hospitalario */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {[
            { src: '/eq-signos.jpg',  label: 'Monitor de signos vitales', sub: 'En operación · UCI' },
            { src: '/eq-uci.jpg',     label: 'Unidad de cuidados intensivos', sub: 'Ventiladores y monitores' },
            { src: '/eq-cuarto.jpg',  label: 'Hospitalización', sub: 'Monitoreo a pie de cama' },
            { src: '/eq-monitor.jpg', label: 'Bombas de infusión', sub: 'Trazabilidad por equipo' },
          ].map((p, i) => (
            <div
              key={p.src}
              className={`group relative rounded-2xl overflow-hidden border border-border bg-slate-900 ${i === 0 ? 'col-span-2 lg:col-span-2 row-span-1' : ''}`}
            >
              <img
                src={p.src}
                alt={p.label}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? 'h-56 sm:h-72' : 'h-40 sm:h-48'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4">
                <p className="font-sans font-medium text-sm text-white leading-tight">{p.label}</p>
                <p className="font-data font-normal text-xs text-white/70 mt-0.5">{p.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Áreas del hospital y resguardo de equipos */}
        <div className="mb-12">
          <p className="text-center font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-5">
            Áreas del hospital · dónde viven y se resguardan los activos
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { src: '/quirofano.jpg',     label: 'Quirófano', sub: 'Cirugía · equipo crítico' },
              { src: '/laboratorio.jpg',   label: 'Laboratorio clínico', sub: 'Analizadores y diagnóstico' },
              { src: '/sala-equipada.jpg', label: 'Sala equipada', sub: 'Lámparas, torre y monitores' },
              { src: '/hospital-pasillo.jpg', label: 'Hospitalización', sub: 'Camas y monitoreo' },
              { src: '/almacen-equipos.jpg',  label: 'Almacén de resguardo', sub: 'Equipos en custodia' },
              { src: '/eq-uci.jpg',        label: 'Unidad de cuidados intensivos', sub: 'Soporte vital' },
            ].map((p, i) => (
              <div
                key={p.src}
                className={`group relative rounded-2xl overflow-hidden border border-border bg-slate-900 ${i === 0 ? 'col-span-2 lg:col-span-2' : ''}`}
              >
                <img
                  src={p.src}
                  alt={p.label}
                  loading="lazy"
                  className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? 'h-48 sm:h-64' : 'h-36 sm:h-44'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/15 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4">
                  <p className="font-sans font-medium text-sm text-white leading-tight">{p.label}</p>
                  <p className="font-data font-normal text-xs text-white/70 mt-0.5">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipos de equipo (ilustraciones de marca) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {EQUIPOS.map(({ Comp, nombre, desc }) => (
            <div
              key={nombre}
              className="group bg-bg-principal rounded-2xl border border-border p-5 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1 hover:border-sigah-blue/40 hover:bg-white"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mb-3 transition-transform duration-300 group-hover:scale-105">
                <Comp />
              </div>
              <h3 className="font-sans font-medium text-sm text-slate-800">{nombre}</h3>
              <p className="font-data font-normal text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center font-data font-normal text-sm text-slate-400 mt-8">
          + 778 equipos registrados en el piloto · todas las marcas y modelos
        </p>
      </div>
    </section>
  )
}
