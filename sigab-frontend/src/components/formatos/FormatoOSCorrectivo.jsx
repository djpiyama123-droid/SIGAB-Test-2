/**
 * Formato 02 — Orden de Servicio Correctivo
 * No. Orden: OS-C-XXXX · NOM-016-SSA3-2012
 * Layout fiel al documento .docx oficial IMSS
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader, FormatoEvidenciaFotografica } from './formatoHelpers';
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

export default function FormatoOSCorrectivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-C-${String(o.id || '0000').padStart(4, '0')}`;
  const estadoFinal = o.estado_final || '';
  const tipoLabel = 'Mantenimiento Correctivo';

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

  const handleMaterialChange = (idx, field, val) => {
    const list = [...(o.materiales || [])];
    if (!list[idx]) list[idx] = { descripcion: '', cantidad: 1, no_parte: '' };
    list[idx] = { ...list[idx], [field]: val };
    onChange && onChange('materiales', list);
  };

  const addMaterialRow = () => {
    const list = [...(o.materiales || [])];
    list.push({ descripcion: '', cantidad: 1, no_parte: '' });
    onChange && onChange('materiales', list);
  };

  const removeMaterialRow = (idx) => {
    const list = [...(o.materiales || [])];
    list.splice(idx, 1);
    onChange && onChange('materiales', list);
  };

  const materiales = (o.materiales && o.materiales.length > 0)
    ? o.materiales
    : [{ descripcion: '', cantidad: '', no_parte: '' }, { descripcion: '', cantidad: '', no_parte: '' }, { descripcion: '', cantidad: '', no_parte: '' }];

  return (
    <>
      <style>{`@media print { body { margin: 0; } #formato-print-root { width: 210mm; font-size: 11pt; } }`}</style>
      <div id="formato-print-root" style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* ── CABECERA INSTITUCIONAL IMSS ───────────────────────────────── */}
        <FormatoHeader
          t={t}
          tipoLabel="ORDEN DE SERVICIO BIOMÉDICA"
          folio={folio}
          fecha={o.fecha_creacion || o.fecha}
          refReporte={o.reporte_falla_ref}
        />

        {/* Subtítulo de tipo — estilo .xls */}
        <div style={{
          textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: t.check,
          letterSpacing: '0.06em', padding: '4px 0 8px 0', textTransform: 'uppercase',
          borderBottom: `1px solid ${t.check}`, marginBottom: 8,
        }}>
          {tipoLabel} · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485
        </div>

        <div style={{ height: 10 }} />

        {/* ── 1. DATOS DEL EQUIPO ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="1. Datos del Equipo" />
            {/* Encabezados fila 1 */}
            <tr>
              <TH w="24%">Equipo</TH>
              <TH w="18%">Marca</TH>
              <TH w="18%">Modelo</TH>
              <TH w="18%">No. Inventario</TH>
              <TH w="22%">QR del Equipo</TH>
            </tr>
            {/* Datos fila 1 */}
            <tr>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_nombre} field="equipo_nombre" placeholder="Nombre equipo" /> : (o.equipo_nombre || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_marca} field="equipo_marca" placeholder="Marca" /> : (o.equipo_marca || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_modelo} field="equipo_modelo" placeholder="Modelo" /> : (o.equipo_modelo || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_inventario || o.no_inventario} field="equipo_inventario" placeholder="No. Inv." /> : (o.equipo_inventario || o.no_inventario || '—')}</div></TD>
              <TD rowSpan={3} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                <QR_SVG />
              </TD>
            </tr>
            {/* Datos fila 2 */}
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
            {/* Datos fila 3 — Localización completa (v.3.2.0, columna propia) */}
            <tr>
              <TH colSpan={2}>Localización completa del equipo o instalación</TH>
              <TD colSpan={2}>
                <div style={{ minHeight: 20 }}>
                  {isEditing
                    ? <EI value={o.localizacion_completa || o.ubicacion_fisica || o.localizacion} field="localizacion_completa" placeholder="Descripción completa de ubicación" />
                    : (o.localizacion_completa || o.ubicacion_fisica || o.localizacion || (o.area ? `${o.area}${o.piso ? `, Piso ${o.piso}` : ''}` : '—'))
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 2. DIAGNÓSTICO DE LA FALLA ───────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="2. Diagnóstico de la Falla" />
            <tr>
              <TD style={{ minHeight: 72, height: 72 }}>
                {isEditing
                  ? <ET value={o.falla_reportada || o.diagnostico_falla} field="falla_reportada" placeholder="Diagnóstico técnico de la falla..." minH={64} />
                  : <div style={{ minHeight: 64, whiteSpace: 'pre-wrap' }}>{o.falla_reportada || o.diagnostico_falla || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 3. DESCRIPCIÓN DEL TRABAJO REALIZADO ────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="3. Descripción del Trabajo Realizado" />
            <tr>
              <TD style={{ minHeight: 80, height: 80 }}>
                {isEditing
                  ? <ET value={o.descripcion_servicio || o.descripcion_trabajo} field="descripcion_servicio" placeholder="Describa las acciones correctivas realizadas..." minH={72} />
                  : <div style={{ minHeight: 72, whiteSpace: 'pre-wrap' }}>{o.descripcion_servicio || o.descripcion_trabajo || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 4. TIEMPOS Y RESPONSABLE ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="4. Tiempos y Responsable" />
            <tr>
              <TH w="18%">Hora Inicio</TH>
              <TH w="18%">Hora Término</TH>
              <TH w="18%">Tiempo Estimado</TH>
              <TH w="18%">Tiempo Real</TH>
              <TH w="28%">Técnico Asignado</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.hora_inicio} field="hora_inicio" placeholder="HH:MM" /> : (o.hora_inicio || '__:__')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.hora_termino || o.hora_fin} field="hora_termino" placeholder="HH:MM" /> : (o.hora_termino || o.hora_fin || '__:__')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.tiempo_estimado_hrs ?? o.tiempo_estimado} field="tiempo_estimado_hrs" placeholder="Hrs" /> : ((o.tiempo_estimado_hrs ?? o.tiempo_estimado) ? `${o.tiempo_estimado_hrs ?? o.tiempo_estimado} h` : '___')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.tiempo_real_hrs ?? o.tiempo_real} field="tiempo_real_hrs" placeholder="Hrs" /> : ((o.tiempo_real_hrs ?? o.tiempo_real) ? `${o.tiempo_real_hrs ?? o.tiempo_real} h` : '___')}</div></TD>
              <TD><div style={{ minHeight: 22 }}>{isEditing ? <EI value={o.tecnico_nombre} field="tecnico_nombre" placeholder="Nombre técnico" /> : (o.tecnico_nombre || '—')}</div></TD>
            </tr>
          </tbody>
        </table>

        {/* ── 5. MATERIAL Y/O REFACCIONES UTILIZADAS ──────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="5. Material y/o Refacciones Utilizadas" />
            <tr>
              <TH w="55%">Descripción del material / refacción</TH>
              <TH w="15%">Cantidad</TH>
              <TH w="30%">No. de Parte / Código</TH>
            </tr>
            {materiales.map((r, i) => (
              <tr key={i}>
                <TD>
                  {isEditing
                    ? <input type="text" value={r.descripcion || ''} onChange={(e) => handleMaterialChange(i, 'descripcion', e.target.value)}
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none', padding: '2px 4px' }} />
                    : (r.descripcion || ' ')
                  }
                </TD>
                <TD>
                  {isEditing
                    ? <input type="text" value={r.cantidad || ''} onChange={(e) => handleMaterialChange(i, 'cantidad', e.target.value)}
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none', padding: '2px 4px' }} />
                    : (r.cantidad || ' ')
                  }
                </TD>
                <TD>
                  {isEditing
                    ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="text" value={r.no_parte || ''} onChange={(e) => handleMaterialChange(i, 'no_parte', e.target.value)}
                          style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', flex: 1, outline: 'none', padding: '2px 4px' }} />
                        <button onClick={() => removeMaterialRow(i)}
                          style={{ cursor: 'pointer', fontSize: 10, color: '#ef4444', background: 'transparent', border: 'none', padding: '0 4px', lineHeight: 1 }}>✕</button>
                      </div>
                    )
                    : (r.no_parte || ' ')
                  }
                </TD>
              </tr>
            ))}
            {isEditing && (
              <tr>
                <TD colSpan={3} style={{ textAlign: 'left', padding: 6 }}>
                  <button onClick={addMaterialRow}
                    style={{ cursor: 'pointer', fontSize: 11, color: t.check, background: 'transparent', border: `1px dashed ${t.check}`, borderRadius: 4, padding: '3px 12px' }}>
                    + Agregar fila
                  </button>
                </TD>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── 6. OBSERVACIONES Y ESTADO FINAL ─────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="6. Observaciones y Estado Final del Equipo" />
            <tr>
              <TD style={{ width: '58%', minHeight: 70, verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Observaciones</div>
                {isEditing
                  ? <ET value={o.observaciones} field="observaciones" placeholder="Observaciones adicionales, pendientes, condiciones especiales..." minH={56} />
                  : <div style={{ minHeight: 56, whiteSpace: 'pre-wrap' }}>{o.observaciones || '—'}</div>
                }
              </TD>
              <TD style={{ width: '42%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 6 }}>Estado final del equipo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ECB checked={estadoFinal === 'operativo'}       label="Operativo"         field="estado_final" val="operativo" />
                  <ECB checked={estadoFinal === 'en_observacion'}  label="En observación"    field="estado_final" val="en_observacion" />
                  <ECB checked={estadoFinal === 'fuera_servicio'}  label="Fuera de servicio" field="estado_final" val="fuera_servicio" />
                  <ECB checked={estadoFinal === 'en_taller'}       label="En taller"         field="estado_final" val="en_taller" />
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: t.label.color }}>
                  Próxima revisión:{' '}
                  {isEditing
                    ? <input type="text" value={o.fecha_revision || ''} onChange={(e) => onChange && onChange('fecha_revision', e.target.value)} placeholder="DD/MM/AAAA"
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: 100, outline: 'none' }} />
                    : <span style={{ color: t.cell.color }}>{o.fecha_revision ? fmtFecha(o.fecha_revision) : '__/__/____'}</span>
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 7. EVIDENCIA FOTOGRÁFICA DEL PROCESO (solo si la orden trae fotos) ── */}
        <FormatoEvidenciaFotografica fotos={o.fotos} t={t} titulo="7. Evidencia Fotográfica del Proceso" />

        {/* ── 8. RECIBE DE CONFORMIDAD (estilo .xls) ────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, marginBottom: 8, border: `2px solid ${t.check}` }}>
          <tbody>
            <SH title="8. Recibe de Conformidad del Servicio" cols={2} />
            <tr>
              <TD style={{ width: '60%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Nombre (quien recibe)</div>
                <div style={{ minHeight: 30, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {isEditing
                    ? <EI value={o.recibe_conformidad_nombre} field="recibe_conformidad_nombre" placeholder="Nombre completo + matrícula" />
                    : (o.recibe_conformidad_nombre || '—')
                  }
                </div>
                <div style={{ ...t.label, marginTop: 8, marginBottom: 4 }}>Firma</div>
                <div style={{ minHeight: 50 }}></div>
              </TD>
              <TD style={{ width: '40%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Fecha de cierre</div>
                <div style={{ minHeight: 22, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {isEditing
                    ? <EI value={o.fecha_cierre} field="fecha_cierre" placeholder="DD/MM/AAAA" />
                    : (o.fecha_cierre ? fmtFecha(o.fecha_cierre) : '__/__/____')
                  }
                </div>
                <div style={{ ...t.label, marginTop: 14, marginBottom: 4 }}>Matrícula</div>
                <div style={{ minHeight: 22, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {isEditing
                    ? <EI value={o.recibe_matricula} field="recibe_matricula" placeholder="Matrícula" />
                    : (o.recibe_matricula || '—')
                  }
                </div>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── FIRMAS (3 columnas) ────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <tbody>
            <tr>
              {[
                { rol: 'Realizó (Ing. Biomédico)', nombre: o.tecnico_nombre },
                { rol: 'Visto Bueno (Jefe Conservación)', nombre: null },
                { rol: 'Sello del Departamento', nombre: null },
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

        <div style={{ marginTop: 8, fontSize: 9, color: t.label.color, textAlign: 'right' }}>
          Formato F-CON-02 · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485 · v.3.3.0
        </div>
      </div>
    </>
  );
}
