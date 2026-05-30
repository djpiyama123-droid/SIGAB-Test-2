import { IconCircleCheck, IconLoader, IconFlag } from '@tabler/icons-react'
import type { Milestone, MilestoneStatus } from '../data/masterPlanMilestones'

interface Props {
  milestones: Milestone[]
}

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { circleClass: string; badgeClass: string; badgeLabel: string; icon: React.ReactNode }
> = {
  completed: {
    icon: <IconCircleCheck size={14} />,
    circleClass: 'bg-esmeralda text-white',
    badgeClass: 'bg-esmeralda-bg text-esmeralda',
    badgeLabel: 'Completado',
  },
  active: {
    icon: <IconLoader size={14} />,
    circleClass: 'bg-sigah-blue text-white',
    badgeClass: 'bg-bg-alt text-sigah-blue',
    badgeLabel: 'En curso',
  },
  upcoming: {
    icon: <IconFlag size={14} />,
    circleClass: 'bg-white text-sigah-blue border border-sigah-blue',
    badgeClass: 'bg-ambar-bg text-ambar',
    badgeLabel: 'Planificado',
  },
}

export default function MasterPlanTimeline({ milestones }: Props) {
  return (
    <section id="hitos" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            HOJA DE RUTA
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900 mb-4">
            Plan maestro 2026 — 2028
          </h2>
          <p className="font-data font-normal text-base text-slate-500 leading-relaxed">
            Ruta estructurada de validación clínica, escalabilidad SaaS y expansión regional y nacional en el sector salud mexicano.
          </p>
        </div>

        <div className="relative pl-12">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-6">
            {milestones.map(m => {
              const cfg = STATUS_CONFIG[m.status]
              return (
                <div key={m.phase} className="relative">
                  <div
                    className={`absolute -left-12 top-5 w-8 h-8 rounded-full flex items-center justify-center font-sans font-medium text-xs ${cfg.circleClass}`}
                  >
                    {m.phase}
                  </div>

                  <div className="p-5 bg-white rounded-[8px] card-border">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="font-mono font-normal text-xs text-slate-400">
                          {m.period}
                        </span>
                        <h3 className="font-sans font-medium text-sm text-slate-900 mt-1">
                          {m.title}
                        </h3>
                      </div>
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] font-data font-normal text-xs ${cfg.badgeClass}`}
                      >
                        {cfg.icon}
                        {cfg.badgeLabel}
                      </span>
                    </div>
                    <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
