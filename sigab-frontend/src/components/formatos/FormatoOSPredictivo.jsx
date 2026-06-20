/**
 * Formato 04 — Orden de Servicio Predictivo (Asistido por IA SIGAH)
 * No. Orden: OS-PR-XXXX · NOM-016-SSA3-2012
 * Layout fiel al documento .docx oficial IMSS + cabecera especial IA
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
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

export default function FormatoOSPredictivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-PR-${String(o.id || '0000').padStart(4, '0')}`;
  const validacion = o.validacion_ia || '';

  // Helpers de estilo condicional por tema
  const isNeon = tema === 'neon-sigah';
  const chipStyle = t.iaChip || {
    background: isNeon ? '#064e3b' : '#e0edff',
    color: isNeon ? '#10B981' : '#003b7a',
    border: `1px solid ${isNeon ? '#10B981' : '#006CB7'}`,
    borderRadius: 4, padding: '3px 12px',
    fontSize: 11, fontWeight: 'bold', letterSpacing: '0.04em'
  };

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

  const ET = ({ value, field, placeholder = '', minH = 64, readOnly = false }) => (
    <textarea
      value={value || ''}
      onChange={(e) => !readOnly && onChange && onChange(field, e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={3}
      style={{
        border: 'none', borderBottom: `1px dashed ${t.check}`,
        background: 'transparent', color: 'inherit',
        fontSize: 'inherit', width: '100%', minHeight: minH,
        resize: 'none', padding: '4px', outline: 'none', boxSizing: 'border-box',
        cursor: readOnly ? 'default' : 'auto',
        opacity: readOnly ? 0.85 : 1
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

  const TD = ({ children, style: s = {}, colSpan = 1 }) => (
    <td colSpan={colSpan} style={{ ...t.cell, ...s }}>{children}</td>
  );
  const TH = ({ children, colSpan = 1, w }) => (
    <td colSpan={colSpan} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: w }}>
      {children}
    </td>
  );
  const SH = ({ title, cols = 10 }) => (
    <tr><td colSpan={cols} style={t.sectionTitle}>{title}</td></tr>
  );

  // Métrica IA card
  const MetricCard = ({ label, value, unit, field, colorOverride }) => {
    const color = colorOverride || t.check;
    return (
      <td style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', width: '25%', padding: '10px 6px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange && onChange(field, parseFloat(e.target.value) || 0)}
              style={{
                fontSize: 20, fontWeight: 'bold', color,
                background: 'transparent', border: 'none',
                borderBottom: `1px dashed ${t.check}`, width: 64,
                textAlign: 'center', outline: 'none'
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 'bold', color }}>{unit}</span>
          </div>
        ) : (
          <div style={{ fontSize: 24, fontWeight: 'bold', color, lineHeight: 1 }}>
            {value != null ? `${value}${unit}` : '—'}
          </div>
        )}
        <div style={{ ...t.label, marginTop: 4, fontSize: 9, lineHeight: 1.3 }}>{label}</div>
      </td>
    );
  };

  // Color semáforo para índice de salud
  const saludColor = (v) => {
    if (v == null) return t.check;
    if (v >= 70) return '#10B981';
    if (v >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <>
      <style>{`@media print { body { margin: 0; } #formato-print-root { width: 210mm; font-size: 11pt; } }`}</style>
      <div id="formato-print-root" style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* ── CHIP IA SIGAH ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <span style={chipStyle}>&#9889; ASISTIDO POR IA SIGAH</span>
        </div>

        {/* ── CABECERA ─────────────────────────────────────────────────────── */}
        <FormatoHeader
          t={t}
          tipoLabel="ORDEN DE SERVICIO — PREDICTIVO"
          folio={folio}
          fecha={o.fecha_creacion || o.fecha}
        />

        <div style={{ height: 10 }} />

        {/* ── 1. DATOS DEL EQUIPO ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="1. Datos del Equipo" />
            <tr>
              <TH w="23%">Equipo</TH>
              <TH w="17%">Marca</TH>
              <TH w="17%">Modelo</TH>
              <TH w="17%">No. Inventario</TH>
              <TH w="26%">QR del Equipo</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_nombre} field="equipo_nombre" placeholder="Nombre equipo" /> : (o.equipo_nombre || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_marca} field="equipo_marca" placeholder="Marca" /> : (o.equipo_marca || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_modelo} field="equipo_modelo" placeholder="Modelo" /> : (o.equipo_modelo || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_inventario || o.no_inventario} field="equipo_inventario" placeholder="No. Inv." /> : (o.equipo_inventario || o.no_inventario || '—')}</div></TD>
              <TD rowSpan={3} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                <QR_SVG />
              </TD>
            </tr>
            <tr>
              <TH>No. de Serie</TH>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_serie} field="equipo_serie" placeholder="No. Serie" /> : (o.equipo_serie || '—')}</div></TD>
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
            {/* Fila 3: Horas de uso + Antigüedad */}
            <tr>
              <TH w="23%">Horas de uso acum.</TH>
              <TD>
                <div style={{ minHeight: 20 }}>
                  {isEditing
                    ? <EI value={o.horas_uso_acumuladas} field="horas_uso_acumuladas" placeholder="Horas" />
                    : (o.horas_uso_acumuladas != null ? `${o.horas_uso_acumuladas} h` : '—')
                  }
                </div>
              </TD>
              <TH>Antigüedad del equipo</TH>
              <TD>
                <div style={{ minHeight: 20 }}>
                  {isEditing
                    ? <EI value={o.antiguedad_equipo} field="antiguedad_equipo" placeholder="Ej: 3 años" />
                    : (o.antiguedad_equipo || '—')
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 2. ANÁLISIS PREDICTIVO SIGAH (4 métricas IA) ────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="2. Análisis Predictivo SIGAH" />
            <tr>
              <MetricCard
                label="Índice de Salud (/ 100)"
                value={o.indice_salud}
                unit=""
                field="indice_salud"
                colorOverride={saludColor(o.indice_salud)}
              />
              <MetricCard
                label="Probabilidad de Falla"
                value={o.probabilidad_falla}
                unit="%"
                field="probabilidad_falla"
                colorOverride={o.probabilidad_falla >= 60 ? '#EF4444' : o.probabilidad_falla >= 30 ? '#F59E0B' : '#10B981'}
              />
              <MetricCard
                label="Ventana de Falla (días)"
                value={o.ventana_falla_dias}
                unit=" días"
                field="ventana_falla_dias"
              />
              <MetricCard
                label="Confianza del Modelo"
                value={o.confianza_modelo}
                unit="%"
                field="confianza_modelo"
              />
            </tr>
          </tbody>
        </table>

        {/* ── 3. COMPONENTE / SUBSISTEMA EN RIESGO ────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="3. Componente / Subsistema en Riesgo" />
            <tr>
              <TH w="42%">Componente / Subsistema identificado</TH>
              <TH w="58%">Indicadores monitoreados (MTBF, alertas, uso, etc.)</TH>
            </tr>
            <tr>
              <TD style={{ minHeight: 50, verticalAlign: 'top' }}>
                {isEditing
                  ? <ET value={o.componente_riesgo} field="componente_riesgo" placeholder="Ej: Batería interna, Bomba peristáltica..." minH={44} />
                  : <div style={{ minHeight: 44, whiteSpace: 'pre-wrap' }}>{o.componente_riesgo || '—'}</div>
                }
              </TD>
              <TD style={{ minHeight: 50, verticalAlign: 'top' }}>
                {isEditing
                  ? <ET value={o.indicadores_monitoreados} field="indicadores_monitoreados" placeholder="Ej: MTBF 450 h, 3 alertas activas, ciclos > umbral..." minH={44} />
                  : <div style={{ minHeight: 44, whiteSpace: 'pre-wrap' }}>{o.indicadores_monitoreados || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 4. RECOMENDACIÓN GENERADA POR IA ────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="4. Recomendación Generada por IA" />
            <tr>
              <TD style={{ minHeight: 72 }}>
                {/* Siempre read-only — generada por la IA */}
                <ET
                  value={o.recomendacion_ia || o.descripcion_servicio}
                  field="recomendacion_ia"
                  placeholder="(Texto generado automáticamente por el modelo predictivo de SIGAH)"
                  minH={64}
                  readOnly={!isEditing}
                />
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 5. ACCIÓN PREVENTIVA EJECUTADA ──────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="5. Acción Preventiva Ejecutada" />
            <tr>
              <TD style={{ minHeight: 72 }}>
                {isEditing
                  ? <ET value={o.accion_preventiva || o.descripcion_trabajo} field="accion_preventiva" placeholder="Describa las acciones preventivas ejecutadas por el técnico..." minH={64} />
                  : <div style={{ minHeight: 64, whiteSpace: 'pre-wrap' }}>{o.accion_preventiva || o.descripcion_trabajo || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 6. TIEMPOS Y RESPONSABLE ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="6. Tiempos y Responsable" />
            <tr>
              <TH w="22%">Hora Inicio</TH>
              <TH w="22%">Hora Término</TH>
              <TH w="22%">Tiempo Real</TH>
              <TH w="34%">Técnico Asignado</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.hora_inicio} field="hora_inicio" placeholder="HH:MM" /> : (o.hora_inicio || '__:__')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.hora_termino || o.hora_fin} field="hora_termino" placeholder="HH:MM" /> : (o.hora_termino || o.hora_fin || '__:__')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.tiempo_real} field="tiempo_real" placeholder="Hrs" /> : (o.tiempo_real ? `${o.tiempo_real} h` : '___')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.tecnico_nombre} field="tecnico_nombre" placeholder="Nombre técnico" /> : (o.tecnico_nombre || '—')}</div></TD>
            </tr>
          </tbody>
        </table>

        {/* ── 7. VALIDACIÓN DEL INGENIERO BIOMÉDICO ───────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="7. Validación del Ingeniero Biomédico" />
            <tr>
              <TD style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 6 }}>Decisión sobre la recomendación IA</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <ECB checked={validacion === 'acepta'}   label="Acepta la recomendación" field="validacion_ia" val="acepta" />
                  <ECB checked={validacion === 'ajusta'}   label="Ajusta"                  field="validacion_ia" val="ajusta" />
                  <ECB checked={validacion === 'descarta'} label="Descarta"                field="validacion_ia" val="descarta" />
                </div>
              </TD>
              <TD style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Justificación (obligatoria si ajusta o descarta)</div>
                {isEditing
                  ? <ET value={o.justificacion_validacion} field="justificacion_validacion" placeholder="Argumento clínico / técnico del ingeniero..." minH={52} />
                  : <div style={{ minHeight: 52, whiteSpace: 'pre-wrap', borderBottom: `1px solid ${t.table.borderColor}` }}>{o.justificacion_validacion || ' '}</div>
                }
                <div style={{ marginTop: 10, fontSize: 10, color: t.label.color }}>
                  Matrícula IMSS:{' '}
                  {isEditing
                    ? <input type="text" value={o.matricula_ingeniero || ''} onChange={(e) => onChange && onChange('matricula_ingeniero', e.target.value)} placeholder="Matrícula"
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: 120, outline: 'none' }} />
                    : <span style={{ color: t.cell.color }}>{o.matricula_ingeniero || '____________________'}</span>
                  }
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: t.label.color }}>
                  Fecha de validación:{' '}
                  {isEditing
                    ? <input type="text" value={o.fecha_validacion || ''} onChange={(e) => onChange && onChange('fecha_validacion', e.target.value)} placeholder="DD/MM/AAAA"
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: 100, outline: 'none' }} />
                    : <span style={{ color: t.cell.color }}>{o.fecha_validacion ? fmtFecha(o.fecha_validacion) : '__/__/____'}</span>
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <tbody>
            <tr>
              {[
                { rol: 'Técnico Asignado', nombre: o.tecnico_nombre },
                { rol: 'Ingeniero Biomédico', nombre: o.ingeniero_nombre },
                { rol: 'Jefe de Conservación', nombre: null },
              ].map(({ rol, nombre }) => (
                <td key={rol} style={{ ...t.firmaCell, width: '33.33%', textAlign: 'center' }}>
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

        {/* ── AVISO LEGAL IA ───────────────────────────────────────────────── */}
        <div style={{
          marginTop: 12,
          padding: '6px 10px',
          background: isNeon ? '#0c1a12' : '#fffbeb',
          border: `1px solid ${isNeon ? '#10B981' : '#F59E0B'}`,
          borderRadius: 4,
          fontSize: 9,
          color: isNeon ? '#6ee7b7' : '#92400e'
        }}>
          &#9888; La IA de SIGAH sugiere acciones preventivas basadas en datos históricos; la decisión y la responsabilidad clínica son exclusivas del ingeniero biomédico certificado.
          &nbsp;· Formato F-CON-04 · NOM-016-SSA3-2012
        </div>
      </div>
    </>
  );
}
