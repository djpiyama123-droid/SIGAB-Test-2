import { useRef, useEffect } from 'react'
import AnesthesiaMachine from './AnesthesiaMachine'

const LERP_FACTOR = 0.08
const JITTER_THRESHOLD = 0.04

// Cards narrative — each appears when progress >= threshold
const CARDS = [
  {
    title: 'Trazabilidad física absoluta',
    body: 'Cada activo biomédico es vinculado a una zona geográfica y responsable, eliminando tiempos muertos en urgencias y quirófanos.',
    threshold: 0.18,
    side: 'start' as const,
    highlightGroup: 'sigah-monitor-group',
  },
  {
    title: 'IA predictiva integrada',
    body: 'Nuestra capa analítica procesa historial de órdenes de servicio para anticipar fallas críticas antes de que ocurran.',
    threshold: 0.55,
    side: 'end' as const,
    highlightGroup: 'sigah-panel-group',
  },
]

// Highlight groups sequenced by scroll progress
const HIGHLIGHT_SEQUENCE = [
  { from: 0.0,  to: 0.4,  groupId: 'sigah-monitor-group'   },
  { from: 0.4,  to: 0.75, groupId: 'sigah-panel-group'     },
  { from: 0.75, to: 1.0,  groupId: 'sigah-circuit-group'   },
]

const GLOW_FILTER = 'drop-shadow(0 0 10px rgba(0,108,183,0.8)) drop-shadow(0 0 3px rgba(0,108,183,0.6))'
const NO_FILTER   = 'none'

export default function ScrollVideoEngine() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const stickyRef      = useRef<HTMLDivElement>(null)
  const card1Ref       = useRef<HTMLDivElement>(null)
  const card2Ref       = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const rafRef         = useRef<number>(0)
  const progressRef    = useRef<number>(0)
  const targetRef      = useRef<number>(0)

  useEffect(() => {
    const cardRefs = [card1Ref, card2Ref]

    // Cache SVG group elements once
    let groupEls: Map<string, SVGElement> | null = null
    const getGroupEls = () => {
      if (groupEls) return groupEls
      const container = containerRef.current
      if (!container) return null
      groupEls = new Map([
        ['sigah-monitor-group',   container.querySelector('#sigah-monitor-group')   as SVGElement],
        ['sigah-panel-group',     container.querySelector('#sigah-panel-group')     as SVGElement],
        ['sigah-circuit-group',   container.querySelector('#sigah-circuit-group')   as SVGElement],
        ['sigah-vaporizer-group', container.querySelector('#sigah-vaporizer-group') as SVGElement],
        ['sigah-cart-group',      container.querySelector('#sigah-cart-group')      as SVGElement],
      ])
      return groupEls
    }

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

      // Progress bar
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`
      }

      // Narrative cards (opacity + transform)
      CARDS.forEach((card, i) => {
        const ref = cardRefs[i].current
        if (!ref) return
        const visible = p >= card.threshold
        ref.style.opacity = visible ? '1' : '0'
        ref.style.transform = visible ? 'translateY(0px)' : 'translateY(20px)'
      })

      // SVG group highlights
      const els = getGroupEls()
      if (els) {
        // First reset all
        els.forEach(el => { if (el) el.style.filter = NO_FILTER })
        // Apply glow to active group
        const activeSeq = HIGHLIGHT_SEQUENCE.find(s => p >= s.from && p < s.to)
        if (activeSeq) {
          const el = els.get(activeSeq.groupId)
          if (el) el.style.filter = GLOW_FILTER
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <section
      id="plataforma"
      ref={containerRef}
      className="relative w-full"
      style={{ height: '340vh' }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-sigah-blue-dark"
      >
        {/* Section heading */}
        <div className="absolute top-6 inset-x-0 flex justify-center z-10">
          <p className="font-data font-normal text-xs text-white/40 uppercase tracking-widest">
            Sistema en acción
          </p>
        </div>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
          <div
            ref={progressBarRef}
            className="h-full bg-sigah-blue transition-none"
            style={{ width: '0%' }}
          />
        </div>

        {/* SVG illustration — right-side aligned */}
        <div className="absolute inset-0 flex items-center justify-end pr-8 lg:pr-16 pointer-events-none">
          <AnesthesiaMachine className="h-[82vh] w-auto max-w-[52%] opacity-90" />
        </div>

        {/* Left overlay gradient for card readability */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,73,125,0.9) 40%, transparent)' }}
        />

        {/* Narrative cards */}
        <div className="absolute inset-0 flex flex-col justify-between p-8 lg:p-14 pointer-events-none">
          {/* Card 1 — top left */}
          <div
            ref={card1Ref}
            className="max-w-xs mt-16 self-start"
            style={{
              opacity: 0,
              transform: 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <div className="bg-white/8 backdrop-blur-none border border-white/15 rounded-[8px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sigah-blue flex-shrink-0" />
                <span className="font-data font-normal text-xs text-white/50 uppercase tracking-wider">
                  Monitor de vitales
                </span>
              </div>
              <h3 className="font-sans font-medium text-base text-white mb-1.5">
                {CARDS[0].title}
              </h3>
              <p className="font-data font-normal text-sm text-white/70 leading-relaxed">
                {CARDS[0].body}
              </p>
            </div>
          </div>

          {/* Card 2 — bottom left */}
          <div
            ref={card2Ref}
            className="max-w-xs mb-14 self-start"
            style={{
              opacity: 0,
              transform: 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <div className="bg-white/8 backdrop-blur-none border border-white/15 rounded-[8px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-esmeralda flex-shrink-0" />
                <span className="font-data font-normal text-xs text-white/50 uppercase tracking-wider">
                  Panel de control
                </span>
              </div>
              <h3 className="font-sans font-medium text-base text-white mb-1.5">
                {CARDS[1].title}
              </h3>
              <p className="font-data font-normal text-sm text-white/70 leading-relaxed">
                {CARDS[1].body}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll hint — only visible before scrolling starts */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <p className="font-data font-normal text-xs text-white/30">
            Desplázate para explorar el sistema
          </p>
        </div>
      </div>
    </section>
  )
}
