import {
  IconHeartRateMonitor, IconStethoscope, IconUserCheck, IconWifi,
} from '@tabler/icons-react'

const LIMITS = [
  {
    icon: <IconHeartRateMonitor size={20} />,
    title: 'No es expediente clínico de pacientes',
    body: 'SIGAH gestiona activos y equipos biomédicos — no datos médicos de pacientes ni historiales clínicos. Sin datos de salud personal.',
  },
  {
    icon: <IconStethoscope size={20} />,
    title: 'No es dispositivo médico (no-SaMD)',
    body: 'No diagnostica, no controla equipos en operación clínica ni toma decisiones médicas. No requiere registro sanitario COFEPRIS.',
  },
  {
    icon: <IconUserCheck size={20} />,
    title: 'No sustituye al personal clínico ni técnico',
    body: 'Es una herramienta de gestión y trazabilidad. Las decisiones técnicas y clínicas siguen siendo del personal calificado del hospital.',
  },
  {
    icon: <IconWifi size={20} />,
    title: 'No depende de internet para operar',
    body: 'Por diseño es 100 % on-premise. La conectividad a internet es opcional — el sistema sigue funcionando si cae la red.',
  },
]

export default function LimitsSection() {
  return (
    <section id="limites" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider mb-3">
              ALCANCE Y LÍMITES
            </p>
            <h2 className="font-sans font-medium text-3xl text-slate-900 mb-5">
              Lo que SIGAH no hace — y por qué eso importa
            </h2>
            <p className="font-data font-normal text-base text-slate-500 leading-relaxed mb-6">
              Definir los límites con precisión no es debilidad — es madurez técnica y
              regulatoria. Demuestra que entendemos el ecosistema de salud y que no
              sobrevendemos lo que aún no existe.
            </p>
            <div className="bg-bg-alt rounded-xl p-5 border border-border">
              <p className="font-data font-normal text-sm text-slate-600 leading-relaxed">
                <span className="font-medium text-sigah-blue">Clasificación regulatoria:</span>{' '}
                Software de gestión administrativa hospitalaria. No-SaMD confirmado.
                Sin obligación de registro ante COFEPRIS ni FDA 21 CFR 11.
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="grid gap-4">
            {LIMITS.map(l => (
              <div key={l.title} className="flex gap-4 p-5 rounded-xl border border-border bg-bg-principal hover:border-sigah-blue/30 transition-colors duration-150">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white card-border text-slate-500">
                  {l.icon}
                </div>
                <div>
                  <h3 className="font-sans font-medium text-sm text-slate-800 mb-1">{l.title}</h3>
                  <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">{l.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
