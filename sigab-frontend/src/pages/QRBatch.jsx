import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/sigab';
import { QrCode, Printer, CheckCircle, Search, LayoutGrid, Sticker, Eye, ChevronDown, X, CheckSquare, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

/* ─── IMSS Logo SVG Component (official eagle/serpent/hands emblem, monochrome) ─── */
function IMSSLogo({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="currentColor">
      {/* Outer circle */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3"/>
      {/* Inner circle */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      {/* Eagle body */}
      <path d="M50 18 C45 22 38 28 36 35 C34 42 38 48 42 52 L50 58 L58 52 C62 48 66 42 64 35 C62 28 55 22 50 18Z" />
      {/* Wings left */}
      <path d="M36 35 C30 30 22 28 18 32 C14 36 16 44 20 48 C24 52 32 54 38 50 C34 46 34 40 36 35Z" />
      {/* Wings right */}
      <path d="M64 35 C70 30 78 28 82 32 C86 36 84 44 80 48 C76 52 68 54 62 50 C66 46 66 40 64 35Z" />
      {/* Serpent */}
      <path d="M44 42 C46 44 48 46 50 44 C52 42 54 44 52 46 C50 48 48 48 46 46 C44 44 44 42 44 42Z" fill="white"/>
      {/* Hands/protection base */}
      <path d="M30 60 C34 56 42 54 50 58 C58 54 66 56 70 60 C72 64 70 70 66 74 L50 82 L34 74 C30 70 28 64 30 60Z" />
      {/* IMSS text arc */}
      <text x="50" y="94" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="6">IMSS</text>
    </svg>
  );
}

/* ─── Professional QR Label — Carta Format ─── */
function EtiquetaCarta({ equipo }) {
  return (
    <div className="qr-label-carta">
      {/* Header verde institucional */}
      <div className="qr-label-header">
        <IMSSLogo size={16} className="qr-label-imss-icon" />
        <span className="qr-label-institution">IMSS — HGR No. 1</span>
      </div>

      {/* QR Code */}
      <div className="qr-label-qr-container">
        <QRCodeSVG
          value={`https://sigab.imss.gob.mx/eq/${equipo.serie}`}
          size={110}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Equipment Info */}
      <div className="qr-label-info">
        <p className="qr-label-nombre">{equipo.nombre}</p>
        <p className="qr-label-serie">{equipo.serie}</p>
        <p className="qr-label-ubicacion">{equipo.area}{equipo.piso ? ` · Piso ${equipo.piso}` : ''}</p>
      </div>

      {/* Footer */}
      <div className="qr-label-footer">
        <span>SIGAB</span>
        <span>•</span>
        <span>Activo Biomédico</span>
      </div>
    </div>
  );
}

/* ─── Professional QR Label — Zebra Sticker Format (horizontal 2"×1") ─── */
function EtiquetaZebra({ equipo }) {
  return (
    <div className="qr-label-zebra">
      {/* QR Left */}
      <div className="qr-zebra-qr">
        <QRCodeSVG
          value={`https://sigab.imss.gob.mx/eq/${equipo.serie}`}
          size={62}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Info Right */}
      <div className="qr-zebra-info">
        <div className="qr-zebra-header-row">
          <IMSSLogo size={10} className="qr-zebra-imss" />
          <span className="qr-zebra-inst">IMSS · HGR 1</span>
        </div>
        <p className="qr-zebra-nombre">{equipo.nombre}</p>
        <p className="qr-zebra-serie">{equipo.serie}</p>
        <p className="qr-zebra-ubicacion">{equipo.area}</p>
        <p className="qr-zebra-sigab">SIGAB</p>
      </div>
    </div>
  );
}

/* ─── Preview Card (shown in screen UI) ─── */
function PreviewCard({ equipo, modo }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 transform transition-all hover:scale-105 hover:shadow-xl">
      {modo === 'carta' ? <EtiquetaCarta equipo={equipo} /> : <EtiquetaZebra equipo={equipo} />}
    </div>
  );
}

export default function QRBatch() {
  const [equipos, setEquipos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modo, setModo] = useState('carta'); // 'carta' | 'zebra'
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    setLoading(true);
    try {
      const res = await api.getEquipos({ limit: 500 });
      setEquipos(res.equipos || []);
    } catch (err) {
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  const areas = useMemo(() => [...new Set(equipos.map(e => e.area).filter(Boolean))].sort(), [equipos]);

  const equiposFiltrados = useMemo(() => {
    let filtered = equipos;
    if (area) filtered = filtered.filter(e => e.area === area);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(e =>
        (e.nombre || '').toLowerCase().includes(q) ||
        (e.serie || '').toLowerCase().includes(q) ||
        (e.marca || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [equipos, area, busqueda]);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    const ids = equiposFiltrados.map(e => e.id);
    setSeleccionados(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deseleccionarTodos = () => {
    const idsVisible = new Set(equiposFiltrados.map(e => e.id));
    setSeleccionados(prev => prev.filter(id => !idsVisible.has(id)));
  };

  const toggleSeleccionarTodos = () => {
    const allVisible = equiposFiltrados.every(e => seleccionados.includes(e.id));
    if (allVisible) deseleccionarTodos();
    else seleccionarTodos();
  };

  const equiposParaImprimir = equipos.filter(e => seleccionados.includes(e.id));
  const paginasEstimadas = modo === 'carta'
    ? Math.ceil(equiposParaImprimir.length / 12)
    : equiposParaImprimir.length;

  const handlePrint = () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un equipo antes de imprimir');
      return;
    }

    toast.success(`Preparando ${seleccionados.length} etiquetas — ${paginasEstimadas} página(s)`);

    // Set the print mode CSS class on <html>
    document.documentElement.setAttribute('data-print-mode', modo);

    // For Zebra mode, dynamically inject @page size override
    let zebraStyle = null;
    if (modo === 'zebra') {
      zebraStyle = document.createElement('style');
      zebraStyle.id = 'zebra-page-override';
      zebraStyle.textContent = '@page { size: 51mm 25mm; margin: 0; }';
      document.head.appendChild(zebraStyle);
    }

    setTimeout(() => {
      window.print();
      // Clean up after print dialog closes
      setTimeout(() => {
        document.documentElement.removeAttribute('data-print-mode');
        if (zebraStyle) zebraStyle.remove();
      }, 500);
    }, 100);
  };

  const allVisibleSelected = equiposFiltrados.length > 0 && equiposFiltrados.every(e => seleccionados.includes(e.id));

  return (
    <div className="p-4 md:p-6 space-y-6 qr-batch-screen">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            Etiquetado Masivo QR
          </h1>
          <p className="text-slate-400 mt-1">Genera etiquetas QR profesionales con identidad IMSS para impresión en papel o stickers térmicos.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setModo('carta')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modo === 'carta'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Carta
            </button>
            <button
              onClick={() => setModo('zebra')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modo === 'zebra'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sticker className="h-4 w-4" />
              Zebra
            </button>
          </div>

          {/* Print Button */}
          <button
            disabled={seleccionados.length === 0}
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
          >
            <Printer className="h-4 w-4" />
            Imprimir {seleccionados.length} QR
          </button>
        </div>
      </div>

      {/* ═══ Stats Bar ═══ */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50">
          <span className="text-slate-400 text-sm">Seleccionados:</span>
          <span className="text-white font-bold text-lg">{seleccionados.length}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50">
          <span className="text-slate-400 text-sm">Páginas estimadas:</span>
          <span className="text-white font-bold text-lg">{paginasEstimadas || '—'}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50">
          <span className="text-slate-400 text-sm">Formato:</span>
          <span className={`font-bold text-lg ${modo === 'carta' ? 'text-purple-400' : 'text-amber-400'}`}>
            {modo === 'carta' ? '8.5" × 11" (3×4)' : '2" × 1" (Sticker)'}
          </span>
        </div>
        {seleccionados.length > 0 && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 ml-auto bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Ocultar' : 'Vista'} Previa
          </button>
        )}
      </div>

      {/* ═══ Preview Section ═══ */}
      {showPreview && seleccionados.length > 0 && (
        <div className="print:hidden">
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Vista Previa de Etiqueta</h3>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {equiposParaImprimir.slice(0, 4).map(eq => (
                <PreviewCard key={eq.id} equipo={eq} modo={modo} />
              ))}
              {equiposParaImprimir.length > 4 && (
                <div className="flex items-center px-6 text-slate-500 text-sm">
                  +{equiposParaImprimir.length - 4} más...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-wrap gap-3 print:hidden bg-slate-800/30 p-4 rounded-2xl border border-slate-700">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, serie o marca..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Area Filter */}
        <div className="relative min-w-[180px]">
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none cursor-pointer focus:border-purple-500 outline-none"
          >
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        </div>

        {/* Select All/None */}
        <button
          onClick={toggleSeleccionarTodos}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        >
          {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-purple-400" /> : <Square className="h-4 w-4" />}
          {allVisibleSelected ? 'Deseleccionar' : 'Seleccionar'} visibles ({equiposFiltrados.length})
        </button>

        {seleccionados.length > 0 && (
          <button
            onClick={() => setSeleccionados([])}
            className="text-red-400 hover:text-red-300 px-3 py-2 text-sm font-medium transition-all"
          >
            Limpiar todo ({seleccionados.length})
          </button>
        )}
      </div>

      {/* ═══ Equipment Grid (Selection) ═══ */}
      <div className="print:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : equiposFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <QrCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron equipos{busqueda ? ` para "${busqueda}"` : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {equiposFiltrados.map(eq => {
              const selected = seleccionados.includes(eq.id);
              return (
                <div
                  key={eq.id}
                  onClick={() => toggleSeleccion(eq.id)}
                  className={`group cursor-pointer p-3 border rounded-xl transition-all duration-200 ${
                    selected
                      ? 'bg-purple-900/30 border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/20'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{eq.nombre}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{eq.serie}</p>
                      {eq.area && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{eq.area}</p>}
                    </div>
                    <div className={`ml-2 transition-all duration-200 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                      <CheckCircle className={`h-4 w-4 ${selected ? 'text-purple-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
           PRINT-ONLY ZONES — Hidden on screen, shown when printing
           ═══════════════════════════════════════════════════════ */}

      {/* Carta Format: 3×4 grid with cut guides */}
      <div className="qr-print-carta">
        {equiposParaImprimir.map((eq, idx) => (
          <EtiquetaCarta key={eq.id} equipo={eq} />
        ))}
      </div>

      {/* Zebra Format: one sticker per page */}
      <div className="qr-print-zebra">
        {equiposParaImprimir.map(eq => (
          <div key={eq.id} className="qr-zebra-page">
            <EtiquetaZebra equipo={eq} />
          </div>
        ))}
      </div>
    </div>
  );
}
