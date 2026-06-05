import { IconCircleCheck, IconArrowRight, IconLock } from '@tabler/icons-react'

interface Props {
  onLoginClick: () => void
}

const STATS = [
  { value: '6',    label: 'Equipos biomédicos de alta complejidad bajo control en el piloto' },
  { value: '8.25', label: 'Calificación de viabilidad de localización HGR No. 1' },
  { value: '778',  label: 'Registros de equipos en base de datos del sistema' },
  { value: '244',  label: 'Órdenes de servicio históricas indexadas y trazables' },
]

export default function Hero({ onLoginClick }: Props) {
  return (
    <section id="hero" className="pt-32 pb-24 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        {/* Active pilot badge */}
        <div className="inline-flex items-center gap-2 bg-esmeralda-bg rounded-[12px] px-3 py-1.5 mb-8">
          <IconCircleCheck size={15} className="text-esmeralda flex-shrink-0" />
          <span className="font-data font-normal text-sm text-esmeralda">
            Piloto activo — HGR No. 1 IMSS Tijuana, Baja California
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h1 className="font-sans font-medium text-4xl lg:text-5xl text-slate-900 leading-tight mb-6">
              Trazabilidad e inteligencia operativa para activos biomédicos hospitalarios
            </h1>
            <p className="font-data font-normal text-lg text-slate-600 mb-6 leading-relaxed">
              SIGAH digitaliza el inventario, mantenimiento y control de equipos clínicos en hospitales de alta complejidad. Sistema Industria 4.0 validado en entornos reales del IMSS.
            </p>
            <p className="font-data font-normal text-sm text-slate-400 mb-10 border-l-2 border-sigah-blue pl-3">
              <span className="text-sigah-blue font-medium">SIGAH</span> es el ecosistema y la empresa.{' '}
              <span className="text-sigah-blue font-medium">SIGAB</span> es la aplicación con la que el hospital trabaja todos los días.
            </p>

            {/* CTA buttons — modernized */}
            <div className="flex flex-wrap gap-3">
              <a
                href="#planes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm transition-all duration-200 hover:bg-sigah-blue-dark hover:-translate-y-0.5 active:scale-[0.97] select-none"
              >
                Solicitar demo
                <IconArrowRight size={15} />
              </a>
              <a
                href="#planes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-[1.5px] border-sigah-blue text-sigah-blue font-sans font-medium text-sm transition-all duration-200 hover:bg-bg-alt hover:-translate-y-0.5 active:scale-[0.97] select-none"
              >
                Ver planes de servicio
              </a>
              <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border-[1.5px] border-border text-slate-500 font-sans font-medium text-sm transition-all duration-200 hover:border-sigah-blue hover:text-sigah-blue hover:-translate-y-0.5 active:scale-[0.97] select-none"
              >
                <IconLock size={14} />
                Ya soy cliente
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map(stat => (
              <div
                key={stat.label}
                className="p-6 bg-white rounded-[10px] card-border transition-all duration-200 hover:-translate-y-0.5"
              >
                <p className="font-sans font-medium text-3xl text-sigah-blue mb-2">
                  {stat.value}
                </p>
                <p className="font-data font-normal text-sm text-slate-500 leading-snug">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
