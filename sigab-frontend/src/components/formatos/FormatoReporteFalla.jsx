/**
 * Formato 01 — Reporte de Falla de Equipo
 * Folio: RF-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoReporteFalla({ orden, tema = 'blanco-imss' }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden?.startsWith('RF') ? o.numero_orden : `RF-${String(o.id || '0000').padStart(4, '0')}`;
  const condicion = o.condicion_equipo || (o.estado === 'abierta' ? 'fuera_servicio' : o.estado === 'en_progreso' ? 'operacion_parcial' : '');
  const criticidad = o.prioridad || 'media';

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
            <TD>{o.equipo_nombre || ' '}</TD>
            <TD>{o.equipo_marca || ' '}</TD>
            <TD>{o.equipo_modelo || ' '}</TD>
            <TD>{o.equipo_inventario || ' '}</TD>
            <TD rowSpan={2} style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', fontSize: 10, color: t.label.color }}>
              [QR]
            </TD>
          </tr>
          <tr>
            <TH>No. de Serie</TH>
            <TD colSpan={1}>{o.equipo_serie || ' '}</TD>
            <TH>Ubicación / Servicio</TH>
            <TD>{o.area ? `${o.area}${o.piso ? ` · ${o.piso}` : ''}` : ' '}</TD>
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
            <TD>{o.reportado_por || ' '}</TD>
            <TD>{o.cargo_reportante || ' '}</TD>
            <TD>{o.servicio_turno || ' '}</TD>
          </tr>
        </tbody>
      </table>

      {/* DESCRIPCIÓN DE LA FALLA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Descripción de la Falla" t={t} />
          <tr>
            <TD style={{ minHeight: 64, height: 64 }}>
              {o.falla_reportada || ' '}
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
              <CB checked={condicion === 'fuera_servicio'}    label="Fuera de servicio"    t={t} />
              <CB checked={condicion === 'operacion_parcial'} label="Operación parcial"    t={t} />
              <CB checked={condicion === 'en_riesgo'}         label="En riesgo"            t={t} />
            </TD>
            <TD style={{ width: '40%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Clasificación de Criticidad</span>
              <CB checked={criticidad === 'critica' || criticidad === 'alta'} label="Alta"   t={t} />
              <CB checked={criticidad === 'media'}                            label="Media"  t={t} />
              <CB checked={criticidad === 'baja'}                             label="Baja"   t={t} />
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
            <TD>{o.recibe_nombre || ' '}</TD>
            <TD>{fmtFecha(o.fecha_recepcion)}</TD>
            <TD>{o.hora_recepcion || '__:__'}</TD>
            <TD>{o.numero_orden_generada || ' '}</TD>
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
