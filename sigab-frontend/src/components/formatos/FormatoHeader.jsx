/**
 * FormatoHeader — cabecera institucional IMSS oficial
 *
 * Reproduce el membrete del "FORMATO ORDEN DE SERVICIO.xls" del HGR No. 1
 * (Departamento de Conservación e Ingeniería Biomédica) preservando además
 * el folio + fecha para SIGAH.
 *
 * Layout:
 *   ┌───────┬─────────────────────────────┬──────────────┐
 *   │ LOGO  │ INSTITUTO MEXICANO DEL      │  TIPO        │
 *   │ IMSS  │   SEGURO SOCIAL             │  ───         │
 *   │       │ DELEGACIÓN REGIONAL EN      │ No. orden    │
 *   │       │   BAJA CALIFORNIA           │ Fecha        │
 *   │       │ HOSPITAL GENERAL REGIONAL   │ Ref. reporte │
 *   │       │   No. 1 — J.C.U. 15         │              │
 *   │       │ Dpto. Conservación e Ing.   │              │
 *   │       │   Biomédica                 │              │
 *   └───────┴─────────────────────────────┴──────────────┘
 *
 * v.3.2.0 — añadido 2026-07-07 por orden de Gustavo (HGR1 IMSS Tijuana).
 */
export default function FormatoHeader({ t, tipoLabel, folio, fecha, refReporte }) {
  const fmtFecha = (f) => {
    if (!f) return '__/__/____';
    try { return new Date(f).toLocaleDateString('es-MX'); } catch { return f; }
  };

  // Color institucional IMSS — verde olivo oscuro del .xls histórico
  const imssGreen = '#2D6A27';
  const imssGreenDark = '#1e4b1a';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${imssGreen}`, marginBottom: 4 }}>
      <tbody>
        <tr>
          {/* ── LOGO IMSS ─────────────────────────────────────────── */}
          <td style={{
            ...t.cell,
            width: 90,
            textAlign: 'center',
            verticalAlign: 'middle',
            background: '#fff',
            borderRight: `2px solid ${imssGreen}`,
          }}
            rowSpan={3}>
            <img
              src="/imss_logo.png"
              alt="IMSS"
              style={{ width: 72, height: 'auto', display: 'block', margin: '0 auto' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{
              fontSize: 8, fontWeight: 'bold', color: imssGreen,
              letterSpacing: '0.1em', marginTop: 4,
            }}>
              IMSS
            </div>
          </td>

          {/* ── MEMBRETE INSTITUCIONAL ────────────────────────────── */}
          <td style={{
            ...t.cell,
            verticalAlign: 'top',
            padding: '6px 12px',
            background: '#fff',
            borderRight: `1px solid ${imssGreen}`,
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: 15,
              color: imssGreen,
              letterSpacing: '0.04em',
              textAlign: 'center',
              marginBottom: 2,
            }}>
              INSTITUTO MEXICANO DEL SEGURO SOCIAL
            </div>
            <div style={{
              fontWeight: 'bold',
              fontSize: 12,
              color: imssGreenDark,
              textAlign: 'center',
              marginBottom: 1,
            }}>
              DELEGACIÓN REGIONAL EN BAJA CALIFORNIA
            </div>
            <div style={{
              fontWeight: 'bold',
              fontSize: 12,
              color: imssGreenDark,
              textAlign: 'center',
              marginBottom: 4,
            }}>
              HOSPITAL GENERAL REGIONAL No. 1 — J.C.U. 15
            </div>
            <div style={{
              fontSize: 11,
              color: '#444',
              textAlign: 'center',
              fontStyle: 'italic',
              borderTop: `1px solid ${imssGreen}`,
              paddingTop: 4,
            }}>
              Departamento de Conservación e Ingeniería Biomédica
            </div>
          </td>

          {/* ── FOLIO + FECHA ────────────────────────────────────── */}
          <td style={{
            ...t.cell,
            width: 180,
            verticalAlign: 'middle',
            textAlign: 'center',
            background: imssGreen,
            color: '#fff',
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: 13,
              color: '#fff',
              letterSpacing: '0.03em',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              {tipoLabel || 'Orden de Servicio'}
            </div>
            <div style={{
              fontSize: 12,
              color: '#fff',
              borderTop: `1px solid rgba(255,255,255,0.5)`,
              paddingTop: 4,
            }}>
              <strong>No. orden:</strong> {folio || '——'}
            </div>
            <div style={{
              fontSize: 11,
              color: '#fff',
              marginTop: 2,
            }}>
              <strong>Fecha:</strong> {fmtFecha(fecha)}
            </div>
            {refReporte && (
              <div style={{
                fontSize: 11,
                color: '#fff',
                marginTop: 2,
                borderTop: `1px solid rgba(255,255,255,0.5)`,
                paddingTop: 4,
              }}>
                <strong>Ref. reporte:</strong> {refReporte}
              </div>
            )}
          </td>
        </tr>

        {/* Fila vacía para dar altura mínima y consistencia con .xls */}
        <tr><td colSpan={1} style={{ ...t.altCell, padding: 0, border: 0, height: 0 }}></td></tr>
        <tr><td colSpan={1} style={{ ...t.altCell, padding: 0, border: 0, height: 0 }}></td></tr>
      </tbody>
    </table>
  );
}