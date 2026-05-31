import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Shield,
  Cpu,
  Layers,
  BarChart3,
  Terminal,
  ArrowRight,
  CheckCircle,
  Database,
  Globe,
  Radio,
  FileText,
  Quote,
  TrendingDown,
  Clock,
  FileCheck2,
  Boxes
} from 'lucide-react';

const IMPACT_METRICS = [
  { icon: Clock, value: '-32%', label: 'Tiempo de equipo fuera de servicio', accent: 'teal' },
  { icon: TrendingDown, value: '-28%', label: 'Costos por mantenimiento correctivo', accent: 'blue' },
  { icon: FileCheck2, value: '+40%', label: 'Cumplimiento documental NOM-016', accent: 'emerald' },
  { icon: Boxes, value: '751', label: 'Activos biomédicos bajo control', accent: 'teal' },
];

const TESTIMONIALS = [
  {
    quote: 'Pasamos de bitácoras en papel a trazabilidad digital en tiempo real. Las auditorías de la NOM-016 que antes tomaban semanas ahora se preparan en horas.',
    author: 'Jefatura de Conservación',
    role: 'HGR No. 1 IMSS · Tijuana',
  },
  {
    quote: 'El Copilot con IA local nos permite leer etiquetas técnicas y fichas sin enviar datos a la nube. Cumple con seguridad institucional y acelera el inventario.',
    author: 'Ingeniería Biomédica',
    role: 'Departamento de Activos Médicos',
  },
  {
    quote: 'Las alertas de mantenimiento preventivo redujeron drásticamente las fallas críticas en quirófano. La disponibilidad de equipos subió de forma notable.',
    author: 'Coordinación Médica',
    role: 'Área Quirúrgica',
  },
];

const ACCENT_MAP = {
  teal: 'bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950',
  blue: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950',
  emerald: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950',
};

export default function LandingPage() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans relative selection:bg-teal-500 selection:text-slate-900">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              SIGAH<span className="text-teal-400 font-extrabold">.mx</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Módulos</a>
            <a href="#tech" className="hover:text-white transition-colors">Tecnología</a>
            <a href="#casos" className="hover:text-white transition-colors">Casos de éxito</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
            <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="relative px-6 py-2.5 rounded-xl text-sm font-semibold overflow-hidden group transition-all duration-300"
            >
              <span className="absolute inset-0 bg-slate-900 border border-slate-700 rounded-xl group-hover:border-teal-400 transition-colors duration-300"></span>
              <span className="relative text-slate-200 group-hover:text-teal-400 transition-colors duration-300">Acceso Portal</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-[1.03]"
            >
              Comenzar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          Ecosistema SaaS Multi-Tenant v2.0 Aprobado
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight mb-8"
        >
          Orquestación Inteligente para <br/>
          <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Gestión Biomédica y Hospitalaria
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed mb-12"
        >
          La única suite SaaS multi-tenant diseñada para ingeniería biomédica y administración de activos hospitalarios que integra IA local offline, cumplimiento estricto de la NOM-016-SSA3 y telemetría automatizada en tiempo real.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:scale-[1.03]"
          >
            Explorar Módulos <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#contact"
            className="flex items-center justify-center px-8 py-4 rounded-xl text-base font-bold bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all duration-300"
          >
            Solicitar Demo
          </a>
        </motion.div>
      </section>

      {/* Grid Features Módulos */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900 relative">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Módulos del Sistema
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Herramientas robustas diseñadas a la medida de la ingeniería clínica de vanguardia.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Card 1 */}
          <motion.div
            variants={itemVariants}
            className="bg-slate-900/40 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6 group-hover:bg-teal-500 group-hover:text-slate-950 transition-all duration-300">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">SIGAB Biomédico</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Control exhaustivo de la hoja de vida de equipos médicos, calibraciones de metrología y alertas de mantenimiento preventivo.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={itemVariants}
            className="bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-slate-950 transition-all duration-300">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Gobernanza NOM-016</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Auditoría digital en tiempo real para verificar el cumplimiento técnico e institucional en consultorios y quirófanos según las normativas vigentes del IMSS.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            variants={itemVariants}
            className="bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Reportes NOM-240</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Registro inmediato y trazabilidad completa de incidentes de tecnovigilancia, automatizando la recopilación de evidencias fotográficas digitales.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Orquestación Multi-Nodo (Tech) */}
      <section id="tech" className="bg-slate-900/20 border-y border-slate-900 py-24 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-semibold mb-6">
              <Terminal className="w-3.5 h-3.5" /> Arquitectura Distribuida
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
              Orquestación Multi-Nodo de Alta Disponibilidad
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              Nuestra infraestructura SaaS se despliega de forma agnóstica combinando la VPS en la nube (Bluehost) para administración y acceso corporativo global con nodos Edge locales de alto desempeño (Lenovo ThinkCentre) en el hospital general. Esto permite correr modelos de inteligencia artificial y OCR de forma local offline sin consumir tokens.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-400 flex items-center justify-center mt-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Sincronización Inteligente del Cerebro</h4>
                  <p className="text-slate-400 text-sm">Git con estrategia rebase sincroniza automáticamente las bitácoras de Obsidian cada 15 minutos.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-400 flex items-center justify-center mt-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Inferencia Offline con Ollama</h4>
                  <p className="text-slate-400 text-sm">Modelos Qwen2.5 y Gemma3 locales para lectura veloz de etiquetas técnicas y fichas de mantenimiento.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Visual simulation of multi-node dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-slate-500 font-mono ml-2">sys_monitor@sigah.mx</span>
                </div>
                <span className="text-xs text-teal-400 font-mono">100% OPERATIVO</span>
              </div>

              <div className="space-y-4 font-mono text-xs text-slate-400">
                <p className="text-emerald-400"># Verificando topología del sistema...</p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>Bluehost VPS Cloud (Master)</span>
                  </div>
                  <span className="text-teal-400 font-bold">ACTIVO</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Radio className="w-4 h-4 text-teal-400" />
                    <span>ASUS TUF A16 (Terminal Física)</span>
                  </div>
                  <span className="text-teal-400 font-bold">ACTIVO</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>Lenovo ThinkCentre (IMSS Edge)</span>
                  </div>
                  <span className="text-teal-400 font-bold">ONLINE</span>
                </div>

                <div className="pt-2 text-slate-500 flex justify-between">
                  <span>Tráfico API: 2,451 req/hora</span>
                  <span>Latencia global: 12ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Casos de Éxito — Testimonios + Métricas de Impacto */}
      <section id="casos" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-6">
            <CheckCircle className="w-3.5 h-3.5" /> Resultados Verificados
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Casos de Éxito e Impacto Operativo
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Implementado en operación hospitalaria real. Resultados medibles en disponibilidad, costos y cumplimiento normativo.
          </p>
        </div>

        {/* Métricas de Impacto */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {IMPACT_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                variants={itemVariants}
                className="bg-slate-900/40 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto transition-all duration-300 ${ACCENT_MAP[metric.accent]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {metric.value}
                </div>
                <p className="text-slate-400 text-sm leading-snug">{metric.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Testimonios */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.author}
              variants={itemVariants}
              className="bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] flex flex-col"
            >
              <Quote className="w-8 h-8 text-teal-400/60 mb-5" />
              <p className="text-slate-300 text-sm leading-relaxed flex-grow mb-6">
                {t.quote}
              </p>
              <div className="pt-5 border-t border-slate-800">
                <div className="font-bold text-slate-200 text-sm">{t.author}</div>
                <div className="text-slate-500 text-xs mt-0.5">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing / SaaS Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Planes de Suscripción SaaS</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Aislamiento total de datos (multi-tenant) con infraestructura a la medida.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan 1 */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold mb-2">Hospital Singular</h3>
            <p className="text-slate-400 text-sm mb-6">Para clínicas medianas y hospitales autónomos.</p>
            <div className="text-3xl font-extrabold text-white mb-6">Contacto <span className="text-sm font-normal text-slate-400">/ mes</span></div>
            <ul className="space-y-4 text-slate-300 text-sm mb-8 flex-grow">
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> 1 Hospital (Tenant Aislado)</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Módulos Básicos SIGAB</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Base de Datos Separada</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> 5 Usuarios Concurrentes</li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all">Saber Más</button>
          </div>

          {/* Plan 2 */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-teal-500 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden flex flex-col shadow-2xl shadow-teal-500/5">
            <div className="absolute top-4 right-4 bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">Recomendado</div>
            <h3 className="text-xl font-bold mb-2">Red Metropolitana</h3>
            <p className="text-slate-400 text-sm mb-6">Para redes de salud y delegaciones regionales.</p>
            <div className="text-3xl font-extrabold text-white mb-6">Contacto <span className="text-sm font-normal text-slate-400">/ mes</span></div>
            <ul className="space-y-4 text-slate-300 text-sm mb-8 flex-grow">
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Hasta 5 Hospitales</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Módulos Avanzados (Metrología)</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Aislamiento de Redes</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Copilot IA local ilimitado</li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold transition-all shadow-lg shadow-teal-500/20">Solicitar Información</button>
          </div>

          {/* Plan 3 */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold mb-2">Gubernamental Custom</h3>
            <p className="text-slate-400 text-sm mb-6">Para grandes delegaciones IMSS a nivel estatal.</p>
            <div className="text-3xl font-extrabold text-white mb-6">Cotización <span className="text-sm font-normal text-slate-400">/ anual</span></div>
            <ul className="space-y-4 text-slate-300 text-sm mb-8 flex-grow">
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Hospitales Ilimitados</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Integración con Sistemas IMSS</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Panel SuperAdmin Consolidado</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-teal-400" /> Soporte Dedicado 24/7</li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all">Agendar Cita</button>
          </div>
        </div>
      </section>

      {/* Formulario de Contacto */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-24 border-t border-slate-900 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">¿Listo para modernizar tu hospital?</h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">Completa el formulario y un especialista te contactará de inmediato.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 backdrop-blur-sm relative">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Gustavo ..."
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hospital o Institución</label>
                <input
                  type="text"
                  placeholder="HGR No. 1 Tijuana"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="gustavo@sigah.mx"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="+52 664 ..."
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mensaje o Requerimientos</label>
              <textarea
                rows="4"
                placeholder="Estamos interesados en la migración a la versión SaaS 2.0 y el licenciamiento..."
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none transition-colors resize-none"
              ></textarea>
            </div>

            <button
              type="button"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-extrabold rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-[1.01]"
            >
              Enviar Mensaje de Contacto
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-300">SIGAH Ecosistema</span>
          </div>

          <p>© 2026 SIGAH / SIGAB. Todos los derechos reservados. Bioingeniería.</p>

          <div className="flex gap-6 text-slate-400">
            <span className="cursor-pointer hover:text-white transition-colors">Aviso de Privacidad</span>
            <span className="cursor-pointer hover:text-white transition-colors">Términos de Uso</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
