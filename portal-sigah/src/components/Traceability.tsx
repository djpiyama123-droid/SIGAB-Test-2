/**
 * Traceability — ciclo de vida completo del equipo médico (adquisición → baja),
 * ilustrado con capturas reales del dashboard en vivo de la app SIGAB.
 */

const ETAPAS = [
  { n: '01', titulo: 'Adquisición', desc: 'Ingreso del equipo: factura, proveedor, garantía y datos de compra.', dot: 'bg-sigah-blue' },
  { n: '02', titulo: 'Alta e inventario', desc: 'Registro único: marca, modelo, serie, ubicación y estado operativo.', dot: 'bg-sigah-blue' },
  { n: '03', titulo: 'Identificación', desc: 'QR Nivel H + grabado láser permanente con identidad de la institución.', dot: 'bg-esmeralda' },
  { n: '04', titulo: 'Operación y mantenimiento', desc: 'Preventivos programados, órdenes de servicio y bitácora por equipo.', dot: 'bg-ambar' },
  { n: '05', titulo: 'Trazabilidad', desc: 'Historial de movimientos, traslados y custodia a lo largo de su vida útil.', dot: 'bg-sigah-blue' },
  { n: '06', titulo: 'Baja / fin de vida', desc: 'Retiro documentado con evidencia y cierre del expediente del activo.', dot: 'bg-slate-400' },
]

export default function Traceability() {
  return (
    <section id="trazabilidad" className="py-16 sm:py-20 px-6 bg-bg-principal border-y border-border/60">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            TRAZABILIDAD DE EXTREMO A EXTREMO
          </p>
          <h2 className="font-sans font-medium text-2xl sm:text-3xl text-slate-900 mb-3">
            Todo el ciclo de vida del equipo, en un solo expediente
          </h2>
          <p className="font-data font-normal text-base text-slate-500 leading-relaxed">
            Desde la adquisición hasta la baja, SIGAB conserva el historial completo de cada activo
            biomédico — y lo muestra en vivo en su dashboard.
          </p>
        </div>

        {/* Stepper de etapas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {ETAPAS.map((e) => (
            <div
              key={e.n}
              className="relative bg-white rounded-2xl border border-border p-5 transition-all duration-200 hover:-translate-y-1 hover:border-sigah-blue/40"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-2 h-2 rounded-full ${e.dot} flex-shrink-0`} />
                <span className="font-data font-normal text-xs text-slate-400 tracking-widest">{e.n}</span>
              </div>
              <h3 className="font-sans font-medium text-base text-slate-900 mb-1">{e.titulo}</h3>
              <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
