import { IconSchool, IconBuildingHospital, IconMicroscope } from '@tabler/icons-react'
import type { PilotEquipment } from '../data/pilotInventory'

interface Props {
  inventory: PilotEquipment[]
}

const ORIGIN_ITEMS = [
  {
    icon: <IconSchool size={20} className="text-sigah-blue" />,
    title: 'Universidad Xochicalco, Campus Tijuana',
    body: 'Proyecto concebido durante el décimo cuatrimestre por Fernando Domínguez, Salvador Soltero y Gustavo López Carballo, guiados por los docentes Raúl Gracia y Antonio Piña.',
  },
  {
    icon: <IconMicroscope size={20} className="text-sigah-blue" />,
    title: 'Escuela de Bioingeniería en Procesos de Manufactura',
    body: 'Desarrollado en las asignaturas de Integración Empresarial y Taller de Emprendimiento como solución tecnológica para el sector salud mexicano.',
  },
  {
    icon: <IconBuildingHospital size={20} className="text-sigah-blue" />,
    title: 'Piloto en HGR No. 1 IMSS, Tijuana',
    body: 'Validación en entorno real con equipos de alta complejidad en quirófano y UCIN. Calificación de viabilidad de localización: 8.25. Reemplaza registros en papel por operación digitalizada y trazable.',
  },
]

export default function InstitutionalContext({ inventory }: Props) {
  return (
    <section id="contexto" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            ORIGEN INSTITUCIONAL
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900">
            Del aula universitaria al hospital de alta complejidad
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8 min-w-0">
            {ORIGIN_ITEMS.map(item => (
              <div key={item.title} className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[8px] bg-bg-alt card-border">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-sans font-medium text-sm text-slate-800 mb-1">
                    {item.title}
                  </h3>
                  <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0 w-full">
            <h3 className="font-sans font-medium text-sm text-slate-600 mb-4">
              Inventario piloto — HGR No. 1 IMSS Tijuana
            </h3>
            <div className="overflow-x-auto rounded-[8px] card-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-principal border-b border-border">
                    {['Equipo', 'Marca / Modelo', 'N. de serie', 'Área'].map(h => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-data font-medium text-slate-500 uppercase text-xs tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-border last:border-b-0 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-bg-principal/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-data font-normal text-slate-700 text-xs leading-snug">
                        {item.equipo}
                      </td>
                      <td className="px-4 py-3 font-data font-normal text-slate-600 text-xs whitespace-nowrap">
                        {item.marca !== 'N/D'
                          ? `${item.marca} / ${item.modelo}`
                          : <span className="text-slate-400">N/D</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {item.serie !== 'N/D' ? (
                          <span className="font-mono font-normal text-sigah-blue-dark text-xs">
                            {item.serie}
                          </span>
                        ) : (
                          <span className="font-mono font-normal text-slate-400 text-xs">N/D</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-data font-normal text-slate-500 text-xs whitespace-nowrap">
                        {item.ubicacion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
