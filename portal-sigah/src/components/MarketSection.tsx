import {
  IconBuildingHospital,
  IconBuildingCommunity,
  IconTools,
  IconFlask,
  IconCircleCheck,
  IconClock,
} from '@tabler/icons-react'

const MARKETS = [
  {
    icon: <IconBuildingHospital size={20} />,
    title: 'Hospitales IMSS / ISSSTE',
    description:
      'Gestión completa de activos biomédicos, cumplimiento NOM-016/240, IA local 100% on-premise y trazabilidad forense inmutable.',
    status: 'active' as const,
    statusLabel: 'Piloto activo · HGR No.1',
  },
  {
    icon: <IconBuildingCommunity size={20} />,
    title: 'Clínicas Dentales',
    description:
      'Inventario de equipos odontológicos, mantenimiento preventivo, control de consumibles y cumplimiento regulatorio.',
    status: 'soon' as const,
    statusLabel: 'Próximamente',
  },
  {
    icon: <IconTools size={20} />,
    title: 'Talleres de Reparación',
    description:
      'Trazabilidad de equipos en reparación, gestión de refacciones impresas en 3D, órdenes de servicio y historial de intervenciones.',
    status: 'soon' as const,
    statusLabel: 'Próximamente',
  },
  {
    icon: <IconFlask size={20} />,
    title: 'Laboratorios de Análisis',
    description:
      'Control de equipos analíticos, calibración, metrología, checklists y reportes para acreditación y auditorías.',
    status: 'soon' as const,
    statusLabel: 'Próximamente',
  },
]

export default function MarketSection() {
  return (
    <section id="mercado" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            MERCADO OBJETIVO — SECTOR SALUD 4.0
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900">
            Un ecosistema, múltiples verticales
          </h2>
          <p className="font-data font-normal text-lg text-slate-600 mt-4 max-w-3xl leading-relaxed">
            SIGAH arrancó en hospitales IMSS. La misma plataforma escala a cualquier organización
            del sector salud que quiera adoptar las tecnologías de la{' '}
            <span className="text-slate-800">Industria 4.0</span> — desde la Clínica 1 hasta
            una red nacional de hospitales, clínicas dentales y laboratorios.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MARKETS.map(m => (
            <div key={m.title} className="bg-white rounded-xl card-border p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-sigah-blue text-white flex-shrink-0">
                  {m.icon}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-data font-normal ${
                    m.status === 'active'
                      ? 'bg-esmeralda/10 text-esmeralda'
                      : 'bg-ambar/10 text-ambar'
                  }`}
                >
                  {m.status === 'active' ? (
                    <IconCircleCheck size={12} />
                  ) : (
                    <IconClock size={12} />
                  )}
                  {m.statusLabel}
                </span>
              </div>

              <h3 className="font-sans font-medium text-base text-slate-900 mb-2">
                {m.title}
              </h3>
              <p className="font-data font-normal text-sm text-slate-500 leading-relaxed flex-1">
                {m.description}
              </p>
            </div>
          ))}
        </div>

        <p className="font-data font-normal text-sm text-slate-400 mt-8">
          Expansión planificada vía convenio académico → adjudicación directa → licitación nacional (BC y Sonora).
        </p>
      </div>
    </section>
  )
}
