/**
 * LandingPage.jsx — Portal comercial SIGAH (tema "Clinical Precision Glass").
 *
 * Página pública servida en `/`. Diseño premium dark glassmorphism (Stitch / Apple-Medical).
 * Es visualmente independiente del tema de la app: fuerza su propio fondo oscuro (#020617).
 * Si el usuario ya tiene sesión, redirige al dashboard de la app.
 */
import { useState } from 'react';
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

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [beds, setBeds] = useState(500);

  // En "/" con sesión activa → directo a la app. En "/landing" siempre se muestra
  // (útil como preview de marketing aunque haya sesión iniciada).
  if (user && location.pathname === '/') return <Navigate to="/dashboard" replace />;

  // Calculadora: base $500 + $4 por cama censable.
  const price = (500 + beds * 4).toLocaleString('es-MX');

  const goLogin = () => navigate('/login');

  return (
    <div
      className="min-h-screen flex flex-col font-body text-[#dae2fd] antialiased"
      style={{ backgroundColor: '#020617' }}
    >
      {/* ── Navegación fija ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0b1326]/55 backdrop-blur-[20px] border-b border-cyan-glow/10 shadow-[0_0_20px_rgba(34,217,244,0.05)]">
        <div className="flex justify-between items-center px-6 md:px-8 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <span className="font-display font-extrabold text-xl text-cyan-glow tracking-tighter">SIGAH</span>
            <div className="hidden md:flex items-center gap-5 ml-4">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm text-[#bbc9cd] hover:text-cyan-glow transition-colors"
                >
                  {l.label}
                </a>
              ))}
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
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-sigah-blue text-[#9fcaff] bg-[#0b1326]/50 backdrop-blur-sm">
              <ShieldCheck size={15} />
              Validado en HGR No. 1 IMSS Tijuana
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-tight">
              Gestión biomédica inteligente.<br />
              <span className="text-gradient">Cumplimiento NOM-016 en automático.</span>
            </h1>
            <p className="text-lg text-[#bbc9cd] max-w-2xl leading-relaxed">
              El sistema operativo clínico que digitaliza bitácoras, predice fallas en equipos vitales
              y asegura el cumplimiento regulatorio sin esfuerzo cognitivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right" onClick={goLogin}>
                Comenzar ahora
              </Button>
              <Button variant="glass" size="lg" as="a" href="#planes">
                Ver funcionamiento
              </Button>
            </div>
          </div>

          {/* Preview abstracto del dashboard */}
          <div className="relative w-full max-w-5xl mt-16 mx-auto z-10 glass-panel rounded-xl p-6 overflow-hidden aspect-video hidden md:block group">
            <div className="relative z-10 flex flex-col h-full gap-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">
              <div className="flex justify-between items-center border-b border-cyan-glow/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs text-[#bbc9cd] uppercase tracking-wider">Sistema en línea</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-[#171f33] rounded" />
                  <div className="h-6 w-6 bg-[#171f33] rounded-full" />
                </div>
              </div>
              <div className="flex-grow grid grid-cols-3 gap-4">
                <div className="col-span-2 flex flex-col gap-4">
                  <div className="bg-[#0b1326]/50 rounded-lg flex-grow border border-cyan-glow/10" />
                  <div className="bg-[#0b1326]/50 rounded-lg h-24 border border-cyan-glow/10" />
                </div>
                <div className="col-span-1 flex flex-col gap-4">
                  <div className="bg-[#0b1326]/50 rounded-lg h-1/3 border border-cyan-glow/10" />
                  <div className="ai-card rounded-lg flex-grow" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-20" />
          </div>
        </section>

        {/* ── Ecosistema SIGAH vs SIGAB ── */}
        <section id="ecosistema" className="py-20 px-6 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Ecosistema SIGAH</h2>
              <p className="text-lg text-[#bbc9cd] max-w-2xl mx-auto">
                Módulos especializados para cubrir cada aspecto operativo y clínico de tu institución médica.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SIGAH Comercial */}
              <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group">
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
              <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group border-ai-violet/30">
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

        {/* ── Casos de éxito + impacto ── */}
        <section id="casos" className="py-20 px-6 md:px-8 bg-[#060e20]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Casos de éxito</h2>
              <p className="text-lg text-[#bbc9cd] max-w-2xl mx-auto">
                Instituciones médicas que ya operan con cumplimiento automatizado y mantenimiento predictivo.
              </p>
            </div>

            {/* Testimonios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group"
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

            {/* Métricas de impacto */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {IMPACT_METRICS.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="glass-panel rounded-xl p-6 flex flex-col items-center text-center gap-2"
                  >
                    <Icon className="text-cyan-glow mb-1" size={26} />
                    <span className="font-display font-extrabold text-3xl md:text-4xl text-white">{m.value}</span>
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
          <div className="max-w-4xl mx-auto glass-panel rounded-xl p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center">
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
            <div className="flex-1 w-full bg-[#171f33] rounded-lg p-6 border border-cyan-glow/20 text-center shadow-inner">
              <div className="text-xs text-[#bbc9cd] uppercase tracking-wider mb-2">Inversión mensual estimada</div>
              <div className="font-display font-extrabold text-5xl text-cyan-glow mb-2 flex justify-center items-start">
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

        {/* ── Formulario de auditoría (lead) ── */}
        <section id="cumplimiento" className="py-20 px-6 md:px-8 bg-[#060e20]">
          <div className="max-w-3xl mx-auto glass-panel rounded-xl p-8 md:p-10 border border-cyan-glow/30 relative overflow-hidden">
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
                  <label className="text-xs text-[#bbc9cd]">Nombre completo</label>
                  <input
                    type="text"
                    placeholder="Dr. Juan Pérez"
                    className="bg-[#020617] border border-cyan-glow/20 rounded-lg p-3 text-white placeholder-[#859397] focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[#bbc9cd]">Institución médica</label>
                  <input
                    type="text"
                    placeholder="Hospital General"
                    className="bg-[#020617] border border-cyan-glow/20 rounded-lg p-3 text-white placeholder-[#859397] focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#bbc9cd]">Correo corporativo</label>
                <input
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

        {/* ── Tira de confianza ── */}
        <section className="py-12 px-6 md:px-8 border-t border-cyan-glow/10">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center items-center gap-8 text-[#859397]">
            <span className="flex items-center gap-2 text-sm"><ShieldCheck size={18} className="text-cyan-glow" /> NOM-016-SSA3</span>
            <span className="flex items-center gap-2 text-sm"><Activity size={18} className="text-cyan-glow" /> NOM-240-SSA1</span>
            <span className="flex items-center gap-2 text-sm"><Database size={18} className="text-cyan-glow" /> ISO 13485</span>
            <span className="flex items-center gap-2 text-sm"><Cpu size={18} className="text-cyan-glow" /> IA local On-Premise</span>
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
