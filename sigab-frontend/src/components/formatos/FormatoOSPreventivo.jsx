/**
 * Formato 03 — Orden de Servicio Preventivo
 * Folio: OS-P-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

const RUTINA_ITEMS = [
  { id: 'limpieza_general',        label: 'Limpieza general del equipo' },
  { id: 'inspeccion_fisica',       label: 'Inspección física y de conexiones' },
  { id: 'pruebas_funcionamiento',  label: 'Pruebas de funcionamiento' },
  { id: 'calibracion',             label: 'Calibración / verificación' },
  { id: 'lubricacion',             label: 'Lubricación de componentes' },
  { id: 'prueba_seguridad',        label: 'Prueba de seguridad eléctrica' },
];

export default function FormatoOSPreventivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-P-${String(o.id || '0000').padStart(4, '0')}`;
  const rutina = Array.isArray(o.rutina_realizada) ? o.rutina_realizada : [];
  const condicionCierre = o.condicion_cierre || (o.estado === 'cerrada' ? 'apto_operacion' : '');

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

  const handleRutinaToggle = (itemId) => {
    const list = [...rutina];
    const idx = list.indexOf(itemId);
    if (idx === -1) {
      list.push(itemId);
    } else {
      list.splice(idx, 1);
    }
    onChange('rutina_realizada', list);
  };

  const TD = (props) => <td style={{ ...t.cell, ...props.style }}>{props.children}</td>;
  const TH = ({ children, colSpan, w }) => (
    <td colSpan={colSpan || 1} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: w }}>
      {children}
    </td>
  );

  const leftRutina  = RUTINA_ITEMS.slice(0, 3);
  const rightRutina = RUTINA_ITEMS.slice(3);

  return (
    <div style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <FormatoHeader
        t={t}
        tipoLabel="ORDEN DE SERVICIO — PREVENTIVO"
        folio={folio}
        fecha={o.fecha_creacion || o.fecha}
      />

      <div style={{ height: 8 }} />

      {/* DATOS DEL EQUIPO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Datos del Equipo" t={t} />
          <tr>
            <TH w="25%">Equipo</TH>
            <TH w="18%">Marca</TH>
            <TH w="18%">Modelo</TH>
            <TH w="15%">No. Inventario</TH>
            <TH w="24%">QR del Equipo</TH>
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
            <TD>{isEditing ? <EditInput value={o.equipo_serie} field="equipo_serie" /> : (o.equipo_serie || ' ')}</TD>
            <TH>Ubicación / Servicio</TH>
            <TD>{isEditing ? <EditInput value={o.area} field="area" /> : (o.area ? `${o.area}${o.piso ? ` · Piso ${o.piso}` : ''}` : ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* RUTINA DE MANTENIMIENTO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Rutina de Mantenimiento Efectuada" t={t} />
          <tr>
            <TD style={{ width: '50%', verticalAlign: 'top' }}>
              {leftRutina.map((r) => (
                <div key={r.id} style={{ marginBottom: 6 }}>
                  {isEditing ? (
                    <EditCB checked={rutina.includes(r.id)} label={r.label} onClick={() => handleRutinaToggle(r.id)} />
                  ) : (
                    <CB checked={rutina.includes(r.id)} label={r.label} t={t} />
                  )}
                </div>
              ))}
            </TD>
            <TD style={{ width: '50%', verticalAlign: 'top' }}>
              {rightRutina.map((r) => (
                <div key={r.id} style={{ marginBottom: 6 }}>
                  {isEditing ? (
                    <EditCB checked={rutina.includes(r.id)} label={r.label} onClick={() => handleRutinaToggle(r.id)} />
                  ) : (
                    <CB checked={rutina.includes(r.id)} label={r.label} t={t} />
                  )}
                </div>
              ))}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* SERVICIO EFECTUADO Y MATERIAL */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Servicio Efectuado y Material Utilizado" t={t} />
          <tr>
            <TD style={{ minHeight: 60, height: 60 }}>
              {isEditing ? <EditTextarea value={o.descripcion_servicio} field="descripcion_servicio" /> : (o.descripcion_servicio || ' ')}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* TIEMPOS Y RESPONSABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Tiempos y Responsable" t={t} />
          <tr>
            <TH w="22%">Hora Inicio</TH>
            <TH w="22%">Hora Término</TH>
            <TH w="22%">Tiempo Real</TH>
            <TH w="34%">Técnico Asignado</TH>
          </tr>
          <tr>
            <TD>{isEditing ? <EditInput value={o.hora_inicio} field="hora_inicio" placeholder="HH:MM" /> : (o.hora_inicio || '__:__')}</TD>
            <TD>{isEditing ? <EditInput value={o.hora_termino} field="hora_termino" placeholder="HH:MM" /> : (o.hora_termino || '__:__')}</TD>
            <TD>{isEditing ? <EditInput value={o.tiempo_real} field="tiempo_real" placeholder="Hrs" /> : (o.tiempo_real || '___')}</TD>
            <TD>{isEditing ? <EditInput value={o.tecnico_nombre} field="tecnico_nombre" /> : (o.tecnico_nombre || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* EVIDENCIA FOTOGRÁFICA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Evidencia Fotográfica" t={t} />
          <tr>
            {[0,1,2,3].map((i) => (
              <td key={i} style={{ ...t.cell, width: '25%', height: 80, textAlign: 'center', verticalAlign: 'middle' }}>
                {o.fotos?.[i]
                  ? <img src={o.fotos[i]} alt={`Foto ${i+1}`} style={{ maxWidth: '100%', maxHeight: 74, objectFit: 'contain' }} />
                  : <span style={{ color: t.label.color, fontSize: 10 }}>FOTOGRAFÍA {i+1}</span>
                }
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* RESULTADO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Resultado" t={t} />
          <tr>
            <TD style={{ width: '40%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 4 }}>Próximo Preventivo Programado</span>
              <span style={{ ...t.value, display: 'inline-block', minWidth: 120 }}>
                {isEditing ? <EditInput value={o.proximo_preventivo} field="proximo_preventivo" placeholder="YYYY-MM-DD" style={{ width: '100px' }} /> : (o.proximo_preventivo ? fmtFecha(o.proximo_preventivo) : '__/__/____')}
              </span>
            </TD>
            <TD style={{ width: '60%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Condición al Cierre</span>
              {isEditing ? (
                <>
                  <EditCB checked={condicionCierre === 'apto_operacion'} label="Equipo apto para operación" onClick={() => onChange('condicion_cierre', 'apto_operacion')} />
                  <EditCB checked={condicionCierre === 'requiere_correctivo'} label="Requiere correctivo" onClick={() => onChange('condicion_cierre', 'requiere_correctivo')} />
                </>
              ) : (
                <>
                  <CB checked={condicionCierre === 'apto_operacion'}    label="Equipo apto para operación"  t={t} />
                  <CB checked={condicionCierre === 'requiere_correctivo'} label="Requiere correctivo"       t={t} />
                </>
              )}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* FIRMAS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <tbody>
          <tr>
            {['Técnico Asignado', 'Jefe de Servicio', 'Jefe de Conservación'].map((rol) => (
              <td key={rol} style={{ ...t.firmaCell, width: '33.3%' }}>
                <div style={{ borderTop: `1px solid ${t.table.borderColor}`, paddingTop: 4, marginTop: 24, fontSize: 10, color: t.label.color }}>
                  {rol === 'Técnico Asignado' && o.tecnico_nombre
                    ? <strong style={{ display: 'block' }}>{o.tecnico_nombre}</strong>
                    : <br />}
                  {rol}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 9, color: t.label.color, textAlign: 'right' }}>
        Rutina específica por tipo de equipo: configurable en SIGAH. · NOM-016-SSA3-2012
      </div>
    </div>
  );
}
