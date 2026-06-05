import { IconClockExclamation, IconCalendarOff, IconFileOff } from '@tabler/icons-react'

const STATS = [
  {
    icon: <IconClockExclamation size={28} />,
    value: '85%',
    label: 'del personal pierde tiempo localizando equipos',
    detail: 'Retraso en atención clínica — riesgo en áreas críticas como UCI y quirófano.',
    color: 'text-rojo',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  {
    icon: <IconCalendarOff size={28} />,
    value: '90%',
    label: 'de los mantenimientos preventivos se posterga',
    detail: 'Modelo de "bomberazo" reactivo — el equipo falla antes de recibir mantenimiento.',
    color: 'text-ambar',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: <IconFileOff size={28} />,
    value: '0',
    label: 'trazabilidad forense con registros en papel',
    detail: 'Imposibilidad de cumplir auditorías NOM-016 / NOM-240 — riesgo legal real.',
    color: 'text-sigah-blue',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
]

export default function ProblemSection() {
  return (
    <section id="problema" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 max-w-2xl">
          <p className="font-data font-normal text-xs text-rojo uppercase tracking-wider mb-3">
            EL PROBLEMA — DATOS DE CAMPO
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900 mb-4">
            Los hospitales mexicanos operan en modo reactivo
          </h2>
          <p className="font-data font-normal text-lg text-slate-500 leading-relaxed">
            Datos levantados directamente en el HGR No. 1 del IMSS, Tijuana.
            No son estimaciones — son la realidad que SIGAB vino a resolver.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {STATS.map(s => (
            <div
              key={s.value}
              className={`${s.bg} border ${s.border} rounded-2xl p-7 flex flex-col gap-4`}
            >
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className={`font-sans font-medium text-5xl ${s.color} mb-2`}>{s.value}</p>
                <p className="font-sans font-medium text-base text-slate-800 leading-snug">{s.label}</p>
              </div>
              <p className="font-data font-normal text-sm text-slate-500 leading-relaxed border-t border-current/10 pt-4">
                {s.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Síntesis */}
        <div className="bg-slate-900 rounded-2xl px-8 py-6 flex items-start gap-5">
          <div className="w-1 h-12 bg-sigah-blue rounded-full flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-sans font-medium text-lg text-white leading-relaxed">
              El hospital opera reactivamente, con registros en papel, sin trazabilidad
              forense y expuesto a riesgo legal por negligencia documental.
            </p>
            <p className="font-data font-normal text-sm text-white/50 mt-2">
              Fuente: estudio de necesidades HGR No. 1, firmado por Conservación de Equipos Médicos — mayo 2026
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
