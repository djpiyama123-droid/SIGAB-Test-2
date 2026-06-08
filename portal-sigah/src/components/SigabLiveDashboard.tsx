/**
 * SigabLiveDashboard — "El dashboard en vivo de SIGAB": capturas reales de la app
 * mostrando cada etapa del ciclo de vida. Va justo después de ProductShowcase.
 */

const CAPTURAS = [
  { src: '/sigab-inventario.png', etapa: 'Alta e inventario', titulo: 'Inventario de equipos', desc: 'Cada activo con serie, marca, criticidad y área (CEYE, Lab. Clínico, UCI).' },
  { src: '/sigab-qr.png',         etapa: 'Identificación',    titulo: 'Etiquetado masivo QR', desc: 'Generación de etiquetas QR con identidad IMSS para impresión o grabado láser.' },
  { src: '/sigab-preventivos.png',etapa: 'Mantenimiento',     titulo: 'Mantenimientos preventivos', desc: 'Programación, vencimientos y seguimiento de cada intervención técnica.' },
  { src: '/sigab-dashboard.png',  etapa: 'Control en vivo',   titulo: 'Centro de control SIGAB', desc: 'KPIs en tiempo real: activos totales, operativos y fallas críticas por zona.' },
]

export default function SigabLiveDashboard() {
  return (
    <section id="dashboard-vivo" className="py-16 sm:py-20 px-6 bg-bg-principal border-y border-border/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-2">
            EL DASHBOARD EN VIVO DE SIGAB
          </p>
          <h2 className="font-sans font-medium text-2xl sm:text-3xl text-slate-900">
            Así se ve cada etapa dentro de la aplicación
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {CAPTURAS.map((c) => (
            <figure
              key={c.src}
              className="group rounded-2xl overflow-hidden border border-border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-slate-50">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 font-data font-normal text-[11px] text-slate-400 truncate">
                  sigab · {c.etapa}
                </span>
              </div>
              <div className="overflow-hidden">
                <img
                  src={c.src}
                  alt={c.titulo}
                  loading="lazy"
                  className="w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="p-4 sm:p-5 border-t border-border">
                <p className="font-sans font-medium text-sm text-slate-900">{c.titulo}</p>
                <p className="font-data font-normal text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-center font-data font-normal text-sm text-slate-400 mt-10">
          Capturas reales de SIGAB · HGR No.1 IMSS Tijuana · 100% on-premise
        </p>
      </div>
    </section>
  )
}
