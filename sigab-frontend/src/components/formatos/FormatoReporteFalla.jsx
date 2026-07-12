/**
 * Formato 01 — Reporte de Falla de Equipo
 * Folio: RF-XXXX · NOM-016-SSA3-2012
 * Layout fiel al documento .docx oficial IMSS
 */
import { fmtFecha, normalizeTema } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

const QR_SVG = () => (
  <div style={{ display: 'inline-block', padding: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 2 }}>
    <svg width="52" height="52" viewBox="0 0 29 29" style={{ display: 'block', shapeRendering: 'crispEdges' }}>
      <rect width="29" height="29" fill="#fff"/>
      <path fill="#000" d="M0 0h7v7H0zm1 1h5v5H1zm1 1h3v3H2zM7 0h1v1H7zm1 1h1v1H8zM7 2h1v1H7zm1 1h1v1H8zM0 7h1v1H0zm1 1h1v1H1zM2 7h1v1H2zm3 1h1v1H5zm3 0h1v1H8zm1-1h1v1H9zm1 1h1v1H10zm1-1h1v1H11zM13 0h7v7h-7zm1 1h5v5h-5zm1 1h3v3h-3zM9 4h1v1H9zm1 1h1v1H10zm2-1h1v1H12zm1 1h1v1H13zm2 0h1v1H15zm2-1h1v1H17zm1 1h1v1H18zm2 0h1v1H20zm1-1h1v1H21zm1 1h1v1H22zM0 13h7v7H0zm1 1h5v5H1zm1 1h3v3H2zm10-5h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm1 1h1v1H16zm3 0h1v1H19zm1-1h1v1H20zm2 0h1v1H22zm-9 2h1v1H13zm1 1h1v1H14zm1-1h1v1H15zm2 1h1v1H17zm3-1h1v1H20zm2 1h1v1H22zm-10 3h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm2 0h1v1H17zm1-1h1v1H18zm3 0h1v1H21zm1 1h1v1H22z"/>
    </svg>
    <div style={{ fontSize: 8, textAlign: 'center', color: '#555', marginTop: 2 }}>Scan QR</div>
  </div>
);

export default function FormatoReporteFalla({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = normalizeTema(tema);
  const o = orden || {};

  const folio = o.numero_orden?.startsWith('RF')
    ? o.numero_orden
    : `RF-${String(o.id || '0000').padStart(4, '0')}`;
  const condicion = o.condicion_equipo || '';
  const criticidad = o.prioridad || '';

  const EI = ({ value, field, placeholder = '' }) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange && onChange(field, e.target.value)}
      placeholder={placeholder}
      style={{
        border: 'none', borderBottom: `1px dashed ${t.check}`,
        background: 'transparent', color: 'inherit',
        fontSize: 'inherit', width: '100%',
        padding: '2px 4px', outline: 'none', boxSizing: 'border-box'
      }}
    />
  );

  const ET = ({ value, field, placeholder = '', minH = 64 }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange && onChange(field, e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{
        border: 'none', borderBottom: `1px dashed ${t.check}`,
        background: 'transparent', color: 'inherit',
        fontSize: 'inherit', width: '100%', minHeight: minH,
        resize: 'none', padding: '4px', outline: 'none', boxSizing: 'border-box'
      }}
    />
  );

  const ECB = ({ checked, label, field, val }) => (
    <span
      onClick={() => isEditing && onChange && onChange(field, val)}
      style={{
        cursor: isEditing ? 'pointer' : 'default',
        color: checked ? t.check : t.cell.color,
        marginRight: 18, fontSize: 12, whiteSpace: 'nowrap',
        userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 4
      }}
    >
      <span style={{ fontSize: 14 }}>{checked ? '☑' : '☐'}</span>{label}
    </span>
  );

  const TD = ({ children, style: s = {} }) => (
    <td style={{ ...t.cell, ...s }}>{children}</td>
  );
  const TH = ({ children, colSpan = 1, w }) => (
    <td colSpan={colSpan} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: w }}>
      {children}
    </td>
  );
  const SH = ({ title, cols = 10 }) => (
    <tr><td colSpan={cols} style={t.sectionTitle}>{title}</td></tr>
  );

  return (
    <>
      <style>{`@media print { body { margin: 0; } #formato-print-root { width: 210mm; font-size: 11pt; } }`}</style>
      <div id="formato-print-root" style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* ── CABECERA ─────────────────────────────────────────────────────── */}
        <FormatoHeader
          t={t}
          tipoLabel="REPORTE DE FALLA DE EQUIPO"
          folio={folio}
          fecha={o.fecha_creacion || o.fecha}
        />

        <div style={{ height: 10 }} />

        {/* ── 1. DATOS DEL EQUIPO ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="1. Datos del Equipo" />
            {/* Fila encabezados */}
            <tr>
              <TH w="24%">Equipo</TH>
              <TH w="19%">Marca</TH>
              <TH w="19%">Modelo</TH>
              <TH w="19%">No. Inventario</TH>
              <TH w="19%">QR del Equipo</TH>
            </tr>
            {/* Fila datos — fila 1 */}
            <tr>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_nombre} field="equipo_nombre" placeholder="Nombre equipo" /> : (o.equipo_nombre || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_marca} field="equipo_marca" placeholder="Marca" /> : (o.equipo_marca || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_modelo} field="equipo_modelo" placeholder="Modelo" /> : (o.equipo_modelo || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_inventario || o.no_inventario} field="equipo_inventario" placeholder="No. Inv." /> : (o.equipo_inventario || o.no_inventario || '—')}</div></TD>
              <TD rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                <QR_SVG />
              </TD>
            </tr>
            {/* Fila datos — fila 2 */}
            <tr>
              <TH>No. de Serie</TH>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_serie} field="equipo_serie" placeholder="Serie" /> : (o.equipo_serie || '—')}</div></TD>
              <TH>Ubicación / Servicio</TH>
              <TD>
                <div style={{ minHeight: 20 }}>
                  {isEditing
                    ? <EI value={o.ubicacion_fisica || o.area} field="area" placeholder="Área / Piso" />
                    : (o.ubicacion_fisica || (o.area ? `${o.area}${o.piso ? ` · Piso ${o.piso}` : ''}` : '—'))
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 2. QUIEN REPORTA ─────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="2. Quien Reporta" />
            <tr>
              <TH w="40%">Nombre completo</TH>
              <TH w="25%">Cargo / Categoría</TH>
              <TH w="35%">Servicio / Turno</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.reportado_por} field="reportado_por" placeholder="Nombre quien reporta" /> : (o.reportado_por || '—')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.cargo_reportante} field="cargo_reportante" placeholder="Cargo" /> : (o.cargo_reportante || '—')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.servicio_turno} field="servicio_turno" placeholder="Servicio / Turno" /> : (o.servicio_turno || '—')}</div></TD>
            </tr>
          </tbody>
        </table>

        {/* ── 3. DESCRIPCIÓN DE LA FALLA ───────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="3. Descripción de la Falla" />
            <tr>
              <TD style={{ minHeight: 80, height: 80 }}>
                {isEditing
                  ? <ET value={o.falla_reportada} field="falla_reportada" placeholder="Describa con detalle la falla observada..." minH={72} />
                  : <div style={{ minHeight: 72, whiteSpace: 'pre-wrap' }}>{o.falla_reportada || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 4. CONDICIÓN Y CRITICIDAD ────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="4. Condición y Criticidad del Equipo" />
            <tr>
              <TD style={{ width: '60%' }}>
                <div style={{ ...t.label, marginBottom: 6 }}>Condición del equipo</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <ECB checked={condicion === 'fuera_servicio'}    label="Fuera de servicio"  field="condicion_equipo" val="fuera_servicio" />
                  <ECB checked={condicion === 'en_operacion'}      label="En operación"        field="condicion_equipo" val="en_operacion" />
                  <ECB checked={condicion === 'en_observacion'}    label="En observación"      field="condicion_equipo" val="en_observacion" />
                </div>
              </TD>
              <TD style={{ width: '40%' }}>
                <div style={{ ...t.label, marginBottom: 6 }}>Criticidad</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <ECB checked={criticidad === 'alta' || criticidad === 'critica'} label="Alta"   field="prioridad" val="alta" />
                  <ECB checked={criticidad === 'media'}                            label="Media"  field="prioridad" val="media" />
                  <ECB checked={criticidad === 'baja'}                             label="Baja"   field="prioridad" val="baja" />
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 5. RECEPCIÓN EN CONSERVACIÓN ─────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="5. Recepción en el Departamento de Conservación" />
            <tr>
              <TH w="30%">Recibe (nombre y cargo)</TH>
              <TH w="22%">Fecha de recepción</TH>
              <TH w="16%">Hora</TH>
              <TH w="32%">Genera Orden de Servicio No.</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.recibe_nombre} field="recibe_nombre" placeholder="Nombre técnico" /> : (o.recibe_nombre || '—')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.fecha_recepcion} field="fecha_recepcion" placeholder="DD/MM/AAAA" /> : fmtFecha(o.fecha_recepcion)}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.hora_recepcion} field="hora_recepcion" placeholder="HH:MM" /> : (o.hora_recepcion || '__:__')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.numero_orden_generada} field="numero_orden_generada" placeholder="Ej. OS-C-0001" /> : (o.numero_orden_generada || '—')}</div></TD>
            </tr>
          </tbody>
        </table>

        {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <tbody>
            <tr>
              {[
                { rol: 'Quien Reporta', nombre: o.reportado_por },
                { rol: 'Recibe — Depto. Conservación', nombre: o.recibe_nombre },
              ].map(({ rol, nombre }) => (
                <td key={rol} style={{ ...t.firmaCell, width: '50%', textAlign: 'center' }}>
                  <div style={{ minHeight: 36 }} />
                  <div style={{ borderTop: `1px solid ${t.table.borderColor}`, paddingTop: 4, fontSize: 10, color: t.label.color }}>
                    {nombre ? <strong style={{ display: 'block', color: t.cell.color }}>{nombre}</strong> : <span>&nbsp;</span>}
                    {rol}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 8, fontSize: 9, color: t.label.color, textAlign: 'right' }}>
          Folio RF: da trazabilidad a la OS generada · Formato F-CON-01 · NOM-016-SSA3-2012
        </div>
      </div>
    </>
  );
}
