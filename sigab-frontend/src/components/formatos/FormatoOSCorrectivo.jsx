/**
 * Formato 02 — Orden de Servicio Correctivo
 * Folio: OS-C-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoOSCorrectivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-C-${String(o.id || '0000').padStart(4, '0')}`;
  const estadoFinal = o.estado_final || (o.estado === 'cerrada' ? 'operativo' : o.estado === 'en_progreso' ? 'en_observacion' : '');

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

  const handleMaterialChange = (idx, field, val) => {
    const list = [...(o.materiales || [])];
    if (!list[idx]) {
      list[idx] = { descripcion: '', cantidad: 1 };
    }
    list[idx] = { ...list[idx], [field]: val };
    onChange('materiales', list);
  };

  const addMaterialRow = () => {
    const list = [...(o.materiales || [])];
    list.push({ descripcion: '', cantidad: 1 });
    onChange('materiales', list);
  };

  const removeMaterialRow = (idx) => {
    const list = [...(o.materiales || [])];
    list.splice(idx, 1);
    onChange('materiales', list);
  };

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
        tipoLabel="ORDEN DE SERVICIO — CORRECTIVO"
        folio={folio}
        fecha={o.fecha_creacion || o.fecha}
        refReporte={o.reporte_falla_ref}
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
            <TD rowSpan={2} style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', fontSize: 10, color: t.label.color }}>
              [QR]
            </TD>
          </tr>
          <tr>
            <TH>No. de Serie</TH>
            <TD>{isEditing ? <EditInput value={o.equipo_serie} field="equipo_serie" /> : (o.equipo_serie || ' ')}</TD>
            <TH>Ubicación / Servicio</TH>
            <TD>{isEditing ? <EditInput value={o.area} field="area" /> : (o.area ? `${o.area}${o.piso ? ` · Piso ${o.piso}` : ''}` : ' ')}</TD>
          </tr>
          <tr>
            <TH colSpan={2}>Localización del equipo o instalación</TH>
            <TD colSpan={3}>{isEditing ? <EditInput value={o.ubicacion_fisica} field="ubicacion_fisica" /> : (o.ubicacion_fisica || o.area || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* DIAGNÓSTICO DE LA FALLA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Diagnóstico de la Falla" t={t} />
          <tr>
            <TD style={{ minHeight: 60, height: 60 }}>
              {isEditing ? <EditTextarea value={o.falla_reportada || o.condiciones_encontradas} field="falla_reportada" /> : (o.falla_reportada || o.condiciones_encontradas || ' ')}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* DESCRIPCIÓN DEL TRABAJO REALIZADO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Descripción del Trabajo Realizado" t={t} />
          <tr>
            <TD style={{ minHeight: 70, height: 70 }}>
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
            <TH w="18%">Hora Inicio</TH>
            <TH w="18%">Hora Término</TH>
            <TH w="18%">T. Estimado</TH>
            <TH w="18%">T. Real</TH>
            <TH w="28%">Técnico Asignado</TH>
          </tr>
          <tr>
            <TD>{isEditing ? <EditInput value={o.hora_inicio} field="hora_inicio" placeholder="HH:MM" /> : (o.hora_inicio || '__:__')}</TD>
            <TD>{isEditing ? <EditInput value={o.hora_termino} field="hora_termino" placeholder="HH:MM" /> : (o.hora_termino || '__:__')}</TD>
            <TD>{isEditing ? <EditInput value={o.tiempo_estimado} field="tiempo_estimado" placeholder="Hrs" /> : (o.tiempo_estimado || '___')}</TD>
            <TD>{isEditing ? <EditInput value={o.tiempo_real} field="tiempo_real" placeholder="Hrs" /> : (o.tiempo_real || '___')}</TD>
            <TD>{isEditing ? <EditInput value={o.tecnico_nombre} field="tecnico_nombre" /> : (o.tecnico_nombre || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* MATERIAL Y/O REFACCIONES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Material y/o Refacciones Utilizadas" t={t} />
          <tr>
            <TH w="55%">Descripción</TH>
            <TH w="15%">Cantidad</TH>
            <TH w="30%">Acciones</TH>
          </tr>
          {((o.materiales && o.materiales.length) ? o.materiales : [{ descripcion: '', cantidad: 1 }]).map((r, i) => (
            <tr key={i}>
              <TD>
                {isEditing ? (
                  <input
                    type="text"
                    value={r.descripcion || ''}
                    onChange={(e) => handleMaterialChange(i, 'descripcion', e.target.value)}
                    style={{ border: 'none', borderBottom: '1px dotted #ccc', background: 'transparent', width: '100%', outline: 'none' }}
                  />
                ) : (
                  r.descripcion || ' '
                )}
              </TD>
              <TD>
                {isEditing ? (
                  <input
                    type="number"
                    value={r.cantidad || 1}
                    onChange={(e) => handleMaterialChange(i, 'cantidad', parseInt(e.target.value) || 1)}
                    style={{ border: 'none', borderBottom: '1px dotted #ccc', background: 'transparent', width: '50px', outline: 'none' }}
                  />
                ) : (
                  r.cantidad || ' '
                )}
              </TD>
              <TD>
                {isEditing ? (
                  <button
                    onClick={() => removeMaterialRow(i)}
                    className="px-2 py-0.5 bg-red-600/20 text-red-300 text-xs rounded border border-red-500/30 hover:bg-red-600/40"
                  >
                    Quitar
                  </button>
                ) : (
                  r.no_parte || ' '
                )}
              </TD>
            </tr>
          ))}
          {isEditing && (
            <tr>
              <TD colSpan={3} style={{ textAlign: 'left', padding: 6 }}>
                <button
                  onClick={addMaterialRow}
                  className="px-3 py-1 bg-emerald-600/20 text-emerald-300 text-xs rounded border border-emerald-500/30 hover:bg-emerald-600/40"
                >
                  + Agregar Fila
                </button>
              </TD>
            </tr>
          )}
        </tbody>
      </table>

      {/* OBSERVACIONES Y ESTADO FINAL */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Observaciones y Estado Final" t={t} />
          <tr>
            <TD style={{ width: '60%', minHeight: 56, height: 56 }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 4 }}>Observaciones</span>
              {isEditing ? <EditTextarea value={o.observaciones} field="observaciones" /> : (o.observaciones || ' ')}
            </TD>
            <TD style={{ width: '40%', verticalAlign: 'top' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Estado Final del Equipo</span>
              <div style={{ lineHeight: 2 }}>
                {isEditing ? (
                  <>
                    <EditCB checked={estadoFinal === 'operativo'} label="Operativo" onClick={() => onChange('estado_final', 'operativo')} /><br />
                    <EditCB checked={estadoFinal === 'en_observacion'} label="En observación" onClick={() => onChange('estado_final', 'en_observacion')} /><br />
                    <EditCB checked={estadoFinal === 'baja'} label="Baja" onClick={() => onChange('estado_final', 'baja')} />
                  </>
                ) : (
                  <>
                    <CB checked={estadoFinal === 'operativo'}      label="Operativo"       t={t} /><br />
                    <CB checked={estadoFinal === 'en_observacion'} label="En observación"  t={t} /><br />
                    <CB checked={estadoFinal === 'baja'}           label="Baja"            t={t} />
                  </>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: t.label.color }}>
                Revisar nuevamente: <span style={t.value}>{isEditing ? <EditInput value={o.fecha_revision} field="fecha_revision" placeholder="YYYY-MM-DD" style={{ width: '100px', display: 'inline-block' }} /> : (o.fecha_revision ? fmtFecha(o.fecha_revision) : '  __/__/____  ')}</span>
              </div>
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
        Recibe de conformidad: nombre, firma y fecha del usuario del servicio. · NOM-016-SSA3-2012
      </div>
    </div>
  );
}
