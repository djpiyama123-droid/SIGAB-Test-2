import React from 'react';
import { Building2, Users, DollarSign, Hospital, Activity, ShieldCheck } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import PageHeading from '../components/ui/PageHeading';
import TableWrapper from '../components/ui/TableWrapper';

// ─── Datos mockeados ──────────────────────────────────────────────────────────
// TODO: conectar a /api/admin/stats
const statsMock = {
  total_hospitales: 1,
  hospitales_activos: 1,
  mrr_mxn: 2500,
  usuarios_totales: 8,
};

// TODO: GET /api/admin/hospitales
const hospitalesMock = [
  {
    id: 1,
    nombre: 'HGR No.1 IMSS Tijuana',
    slug: 'hgr1-tijuana',
    estado_suscripcion: 'activo',
    num_usuarios: 8,
    activo_desde: '2024-01-15',
  },
];

// TODO: GET /api/admin/actividad-reciente
const actividadMock = [
  { id: 1, hospital: 'HGR No.1 IMSS Tijuana', accion: 'usuario login', tiempo: 'hace 5 min' },
  { id: 2, hospital: 'HGR No.1 IMSS Tijuana', accion: 'orden de servicio creada #OS-2024-0118', tiempo: 'hace 22 min' },
  { id: 3, hospital: 'HGR No.1 IMSS Tijuana', accion: 'mantenimiento preventivo completado', tiempo: 'hace 1 h' },
  { id: 4, hospital: 'HGR No.1 IMSS Tijuana', accion: 'nuevo equipo registrado (Monitor Mindray)', tiempo: 'hace 3 h' },
  { id: 5, hospital: 'HGR No.1 IMSS Tijuana', accion: 'reporte PDF exportado', tiempo: 'hace 5 h' },
];
// ─────────────────────────────────────────────────────────────────────────────

// Mapa de colores de estado de suscripción
const SUSCRIPCION_BADGE = {
  activo: {
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    label: 'Activo',
  },
  trial: {
    dot: 'bg-amber-500',
    pill: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    label: 'Trial',
  },
  vencido: {
    dot: 'bg-red-500',
    pill: 'bg-red-500/15 text-red-400 border border-red-500/25',
    label: 'Vencido',
  },
  inactivo: {
    dot: 'bg-slate-500',
    pill: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
    label: 'Inactivo',
  },
};

function SuscripcionBadge({ estado }) {
  const cfg = SUSCRIPCION_BADGE[estado] ?? SUSCRIPCION_BADGE.inactivo;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function KPICard({ icon: Icon, label, value, colorClass }) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--content-muted)]">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold ${colorClass ?? 'text-[var(--content-text)]'}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass ? 'bg-current/10' : 'bg-slate-500/10'}`}
          style={{ backgroundColor: 'rgba(0,108,183,0.12)' }}>
          <Icon className={`w-5 h-5 ${colorClass ?? 'text-[var(--content-muted)]'}`} />
        </div>
      </div>
    </GlassCard>
  );
}

export default function AdminGlobal() {
  return (
    <div className="p-6 space-y-8">

      {/* ── Sección 1: Header ── */}
      <PageHeading
        icon={ShieldCheck}
        title="Panel SuperAdmin SIGAH"
        subtitle="Gestión global de hospitales y suscripciones"
        badge="SUPER ADMIN"
      />

      {/* ── Sección 2: KPIs globales ── */}
      <section aria-label="KPIs globales">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--content-muted)] mb-3">
          Resumen global
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Hospital}
            label="Total Hospitales"
            value={statsMock.total_hospitales}
            colorClass="text-blue-400"
          />
          <KPICard
            icon={Building2}
            label="Hospitales Activos"
            value={statsMock.hospitales_activos}
            colorClass="text-emerald-400"
          />
          <KPICard
            icon={DollarSign}
            label="MRR"
            value={`$${statsMock.mrr_mxn.toLocaleString('es-MX')} MXN`}
            colorClass="text-amber-400"
          />
          <KPICard
            icon={Users}
            label="Usuarios Totales"
            value={statsMock.usuarios_totales}
            colorClass="text-slate-300"
          />
        </div>
      </section>

      {/* ── Sección 3: Tabla de Hospitales/Tenants ── */}
      <section aria-label="Hospitales registrados">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--content-muted)] mb-3">
          Hospitales / Tenants
        </h2>
        <TableWrapper>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--content-border)' }}>
                {['Hospital', 'Slug', 'Suscripción', 'Usuarios', 'Activo Desde', 'Acciones'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--content-muted)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hospitalesMock.map((h) => (
                <tr
                  key={h.id}
                  style={{ borderBottom: '1px solid var(--content-border)' }}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3.5 font-medium text-[var(--content-text)]">
                    {h.nombre}
                  </td>
                  <td className="px-4 py-3.5">
                    <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-300">
                      {h.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3.5">
                    <SuscripcionBadge estado={h.estado_suscripcion} />
                  </td>
                  <td className="px-4 py-3.5 text-[var(--content-muted)]">
                    {h.num_usuarios}
                  </td>
                  <td className="px-4 py-3.5 text-[var(--content-muted)]">
                    {new Date(h.activo_desde).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    {/* TODO: Fase 3 — implementar vista de detalle por tenant */}
                    <button
                      disabled
                      title="Próximamente — Fase 3"
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--content-border)] text-[var(--content-muted)] opacity-50 cursor-not-allowed select-none"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      </section>

      {/* ── Sección 4: Actividad reciente ── */}
      <section aria-label="Actividad reciente global">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--content-muted)] mb-3">
          Actividad reciente
        </h2>
        <GlassCard padding={false}>
          <ul className="divide-y divide-[var(--content-border)]">
            {actividadMock.map((evento) => (
              <li key={evento.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--content-text)]">
                    <span className="font-medium">{evento.hospital}</span>
                    {' '}—{' '}
                    <span className="text-[var(--content-muted)]">{evento.accion}</span>
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs text-[var(--content-muted)] whitespace-nowrap">
                  {evento.tiempo}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

    </div>
  );
}
