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

export default function FormatoOSPreventivo({ orden, tema = 'blanco-imss' }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-P-${String(o.id || '0000').padStart(4, '0')}`;
  const rutina = Array.isArray(o.rutina_realizada) ? o.rutina_realizada : [];
  const condicionCierre = o.condicion_cierre || (o.estado === 'cerrada' ? 'apto_operacion' : '');

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
                  <CB checked={rutina.includes(r.id)} label={r.label} t={t} />
                </div>
              ))}
            </TD>
            <TD style={{ width: '50%', verticalAlign: 'top' }}>
              {rightRutina.map((r) => (
                <div key={r.id} style={{ marginBottom: 6 }}>
                  <CB checked={rutina.includes(r.id)} label={r.label} t={t} />
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
            <TH w="22%">Hora Inicio</TH>
            <TH w="22%">Hora Término</TH>
            <TH w="22%">Tiempo Real</TH>
            <TH w="34%">Técnico Asignado</TH>
          </tr>
          <tr>
            <TD>{o.hora_inicio || '__:__'}</TD>
            <TD>{o.hora_termino || '__:__'}</TD>
            <TD>{o.tiempo_real || '___'}</TD>
            <TD>{o.tecnico_nombre || ' '}</TD>
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
                {o.proximo_preventivo ? fmtFecha(o.proximo_preventivo) : '__/__/____'}
              </span>
            </TD>
            <TD style={{ width: '60%' }}>
              <span style={{ ...t.label, display: 'block', marginBottom: 6 }}>Condición al Cierre</span>
              <CB checked={condicionCierre === 'apto_operacion'}    label="Equipo apto para operación"  t={t} />
              <CB checked={condicionCierre === 'requiere_correctivo'} label="Requiere correctivo"       t={t} />
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
