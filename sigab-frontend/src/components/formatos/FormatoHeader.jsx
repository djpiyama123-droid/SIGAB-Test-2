/**
 * FormatoHeader — cabecera institucional IMSS oficial
 *
 * Reproduce el membrete del "FORMATO ORDEN DE SERVICIO.xls" del HGR No. 1
 * (Departamento de Conservación e Ingeniería Biomédica): 4 líneas de
 * membrete + folio/fecha, respetando el tema de impresión activo (`t`, uno
 * de blanco-imss / verde-imss / neon-sigah — ver formatoThemes.js) en vez de
 * fijar un color institucional único, para que los 3 temas de FormatoViewer
 * sigan funcionando igual que antes.
 *
 * v.3.2.0 — porteado 2026-07-08 desde feat/orden-servicio-imss-oficial-2026-07-07
 * (commit 63c849e, base v3) a v4, adaptado al sistema `t` de formatoThemes.js.
 */
import { fmtFecha } from './formatoThemes';

export default function FormatoHeader({ t, tipoLabel, folio, fecha, refReporte }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${t.check}`, marginBottom: 4 }}>
      <tbody>
        <tr>
          {/* ── LOGO IMSS ─────────────────────────────────────────── */}
          <td style={{
            ...t.cell,
            width: 90,
            textAlign: 'center',
            verticalAlign: 'middle',
            borderRight: `2px solid ${t.check}`,
          }}>
            <img
              src="/imss_logo.png"
              alt="IMSS"
              style={{ width: 72, height: 'auto', display: 'block', margin: '0 auto' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ fontSize: 8, fontWeight: 'bold', color: t.check, letterSpacing: '0.1em', marginTop: 4 }}>
              IMSS
            </div>
          </td>

          {/* ── MEMBRETE INSTITUCIONAL ────────────────────────────── */}
          <td style={{ ...t.cell, verticalAlign: 'top', padding: '6px 12px', borderRight: `1px solid ${t.check}` }}>
            <div style={{ fontWeight: 'bold', fontSize: 15, color: t.check, letterSpacing: '0.04em', textAlign: 'center', marginBottom: 2 }}>
              INSTITUTO MEXICANO DEL SEGURO SOCIAL
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: t.cell.color, textAlign: 'center', marginBottom: 1 }}>
              DELEGACIÓN REGIONAL EN BAJA CALIFORNIA
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: t.cell.color, textAlign: 'center', marginBottom: 4 }}>
              HOSPITAL GENERAL REGIONAL No. 1 — J.C.U. 15
            </div>
            <div style={{ fontSize: 11, color: t.label.color, textAlign: 'center', fontStyle: 'italic', borderTop: `1px solid ${t.table.borderColor}`, paddingTop: 4 }}>
              Departamento de Conservación e Ingeniería Biomédica
            </div>
          </td>

          {/* ── FOLIO + FECHA ────────────────────────────────────── */}
          <td style={{
            ...t.cell,
            width: 180,
            verticalAlign: 'middle',
            textAlign: 'center',
            background: t.header.background,
            color: t.header.color,
          }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, color: t.header.color, letterSpacing: '0.03em', marginBottom: 6, textTransform: 'uppercase' }}>
              {tipoLabel || 'Orden de Servicio'}
            </div>
            <div style={{ fontSize: 12, color: t.header.color, borderTop: `1px solid ${t.header.color}55`, paddingTop: 4 }}>
              <strong>No. orden:</strong> {folio || '——'}
            </div>
            <div style={{ fontSize: 11, color: t.header.color, marginTop: 2 }}>
              <strong>Fecha:</strong> {fmtFecha(fecha)}
            </div>
            {refReporte && (
              <div style={{ fontSize: 11, color: t.header.color, marginTop: 2, borderTop: `1px solid ${t.header.color}55`, paddingTop: 4 }}>
                <strong>Ref. reporte:</strong> {refReporte}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
