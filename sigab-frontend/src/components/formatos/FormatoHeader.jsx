/**
 * FormatoHeader — cabecera común a los 4 formatos IMSS/SIGAH
 * Logo IMSS | Nombre hospital + delegación | Tipo + folio + fecha
 */
export default function FormatoHeader({ t, tipoLabel, folio, fecha, refReporte }) {
  const fmtFecha = (f) => {
    if (!f) return '__/__/____';
    try { return new Date(f).toLocaleDateString('es-MX'); } catch { return f; }
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${t.table.borderColor}` }}>
      <tbody>
        <tr>
          {/* Logo */}
          <td style={{ ...t.cell, width: 90, textAlign: 'center', verticalAlign: 'middle' }}
            rowSpan={2}>
            <img
              src="/imss_logo.png"
              alt="IMSS"
              style={{ width: 70, height: 'auto', display: 'block', margin: '0 auto' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </td>
          {/* Hospital info */}
          <td style={{ ...t.cell, verticalAlign: 'middle' }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, color: t.header.color, background: t.header.background, padding: '6px 10px', marginBottom: 0 }}>
              HOSPITAL GENERAL REGIONAL No. 1 — IMSS TIJUANA
            </div>
            <div style={{ ...t.altCell, padding: '4px 10px', fontSize: 11, color: t.label.color }}>
              Delegación 2 Baja California · Unidad Médica HGR No.1
            </div>
            <div style={{ padding: '3px 10px', fontSize: 11, fontWeight: 'bold', color: t.cell.color }}>
              Departamento de Conservación / Ingeniería Biomédica
            </div>
          </td>
          {/* Folio + fecha */}
          <td style={{ ...t.cell, width: 170, verticalAlign: 'middle', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 14, color: t.header.color, letterSpacing: '0.03em' }}>
              {tipoLabel}
            </div>
            <div style={{ fontSize: 12, color: t.cell.color, marginTop: 4 }}>
              <strong>No. orden:</strong> {folio || '——'}
            </div>
            <div style={{ fontSize: 11, color: t.label.color, marginTop: 2 }}>
              <strong>Fecha:</strong> {fmtFecha(fecha)}
            </div>
            {refReporte && (
              <div style={{ fontSize: 11, color: t.label.color, marginTop: 2 }}>
                <strong>Ref. reporte:</strong> {refReporte}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
