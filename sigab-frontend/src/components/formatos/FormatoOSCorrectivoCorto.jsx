/**
 * Formato 02-C — Orden de Servicio Correctivo (FORMATO CORTO)
 * No. Orden: OS-C-XXXX · NOM-016-SSA3-2012
 *
 * Variante compacta de UNA página para correctivos rápidos: mismo membrete
 * institucional y temas de impresión que FormatoOSCorrectivo.jsx (largo),
 * pero solo con lo esencial — sin checklist de estado final ni secciones
 * que no apliquen a un correctivo exprés. Reutiliza formatoThemes/
 * formatoHelpers, no duplica estilos.
 *
 * v.1.0.0 — 2026-07-08, petición directa de Gustavo: selector "Formato
 * corto / Formato completo" en FormatoViewer.jsx para órdenes correctivas.
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoOSCorrectivoCorto({ orden, tema = 'blanco-imss', isEditing = false, onChange }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-C-${String(o.id || '0000').padStart(4, '0')}`;

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

  const ET = ({ value, field, placeholder = '', minH = 40 }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange && onChange(field, e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={{
        border: 'none', borderBottom: `1px dashed ${t.check}`,
        background: 'transparent', color: 'inherit',
        fontSize: 'inherit', width: '100%', minHeight: minH,
        resize: 'none', padding: '3px 4px', outline: 'none', boxSizing: 'border-box'
      }}
    />
  );

  const TD = ({ children, style: s = {}, colSpan = 1 }) => (
    <td colSpan={colSpan} style={{ ...t.cell, padding: '3px 6px', ...s }}>{children}</td>
  );
  const TH = ({ children, colSpan = 1, w }) => (
    <td colSpan={colSpan} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', padding: '3px 6px', width: w }}>
      {children}
    </td>
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

  const materiales = o.materiales || [];
  // "Refacciones (si hay)": en modo lectura solo se muestra la sección si
  // ya existen renglones; en modo edición siempre se ofrece para capturar.
  const mostrarRefacciones = isEditing || materiales.length > 0;

  return (
    <>
      <style>{`@media print { body { margin: 0; } #formato-print-root { width: 210mm; font-size: 10.5pt; } }`}</style>
      <div id="formato-print-root" style={{ ...t.wrapper, fontSize: 11, padding: 16, maxWidth: 900, margin: '0 auto' }}>

        {/* ── CABECERA INSTITUCIONAL IMSS ───────────────────────────────── */}
        <FormatoHeader
          t={t}
          tipoLabel="ORDEN DE SERVICIO CORRECTIVA — FORMATO CORTO"
          folio={folio}
          fecha={o.fecha_creacion || o.fecha}
          refReporte={o.reporte_falla_ref}
        />

        {/* Subtítulo de tipo — estilo .xls, condensado */}
        <div style={{
          textAlign: 'center', fontWeight: 'bold', fontSize: 11, color: t.check,
          letterSpacing: '0.05em', padding: '3px 0 6px 0', textTransform: 'uppercase',
          borderBottom: `1px solid ${t.check}`, marginBottom: 6,
        }}>
          Mantenimiento Correctivo (Exprés) · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485
        </div>

        {/* ── 1. DATOS DEL EQUIPO ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <SecHeader title="1. Datos del Equipo" t={t} colSpan={4} />
            <tr>
              <TH w="28%">Equipo</TH>
              <TH w="24%">Marca</TH>
              <TH w="24%">Modelo</TH>
              <TH w="24%">No. Inventario</TH>
            </tr>
            <tr>
              <TD>{isEditing ? <EI value={o.equipo_nombre} field="equipo_nombre" placeholder="Nombre equipo" /> : (o.equipo_nombre || '—')}</TD>
              <TD>{isEditing ? <EI value={o.equipo_marca} field="equipo_marca" placeholder="Marca" /> : (o.equipo_marca || '—')}</TD>
              <TD>{isEditing ? <EI value={o.equipo_modelo} field="equipo_modelo" placeholder="Modelo" /> : (o.equipo_modelo || '—')}</TD>
              <TD>{isEditing ? <EI value={o.equipo_inventario || o.no_inventario} field="equipo_inventario" placeholder="No. Inv." /> : (o.equipo_inventario || o.no_inventario || '—')}</TD>
            </tr>
            <tr>
              <TH w="28%">No. de Serie</TH>
              <TD>{isEditing ? <EI value={o.equipo_serie} field="equipo_serie" placeholder="No. Serie" /> : (o.equipo_serie || '—')}</TD>
              <TH w="24%">Ubicación / Servicio</TH>
              <TD>
                {isEditing
                  ? <EI value={o.ubicacion_fisica || o.area} field="area" placeholder="Área / Piso" />
                  : (o.ubicacion_fisica || (o.area ? `${o.area}${o.piso ? ` · Piso ${o.piso}` : ''}` : '—'))
                }
              </TD>
            </tr>
            <tr>
              <TH w="24%">Localización completa</TH>
              <TD colSpan={3}>
                {isEditing
                  ? <EI value={o.localizacion_completa || o.ubicacion_fisica || o.localizacion} field="localizacion_completa" placeholder="Descripción completa de ubicación" />
                  : (o.localizacion_completa || o.ubicacion_fisica || o.localizacion || (o.area ? `${o.area}${o.piso ? `, Piso ${o.piso}` : ''}` : '—'))
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 2. DESCRIPCIÓN DE LA FALLA ───────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <SecHeader title="2. Descripción de la Falla" t={t} colSpan={4} />
            <tr>
              <TD colSpan={4}>
                {isEditing
                  ? <ET value={o.falla_reportada || o.diagnostico_falla} field="falla_reportada" placeholder="Diagnóstico técnico de la falla..." minH={36} />
                  : <div style={{ minHeight: 32, whiteSpace: 'pre-wrap' }}>{o.falla_reportada || o.diagnostico_falla || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 3. TRABAJO REALIZADO ─────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <SecHeader title="3. Trabajo Realizado" t={t} colSpan={4} />
            <tr>
              <TD colSpan={4}>
                {isEditing
                  ? <ET value={o.descripcion_servicio || o.descripcion_trabajo} field="descripcion_servicio" placeholder="Describa las acciones correctivas realizadas..." minH={40} />
                  : <div style={{ minHeight: 36, whiteSpace: 'pre-wrap' }}>{o.descripcion_servicio || o.descripcion_trabajo || '—'}</div>
                }
              </TD>
            </tr>
          </tbody>
        </table>

        {/* ── 4. REFACCIONES UTILIZADAS (si hay) ──────────────────────────── */}
        {mostrarRefacciones && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
            <tbody>
              <SecHeader title="4. Refacciones Utilizadas" t={t} colSpan={3} />
              <tr>
                <TH w="55%">Descripción</TH>
                <TH w="15%">Cantidad</TH>
                <TH w="30%">No. de Parte</TH>
              </tr>
              {(materiales.length > 0 ? materiales : (isEditing ? [{ descripcion: '', cantidad: '', no_parte: '' }] : [])).map((r, i) => (
                <tr key={i}>
                  <TD>
                    {isEditing
                      ? <input type="text" value={r.descripcion || ''} onChange={(e) => handleMaterialChange(i, 'descripcion', e.target.value)}
                          style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none', padding: '2px 4px' }} />
                      : (r.descripcion || ' ')
                    }
                  </TD>
                  <TD>
                    {isEditing
                      ? <input type="text" value={r.cantidad || ''} onChange={(e) => handleMaterialChange(i, 'cantidad', e.target.value)}
                          style={{ border: 'none', borderBottom: `1px dashed ${t.check}`, background: 'transparent', color: 'inherit', fontSize: 'inherit', width: '100%', outline: 'none', padding: '2px 4px' }} />
                      : (r.cantidad || ' ')
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
                      : (r.no_parte || ' ')
                    }
                  </TD>
                </tr>
              ))}
              {isEditing && (
                <tr>
                  <TD colSpan={3} style={{ textAlign: 'left', padding: 4 }}>
                    <button onClick={addMaterialRow}
                      style={{ cursor: 'pointer', fontSize: 10, color: t.check, background: 'transparent', border: `1px dashed ${t.check}`, borderRadius: 4, padding: '2px 10px' }}>
                      + Agregar fila
                    </button>
                  </TD>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── 5. HORARIOS Y TÉCNICO ────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <SecHeader title="5. Horarios y Técnico" t={t} colSpan={4} />
            <tr>
              <TH w="16%">Hora Inicio</TH>
              <TH w="16%">Hora Término</TH>
              <TH w="16%">Tiempo Real</TH>
              <TH w="52%">Técnico Asignado</TH>
            </tr>
            <tr>
              <TD>{isEditing ? <EI value={o.hora_inicio} field="hora_inicio" placeholder="HH:MM" /> : (o.hora_inicio || '__:__')}</TD>
              <TD>{isEditing ? <EI value={o.hora_termino || o.hora_fin} field="hora_termino" placeholder="HH:MM" /> : (o.hora_termino || o.hora_fin || '__:__')}</TD>
              <TD>{isEditing ? <EI value={o.tiempo_real_hrs ?? o.tiempo_real} field="tiempo_real_hrs" placeholder="Hrs" /> : ((o.tiempo_real_hrs ?? o.tiempo_real) ? `${o.tiempo_real_hrs ?? o.tiempo_real} h` : '___')}</TD>
              <TD>{isEditing ? <EI value={o.tecnico_nombre} field="tecnico_nombre" placeholder="Nombre técnico" /> : (o.tecnico_nombre || '—')}</TD>
            </tr>
          </tbody>
        </table>

        {/* ── 6. FIRMAS: TÉCNICO + RECIBE DE CONFORMIDAD ──────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, border: `2px solid ${t.check}` }}>
          <tbody>
            <SecHeader title="6. Firmas" t={t} colSpan={2} />
            <tr>
              <TD style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 3 }}>Técnico que realizó</div>
                <div style={{ minHeight: 20, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {o.tecnico_nombre || '—'}
                </div>
                <div style={{ ...t.label, marginTop: 20, marginBottom: 2, textAlign: 'center' }}>Firma</div>
              </TD>
              <TD style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ ...t.label, marginBottom: 3 }}>Recibe de conformidad — Nombre</div>
                <div style={{ minHeight: 20, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {isEditing
                    ? <EI value={o.recibe_conformidad_nombre} field="recibe_conformidad_nombre" placeholder="Nombre completo" />
                    : (o.recibe_conformidad_nombre || '—')
                  }
                </div>
                <div style={{ ...t.label, marginTop: 6, marginBottom: 3 }}>Matrícula</div>
                <div style={{ minHeight: 18, borderBottom: `1px solid ${t.check}`, padding: '2px 4px' }}>
                  {isEditing
                    ? <EI value={o.recibe_matricula} field="recibe_matricula" placeholder="Matrícula" />
                    : (o.recibe_matricula || '—')
                  }
                </div>
                <div style={{ ...t.label, marginTop: 8, marginBottom: 2, textAlign: 'center' }}>Firma</div>
              </TD>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 6, fontSize: 8, color: t.label.color, textAlign: 'right' }}>
          Formato F-CON-02-C (versión corta, una página) · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485 · v.1.0.0
        </div>
      </div>
    </>
  );
}
