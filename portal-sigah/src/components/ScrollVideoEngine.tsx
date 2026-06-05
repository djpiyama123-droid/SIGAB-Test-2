import { useRef, useEffect } from 'react'

const LERP_FACTOR = 0.08
const JITTER_THRESHOLD = 0.04

// Cards aparecen en escalera diagonal izquierda → derecha
const CARDS = [
  {
    tag: 'Módulo Inventario',
    title: 'Inventario digital centralizado',
    body: 'Registro único por equipo: marca, modelo, serie, ubicación y estado operativo. Consultable en tiempo real desde cualquier dispositivo, sin internet.',
    threshold: 0.15,
    dot: 'bg-sigah-blue',
    left: '3%',
    top: '12%',
  },
  {
    tag: 'Identificación Física',
    title: 'QR + Grabado Láser permanente',
    body: 'QR Nivel H grabado con pistola láser portátil: código, info del equipo y logo de la institución. Trazabilidad que dura toda la vida útil del activo.',
    threshold: 0.38,
    dot: 'bg-esmeralda',
    left: '16%',
    top: '30%',
  },
  {
    tag: 'Manufactura 4.0',
    title: 'Escáner 3D + Refacciones impresas',
    body: 'Revopoint Miracoplus digitaliza piezas dañadas → STL → impresión 3D en sitio. Elimina la dependencia de proveedores y el tiempo de paro.',
    threshold: 0.60,
    dot: 'bg-ambar',
    left: '29%',
    top: '48%',
  },
  {
    tag: 'SIGAB Copilot',
    title: 'IA agéntica 100% local',
    body: 'DeepSeek, Gemma 4, Qwen y más modelos open-source corriendo en el servidor on-premise del hospital. Ningún dato sale. Sin costo por consulta.',
    threshold: 0.82,
    dot: 'bg-sigah-blue',
    left: '42%',
    top: '66%',
  },
]

export default function ScrollVideoEngine() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const card3Ref = useRef<HTMLDivElement>(null)
  const card4Ref = useRef<HTMLDivElement>(null)
  const rafRef      = useRef<number>(0)
  const progressRef = useRef<number>(0)
  const targetRef   = useRef<number>(0)

  useEffect(() => {
    const namedCardRefs = [card1Ref, card2Ref, card3Ref, card4Ref]

    const tick = () => {
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const scrollable = container.offsetHeight - window.innerHeight
        if (scrollable > 0) {
          targetRef.current = Math.max(0, Math.min(1, -rect.top / scrollable))
        }
      }

      const prev = progressRef.current
      const next = prev + (targetRef.current - prev) * LERP_FACTOR
      progressRef.current = Math.abs(next - prev) < JITTER_THRESHOLD * 0.1 ? prev : next
      const p = progressRef.current

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`
      }

      // Cards: escalera izquierda→derecha, slide desde izquierda
      CARDS.forEach((card, i) => {
        const el = namedCardRefs[i].current
        if (!el) return
        const visible = p >= card.threshold
        el.style.opacity = visible ? '1' : '0'
        el.style.transform = visible ? 'translateX(0px)' : 'translateX(-20px)'
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [card1Ref, card2Ref, card3Ref, card4Ref])

  const cardRefs = [card1Ref, card2Ref, card3Ref, card4Ref]

  return (
    <section
      id="plataforma"
      ref={containerRef}
      className="relative w-full"
      style={{ height: '420vh' }}
    >
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-slate-50">
        {/* Label */}
        <div className="absolute top-6 inset-x-0 flex justify-center z-10 pointer-events-none">
          <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-widest">
            Sistema en acción
          </p>
        </div>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-200 z-10">
          <div
            ref={progressBarRef}
            className="h-full bg-sigah-blue transition-none"
            style={{ width: '0%' }}
          />
        </div>

        {/* Máquina — estática, derecha */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 md:pr-10 lg:pr-16 pointer-events-none">
          <img
            src="/maquina-anestesia.jpg"
            alt="Máquina de anestesia Mindray gestionada con SIGAH"
            className="h-[78vh] w-auto object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Cards — escalera diagonal */}
        <div className="absolute inset-0 pointer-events-none">
          {CARDS.map((card, i) => (
            <div
              key={card.title}
              ref={cardRefs[i]}
              className="absolute w-[200px]"
              style={{
                left: card.left,
                top: card.top,
                opacity: 0,
                transform: 'translateX(-20px)',
                transition: 'opacity 0.65s ease, transform 0.65s ease',
              }}
            >
              <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${card.dot} flex-shrink-0`} />
                  <span className="font-data font-normal text-[10px] text-slate-400 uppercase tracking-wider">
                    {card.tag}
                  </span>
                </div>
                <h3 className="font-sans font-medium text-sm text-slate-900 mb-1 leading-snug">
                  {card.title}
                </h3>
                <p className="font-data font-normal text-xs text-slate-500 leading-relaxed">
                  {card.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <p className="font-data font-normal text-xs text-slate-400">
            Desplázate para explorar el sistema
          </p>
        </div>
      </div>
    </section>
  )
}
