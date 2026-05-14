import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import toast from '../lib/toast';

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function abrirBlobPdf(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function BtnExport({ onClick, children, variant = 'pdf' }) {
  const cls = variant === 'pdf'
    ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
    : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value, color = 'slate' }) {
  const colors = {
    emerald: 'text-emerald-400',
    red:     'text-red-400',
    yellow:  'text-yellow-400',
    blue:    'text-blue-400',
    slate:   'text-slate-300',
  };
  return (
    <div className="bg-slate-900/50 rounded-lg p-4">
      <div className={`text-3xl font-bold ${colors[color]}`}>{value ?? '—'}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function Reportes() {
  const [reporte, setReporte]   = useState(null);
  const [criticos, setCriticos] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([api.getReporteDiario(), api.getEquiposCriticos()])
      .then(([rep, crit]) => {
        setReporte(rep);
        setCriticos(crit.equipos_criticos || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();

  async function handleExport(fn, filename, tipo) {
    const tid = toast.loading(`Generando ${tipo}...`);
    try {
      const blob = await fn();
      if (filename.endsWith('.pdf')) abrirBlobPdf(blob);
      else descargarBlob(blob, filename);
      toast.success(`${tipo} listo`, { id: tid });
    } catch {
      toast.error(`Error al generar ${tipo}`, { id: tid });
    }
  }

  if (loading) {
    return (
      <div className="text-slate-400 py-12 text-center">Generando reporte...</div>
    );
  }

  const estadoMap = reporte?.equipos_por_estado?.reduce(
    (acc, e) => ({ ...acc, [e.estado]: e.total }),
    {}
  ) || {};

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-slate-400 text-sm">
            Resumen del estado del sistema — {reporte?.fecha}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BtnExport
            variant="pdf"
            onClick={() => handleExport(
              () => api.descargarReporteDiarioPdf(),
              `reporte-diario-${reporte?.fecha}.pdf`,
              'PDF diario'
            )}
          >
            📄 PDF Diario
          </BtnExport>
          <BtnExport
            variant="excel"
            onClick={() => handleExport(
              () => api.descargarReporteDiarioExcel(),
              `reporte-diario-${reporte?.fecha}.xlsx`,
              'Excel diario'
            )}
          >
            📊 Excel Diario
          </BtnExport>
          <BtnExport
            variant="pdf"
            onClick={() => handleExport(
              () => api.descargarHistorialPdf(mes, anio),
              `historial-${anio}-${String(mes).padStart(2,'0')}.pdf`,
              'PDF historial'
            )}
          >
            📄 PDF Historial
          </BtnExport>
          <BtnExport
            variant="excel"
            onClick={() => handleExport(
              () => api.descargarHistorialExcel(mes, anio),
              `historial-${anio}-${String(mes).padStart(2,'0')}.xlsx`,
              'Excel historial'
            )}
          >
            📊 Excel Historial
          </BtnExport>
        </div>
      </div>

      {/* Reporte diario */}
      {reporte && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">
            Reporte del día
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="OS abiertas hoy" value={reporte.ordenes_hoy} color="blue" />
            <StatBox label="OS pendientes" value={reporte.ordenes_abiertas} color="yellow" />
            <StatBox label="Operativos" value={estadoMap['operativo']} color="emerald" />
            <StatBox label="En mantenimiento" value={estadoMap['en_mantenimiento']} color="yellow" />
            <StatBox label="Fuera de servicio" value={estadoMap['fuera_servicio']} color="red" />
            <StatBox label="En traslado" value={estadoMap['en_traslado']} />
          </div>
        </section>
      )}

      {/* Preventivos próxima semana */}
      {reporte?.preventivos_proxima_semana?.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">
            Preventivos próximos 7 días
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium">Equipo</th>
                  <th className="px-4 py-3 font-medium">Tipo preventivo</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {reporte.preventivos_proxima_semana.map((pp, i) => (
                  <tr key={i}
                    className="border-t border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-white">
                      {pp.nombre}
                      <span className="text-slate-500 ml-1 text-xs font-mono">
                        ({pp.serie})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{pp.tipo_preventivo}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {pp.proxima_ejecucion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Equipos críticos */}
      {criticos.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">
            Equipos críticos / fuera de servicio
          </h2>
          <div className="space-y-2">
            {criticos.map((eq) => (
              <div key={eq.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-white text-sm font-medium">{eq.nombre}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {eq.marca} — Serie: <span className="font-mono">{eq.serie}</span>
                  </p>
                  <p className="text-slate-600 text-xs">{eq.area}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
                    eq.estado === 'fuera_servicio'
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {eq.estado?.replace(/_/g, ' ')}
                  </span>
                  {eq.tickets_abiertos > 0 && (
                    <p className="text-yellow-400 text-xs mt-1">
                      {eq.tickets_abiertos} ticket(s) abierto(s)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
