/**
 * Formato 03 — Orden de Servicio Preventivo
 * No. Orden: OS-P-XXXX · NOM-016-SSA3-2012
 * Layout fiel al documento .docx oficial IMSS
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';
import { getMediaUrl } from '../../api/sigah';

const QR_SVG = () => (
  <div style={{ display: 'inline-block', padding: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 2 }}>
    <svg width="52" height="52" viewBox="0 0 29 29" style={{ display: 'block', shapeRendering: 'crispEdges' }}>
      <rect width="29" height="29" fill="#fff"/>
      <path fill="#000" d="M0 0h7v7H0zm1 1h5v5H1zm1 1h3v3H2zM7 0h1v1H7zm1 1h1v1H8zM7 2h1v1H7zm1 1h1v1H8zM0 7h1v1H0zm1 1h1v1H1zM2 7h1v1H2zm3 1h1v1H5zm3 0h1v1H8zm1-1h1v1H9zm1 1h1v1H10zm1-1h1v1H11zM13 0h7v7h-7zm1 1h5v5h-5zm1 1h3v3h-3zM9 4h1v1H9zm1 1h1v1H10zm2-1h1v1H12zm1 1h1v1H13zm2 0h1v1H15zm2-1h1v1H17zm1 1h1v1H18zm2 0h1v1H20zm1-1h1v1H21zm1 1h1v1H22zM0 13h7v7H0zm1 1h5v5H1zm1 1h3v3H2zm10-5h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm1 1h1v1H16zm3 0h1v1H19zm1-1h1v1H20zm2 0h1v1H22zm-9 2h1v1H13zm1 1h1v1H14zm1-1h1v1H15zm2 1h1v1H17zm3-1h1v1H20zm2 1h1v1H22zm-10 3h1v1H12zm2 1h1v1H14zm1-1h1v1H15zm2 0h1v1H17zm1-1h1v1H18zm3 0h1v1H21zm1 1h1v1H22z"/>
    </svg>
    <div style={{ fontSize: 8, textAlign: 'center', color: '#555', marginTop: 2 }}>Scan QR</div>
  </div>
);

// Rutina oficial según .docx — 10 ítems en 2 columnas
const RUTINA_ITEMS = [
  { id: 'limpieza_general',        label: 'Limpieza general del equipo' },
  { id: 'inspeccion_visual',       label: 'Inspección visual y funcional' },
  { id: 'calibracion',             label: 'Calibración / verificación' },
  { id: 'lubricacion',             label: 'Lubricación / engrase' },
  { id: 'ajuste_apriete',          label: 'Ajuste / apriete' },
  { id: 'prueba_seguridad',        label: 'Prueba de seguridad eléctrica' },
  { id: 'verificacion_alarmas',    label: 'Verificación de alarmas' },
  { id: 'sustitucion_filtros',     label: 'Sustitución de filtros / consumibles' },
  { id: 'prueba_funcionamiento',   label: 'Prueba de funcionamiento' },
  { id: 'actualizacion_firmware',  label: 'Actualización de firmware' },
];

export default function FormatoOSPreventivo({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-P-${String(o.id || '0000').padStart(4, '0')}`;
  const rutina = Array.isArray(o.rutina_realizada) ? o.rutina_realizada : [];
  const resultado = o.resultado_preventivo || o.condicion_cierre || '';

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

  const RutinaCheck = ({ item }) => {
    const checked = rutina.includes(item.id);
    return (
      <div
        onClick={() => {
          if (!isEditing) return;
          const list = [...rutina];
          const idx = list.indexOf(item.id);
          if (idx === -1) list.push(item.id);
          else list.splice(idx, 1);
          onChange && onChange('rutina_realizada', list);
        }}
        style={{
          cursor: isEditing ? 'pointer' : 'default',
          color: checked ? t.check : t.cell.color,
          fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 6, userSelect: 'none'
        }}
      >
        <span style={{ fontSize: 15 }}>{checked ? '☑' : '☐'}</span>
        <span>{item.label}</span>
      </div>
    );
  };

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
    if (!list[idx]) list[idx] = { descripcion: '', cantidad: '', no_parte: '' };
    list[idx] = { ...list[idx], [field]: val };
    onChange && onChange('materiales', list);
  };

  const materiales = (o.materiales && o.materiales.length > 0)
    ? o.materiales
    : [{ descripcion: '', cantidad: '', no_parte: '' }, { descripcion: '', cantidad: '', no_parte: '' }];

  const leftRutina  = RUTINA_ITEMS.slice(0, 5);
  const rightRutina = RUTINA_ITEMS.slice(5);

  return (
    <>
      <style>{`@media print { body { margin: 0; } #formato-print-root { width: 210mm; font-size: 11pt; } }`}</style>
      <div id="formato-print-root" style={{ ...t.wrapper, padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* ── CABECERA ─────────────────────────────────────────────────────── */}
        <FormatoHeader
          t={t}
          tipoLabel="ORDEN DE SERVICIO — PREVENTIVO"
          folio={folio}
          fecha={o.fecha_creacion || o.fecha}
        />

        <div style={{ height: 10 }} />

        {/* ── 1. DATOS DEL EQUIPO ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="1. Datos del Equipo" />
            <tr>
              <TH w="24%">Equipo</TH>
              <TH w="18%">Marca</TH>
              <TH w="18%">Modelo</TH>
              <TH w="18%">No. Inventario</TH>
              <TH w="22%">QR del Equipo</TH>
            </tr>
            <tr>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_nombre} field="equipo_nombre" placeholder="Nombre equipo" /> : (o.equipo_nombre || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_marca} field="equipo_marca" placeholder="Marca" /> : (o.equipo_marca || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_modelo} field="equipo_modelo" placeholder="Modelo" /> : (o.equipo_modelo || '—')}</div></TD>
              <TD><div style={{ minHeight: 20 }}>{isEditing ? <EI value={o.equipo_inventario || o.no_inventario} field="equipo_inventario" placeholder="No. Inv." /> : (o.equipo_inventario || o.no_inventario || '—')}</div></TD>
              <TD rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
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
          </tbody>
        </table>

        {/* ── 2. RUTINA DE MANTENIMIENTO EFECTUADA ────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="2. Rutina de Mantenimiento Efectuada" />
            <tr>
              <TD style={{ width: '50%', verticalAlign: 'top', padding: '8px 10px' }}>
                {leftRutina.map((r) => <RutinaCheck key={r.id} item={r} />)}
              </TD>
              <TD style={{ width: '50%', verticalAlign: 'top', padding: '8px 10px' }}>
                {rightRutina.map((r) => <RutinaCheck key={r.id} item={r} />)}
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 3. SERVICIO EFECTUADO Y MATERIAL UTILIZADO ──────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="3. Servicio Efectuado y Material Utilizado" />
            <tr>
              <TD style={{ width: '55%', minHeight: 64, verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Descripción del servicio efectuado</div>
                {isEditing
                  ? <ET value={o.descripcion_servicio} field="descripcion_servicio" placeholder="Describa el servicio preventivo realizado..." minH={56} />
                  : <div style={{ minHeight: 56, whiteSpace: 'pre-wrap' }}>{o.descripcion_servicio || '—'}</div>
                }
              </TD>
              <TD style={{ width: '45%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Material / consumibles</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...t.altCell, ...t.cell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: '65%' }}>Descripción</td>
                      <td style={{ ...t.altCell, ...t.cell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: '35%' }}>Cant.</td>
                    </tr>
                    {materiales.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...t.cell, fontSize: 11 }}>
                          {isEditing
                            ? <input type="text" value={r.descripcion || ''} onChange={(e) => handleMaterialChange(i, 'descripcion', e.target.value)}
                                style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none' }} />
                            : (r.descripcion || ' ')
                          }
                        </td>
                        <td style={{ ...t.cell, fontSize: 11 }}>
                          {isEditing
                            ? <input type="text" value={r.cantidad || ''} onChange={(e) => handleMaterialChange(i, 'cantidad', e.target.value)}
                                style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none' }} />
                            : (r.cantidad || ' ')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 4. TIEMPOS Y RESPONSABLE ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="4. Tiempos y Responsable" />
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

        {/* ── 5. EVIDENCIA FOTOGRÁFICA ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="5. Evidencia Fotográfica" />
            <tr>
              {[0, 1, 2, 3].map((i) => (
                <td key={i} style={{ ...t.cell, width: '25%', height: 90, textAlign: 'center', verticalAlign: 'middle', padding: 4 }}>
                  {o.fotos?.[i]
                    ? <img src={getMediaUrl(o.fotos[i])} alt={`Foto ${i + 1}`} style={{ maxWidth: '100%', maxHeight: 82, objectFit: 'contain' }} />
                    : (
                      <div style={{ border: `1px dashed ${t.table.borderColor}`, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                        <span style={{ fontSize: 22, opacity: 0.3 }}>📷</span>
                        <span style={{ color: t.label.color, fontSize: 9, marginTop: 2 }}>FOTOGRAFÍA {i + 1}</span>
                      </div>
                    )
                  }
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ── 6. RESULTADO ─────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <SH title="6. Resultado del Mantenimiento Preventivo" />
            <tr>
              <TD style={{ width: '55%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 6 }}>Estado al cierre</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <ECB checked={resultado === 'satisfactorio'}       label="Satisfactorio"                field="resultado_preventivo" val="satisfactorio" />
                  <ECB checked={resultado === 'con_observaciones'}   label="Con observaciones"            field="resultado_preventivo" val="con_observaciones" />
                  <ECB checked={resultado === 'requiere_refaccion'}  label="Requiere refacción/correctivo" field="resultado_preventivo" val="requiere_refaccion" />
                  <ECB checked={resultado === 'fuera_servicio'}      label="Fuera de servicio"             field="resultado_preventivo" val="fuera_servicio" />
                </div>
              </TD>
              <TD style={{ width: '45%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 4 }}>Observaciones del resultado</div>
                {isEditing
                  ? <ET value={o.observaciones_resultado || o.observaciones} field="observaciones_resultado" placeholder="Detalle de observaciones..." minH={52} />
                  : <div style={{ minHeight: 52, whiteSpace: 'pre-wrap' }}>{o.observaciones_resultado || o.observaciones || '—'}</div>
                }
                <div style={{ marginTop: 8, fontSize: 10, color: t.label.color }}>
                  Próximo preventivo programado:{' '}
                  {isEditing
                    ? <input type="text" value={o.proximo_preventivo || ''} onChange={(e) => onChange && onChange('proximo_preventivo', e.target.value)} placeholder="DD/MM/AAAA"
                        style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: 100, outline: 'none' }} />
                    : <span style={{ color: t.cell.color }}>{o.proximo_preventivo ? fmtFecha(o.proximo_preventivo) : '__/__/____'}</span>
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
                { rol: 'Jefe de Servicio', nombre: null },
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

        <div style={{ marginTop: 8, fontSize: 9, color: t.label.color, textAlign: 'right' }}>
          Rutina específica por tipo de equipo configurable en SIGAH · Formato F-CON-03 · NOM-016-SSA3-2012
        </div>
      </div>
    </>
  );
}
