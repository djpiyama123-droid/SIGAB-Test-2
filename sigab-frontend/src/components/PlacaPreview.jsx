import { QRCodeSVG } from 'qrcode.react';

const TIER_PRESETS = {
  basico: {
    label: 'Etiqueta poliéster',
    material: 'Poliéster adhesivo 40×25mm',
    width: 200,
    height: 125,
    bg: '#FFFFFF',
    text: '#0F172A',
    accent: '#006CB7',
    qrSize: 88,
    showCornerMarks: false,
    showAccentBar: true,
  },
  estandar: {
    label: 'Aluminio anodizado',
    material: 'Aluminio anodizado 50×30mm · grabado láser',
    width: 240,
    height: 144,
    bg: '#E5E7EB',
    text: '#0F172A',
    accent: '#006CB7',
    qrSize: 108,
    showCornerMarks: true,
    showAccentBar: true,
  },
  premium: {
    label: 'Acero inox 304',
    material: 'Acero inox 304 60×40mm · grabado láser + atornillado',
    width: 280,
    height: 186,
    bg: '#F1F5F9',
    text: '#0F172A',
    accent: '#059669',
    qrSize: 132,
    showCornerMarks: true,
    showAccentBar: true,
    showScrewHoles: true,
  },
};

/**
 * Render visual de la placa física (preview en pantalla).
 * El SVG real para producción se genera en el backend (vectorial puro).
 *
 * Props:
 *   equipo: { id, nombre, serie, inventario, qr_token }
 *   tier: 'basico' | 'estandar' | 'premium'
 *   baseUrl: dominio para el QR (default window.location.origin)
 */
export default function PlacaPreview({ equipo, tier = 'estandar', baseUrl }) {
  const preset = TIER_PRESETS[tier] || TIER_PRESETS.estandar;
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://sigah.mx');
  const qrToken = equipo?.qr_token || equipo?.serie || String(equipo?.id || '');
  const qrUrl = `${origin}/equipo/${qrToken}`;

  const nombre = (equipo?.nombre || 'Sin nombre').slice(0, 24);
  const serie = equipo?.serie || '—';
  const inventario = equipo?.inventario || `SIGAH-${String(equipo?.id || 0).padStart(4, '0')}`;

  return (
    <div
      className="relative shadow-xl rounded-md overflow-hidden border-2 transition-transform hover:scale-105"
      style={{
        width: preset.width,
        height: preset.height,
        backgroundColor: preset.bg,
        borderColor: preset.accent + '40',
        color: preset.text,
      }}
    >
      {/* Marcas de registro CNC en esquinas */}
      {preset.showCornerMarks && (
        <>
          <div className="absolute top-1 left-1 w-2 h-2 border-l border-t" style={{ borderColor: preset.text }} />
          <div className="absolute top-1 right-1 w-2 h-2 border-r border-t" style={{ borderColor: preset.text }} />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b" style={{ borderColor: preset.text }} />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b" style={{ borderColor: preset.text }} />
        </>
      )}

      {/* Agujeros de tornillo (premium) */}
      {preset.showScrewHoles && (
        <>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-400/30 border border-slate-500" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-400/30 border border-slate-500" />
        </>
      )}

      {/* Contenido principal */}
      <div className="h-full flex items-stretch p-2.5 gap-2.5">
        {/* QR vectorial */}
        <div className="flex-shrink-0 flex items-center">
          <div className="bg-white p-1 rounded-sm">
            <QRCodeSVG
              value={qrUrl}
              size={preset.qrSize}
              level="H"
              includeMargin={false}
              fgColor={preset.text}
              bgColor="#FFFFFF"
            />
          </div>
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-0.5">
            <p
              className="font-bold leading-tight"
              style={{
                color: preset.text,
                fontSize: preset.height * 0.13,
                lineHeight: 1.1,
              }}
            >
              {nombre}
            </p>
            <p className="font-mono" style={{ color: preset.text + 'CC', fontSize: preset.height * 0.085 }}>
              S/N: {serie}
            </p>
            <p className="font-mono" style={{ color: preset.text + 'AA', fontSize: preset.height * 0.075 }}>
              INV: {inventario}
            </p>
          </div>

          {preset.showAccentBar && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-0.5 flex-1" style={{ backgroundColor: preset.accent }} />
              <span className="font-bold tracking-wider" style={{ color: preset.accent, fontSize: preset.height * 0.06 }}>
                SIGAH
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { TIER_PRESETS };
