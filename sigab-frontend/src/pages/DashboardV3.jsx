/**
 * @module pages/DashboardV3
 * @description SIGAB v3.0 — Dashboard "Verde-Blanco IMSS" (estilo Clinni).
 * - DashboardV3 (default): página autocontenida con shell propio. Ruta /v3
 * - DashboardV3Content: solo el contenido, para usar dentro del Layout real. Ruta /v3app
 */
import '../styles/dashboard-v3.css';
import {
  ActivitySquare, LayoutDashboard, Boxes, ClipboardList, Wrench, ShieldAlert,
  Ruler, FileText, Hospital, BarChart3, Building2, Settings, ArrowUpRight,
  Sparkles, MoreHorizontal, HeartPulse, Gauge, ShieldCheck, LayoutGrid,
  ArrowRight, CalendarClock,
} from 'lucide-react';

const NAV = [
  { icon: LayoutDashboard, label: 'Resumen', active: true },
  { icon: Boxes, label: 'Inventario' },
  { icon: ClipboardList, label: 'Órdenes de servicio' },
  { icon: Wrench, label: 'Mantenimientos' },
  { icon: ShieldAlert, label: 'Tecnovigilancia' },
  { icon: Ruler, label: 'Calibraciones' },
  { icon: FileText, label: 'Formatos NOM' },
  { icon: Hospital, label: 'Hospitales' },
  { icon: BarChart3, label: 'Reportes' },
];

const CARDS = [
  { ic: 'ic1', big: 'big1', Icon: Wrench, title: 'Mantenimiento', desc: 'Órdenes correctivas y preventivas en curso.', value: '24', unit: 'órdenes activas' },
  { ic: 'ic2', big: 'big2', Icon: Gauge, title: 'Operatividad', desc: 'Disponibilidad de la flota en tiempo real.', value: '1,089', unit: 'equipos operativos' },
  { ic: 'ic3', big: 'big3', Icon: ShieldCheck, title: 'Tecnovigilancia', desc: 'Alertas y reportes de seguridad de equipos.', value: '7', unit: 'alertas abiertas' },
  { ic: 'ic4', big: 'big4', Icon: LayoutGrid, title: 'Inventario', desc: 'Catálogo de equipo médico por área.', value: '1,248', unit: 'equipos' },
];

/* Contenido del dashboard (sin shell) — reutilizable dentro del Layout real */
function MainArea() {
  return (
    <main className="main">
      <div className="head">
        <div>
          <h1>Flota biomédica operativa, con incidencias por atender</h1>
          <p className="sub">Detectamos equipos que requieren mantenimiento y órdenes de servicio por cerrar en las áreas críticas.</p>
          <div className="metrics">
            <div className="metric">
              <div className="k">Equipos totales</div>
              <div className="v" style={{ color: 'var(--g1b)' }}>1,248</div>
              <div className="bar" style={{ background: 'linear-gradient(90deg,var(--g1a),var(--g1b))' }} />
            </div>
            <div className="metric">
              <div className="k">Órdenes abiertas</div>
              <div className="v" style={{ color: 'var(--g2b)' }}>39</div>
              <div className="bar" style={{ background: 'linear-gradient(90deg,var(--g2a),var(--g2b))' }} />
            </div>
          </div>
          <div className="cta">
            <button className="btn"><Sparkles size={18} /> Análisis inteligente IA</button>
            <button className="btn-ghost"><MoreHorizontal size={20} /></button>
          </div>
        </div>

        <div className="gauge">
          <svg width="212" height="212" viewBox="0 0 212 212">
            <circle cx="106" cy="106" r="90" fill="none" stroke="#E9F4EE" strokeWidth="18" />
            <defs>
              <linearGradient id="dv3g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--ring-from)" />
                <stop offset="1" stopColor="var(--ring-to)" />
              </linearGradient>
            </defs>
            <circle cx="106" cy="106" r="90" fill="none" stroke="url(#dv3g)" strokeWidth="18"
              strokeLinecap="round" strokeDasharray="565" strokeDashoffset="73"
              transform="rotate(-90 106 106)" />
          </svg>
          <div className="lbl">
            <div className="icn"><HeartPulse size={20} /></div>
            <div className="cap">Índice de disponibilidad</div>
            <div className="num">87<small>/100</small></div>
            <div className="ok">Óptimo</div>
          </div>
        </div>
      </div>

      <div className="cards">
        {CARDS.map(({ ic, big, Icon, title, desc, value, unit }) => (
          <div className="card" key={title}>
            <div className={`ic ${ic}`}><Icon size={22} /></div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="foot">
              <div>
                <div className={`big ${big}`}>{value}</div>
                <div className="unit">{unit}</div>
              </div>
              <div className="arrow"><ArrowRight size={17} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="banner">
        <div className="ic"><CalendarClock size={22} /></div>
        <div>
          <b>Calibraciones próximas</b>
          <p>Programa y da seguimiento a las calibraciones que vencen este mes.</p>
        </div>
        <div className="arrow"><ArrowRight size={18} /></div>
      </div>
    </main>
  );
}

/* Solo contenido — para montar dentro del Layout/Sidebar/Header reales */
export function DashboardV3Content() {
  return (
    <div className="dv3" style={{ minHeight: 'auto', background: 'transparent' }}>
      <MainArea />
    </div>
  );
}

/* Standalone con shell propio (preview de diseño) */
export default function DashboardV3() {
  return (
    <div className="dv3">
      <div className="app">
        <aside className="side">
          <div className="brand">
            <div className="logo"><ActivitySquare size={20} /></div>
            <div className="name">SIGAB</div>
          </div>
          <div className="nav-label">Menú principal</div>
          <nav className="nav">
            {NAV.map(({ icon: Icon, label, active }) => (
              <a key={label} className={active ? 'active' : undefined}>
                <Icon /> {label}
              </a>
            ))}
          </nav>
          <div className="promo">
            <div className="pill"><Building2 size={18} /></div>
            <b>IMSS · HGR No.1</b>
            <p>Hospital General Regional No.1, Tijuana B.C.</p>
            <a>Cambiar unidad <ArrowUpRight size={13} /></a>
          </div>
          <div className="side-foot">
            <a><Settings size={18} /> Configuración</a>
            <span className="ver mono">v3.0</span>
          </div>
        </aside>
        <MainArea />
      </div>
    </div>
  );
}
