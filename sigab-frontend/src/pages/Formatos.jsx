/**
 * @module pages/Formatos
 * @description Centro de Formatos IMSS/SIGAH — visualiza y abre los 4 formatos oficiales.
 * Cada formato puede abrirse directamente o desde una orden existente.
 */
import { useState } from 'react';
import FormatoViewer from '../components/formatos/FormatoViewer';

const FORMATOS_INFO = [
  {
    tipo: 'reporte_falla',
    folio_prefix: 'RF',
    label: 'Reporte de Falla',
    descripcion: 'Registro inicial de falla reportada por el servicio.',
    norma: 'NOM-016-SSA3-2012',
    color: 'amber',
    icon: '⚠️',
    campos: ['Equipo', 'Quién reporta', 'Descripción de falla', 'Condición y criticidad'],
  },
  {
    tipo: 'correctivo',
    folio_prefix: 'OS-C',
    label: 'OS Correctivo',
    descripcion: 'Orden de servicio para mantenimiento correctivo de equipos.',
    norma: 'NOM-016-SSA3-2012',
    color: 'red',
    icon: '🔧',
    campos: ['Diagnóstico de falla', 'Trabajo realizado', 'Tiempos', 'Material y refacciones', 'Estado final'],
  },
  {
    tipo: 'preventivo',
    folio_prefix: 'OS-P',
    label: 'OS Preventivo',
    descripcion: 'Orden de servicio para mantenimiento preventivo programado.',
    norma: 'NOM-016-SSA3-2012',
    color: 'emerald',
    icon: '📅',
    campos: ['Rutina (6 casillas)', 'Servicio efectuado', 'Tiempos', 'Evidencia fotográfica', 'Próximo preventivo'],
  },
  {
    tipo: 'predictivo',
    folio_prefix: 'OS-PR',
    label: 'OS Predictivo (IA)',
    descripcion: 'Orden asistida por IA SIGAH basada en análisis de historial.',
    norma: 'NOM-016-SSA3-2012',
    color: 'purple',
    icon: '⚡',
    campos: ['Análisis IA (4 métricas)', 'Recomendación generada', 'Acción ejecutada', 'Validación ingeniero'],
  },
];

const COLOR_CLASSES = {
  amber:   { card: 'border-amber-700/50 hover:border-amber-500', badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700' },
  red:     { card: 'border-red-700/50 hover:border-red-500',     badge: 'bg-red-100 text-red-600',     btn: 'bg-red-600 hover:bg-red-700' },
  emerald: { card: 'border-emerald-700/50 hover:border-emerald-500', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  purple:  { card: 'border-purple-700/50 hover:border-purple-500', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
};

function ordenVacio(tipo) {
  return {
    tipo_mantenimiento: tipo,
    numero_orden: `${FORMATOS_INFO.find((f) => f.tipo === tipo)?.folio_prefix || 'XX'}-0001`,
    equipo_nombre: '[Nombre del Equipo]',
    equipo_marca: '[Marca]',
    equipo_modelo: '[Modelo]',
    equipo_serie: '[Serie]',
    area: '[Área / Servicio]',
    fecha: new Date().toISOString().split('T')[0],
    tecnico_nombre: '[Técnico Asignado]',
  };
}

export default function Formatos() {
  const [visorOrden, setVisorOrden] = useState(null);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-text)]">Formatos Oficiales IMSS</h1>
          <p className="text-sm text-[var(--content-muted)] mt-1">
            4 formatos NOM-016-SSA3-2012 · Con 3 temas visuales · Imprimibles directamente
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 text-sm text-blue-700">
        <strong>Tip:</strong> Abre un formato en blanco para vista previa, o ve a{' '}
        <strong>Órdenes de Servicio</strong> y usa el botón <strong>🖨 Formato</strong> en cualquier orden para imprimir con sus datos ya pre-llenados.
      </div>

      {/* Grid de 4 formatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORMATOS_INFO.map((f) => {
          const c = COLOR_CLASSES[f.color];
          return (
            <div key={f.tipo}
              className={`bg-[var(--content-surface)] border rounded-xl p-5 transition-colors ${c.card}`}>
              {/* Header de la card */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-[var(--content-text)]">{f.label}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono ${c.badge}`}>
                      {f.folio_prefix}-XXXX
                    </span>
                  </div>
                  <p className="text-xs text-[var(--content-muted)] mt-1">{f.descripcion}</p>
                </div>
              </div>

              {/* Campos del formato */}
              <div className="mb-4">
                <p className="text-xs text-[var(--content-muted)] uppercase font-medium mb-2">Secciones</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.campos.map((campo) => (
                    <span key={campo}
                      className="px-2 py-0.5 bg-[var(--content-bg)] text-[var(--content-muted)] text-xs rounded border border-[var(--content-border)]">
                      {campo}
                    </span>
                  ))}
                </div>
              </div>

              {/* Norma + Botón */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--content-muted)]">{f.norma}</span>
                <button
                  onClick={() => setVisorOrden(ordenVacio(f.tipo))}
                  className={`px-4 py-1.5 text-white text-xs font-medium rounded transition-colors ${c.btn}`}
                >
                  Ver Formato
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor de formato */}
      {visorOrden && (
        <FormatoViewer
          orden={visorOrden}
          onClose={() => setVisorOrden(null)}
        />
      )}
    </div>
  );
}
