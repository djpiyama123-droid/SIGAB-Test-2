import {
  IconScan, IconBolt, IconCpu,
  IconAlertTriangle, IconCircleCheck,
  IconArrowRight, IconCurrencyDollar, IconReplace,
  IconStarFilled,
} from '@tabler/icons-react'

const TOOLS = [
  {
    tag: 'Fabricación de refacciones',
    icon: <IconScan size={22} />,
    title: 'Revopoint Miracoplus — Escáner 3D all-in-one',
    image: '/escaner-metrologia.jpg',
    imgClass: 'object-contain bg-slate-100',
    video: 'zez4LI-0EDQ',
    videoLabel: 'Cómo escanear con metrología (Revopoint)',
    problem: 'Las refacciones se dibujan manualmente en AutoCAD antes de imprimirse. Ese diseño manual es el cuello de botella: lento y dependiente de un experto.',
    solution: 'El Revopoint Miracoplus digitaliza la pieza real en minutos → STL → impresión 3D directa. Se elimina el rediseño y se habilita un catálogo de refacciones bajo demanda en SIGAB.',
    flow: 'Pieza dañada → escaneo 3D → STL → impresión filamento/resina → registro en SIGAB → grabado láser del ID',
    benefits: [
      'Refacciones caras o descontinuadas fabricadas en sitio',
      'Menor tiempo de paro del equipo médico',
      'Catálogo de piezas reutilizable entre hospitales',
    ],
    premium: false,
  },
  {
    tag: 'Identificación permanente',
    icon: <IconBolt size={22} />,
    title: 'Pistola grabadora láser portátil — reemplaza la Zebra',
    image: '/pistola-laser.jpg',
    imgClass: 'object-cover object-center scale-[1.35]',
    video: '',
    videoLabel: '',
    problem: 'Las etiquetas Zebra se despegan y no resisten la limpieza con cloro y desinfectantes hospitalarios, rompiendo la trazabilidad del activo.',
    solution: 'La pistola láser portátil graba de forma permanente el QR, información del equipo y el logo institucional en metal, plástico o cables. El activo queda ligado a su expediente en SIGAB de por vida.',
    flow: 'QR + info del equipo + logo institucional → pistola láser → grabado indeleble en metal/plástico/cable → trazabilidad de por vida',
    benefits: [
      'Marca indeleble en metal, plástico y cables',
      'Elimina el gasto recurrente en consumibles',
      'Identificación que dura toda la vida útil del equipo',
    ],
    premium: false,
  },
  {
    tag: 'Servidor IA on-premise',
    icon: <IconCpu size={22} />,
    title: 'ASUS Ascent GX10 — Servidor de IA local',
    image: '/workstation-ia.jpg',
    imgClass: 'object-cover object-center',
    video: '',
    videoLabel: '',
    problem: 'Los modelos de IA en la nube implican costo por token, latencia de red y envío de datos clínicos sensibles a terceros. Las instituciones con alta carga o requisitos de privacidad no pueden depender de la nube.',
    solution: 'El ASUS Ascent GX10 con chip NVIDIA GB10 Grace Blackwell corre modelos de última generación on-premise: DeepSeek V4, Kimi, Gemma 4, Qwen, Llama 4. SIGAB Copilot funciona a máxima capacidad, sin costo por consulta.',
    flow: 'Personal del hospital → SIGAB Copilot → modelo local (DeepSeek/Gemma/Qwen) → respuesta en segundos → ningún dato sale del hospital',
    benefits: [
      '128 GB memoria unificada — modelos de gran escala localmente',
      'NVIDIA Blackwell GPU — inferencia rápida de modelos frontier',
      'Corre DeepSeek V4, Kimi, Gemma 4, Qwen, Llama 4 off-line',
      'Se deja al hospital en financiamiento mensual o como parte del setup',
    ],
    premium: true,
  },
]

const TIERS = [
  {
    label: 'Paquete Estándar',
    desc: 'Escáner 3D + Grabadora Láser',
    hardware: '~$100,000 MXN',
    setup: '$25,000 – $30,000 MXN',
    monthly: '$3,500 – $5,000 MXN',
    includes: ['Revopoint Miracoplus', 'Pistola láser portátil', 'SIGAB licencia completa', 'Soporte SLA'],
    highlight: false,
  },
  {
    label: 'Paquete IA Premium',
    desc: 'Escáner 3D + Laser + Servidor IA',
    hardware: '~$200,000 MXN',
    setup: '$25,000 – $30,000 MXN',
    monthly: '$3,500 – $5,000 MXN',
    includes: ['Todo lo del Paquete Estándar', 'ASUS Ascent GX10 (financiable)', 'DeepSeek V4 / Gemma 4 / Qwen local', 'SIGAB Copilot a máxima capacidad'],
    highlight: true,
  },
]

export default function NewServices() {
  return (
    <section id="inversion" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            ECOSISTEMA FÍSICO + IA — INVERSIÓN PROPUESTA
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900">
            Tres herramientas que cierran el ciclo completo
          </h2>
          <p className="font-data font-normal text-lg text-slate-600 mt-4 max-w-3xl leading-relaxed">
            Del inventario a la fabricación de refacciones y a la IA agéntica de frontera, 100% on-premise.
            SIGAH convierte un hospital en una organización de{' '}
            <span className="text-slate-800">Industria 4.0 verdadera</span>.
          </p>
        </div>

        {/* Tool cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {TOOLS.map(t => (
            <div
              key={t.title}
              className={`rounded-xl card-border p-7 relative ${
                t.premium ? 'bg-sigah-blue-dark' : 'bg-bg-principal'
              }`}
            >
              {t.premium && (
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
                  <IconStarFilled size={10} className="text-yellow-300" />
                  <span className="font-data font-normal text-[10px] text-white/80 uppercase tracking-wider">Premium</span>
                </div>
              )}

              {/* Ventana con imagen (y video) de la herramienta */}
              <div className={`rounded-lg overflow-hidden mb-5 border ${t.premium ? 'border-white/15' : 'border-border'}`}>
                <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${t.premium ? 'border-white/10 bg-white/5' : 'border-border bg-slate-50'}`}>
                  <span className="w-2 h-2 rounded-full bg-red-400/70" />
                  <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                  <span className={`ml-2 font-data font-normal text-[10px] truncate ${t.premium ? 'text-white/50' : 'text-slate-400'}`}>
                    {t.tag}
                  </span>
                </div>
                <div className="h-44 overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img src={t.image} alt={t.title} loading="lazy" className={`w-full h-full ${t.imgClass}`} />
                </div>
                {t.video && (
                  <div className={`${t.premium ? 'border-t border-white/10' : 'border-t border-border'}`}>
                    <iframe
                      src={`https://www.youtube.com/embed/${t.video}`}
                      title={t.videoLabel}
                      className="w-full aspect-video block"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <span className={`w-11 h-11 flex items-center justify-center rounded-lg ${
                  t.premium ? 'bg-white/15 text-white' : 'bg-sigah-blue text-white'
                }`}>
                  {t.icon}
                </span>
                <span className={`font-data font-normal text-xs uppercase tracking-wider ${
                  t.premium ? 'text-white/60' : 'text-sigah-blue'
                }`}>{t.tag}</span>
              </div>

              <h3 className={`font-sans font-medium text-base mb-4 leading-snug ${
                t.premium ? 'text-white' : 'text-slate-900'
              }`}>{t.title}</h3>

              <div className="flex gap-3 mb-3">
                <IconAlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${t.premium ? 'text-yellow-300' : 'text-ambar'}`} />
                <p className={`font-data font-normal text-xs leading-relaxed ${t.premium ? 'text-white/70' : 'text-slate-600'}`}>
                  <span className={t.premium ? 'text-white/90' : 'text-slate-800'}>Problema. </span>{t.problem}
                </p>
              </div>

              <div className="flex gap-3 mb-4">
                <IconReplace size={15} className={`flex-shrink-0 mt-0.5 ${t.premium ? 'text-white/60' : 'text-sigah-blue'}`} />
                <p className={`font-data font-normal text-xs leading-relaxed ${t.premium ? 'text-white/70' : 'text-slate-600'}`}>
                  <span className={t.premium ? 'text-white/90' : 'text-slate-800'}>Solución. </span>{t.solution}
                </p>
              </div>

              <div className={`rounded-lg px-3 py-2.5 mb-4 ${t.premium ? 'bg-white/10' : 'bg-sigah-blue/5'}`}>
                <p className={`font-data font-normal text-xs leading-relaxed ${t.premium ? 'text-white/70' : 'text-sigah-blue-dark'}`}>
                  <span className="font-medium">Flujo: </span>{t.flow}
                </p>
              </div>

              <ul className={`space-y-1.5 border-t pt-4 ${t.premium ? 'border-white/15' : 'border-border'}`}>
                {t.benefits.map(b => (
                  <li key={b} className={`flex items-start gap-2 font-data font-normal text-xs ${t.premium ? 'text-white/70' : 'text-slate-600'}`}>
                    <IconCircleCheck size={13} className={`flex-shrink-0 mt-0.5 ${t.premium ? 'text-white/50' : 'text-esmeralda'}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Pricing tiers */}
        <div className="mb-6">
          <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider mb-4">
            Paquetes de inversión
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {TIERS.map(tier => (
              <div
                key={tier.label}
                className={`rounded-xl p-6 ${
                  tier.highlight
                    ? 'bg-sigah-blue-dark ring-2 ring-sigah-blue'
                    : 'bg-bg-principal card-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-sans font-medium text-base ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {tier.label}
                  </p>
                  {tier.highlight && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                      <IconStarFilled size={9} className="text-yellow-300" />
                      <span className="font-data text-[10px] text-white/80">Recomendado</span>
                    </span>
                  )}
                </div>
                <p className={`font-data font-normal text-xs mb-4 ${tier.highlight ? 'text-white/60' : 'text-slate-500'}`}>
                  {tier.desc}
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className={`font-data font-normal text-[10px] uppercase tracking-wider mb-1 ${tier.highlight ? 'text-white/40' : 'text-slate-400'}`}>Hardware</p>
                    <p className={`font-sans font-medium text-sm ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>{tier.hardware}</p>
                  </div>
                  <div>
                    <p className={`font-data font-normal text-[10px] uppercase tracking-wider mb-1 ${tier.highlight ? 'text-white/40' : 'text-slate-400'}`}>Setup fee</p>
                    <p className={`font-sans font-medium text-sm ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>{tier.setup}</p>
                  </div>
                  <div>
                    <p className={`font-data font-normal text-[10px] uppercase tracking-wider mb-1 ${tier.highlight ? 'text-white/40' : 'text-slate-400'}`}>Mensualidad</p>
                    <p className={`font-sans font-medium text-sm ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>{tier.monthly}</p>
                  </div>
                </div>

                <ul className={`space-y-1.5 border-t pt-3 ${tier.highlight ? 'border-white/15' : 'border-border'}`}>
                  {tier.includes.map(item => (
                    <li key={item} className={`flex items-center gap-2 font-data font-normal text-xs ${tier.highlight ? 'text-white/70' : 'text-slate-600'}`}>
                      <IconCircleCheck size={12} className={tier.highlight ? 'text-white/50 flex-shrink-0' : 'text-esmeralda flex-shrink-0'} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CTA bar */}
        <div className="bg-sigah-blue rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-lg flex-shrink-0">
              <IconCurrencyDollar size={20} className="text-white" />
            </span>
            <p className="font-data font-normal text-sm text-white/80 leading-relaxed max-w-xl">
              El hardware se puede dejar al hospital en{' '}
              <span className="text-white font-medium">financiamiento mensual</span>{' '}
              o como parte del setup fee. El servidor ASUS es opcional — solo para hospitales que
              requieran IA de frontera on-premise sin depender de la nube.
            </p>
          </div>
          <a
            href="#planes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sigah-blue font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] select-none flex-shrink-0"
          >
            Ver planes
            <IconArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}
