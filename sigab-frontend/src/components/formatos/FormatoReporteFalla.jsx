/**
 * Formato 01 — Reporte de Falla de Equipo
 * Folio: RF-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoReporteFalla({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden?.startsWith('RF') ? o.numero_orden : `RF-${String(o.id || '0000').padStart(4, '0')}`;
  const condicion = o.condicion_equipo || (o.estado === 'abierta' ? 'fuera_servicio' : o.estado === 'en_progreso' ? 'operacion_parcial' : '');
  const criticidad = o.prioridad || 'media';

  const EditInput = ({ value, field, placeholder = '', style = {} }) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(field, e.target.value)}
      placeholder={placeholder}
      style={{
        border: 'none',
        borderBottom: `1px dashed ${t.check || '#006CB7'}`,
        background: 'transparent',
        color: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        width: '100%',
        padding: '2px 4px',
        outline: 'none',
        boxSizing: 'border-box',
        ...style
      }}
    />
  );

  const EditTextarea = ({ value, field, placeholder = '', style = {} }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(field, e.target.value)}
      placeholder={placeholder}
      style={{
        border: 'none',
        borderBottom: `1px dashed ${t.check || '#006CB7'}`,
        background: 'transparent',
        color: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        width: '100%',
        height: '100%',
        minHeight: 'inherit',
        resize: 'none',
        padding: '4px',
        outline: 'none',
        boxSizing: 'border-box',
        ...style
      }}
    />
  );

  const EditCB = ({ checked, label, onClick }) => (
    <span
      onClick={onClick}
      style={{
        cursor: 'pointer',
        color: checked ? t.check : t.cell.color,
        marginRight: 14,
        fontSize: 13,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        borderBottom: '1px dotted #ccc'
      }}
    >
      <span style={{ color: checked ? t.check : t.cell.color, fontSize: 15 }}>{checked ? '☑' : '☐'}</span>
      {' '}{label}
    </span>
  );

  const TD = (props) => <td style={{ ...t.cell, ...props.style }}>{props.children}</td>;
  const TH = ({ children, colSpan, w }) => (
    <td colSpan={colSpan || 1} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: w }}>
      {children}
    </td>
  );

  return (
    <div style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <FormatoHeader
        t={t}
        tipoLabel="REPORTE DE FALLA DE EQUIPO"
        folio={folio}
        fecha={o.fecha_creacion || o.fecha}
      />

      <div style={{ height: 8 }} />

      {/* DATOS DEL EQUIPO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Datos del Equipo" t={t} />
          <tr>
            <TH w="22%">Equipo</TH>
            <TH w="20%">Marca</TH>
            <TH w="20%">Modelo</TH>
            <TH w="15%">No. Inventario</TH>
            <TH w="23%">QR del Equipo</TH>
          </tr>
          <tr>
            <TD>{isEditing ? <EditInput value={o.equipo_nombre} field="equipo_nombre" /> : (o.equipo_nombre || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.equipo_marca} field="equipo_marca" /> : (o.equipo_marca || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.equipo_modelo} field="equipo_modelo" /> : (o.equipo_modelo || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.equipo_inventario} field="equipo_inventario" /> : (o.equipo_inventario || ' ')}</TD>
            <TD rowSpan={2} style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
              <div style={{ display: 'inline-block', padding: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 2 }}>
                <svg width="46" height="46" viewBox="0 0 29 29" style={{ display: 'block', shapeRendering: 'crispedges' }}>
                  <path fill="#000" d="M0 0h7v7H0zm1 1h5v5H1zm1 1h3v3H2zm5-2h1v1H7zm1 1h1v1H8zm-1 1h1v1H7zm1 1h1v1H8zm-8 4h1v1H0zm1 1h1v1H1zm1-1h1v1H2zm3 1h1v1H5zm3 0h1v1H8zm1-1h1v1H9zm1 1h1v1H10zm1-1h1v1H11zm2-7h7v7h-7zm1 1h5v5h-5zm1 1h3v3H3zm-5 6h1v1H9zm1 1h1v1H10zm2-1h1v1H12zm1 1h1v1H13zm2 0h1v1H15zm2-1h1v1H17zm1 1h1v1H18zm2 0h1v1H20zm1-1h1v1H21zm1 1h1v1H22zm-22 5h7v7H0zm1 1h5v5H1zm1 1h3v3H2zm10-5h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm1 1h1v1H16zm3 0h1v1H19zm1-1h1v1H20zm2 0h1v1H22zm-9 2h1v1H13zm1 1h1v1H14zm1-1h1v1H15zm2 1h1v1H17zm3-1h1v1H20zm2 1h1v1H22zm-10 3h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm2 0h1v1H17zm1-1h1v1H18zm3 0h1v1H21zm1 1h1v1H22z" />
                </svg>
              </div>
            </TD>
          </tr>
          <tr>
            <TH>No. de Serie</TH>
            <TD colSpan={1}>{isEditing ? <EditInput value={o.equipo_serie} field="equipo_serie" /> : (o.equipo_serie || ' ')}</TD>
            <TH>Ubicación / Servicio</TH>
            <TD>{isEditing ? <EditInput value={o.area} field="area" /> : (o.area ? `${o.area}${o.piso ? ` · ${o.piso}` : ''}` : ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* QUIEN REPORTA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Quien Reporta" t={t} />
          <tr>
            <TH w="40%">Nombre</TH>
            <TH w="25%">Cargo</TH>
            <TH w="35%">Servicio / Turno</TH>
          </tr>
          <tr>
            <TD>{isEditing ? <EditInput value={o.reportado_por} field="reportado_por" /> : (o.reportado_por || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.cargo_reportante} field="cargo_reportante" /> : (o.cargo_reportante || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.servicio_turno} field="servicio_turno" /> : (o.servicio_turno || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* DESCRIPCIÓN DE LA FALLA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Descripción de la Falla" t={t} />
          <tr>
            <TD style={{ minHeight: 64, height: 64 }}>
              {isEditing ? <EditTextarea value={o.falla_reportada} field="falla_reportada" /> : (o.falla_reportada || ' ')}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* CONDICIÓN Y CRITICIDAD */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Condición y Criticidad" t={t} />
          <tr>
            <TD style={{ width: '60%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Condición del Equipo</span>
              {isEditing ? (
                <>
                  <EditCB checked={condicion === 'fuera_servicio'} label="Fuera de servicio" onClick={() => onChange('condicion_equipo', 'fuera_servicio')} />
                  <EditCB checked={condicion === 'operacion_parcial'} label="Operación parcial" onClick={() => onChange('condicion_equipo', 'operacion_parcial')} />
                  <EditCB checked={condicion === 'en_riesgo'} label="En riesgo" onClick={() => onChange('condicion_equipo', 'en_riesgo')} />
                </>
              ) : (
                <>
                  <CB checked={condicion === 'fuera_servicio'}    label="Fuera de servicio"    t={t} />
                  <CB checked={condicion === 'operacion_parcial'} label="Operación parcial"    t={t} />
                  <CB checked={condicion === 'en_riesgo'}         label="En riesgo"            t={t} />
                </>
              )}
            </TD>
            <TD style={{ width: '40%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Clasificación de Criticidad</span>
              {isEditing ? (
                <>
                  <EditCB checked={criticidad === 'critica' || criticidad === 'alta'} label="Alta" onClick={() => onChange('prioridad', 'alta')} />
                  <EditCB checked={criticidad === 'media'} label="Media" onClick={() => onChange('prioridad', 'media')} />
                  <EditCB checked={criticidad === 'baja'} label="Baja" onClick={() => onChange('prioridad', 'baja')} />
                </>
              ) : (
                <>
                  <CB checked={criticidad === 'critica' || criticidad === 'alta'} label="Alta"   t={t} />
                  <CB checked={criticidad === 'media'}                            label="Media"  t={t} />
                  <CB checked={criticidad === 'baja'}                             label="Baja"   t={t} />
                </>
              )}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* RECEPCIÓN EN CONSERVACIÓN */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Recepción en el Departamento de Conservación" t={t} />
          <tr>
            <TH w="28%">Recibe</TH>
            <TH w="20%">Fecha</TH>
            <TH w="17%">Hora</TH>
            <TH w="35%">Genera Orden de Servicio No.</TH>
          </tr>
          <tr>
            <TD>{isEditing ? <EditInput value={o.recibe_nombre} field="recibe_nombre" /> : (o.recibe_nombre || ' ')}</TD>
            <TD>{isEditing ? <EditInput value={o.fecha_recepcion} field="fecha_recepcion" placeholder="YYYY-MM-DD" /> : fmtFecha(o.fecha_recepcion)}</TD>
            <TD>{isEditing ? <EditInput value={o.hora_recepcion} field="hora_recepcion" placeholder="HH:MM" /> : (o.hora_recepcion || '__:__')}</TD>
            <TD>{isEditing ? <EditInput value={o.numero_orden_generada} field="numero_orden_generada" /> : (o.numero_orden_generada || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* FIRMAS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <tbody>
          <tr>
            {[
              ['Reporta', o.reportado_por],
              ['Recibe — Conservación', o.recibe_nombre],
            ].map(([rol, nombre]) => (
              <td key={rol} style={{ ...t.firmaCell, width: '50%' }}>
                <div style={{ borderTop: `1px solid ${t.table.borderColor}`, paddingTop: 4, marginTop: 16, fontSize: 10, color: t.label.color }}>
                  {nombre ? <strong style={{ display: 'block' }}>{nombre}</strong> : <br />}
                  {rol}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 9, color: t.label.color, textAlign: 'right' }}>
        El folio de este reporte da trazabilidad a la orden de servicio que se genere. · NOM-016-SSA3-2012
      </div>
    </div>
  );
}
