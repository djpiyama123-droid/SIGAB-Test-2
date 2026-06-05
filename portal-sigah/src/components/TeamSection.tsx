import { IconCode, IconBuildingHospital, IconMapPin } from '@tabler/icons-react'

const TEAM = [
  {
    initials: 'GL',
    name: 'Gustavo López Carballo',
    role: 'CEO & Co-fundador',
    tag: 'Tecnología & Visión',
    icon: <IconCode size={13} />,
    description:
      'Bioingeniero en Procesos de Manufactura · Universidad Xochicalco. Creador de SIGAB durante su residencia y servicio social en el Departamento de Conservación del HGR No.1 IMSS Tijuana.',
  },
  {
    initials: 'CO',
    name: 'Carlos Oswaldo Ramírez González',
    role: 'CTO & Co-fundador',
    tag: 'Operaciones & Hospital',
    icon: <IconBuildingHospital size={13} />,
    description:
      'Ing. Subjefe de Conservación de Equipos Médicos · HGR No.1 IMSS Tijuana. Validador de campo del sistema SIGAB desde su concepción; garantiza que cada módulo refleja la operación real del hospital.',
  },
]

export default function TeamSection() {
  return (
    <section id="equipo" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            EQUIPO FUNDADOR
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900">
            Diseñado desde adentro del hospital
          </h2>
          <p className="font-data font-normal text-lg text-slate-600 mt-4 max-w-2xl leading-relaxed">
            SIGAH nació de una residencia real en el HGR No.1 IMSS Tijuana. No es un software
            genérico adaptado al sector salud — es un sistema hecho por bioingenieros para hospitales,
            validado en campo con calificación{' '}
            <span className="text-slate-800">8.25 / 10</span>.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {TEAM.map(member => (
            <div key={member.name} className="bg-bg-principal rounded-xl card-border p-7">
              {/* Avatar + nombre */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-sigah-blue flex items-center justify-center flex-shrink-0 select-none">
                  <span className="font-sans font-semibold text-lg text-white leading-none">
                    {member.initials}
                  </span>
                </div>
                <div>
                  <p className="font-sans font-medium text-base text-slate-900 leading-tight">
                    {member.name}
                  </p>
                  <p className="font-data font-normal text-sm text-sigah-blue mt-0.5">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Tag */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-slate-400">{member.icon}</span>
                <span className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">
                  {member.tag}
                </span>
              </div>

              <p className="font-data font-normal text-sm text-slate-600 leading-relaxed">
                {member.description}
              </p>
            </div>
          ))}
        </div>

        {/* Ubicación */}
        <div className="flex items-center gap-2 mt-8">
          <IconMapPin size={14} className="text-slate-400" />
          <span className="font-data font-normal text-sm text-slate-400">
            Tijuana, Baja California · México
          </span>
        </div>
      </div>
    </section>
  )
}
