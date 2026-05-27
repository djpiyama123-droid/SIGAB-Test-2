/**
 * FormatoViewer — modal de previsualización e impresión de formatos IMSS/SIGAH
 * Soporta 3 temas: blanco-imss, verde-imss, neon-sigah
 */
import { useState } from 'react';
import { usePrintFormato } from '../../hooks/usePrintFormato';
import FormatoReporteFalla from './FormatoReporteFalla';
import FormatoOSCorrectivo from './FormatoOSCorrectivo';
import FormatoOSPreventivo from './FormatoOSPreventivo';
import FormatoOSPredictivo from './FormatoOSPredictivo';

const TEMAS = [
  { id: 'blanco-imss', label: 'Blanco IMSS',  desc: 'Fondo blanco · Header azul IMSS' },
  { id: 'verde-imss',  label: 'Verde IMSS',   desc: 'Fondo blanco · Header verde institucional' },
  { id: 'neon-sigah',  label: 'Neon SIGAH',   desc: 'Fondo oscuro · Texto neón' },
];

const TIPO_LABEL = {
  reporte_falla: 'Reporte de Falla',
  correctivo:    'OS Correctivo',
  preventivo:    'OS Preventivo',
  predictivo:    'OS Predictivo',
};

function renderFormato(tipo, orden, tema) {
  switch (tipo) {
    case 'reporte_falla': return <FormatoReporteFalla orden={orden} tema={tema} />;
    case 'preventivo':    return <FormatoOSPreventivo orden={orden} tema={tema} />;
    case 'predictivo':    return <FormatoOSPredictivo orden={orden} tema={tema} />;
    default:              return <FormatoOSCorrectivo orden={orden} tema={tema} />;
  }
}

export default function FormatoViewer({ orden, onClose }) {
  const [tema, setTema] = useState('blanco-imss');
  const { print } = usePrintFormato();

  const tipo = orden?.tipo_mantenimiento || 'correctivo';
  const titulo = `${TIPO_LABEL[tipo] || 'Formato'} — ${orden?.numero_orden || ''}`;

  return (
    <>
      {/* CSS de impresión — oculta todo excepto el área del formato */}
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #formato-print-root { visibility: visible !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; }
          #formato-print-root * { visibility: visible !important; }
          .formato-no-print { display: none !important; }
        }
      `}</style>

      {/* Overlay modal */}
      <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto">

        {/* Barra de controles (se oculta al imprimir) */}
        <div className="formato-no-print sticky top-0 bg-slate-900/95 border-b border-slate-700 backdrop-blur-sm px-4 py-3 z-10">
          <div className="flex flex-wrap items-center gap-2 max-w-5xl mx-auto">
            <span className="text-white font-medium text-sm truncate max-w-xs">{titulo}</span>

            {/* Selector de tema */}
            <div className="flex gap-1.5 ml-2 flex-wrap">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTema(t.id)}
                  title={t.desc}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    tema === t.id
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={print}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded border border-blue-500 transition-colors"
              >
                🖨 Imprimir
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded border border-slate-600 transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>

        {/* Contenido del formato (área imprimible) */}
        <div className="flex justify-center py-6 px-4">
          <div
            id="formato-print-root"
            className="w-full max-w-4xl shadow-2xl rounded-sm overflow-hidden"
          >
            {renderFormato(tipo, orden, tema)}
          </div>
        </div>

      </div>
    </>
  );
}
