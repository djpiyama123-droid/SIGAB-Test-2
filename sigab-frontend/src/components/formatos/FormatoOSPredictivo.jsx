/**
 * Formato 04 — Orden de Servicio Predictivo (Asistido por IA SIGAH)
 * Folio: OS-PR-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoOSPredictivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-PR-${String(o.id || '0000').padStart(4, '0')}`;
  const validacion = o.validacion_ia || '';

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

  const MetricCard = ({ label, value, unit, field }) => (
    <td style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', width: '25%' }}>
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: t.header.background || t.check,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px dashed #ccc',
              width: '70px',
              textAlign: 'center',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 'bold', color: t.header.background || t.check }}>{unit}</span>
        </div>
      ) : (
        <div style={{ fontSize: 22, fontWeight: 'bold', color: t.header.background || t.check }}>
          {value ?? '—'}{unit}
        </div>
      )}
      <div style={{ ...t.label, marginTop: 2, fontSize: 9 }}>{label}</div>
    </td>
  );

  return (
    <div style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Chip IA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <span style={t.iaChip}>⚡ ASISTIDO POR IA SIGAH</span>
      </div>

      <FormatoHeader
        t={t}
        tipoLabel="ORDEN DE SERVICIO — PREDICTIVO"
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
            <TD rowSpan={3} style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
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
          <tr>
            <TH colSpan={2}>Horas de Uso Acumuladas</TH>
            <TD colSpan={1}>{isEditing ? <EditInput value={o.horas_uso_acumuladas} field="horas_uso_acumuladas" /> : (o.horas_uso_acumuladas ? `${o.horas_uso_acumuladas} h` : ' ')}</TD>
            <TH>Antigüedad del Equipo</TH>
            <TD colSpan={1}>{isEditing ? <EditInput value={o.antiguedad_equipo} field="antiguedad_equipo" /> : (o.antiguedad_equipo || ' ')}</TD>
          </tr>
        </tbody>
      </table>

      {/* ANÁLISIS PREDICTIVO SIGAH (4 métricas IA) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Análisis Predictivo SIGAH" t={t} />
          <tr>
            <MetricCard label="Índice de Salud (/ 100)" value={o.indice_salud}          unit="" field="indice_salud" />
            <MetricCard label="Probabilidad de Falla"   value={o.probabilidad_falla}    unit="%" field="probabilidad_falla" />
            <MetricCard label="Ventana Recomendada"     value={o.ventana_recomendada}   unit=" días" field="ventana_recomendada" />
            <MetricCard label="Confianza del Modelo"    value={o.confianza_modelo}      unit="%" field="confianza_modelo" />
          </tr>
        </tbody>
      </table>

      {/* RECOMENDACIÓN GENERADA POR IA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Recomendación Generada por IA" t={t} />
          <tr>
            <TH w="40%">Componente / Subsistema en Riesgo</TH>
            <TH w="60%">Indicadores Monitoreados (MTBF, Alertas, Uso)</TH>
          </tr>
          <tr>
            <TD style={{ minHeight: 50, height: 50, verticalAlign: 'top' }}>
              {isEditing ? <EditTextarea value={o.componente_riesgo} field="componente_riesgo" /> : (o.componente_riesgo || ' ')}
            </TD>
            <TD style={{ minHeight: 50, height: 50, verticalAlign: 'top' }}>
              {isEditing ? <EditTextarea value={o.indicadores_monitoreados} field="indicadores_monitoreados" /> : (o.indicadores_monitoreados || ' ')}
            </TD>
          </tr>
        </tbody>
      </table>

      {/* ACCIÓN PREVENTIVA EJECUTADA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Acción Preventiva Ejecutada" t={t} />
          <tr>
            <TD style={{ minHeight: 60, height: 60 }}>
              {isEditing ? <EditTextarea value={o.descripcion_servicio || o.accion_preventiva} field="descripcion_servicio" /> : (o.descripcion_servicio || o.accion_preventiva || ' ')}
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

      {/* VALIDACIÓN DEL INGENIERO BIOMÉDICO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Validación del Ingeniero Biomédico" t={t} />
          <tr>
            <TD>
              <div style={{ marginBottom: 6 }}>
                {isEditing ? (
                  <>
                    <EditCB checked={validacion === 'acepta'} label="Acepta la recomendación" onClick={() => onChange('validacion_ia', 'acepta')} />
                    <EditCB checked={validacion === 'ajusta'} label="Ajusta" onClick={() => onChange('validacion_ia', 'ajusta')} />
                    <EditCB checked={validacion === 'descarta'} label="Descarta" onClick={() => onChange('validacion_ia', 'descarta')} />
                  </>
                ) : (
                  <>
                    <CB checked={validacion === 'acepta'}   label="Acepta la recomendación" t={t} />
                    <CB checked={validacion === 'ajusta'}   label="Ajusta"                  t={t} />
                    <CB checked={validacion === 'descarta'} label="Descarta"                t={t} />
                  </>
                )}
              </div>
              <div style={{ fontSize: 10, color: t.label.color, marginBottom: 4 }}>
                Justificación (obligatoria si ajusta o descarta):
              </div>
              <div style={{ ...t.value, minHeight: 28, borderBottom: `1px solid ${t.table.borderColor}` }}>
                {isEditing ? <EditInput value={o.justificacion_validacion} field="justificacion_validacion" /> : (o.justificacion_validacion || ' ')}
              </div>
            </TD>
          </tr>
        </tbody>
      </table>

      {/* FIRMAS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <tbody>
          <tr>
            {['Técnico Asignado', 'Ingeniero Biomédico', 'Jefe de Conservación'].map((rol) => (
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
        La IA de SIGAH sugiere; la decisión y la responsabilidad clínica son del ingeniero biomédico. · NOM-016-SSA3-2012
      </div>
    </div>
  );
}
