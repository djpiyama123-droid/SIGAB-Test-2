/**
 * FormatoViewer — modal de previsualización e impresión de formatos IMSS/SIGAH
 * Soporta 3 temas: blanco-imss, verde-imss, neon-sigah
 * autoprint=true dispara impresión automáticamente al montar (para flujo post-creación de OS)
 */
import { useState, useEffect, useRef } from 'react';
import { usePrintFormato } from '../../hooks/usePrintFormato';
import { api } from '../../api/sigah';
import toast from '../../lib/toast';
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

function renderFormato(tipo, orden, tema, isEditing, onChange) {
  switch (tipo) {
    case 'reporte_falla': return <FormatoReporteFalla orden={orden} tema={tema} isEditing={isEditing} onChange={onChange} />;
    case 'preventivo':    return <FormatoOSPreventivo orden={orden} tema={tema} isEditing={isEditing} onChange={onChange} />;
    case 'predictivo':    return <FormatoOSPredictivo orden={orden} tema={tema} isEditing={isEditing} onChange={onChange} />;
    default:              return <FormatoOSCorrectivo orden={orden} tema={tema} isEditing={isEditing} onChange={onChange} />;
  }
}

export default function FormatoViewer({ orden: initialOrden, onClose, autoprint = false }) {
  const [tema, setTema] = useState('blanco-imss');
  const [isEditing, setIsEditing] = useState(false);
  const [currentOrden, setCurrentOrden] = useState(initialOrden || {});
  const [editedOrden, setEditedOrden] = useState({});
  const { print } = usePrintFormato();
  const autoprintDone = useRef(false);

  useEffect(() => {
    setCurrentOrden(initialOrden || {});
  }, [initialOrden]);

  // Disparo automático de impresión al montar (usado en flujo post-creación de OS)
  useEffect(() => {
    if (autoprint && !autoprintDone.current) {
      autoprintDone.current = true;
      // Esperar a que el DOM del formato esté renderizado
      const t = setTimeout(() => { print(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [autoprint, print]);

  const tipo = currentOrden?.tipo_mantenimiento || 'correctivo';
  const titulo = `${TIPO_LABEL[tipo] || 'Formato'} — ${currentOrden?.numero_orden || ''}`;

  const handleStartEdit = () => {
    setEditedOrden({ ...currentOrden, materiales: currentOrden.materiales || [] });
    setIsEditing(true);
  };

  const handleFieldChange = (field, value) => {
    setEditedOrden((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!currentOrden.id || String(currentOrden.id).includes('mock') || currentOrden.numero_orden?.endsWith('0001') && !currentOrden.created_at) {
      toast.error('No se puede guardar una plantilla en blanco de vista previa');
      return;
    }
    const tid = toast.loading('Guardando cambios...');
    try {
      await api.updateOrden(currentOrden.id, editedOrden);
      toast.success('Orden guardada con éxito', { id: tid });
      setCurrentOrden(editedOrden);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Error al guardar la orden', { id: tid });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto">

      {/* Barra de controles */}
      <div className="sticky top-0 bg-slate-900/95 border-b border-slate-700 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex flex-wrap items-center gap-2 max-w-5xl mx-auto">
          <span className="text-white font-medium text-sm truncate max-w-xs">{titulo}</span>

          {/* Selector de tema */}
          <div className="flex gap-1.5 ml-2 flex-wrap">
            {TEMAS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTema(t.id)}
                title={t.desc}
                disabled={isEditing}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  tema === t.id
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            {currentOrden.id && !String(currentOrden.id).includes('mock') && (
              isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded border border-emerald-500 transition-colors animate-pulse"
                  >
                    💾 Guardar
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
                  >
                    ✕ Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded border border-amber-500 transition-colors"
                >
                  ✍️ Editar Formato
                </button>
              )
            )}
            <button
              onClick={print}
              disabled={isEditing}
              className={`px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded border border-blue-500 transition-colors ${
                isEditing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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
          {renderFormato(tipo, isEditing ? editedOrden : currentOrden, tema, isEditing, handleFieldChange)}
        </div>
      </div>

    </div>
  );
}
