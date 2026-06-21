/**
 * @module pages/CommandCenter
 * @description Hub de conocimiento y documentación técnica SIGAH.
 *
 * Consola interna para el equipo de desarrollo: arquitectura, roadmap,
 * migraciones, API reference y contexto de sesión.
 *
 * BETA — visible para todos los usuarios autenticados.
 */
import React, { useState } from 'react';
import {
  Terminal,
  Network,
  Map,
  Code2,
  Shield,
  Database,
  Brain,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Server,
  Layers,
  Cpu,
  Cloud,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import PageHeading from '../components/ui/PageHeading';

// ─── Datos estáticos del proyecto ─────────────────────────────────────────────

const FASES = [
  {
    num: 0,
    nombre: 'Fundación legal + Hetzner',
    detalle: 'S. de R.L. de C.V. + RESICO PM, infraestructura Hetzner Cloud, rebrand docs.',
    estado: 'EN CURSO',
    color: 'amber',
  },
  {
    num: 1,
    nombre: 'Multi-tenancy BD',
    detalle: '18 tablas + columna tenant_id + tabla hospitales. Migración lista para aplicar.',
    estado: 'LISTO',
    color: 'blue',
  },
  {
    num: 2,
    nombre: 'Aislamiento backend',
    detalle: '102 endpoints — dependencia get_current_tenant + filtrado JWT por hospital_id.',
    estado: 'EN PROGRESO',
    color: 'blue',
  },
  {
    num: 3,
    nombre: 'Panel SuperAdmin SIGAH',
    detalle: 'Rol superadmin, ruta /admin-global, dashboard global multi-hospital.',
    estado: 'EN PROGRESO',
    color: 'blue',
  },
  {
    num: 4,
    nombre: 'Despliegue cloud + Edge Nodes',
    detalle: 'Hetzner CX32/CX42, Docker Compose, Edge Nodes por hospital.',
    estado: 'PENDIENTE',
    color: 'slate',
  },
  {
    num: 5,
    nombre: 'Módulo de Formatos',
    detalle: '4 plantillas NOM-016/NOM-240 — ver docs/SIGAH/Especificacion_Formatos_SIGAH.docx.',
    estado: 'PENDIENTE',
    color: 'slate',
  },
  {
    num: 6,
    nombre: 'Comercialización: CFDI + onboarding',
    detalle: 'Facturación SaaS, Setup Fee + mensualidad, CFDI 4.0 vía PAC.',
    estado: 'PENDIENTE',
    color: 'slate',
  },
];

const MIGRACIONES = [
  { rev: '001', nombre: 'Schema inicial — equipos, ordenes, usuarios', aplicada: true },
  { rev: '002', nombre: 'Tecnovigilancia NOM-240 + eventos adversos', aplicada: true },
  { rev: '003', nombre: 'Trazabilidad NOM-016 + log_actividad', aplicada: true },
  { rev: '004', nombre: 'Checklists + métricas de cumplimiento', aplicada: true },
  { rev: '005 (Fase 1)', nombre: 'tenant_id + tabla hospitales — 18 tablas', aplicada: false },
];

const STACK_CARDS = [
  {
    icon: Server,
    label: 'Backend',
    items: ['FastAPI', 'Python 3.12', 'MySQL 8.0'],
    color: 'emerald',
  },
  {
    icon: Layers,
    label: 'Frontend',
    items: ['React 18', 'Vite', 'Tailwind CSS 3'],
    color: 'blue',
  },
  {
    icon: Cpu,
    label: 'IA',
    items: ['Gemma (Ollama)', 'Qwen (Ollama)', 'Claude Sonnet 4.6 (SaaS)'],
    color: 'purple',
  },
  {
    icon: Cloud,
    label: 'Deploy',
    items: ['Hetzner CX32', 'Docker Compose', 'Edge Nodes'],
    color: 'amber',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FASE_BADGE = {
  'EN CURSO': {
    pill: 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
    dot: 'bg-amber-400',
    icon: Clock,
  },
  'LISTO': {
    pill: 'bg-blue-500/15 text-blue-600 border border-blue-500/30',
    dot: 'bg-blue-400',
    icon: CheckCircle2,
  },
  'EN PROGRESO': {
    pill: 'bg-blue-500/15 text-blue-600 border border-blue-500/30',
    dot: 'bg-blue-400',
    icon: AlertCircle,
  },
  'PENDIENTE': {
    pill: 'bg-slate-500/15 text-slate-500 border border-slate-500/30',
    dot: 'bg-slate-500',
    icon: Circle,
  },
};

const STACK_COLOR = {
  emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  blue: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-600', dot: 'bg-blue-400' },
  purple: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-600', dot: 'bg-purple-400' },
  amber: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600', dot: 'bg-amber-400' },
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FaseBadge({ estado }) {
  const cfg = FASE_BADGE[estado] || FASE_BADGE['PENDIENTE'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.pill}`}>
      <Icon className="w-3 h-3" />
      {estado}
    </span>
  );
}

function MiniTimeline() {
  return (
    <div className="relative pl-6 space-y-0">
      {/* Línea vertical */}
      <div
        className="absolute left-[11px] top-4 bottom-4 w-0.5"
        style={{ background: 'var(--content-border)' }}
      />
      {FASES.map((fase, idx) => {
        const cfg = FASE_BADGE[fase.estado] || FASE_BADGE['PENDIENTE'];
        return (
          <div key={fase.num} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Dot */}
            <div
              className={`absolute -left-6 mt-1 w-[10px] h-[10px] rounded-full border-2 flex-shrink-0 ${cfg.dot}`}
              style={{ borderColor: 'var(--content-surface)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--content-muted)' }}>
                  F{fase.num}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--content-text)' }}>
                  {fase.nombre}
                </span>
                <FaseBadge estado={fase.estado} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--content-muted)' }}>
                {fase.detalle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MigracionesLista() {
  return (
    <ul className="space-y-2">
      {MIGRACIONES.map((m) => (
        <li key={m.rev} className="flex items-start gap-2.5">
          {m.aplicada ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <span className="font-mono text-[10px] text-blue-600 mr-1.5">{m.rev}</span>
            <span className="text-sm" style={{ color: m.aplicada ? 'var(--content-text)' : 'var(--content-muted)' }}>
              {m.nombre}
            </span>
            {!m.aplicada && (
              <span className="ml-2 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">(no aplicada)</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Quick-access card component ─────────────────────────────────────────────

function QuickCard({ icon: Icon, title, description, color = 'blue', children, href, hrefLabel }) {
  const [open, setOpen] = useState(false);
  const hasExpand = !!children;
  const colorMap = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-600',
    slate: 'bg-slate-500/10 border-slate-500/20 text-slate-500',
    red: 'bg-red-500/10 border-red-500/20 text-red-600',
  };

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex-shrink-0 p-2 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--content-text)' }}>{title}</h3>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--content-muted)' }}>{description}</p>
        </div>
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-300 transition-colors mt-auto"
        >
          <ExternalLink className="w-3 h-3" />
          {hrefLabel || 'Abrir'}
        </a>
      )}

      {hasExpand && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium mt-auto transition-colors"
            style={{ color: 'var(--content-muted)' }}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
          {open && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--content-border)' }}>
              {children}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* ── 1. Header ── */}
      <PageHeading
        icon={Terminal}
        title="Command Center"
        subtitle="Hub de conocimiento y documentación técnica SIGAH"
        badge="BETA"
      />

      {/* ── 2. Quick-access cards ── */}
      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--content-muted)' }}
        >
          Acceso Rapido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Card 1 — Arquitectura */}
          <QuickCard
            icon={Network}
            title="Arquitectura SIGAH"
            description="Stack tecnico, fases del proyecto, decisiones de diseno y ADRs."
            color="blue"
          >
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--content-muted)' }}>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Backend:</span> FastAPI + Python 3.12 + MySQL 8.0</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Frontend:</span> React 18 + Vite + Tailwind 3</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>IA (HGR):</span> Gemma + Qwen via Ollama</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>IA (SaaS):</span> Gemini 2.5 Flash-Lite + Claude Sonnet 4.6</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Infra:</span> Hetzner CX32/CX42 + Edge Nodes</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Docs:</span> docs/SIGAH/ — Plan Maestro, Fiscal, Costos IA</li>
            </ul>
          </QuickCard>

          {/* Card 2 — Fases del Roadmap */}
          <QuickCard
            icon={Map}
            title="Fases del Roadmap"
            description="Fase 0 a 6: multi-tenancy, Hetzner, formatos, CFDI."
            color="emerald"
          >
            <MiniTimeline />
          </QuickCard>

          {/* Card 3 — API Reference */}
          <QuickCard
            icon={Code2}
            title="API Reference"
            description="102 endpoints documentados — FastAPI OpenAPI interactivo."
            color="purple"
            href="http://localhost:8000/docs"
            hrefLabel="Abrir OpenAPI (dev only)"
          />

          {/* Card 4 — Seguridad & Tenancy */}
          <QuickCard
            icon={Shield}
            title="Seguridad & Tenancy"
            description="Modelo de aislamiento multi-tenant, JWT, hospital_id."
            color="red"
          >
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--content-muted)' }}>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Autenticacion:</span> JWT HS256, refresh via cookie HttpOnly</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Aislamiento:</span> hospital_id en cada query — sin cross-tenant</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Roles:</span> superadmin / admin / tecnico / enfermeria</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Audit trail:</span> tabla log_actividad — NOM-016 compliant</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Dependencia:</span> get_current_tenant (Fase 2 — en progreso)</li>
            </ul>
          </QuickCard>

          {/* Card 5 — Estado de Migraciones */}
          <QuickCard
            icon={Database}
            title="Estado de Migraciones"
            description="Alembic: 4 revisiones aplicadas. Fase 1 lista para Hetzner."
            color="amber"
          >
            <MigracionesLista />
          </QuickCard>

          {/* Card 6 — Contexto de Sesion */}
          <QuickCard
            icon={Brain}
            title="Contexto de Sesion"
            description="Variables de entorno, rutas activas, agentes disponibles."
            color="slate"
          >
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--content-muted)' }}>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Backend URL:</span> <span className="font-mono text-blue-600">http://localhost:8000</span></li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Frontend:</span> <span className="font-mono text-blue-600">http://localhost:5173</span></li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Rama activa:</span> <span className="font-mono text-emerald-600">feat/sileo-toasts-hermes-context</span></li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Agentes:</span> 67 agentes (.claude/agents/) + NEXUS</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>Skills activas:</span> ui-ux-pro-max, webapp-testing, ccpm</li>
              <li><span className="font-semibold" style={{ color: 'var(--content-text)' }}>NOM:</span> NOM-016-SSA3 · NOM-240-SSA1 · ISO 13485</li>
            </ul>
          </QuickCard>

        </div>
      </section>

      {/* ── 3. Mini-timeline de fases (detalle expandido) ── */}
      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--content-muted)' }}
        >
          Timeline del Proyecto — Fases 0 a 6
        </h2>
        <GlassCard>
          <MiniTimeline />
        </GlassCard>
      </section>

      {/* ── 4. Stack tecnico — cards compactas ── */}
      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--content-muted)' }}
        >
          Stack Tecnico
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STACK_CARDS.map(({ icon: Icon, label, items, color }) => {
            const c = STACK_COLOR[color];
            return (
              <GlassCard key={label} padding={true}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg border ${c.bg}`}>
                    <Icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--content-text)' }}>{label}</span>
                </div>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--content-muted)' }}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            );
          })}
        </div>
      </section>

    </div>
  );
}
