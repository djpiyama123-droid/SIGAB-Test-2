import { IconCheck, IconMinus } from '@tabler/icons-react'
import type { ServicePlan, PlanFeature } from '../data/servicePlans'

interface Props {
  plans: ServicePlan[]
  features: PlanFeature[]
  onLoginClick: () => void
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <IconCheck size={16} className="text-esmeralda" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <IconMinus size={16} className="text-slate-300" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-ambar-bg text-ambar font-data font-normal text-xs">
      {value}
    </span>
  )
}

export default function ServicePlans({ plans, features, onLoginClick }: Props) {
  return (
    <section id="planes" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            PLANES DE SERVICIO
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900 mb-4">
            Dos modelos adaptados a tu realidad hospitalaria
          </h2>
          <p className="font-data font-normal text-base text-slate-500 max-w-2xl leading-relaxed">
            Plan A para hospitales que requieren resiliencia operativa con servidor local en sitio. Plan B para instituciones que necesitan ordenar su inventario como punto de partida hacia la digitalización.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`p-8 rounded-[8px] bg-white ${
                plan.highlight
                  ? 'border border-sigah-blue'
                  : 'card-border'
              }`}
            >
              <div className="mb-6">
                <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider mb-1">
                  {plan.subtitle}
                </p>
                <h3 className="font-sans font-medium text-xl text-slate-900 mb-3">
                  {plan.name}
                </h3>
                <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="mb-7">
                {plan.id === 'A' ? (
                  <>
                    <p className="font-data font-medium text-2xl text-sigah-blue">
                      $4,000{' '}
                      <span className="text-sm text-slate-500 font-normal">MXN / mes</span>
                    </p>
                    <p className="font-data font-normal text-xs text-slate-400 mt-1">
                      + $20,000 MXN de configuración inicial (Setup Fee)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-data font-medium text-2xl text-sigah-blue">
                      Cotizado
                    </p>
                    <p className="font-data font-normal text-xs text-slate-400 mt-1">
                      Pago único por proyecto de auditoría e inventariado
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href="mailto:contacto@sigah.mx"
                  className={`w-full flex items-center justify-center py-2.5 rounded-xl font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] select-none ${
                    plan.highlight
                      ? 'bg-sigah-blue text-white hover:bg-sigah-blue-dark'
                      : 'border-[1.5px] border-sigah-blue text-sigah-blue hover:bg-bg-alt'
                  }`}
                >
                  Solicitar información
                </a>
                {plan.highlight && (
                  <button
                    onClick={onLoginClick}
                    className="w-full flex items-center justify-center py-2 rounded-xl border-[1.5px] border-border text-slate-500 font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sigah-blue hover:text-sigah-blue active:scale-[0.97] select-none"
                  >
                    Ya soy cliente — acceder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[8px] card-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-principal border-b border-border">
                <th className="text-left px-6 py-4 font-data font-medium text-slate-500 uppercase text-xs tracking-wider">
                  Característica
                </th>
                <th className="text-center px-6 py-4 font-data font-medium text-sigah-blue uppercase text-xs tracking-wider">
                  Plan A
                </th>
                <th className="text-center px-6 py-4 font-data font-medium text-slate-400 uppercase text-xs tracking-wider">
                  Plan B
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, idx) => (
                <tr
                  key={f.feature}
                  className={`border-b border-border last:border-b-0 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-bg-principal/40'
                  }`}
                >
                  <td className="px-6 py-3 font-data font-normal text-slate-700 text-sm">
                    {f.feature}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <FeatureCell value={f.planA} />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <FeatureCell value={f.planB} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
