/**
 * LandingPage.jsx — Portal comercial SIGAH (tema "Clinical Precision Glass").
 *
 * Página pública servida en `/`. Diseño premium dark glassmorphism (Stitch / Apple-Medical).
 * Es visualmente independiente del tema de la app: fuerza su propio fondo oscuro (#020617).
 * Si el usuario ya tiene sesión, redirige al dashboard de la app.
 *
 * Dirección visual "Quirófano de datos": scroll storytelling sobrio (reveals escalonados,
 * mockup 2.5D que se asienta, parallax lento, count-up de métricas). Todo CSS-first, sin
 * librería de animación nueva, y respeta prefers-reduced-motion en cada efecto.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, ArrowRight, Building2, Stethoscope, HeartPulse,
  CheckCircle2, CalendarCheck, Cpu, Activity, Database, Menu,
  Quote, TrendingDown, Clock, FileCheck2, Boxes,
} from 'lucide-react';
import { Button } from '../components/ui';

const NAV_LINKS = [
  { label: 'Plataforma',  href: '#plataforma' },
  { label: 'Planes',      href: '#planes' },
  { label: 'Casos de éxito', href: '#casos' },
  { label: 'Cumplimiento', href: '#cumplimiento' },
];

const SIGAH_FEATURES = [
  'Inventario digital de activos',
  'Cronograma de mantenimiento preventivo',
  'Alertas de calibración y vencimientos',
];

const SIGAB_FEATURES = [
  'Trazabilidad por zona y piso (mapa en vivo)',
  'Señales predictivas de falla con IA local',
  'Bitácoras clínicas y órdenes NOM-016',
];

const IMPACT_METRICS = [
  { icon: TrendingDown, value: '-32%', label: 'Tiempo caído en equipos vitales', sub: 'mastógrafos y ventiladores' },
  { icon: Clock,        value: '-28%', label: 'Costos en mantenimiento correctivo', sub: 'vs. esquema reactivo previo' },
  { icon: FileCheck2,   value: '+40%', label: 'Cumplimiento documental NOM-016', sub: 'bitácoras y trazabilidad' },
  { icon: Boxes,        value: '751',  label: 'Activos biomédicos gestionados', sub: 'inventario digital en vivo' },
];

const TESTIMONIALS = [
  { quote: 'Pasamos de hojas de cálculo dispersas a un inventario único con trazabilidad por piso. La auditoría NOM-016 dejó de ser una crisis trimestral.', name: 'Ing. Laura Méndez', role: 'Jefa de Ingeniería Biomédica', org: 'Hospital General Regional' },
  { quote: 'Las señales predictivas nos avisan antes de que un ventilador falle. Redujimos paros no programados en soporte vital de forma notable.', name: 'Ing. Carlos Ríos', role: 'Coordinador de Conservación', org: 'Red Hospitalaria Metropolitana' },
  { quote: 'El cumplimiento regulatorio quedó integrado al flujo de trabajo diario. La IA local corre dentro del hospital, sin enviar datos a la nube.', name: 'Dr. Antonio Vega', role: 'Director de Operaciones', org: 'Instituto de Especialidades' },
];

const SPY_IDS = ['plataforma', 'ecosistema', 'casos', 'planes', 'cumplimiento'];

const TRUST_SEALS = [
  { icon: ShieldCheck, label: 'NOM-016-SSA3' },
  { icon: Activity,    label: 'NOM-240-SSA1' },
  { icon: Database,    label: 'ISO 13485' },
  { icon: Cpu,         label: 'IA local On-Premise' },
];

/* ── Hooks de animación (vanilla, 0 kb de lib) ───────────────────────── */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

// Revela todos los [data-reveal] una sola vez al entrar en viewport.
function useReveal(reduced) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (reduced) { els.forEach((el) => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced]);
}

// Nav compacto al scrollear + expone --scroll-y para el parallax del hero.
function useScrollFx(reduced) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled(y > 8);
        if (!reduced) document.documentElement.style.setProperty('--scroll-y', String(y));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);
  return scrolled;
}

// Link de nav activo según la sección visible (scroll-spy).
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

// Número que persigue suavemente su objetivo (tween del precio al mover el slider).
function useSpringNumber(target, reduced) {
  const [val, setVal] = useState(target);
  const cur = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) { cur.current = target; setVal(target); return; }
    cancelAnimationFrame(raf.current);
    const step = () => {
      const d = target - cur.current;
      if (Math.abs(d) < 0.5) { cur.current = target; setVal(target); return; }
      cur.current += d * 0.18;            // ponytail: lerp simple, sin lib de spring
      setVal(cur.current);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced]);
  return Math.round(val);
}

/* ── Componentes de presentación ─────────────────────────────────────── */

// Titular que entra palabra por palabra (escalonado).
function Words({ text, start = 0, step = 55, className = '' }) {
  const words = text.split(' ');
  // El espacio va como text node FUERA del span: un inline-block colapsa su
  // whitespace interno y pegaría las palabras.
  return words.flatMap((w, i) => {
    const span = (
      <span
        key={`${w}-${i}`}
        data-reveal
        className={`reveal-word ${className}`}
        style={{ '--d': `${start + i * step}ms` }}
      >
        {w}
      </span>
    );
    return i < words.length - 1 ? [span, ' '] : [span];
  });
}

// Métrica de impacto con count-up al entrar en viewport. Preserva signo y sufijo.
function AnimatedMetric({ value, reduced }) {
  const m = String(value).match(/^([+-]?)(\d+)(.*)$/);
  const sign = m ? m[1] : '';
  const end = m ? parseInt(m[2], 10) : 0;
  const suffix = m ? m[3] : '';
  const ref = useRef(null);
  const [n, setN] = useState(reduced || !m ? end : 0);

  useEffect(() => {
    if (reduced || !m) { setN(end); return; }
    const node = ref.current;
    let raf = 0, started = false;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        const dur = 1400, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          setN(Math.round(end * (1 - Math.pow(1 - p, 3))));   // easeOutCubic
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    if (node) io.observe(node);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
    // deps por `value` (estable), NO por `m` (array nuevo cada render → reiniciaría el tick).
  }, [value, reduced]);

  if (!m) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{sign}{n}{suffix}</span>;
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [beds, setBeds] = useState(500);

  // Hooks de animación — todos antes de cualquier return condicional (reglas de hooks).
  const reduced = usePrefersReducedMotion();
  const scrolled = useScrollFx(reduced);
  const active = useScrollSpy(SPY_IDS);
  useReveal(reduced);
  const animatedPrice = useSpringNumber(500 + beds * 4, reduced);   // base $500 + $4/cama

  // En "/" con sesión activa → directo a la app. En "/landing" siempre se muestra
  // (útil como preview de marketing aunque haya sesión iniciada).
  if (user && location.pathname === '/') return <Navigate to="/dashboard" replace />;

  const price = animatedPrice.toLocaleString('es-MX');
  const goLogin = () => navigate('/login');

  return (
    <div
      className="min-h-screen flex flex-col font-body text-[#dae2fd] antialiased"
      style={{ backgroundColor: '#020617' }}
    >
      {/* ── Navegación fija (se compacta al scrollear, link activo por sección) ── */}
      <nav
        className={`fixed top-0 w-full z-50 backdrop-blur-[20px] border-b border-cyan-glow/10 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0b1326]/80 shadow-[0_4px_24px_rgba(34,217,244,0.08)]'
            : 'bg-[#0b1326]/55 shadow-[0_0_20px_rgba(34,217,244,0.05)]'
        }`}
      >
        <div className={`flex justify-between items-center px-6 md:px-8 max-w-7xl mx-auto transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
          <div className="flex items-center gap-6">
            <span className="font-display font-extrabold text-xl text-cyan-glow tracking-tighter">SIGAH</span>
            <div className="hidden md:flex items-center gap-5 ml-4">
              {NAV_LINKS.map((l) => {
                const isActive = active === l.href.slice(1);
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    className={`text-sm transition-colors ${isActive ? 'text-cyan-glow' : 'text-[#bbc9cd] hover:text-cyan-glow'}`}
                  >
                    {l.label}
                  </a>
                );
              })}
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={goLogin} className="hidden md:inline-flex">
            Iniciar sesión
          </Button>
          <button className="md:hidden text-cyan-glow" onClick={goLogin} aria-label="Acceder">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* ── Hero ── */}
        <section
          id="plataforma"
          className="relative px-6 md:px-8 py-20 md:py-28 flex flex-col items-center text-center radial-bg overflow-hidden"
        >
          {/* Video ambiental de fondo (muy tenue) — desactivado en reduced-motion */}
          {!reduced && (
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-[0.16] pointer-events-none"
              src="/landing/hero-loop.webm"
              poster="/landing/hero-loop-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          )}
          {/* Overlay para legibilidad del texto sobre el video */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#020617]/40 via-[#020617]/10 to-[#020617]"
          />
          {/* Glow decorativo con parallax lento */}
          <div
            aria-hidden="true"
            className="hero-parallax pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[min(90vw,720px)] h-[480px] rounded-full blur-[120px] opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)' }}
          />
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div data-reveal className="reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-sigah-blue text-[#9fcaff] bg-[#0b1326]/50 backdrop-blur-sm">
              <ShieldCheck size={15} />
              Validado en HGR No. 1 IMSS Tijuana
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-tight">
              <Words text="Gestión biomédica inteligente." start={120} />
              <br />
              <Words text="Cumplimiento NOM-016 en automático." start={420} className="text-gradient" />
            </h1>
            <p data-reveal className="reveal text-lg text-[#bbc9cd] max-w-2xl leading-relaxed" style={{ '--d': '760ms' }}>
              El sistema operativo clínico que digitaliza bitácoras, predice fallas en equipos vitales
              y asegura el cumplimiento regulatorio sin esfuerzo cognitivo.
            </p>
            <div data-reveal className="reveal flex flex-col sm:flex-row gap-4 mt-4" style={{ '--d': '900ms' }}>
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right" onClick={goLogin}>
                Comenzar ahora
              </Button>
              <Button variant="glass" size="lg" as="a" href="#planes">
                Ver funcionamiento
              </Button>
            </div>
          </div>

          {/* Preview real del dashboard — mockup con efecto 2.5D al entrar */}
          <div
            data-reveal
            className="hero-rise relative w-full max-w-5xl mt-16 mx-auto z-10 glass-panel rounded-xl p-2 overflow-hidden hidden md:block"
            style={{ '--d': '300ms' }}
          >
            <img
              src="/landing/dashboard-hero.webp"
              alt="Tablero SIGAB de gestión de activos biomédicos del HGR No. 1 IMSS Tijuana"
              width={1500}
              height={1222}
              loading="lazy"
              decoding="async"
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#020617] via-transparent to-transparent pointer-events-none" />
          </div>
        </section>

        {/* ── Ecosistema SIGAH vs SIGAB ── */}
        <section id="ecosistema" className="py-20 px-6 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div data-reveal className="reveal text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Ecosistema SIGAH</h2>
              <p className="text-lg text-[#bbc9cd] max-w-2xl mx-auto">
                Módulos especializados para cubrir cada aspecto operativo y clínico de tu institución médica.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SIGAH Comercial */}
              <div data-reveal className="reveal reveal-left glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group">
                <Building2 className="absolute top-4 right-4 text-cyan-glow opacity-20 group-hover:opacity-100 transition-opacity" size={56} />
                <h3 className="font-display font-semibold text-xl text-cyan-glow flex items-center gap-2">
                  <Building2 size={22} /> SIGAH Comercial
                </h3>
                <p className="text-[#bbc9cd]">Gestión administrativa y mantenimiento de equipos biomédicos.</p>
                <ul className="space-y-2 mt-2 flex-grow">
                  {SIGAH_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[#dae2fd]">
                      <CheckCircle2 className="text-cyan-glow shrink-0 mt-0.5" size={20} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* SIGAB Clínico */}
              <div data-reveal className="reveal reveal-right glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group border-ai-violet/30" style={{ '--d': '120ms' }}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ai-violet to-transparent opacity-50" />
                <HeartPulse className="absolute top-4 right-4 text-ai-violet opacity-20 group-hover:opacity-100 transition-opacity" size={56} />
                <h3 className="font-display font-semibold text-xl text-[#cbb5ff] flex items-center gap-2">
                  <Stethoscope size={22} /> SIGAB Clínico
                </h3>
                <p className="text-[#bbc9cd]">Monitoreo y trazabilidad de activos y operación clínica en tiempo real.</p>
                <ul className="space-y-2 mt-2 flex-grow">
                  {SIGAB_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[#dae2fd]">
                      <CheckCircle2 className="text-[#cbb5ff] shrink-0 mt-0.5" size={20} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Casos de éxito + impacto (fondo fotográfico con overlay) ── */}
        <section id="casos" className="photo-section py-20 px-6 md:px-8 bg-[#060e20]">
          <div className="photo-layer" style={{ backgroundImage: "url('/landing/casos-bg.webp')" }} />
          <div className="max-w-6xl mx-auto">
            <div data-reveal className="reveal text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Casos de éxito</h2>
              <p className="text-lg text-[#bbc9cd] max-w-2xl mx-auto">
                Instituciones médicas que ya operan con cumplimiento automatizado y mantenimiento predictivo.
              </p>
            </div>

            {/* Testimonios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  data-reveal
                  className="reveal glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group"
                  style={{ '--d': `${i * 110}ms` }}
                >
                  <Quote className="text-cyan-glow opacity-30 group-hover:opacity-100 transition-opacity" size={28} />
                  <blockquote className="text-[#dae2fd] leading-relaxed flex-grow">{t.quote}</blockquote>
                  <figcaption className="border-t border-cyan-glow/10 pt-4">
                    <div className="font-display font-semibold text-white text-sm">{t.name}</div>
                    <div className="text-xs text-cyan-glow">{t.role}</div>
                    <div className="text-xs text-[#859397]">{t.org}</div>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Métricas de impacto (count-up al entrar) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {IMPACT_METRICS.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    data-reveal
                    className="reveal glass-panel rounded-xl p-6 flex flex-col items-center text-center gap-2"
                    style={{ '--d': `${i * 90}ms` }}
                  >
                    <Icon className="text-cyan-glow mb-1" size={26} />
                    <span className="font-display font-extrabold text-3xl md:text-4xl text-white">
                      <AnimatedMetric value={m.value} reduced={reduced} />
                    </span>
                    <span className="text-sm text-[#dae2fd] leading-snug">{m.label}</span>
                    <span className="text-xs text-[#859397]">{m.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Calculadora de inversión ── */}
        <section id="planes" className="py-20 px-6 md:px-8 bg-[#060e20]">
          <div data-reveal className="reveal max-w-4xl mx-auto glass-panel rounded-xl p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 w-full">
              <h2 className="font-display font-bold text-3xl mb-2">Calculadora de inversión</h2>
              <p className="text-[#bbc9cd] mb-8">Escala tu licencia según la capacidad de tu institución.</p>
              <div className="mb-3 flex justify-between items-end">
                <label htmlFor="bed-slider" className="text-xs font-semibold text-cyan-glow uppercase tracking-wider">
                  Camas censables
                </label>
                <span className="font-display font-semibold text-xl text-white">{beds}</span>
              </div>
              <input
                id="bed-slider"
                type="range"
                min="50"
                max="2000"
                step="50"
                value={beds}
                onChange={(e) => setBeds(parseInt(e.target.value, 10))}
                className="glass-range w-full h-2 bg-[#2d3449] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-xs text-[#859397]">
                <span>50</span>
                <span>2000</span>
              </div>
            </div>
            <div className="flex-1 w-full bg-[#171f33] rounded-lg p-6 border border-cyan-glow/20 text-center shadow-inner transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]">
              <div className="text-xs text-[#bbc9cd] uppercase tracking-wider mb-2">Inversión mensual estimada</div>
              <div className="font-display font-extrabold text-5xl text-cyan-glow mb-2 flex justify-center items-start" style={{ textShadow: '0 0 24px rgba(34,211,238,0.25)' }}>
                <span className="text-xl mt-1">$</span>
                <span>{price}</span>
                <span className="text-xl mt-auto mb-1 text-[#bbc9cd]">/mes</span>
              </div>
              <p className="text-xs text-[#bbc9cd] mb-6">Licencia incluye soporte técnico 24/7</p>
              <Button variant="primary" className="w-full" onClick={goLogin}>
                Solicitar presupuesto formal
              </Button>
            </div>
          </div>
        </section>

        {/* ── Formulario de auditoría (lead) con fondo fotográfico ── */}
        <section id="cumplimiento" className="photo-section py-20 px-6 md:px-8 bg-[#060e20]">
          <div className="photo-layer" style={{ backgroundImage: "url('/landing/cta-bg.webp')" }} />
          <div data-reveal className="reveal max-w-3xl mx-auto glass-panel rounded-xl p-8 md:p-10 border border-cyan-glow/30 relative overflow-hidden">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-glow/0 via-cyan-glow/20 to-cyan-glow/0 opacity-50 pointer-events-none animate-shimmer" />
            <div className="text-center mb-8 relative z-10">
              <h2 className="font-display font-bold text-3xl mb-2">Agenda tu auditoría gratuita NOM-016</h2>
              <p className="text-[#bbc9cd]">
                Descubre el nivel de cumplimiento actual de tu hospital y cómo SIGAH puede automatizarlo.
              </p>
            </div>
            <form
              className="flex flex-col gap-5 relative z-10"
              onSubmit={(e) => { e.preventDefault(); goLogin(); }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="landing-nombre" className="text-xs text-[#bbc9cd]">Nombre completo</label>
                  <input
                    id="landing-nombre"
                    type="text"
                    placeholder="Dr. Juan Pérez"
                    className="bg-[#020617] border border-cyan-glow/20 rounded-lg p-3 text-white placeholder-[#859397] focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="landing-institucion" className="text-xs text-[#bbc9cd]">Institución médica</label>
                  <input
                    id="landing-institucion"
                    type="text"
                    placeholder="Hospital General"
                    className="bg-[#020617] border border-cyan-glow/20 rounded-lg p-3 text-white placeholder-[#859397] focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="landing-correo" className="text-xs text-[#bbc9cd]">Correo corporativo</label>
                <input
                  id="landing-correo"
                  type="email"
                  placeholder="juan.perez@hospital.com"
                  className="bg-[#020617] border border-cyan-glow/20 rounded-lg p-3 text-white placeholder-[#859397] focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow focus:outline-none transition-colors"
                />
              </div>
              <Button variant="primary" type="submit" icon={CalendarCheck} className="w-full mt-2">
                Solicitar auditoría
              </Button>
              <p className="text-center text-xs text-[#859397]">
                Tus datos están protegidos bajo estrictos protocolos de privacidad.
              </p>
            </form>
          </div>
        </section>

        {/* ── Tira de confianza (marquee suave, pausable, estático en reduced-motion) ── */}
        <section className="py-12 px-6 md:px-8 border-t border-cyan-glow/10 overflow-hidden">
          <div className="marquee-mask max-w-5xl mx-auto">
            <div className="marquee-track gap-8 text-[#859397]">
              {[...TRUST_SEALS, ...TRUST_SEALS].map((s, i) => {
                const Icon = s.icon;
                return (
                  <span key={i} aria-hidden={i >= TRUST_SEALS.length} className="flex items-center gap-2 text-sm whitespace-nowrap px-4">
                    <Icon size={18} className="text-cyan-glow" /> {s.label}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#060e20] w-full py-12 border-t border-cyan-glow/10 flex flex-col md:flex-row justify-between items-center px-6 md:px-8 gap-4 mt-auto">
        <span className="font-display font-bold text-lg text-white">SIGAH</span>
        <div className="flex flex-wrap justify-center gap-6">
          {['Privacidad', 'Términos', 'Contacto', 'Cumplimiento'].map((t) => (
            <a key={t} href="#" className="text-xs uppercase tracking-wider text-[#bbc9cd] hover:text-cyan-glow transition-colors">{t}</a>
          ))}
        </div>
        <span className="text-xs uppercase tracking-wider text-[#9fcaff]">© 2026 SIGAH Medical Systems</span>
      </footer>
    </div>
  );
}
