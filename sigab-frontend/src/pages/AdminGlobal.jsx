import React, { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, Hospital, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../api/sigah';
import toast from '../components/Toast';
import GlassCard from '../components/ui/GlassCard';
import PageHeading from '../components/ui/PageHeading';
import TableWrapper from '../components/ui/TableWrapper';

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
          <p className={`mt-1.5 text-2xl font-bold ${colorClass ?? 'text-[var(--content-text)]'}`}>{value ?? '—'}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass ? 'bg-current/10' : 'bg-slate-500/10'}`}
          style={{ backgroundColor: 'rgba(0,108,183,0.12)' }}>
          <Icon className={`w-5 h-5 ${colorClass ?? 'text-[var(--content-muted)]'}`} />
        </div>
      </div>
    </GlassCard>
  );
}

function formatRelative(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default function AdminGlobal() {
  const [stats, setStats] = useState(null);
  const [hospitales, setHospitales] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [statsRes, hosp, act] = await Promise.all([
        api.getAdminStats(),
        api.getAdminHospitales(),
        api.getAdminActividad(),
      ]);
      setStats(statsRes);
      setHospitales(hosp.hospitales ?? hosp ?? []);
      setActividad(act.actividad ?? act ?? []);
    } catch (err) {
      if (err.response?.status === 403) {
        setForbidden(true);
        toast.error('Acceso restringido: se requiere rol superadmin_sigah');
      } else {
        toast.error('Error al cargar panel admin');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* ── Sección 1: Header ── */}
      <div className="flex items-start justify-between">
        <PageHeading
          icon={ShieldCheck}
          title="Panel SuperAdmin SIGAH"
          subtitle="Gestión global de hospitales y suscripciones"
          badge="SUPER ADMIN"
        />
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {forbidden && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 text-amber-400 text-sm">
          ⚠️ Los datos mostrados son de ejemplo. Este panel requiere el rol <code className="font-mono bg-amber-500/10 px-1 rounded">superadmin_sigah</code>.
        </div>
      )}

      {/* ── Sección 2: KPIs globales ── */}
      <section aria-label="KPIs globales">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--content-muted)] mb-3">
          Resumen global
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Hospital}
            label="Total Hospitales"
            value={stats?.total_hospitales ?? '—'}
            colorClass="text-blue-400"
          />
          <KPICard
            icon={Building2}
            label="Hospitales Activos"
            value={stats?.hospitales_activos ?? '—'}
            colorClass="text-emerald-400"
          />
          <KPICard
            icon={DollarSign}
            label="MRR"
            value={stats?.mrr_mxn != null ? `$${Number(stats.mrr_mxn).toLocaleString('es-MX')} MXN` : '—'}
            colorClass="text-amber-400"
          />
          <KPICard
            icon={Users}
            label="Usuarios Totales"
            value={stats?.total_usuarios ?? stats?.usuarios_totales ?? '—'}
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--content-muted)] text-sm">
                    Cargando...
                  </td>
                </tr>
              ) : hospitales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--content-muted)] text-sm">
                    Sin hospitales registrados.
                  </td>
                </tr>
              ) : (
                hospitales.map((h) => (
                  <tr
                    key={h.id}
                    style={{ borderBottom: '1px solid var(--content-border)' }}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--content-text)]">{h.nombre}</td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-300">
                        {h.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      <SuscripcionBadge estado={h.estado_suscripcion} />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--content-muted)]">
                      {h.num_usuarios ?? h.total_usuarios ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--content-muted)]">
                      {h.activo_desde
                        ? new Date(h.activo_desde).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        disabled
                        title="Próximamente — Fase 3"
                        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--content-border)] text-[var(--content-muted)] opacity-50 cursor-not-allowed"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
            {loading ? (
              <li className="px-5 py-4 text-sm text-[var(--content-muted)] text-center">Cargando actividad...</li>
            ) : actividad.length === 0 ? (
              <li className="px-5 py-4 text-sm text-[var(--content-muted)] text-center">Sin actividad reciente.</li>
            ) : (
              actividad.slice(0, 20).map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--content-text)]">
                      <span className="font-medium">{ev.hospital_nombre ?? ev.hospital ?? 'Sistema'}</span>
                      {' '}—{' '}
                      <span className="text-[var(--content-muted)]">{ev.accion}</span>
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-[var(--content-muted)] whitespace-nowrap">
                    {ev.created_at ? formatRelative(ev.created_at) : ev.tiempo ?? ''}
                  </span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </section>
    </div>
  );
}
