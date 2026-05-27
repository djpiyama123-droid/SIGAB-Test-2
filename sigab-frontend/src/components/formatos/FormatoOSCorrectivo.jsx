/**
 * Formato 02 — Orden de Servicio Correctivo
 * Folio: OS-C-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoOSCorrectivo({ orden, tema = 'blanco-imss' }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-C-${String(o.id || '0000').padStart(4, '0')}`;
  const estadoFinal = o.estado_final || (o.estado === 'cerrada' ? 'operativo' : o.estado === 'en_progreso' ? 'en_observacion' : '');

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
            <TD>{o.equipo_serie || ' '}</TD>
            <TH>Ubicación / Servicio</TH>
            <TD>{o.area ? `${o.area}${o.piso ? ` · Piso ${o.piso}` : ''}` : ' '}</TD>
          </tr>
          <tr>
            <TH colSpan={2}>Localización del equipo o instalación</TH>
            <TD colSpan={3}>{o.ubicacion_fisica || o.area || ' '}</TD>
          </tr>
        </tbody>
      </table>

      {/* DIAGNÓSTICO DE LA FALLA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Diagnóstico de la Falla" t={t} />
          <tr>
            <TD style={{ minHeight: 60, height: 60 }}>
              {o.falla_reportada || o.condiciones_encontradas || ' '}
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
              {o.descripcion_servicio || ' '}
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
            <TD>{o.hora_inicio || '__:__'}</TD>
            <TD>{o.hora_termino || '__:__'}</TD>
            <TD>{o.tiempo_estimado || '___'}</TD>
            <TD>{o.tiempo_real || '___'}</TD>
            <TD>{o.tecnico_nombre || ' '}</TD>
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
            <TH w="30%">No. de Parte</TH>
          </tr>
          {(o.refacciones?.length ? o.refacciones : [{}, {}, {}]).map((r, i) => (
            <tr key={i}>
              <TD>{r.descripcion || ' '}</TD>
              <TD>{r.cantidad || ' '}</TD>
              <TD>{r.no_parte || ' '}</TD>
            </tr>
          ))}
        </tbody>
      </table>

      {/* OBSERVACIONES Y ESTADO FINAL */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Observaciones y Estado Final" t={t} />
          <tr>
            <TD style={{ width: '60%', minHeight: 56, height: 56 }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 4 }}>Observaciones</span>
              {o.observaciones || ' '}
            </TD>
            <TD style={{ width: '40%', verticalAlign: 'top' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Estado Final del Equipo</span>
              <div style={{ lineHeight: 2 }}>
                <CB checked={estadoFinal === 'operativo'}      label="Operativo"       t={t} /><br />
                <CB checked={estadoFinal === 'en_observacion'} label="En observación"  t={t} /><br />
                <CB checked={estadoFinal === 'baja'}           label="Baja"            t={t} />
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: t.label.color }}>
                Revisar nuevamente: <span style={t.value}>{o.fecha_revision ? fmtFecha(o.fecha_revision) : '  __/__/____  '}</span>
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
