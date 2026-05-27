/**
 * Formato 04 — Orden de Servicio Predictivo (Asistido por IA SIGAH)
 * Folio: OS-PR-XXXX · NOM-016-SSA3-2012
 */
import { TEMAS_CONFIG, fmtFecha } from './formatoThemes';
import { CB, SecHeader } from './formatoHelpers';
import FormatoHeader from './FormatoHeader';

export default function FormatoOSPredictivo({ orden, tema = 'blanco-imss' }) {
  const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
  const o = orden || {};

  const folio = o.numero_orden || `OS-PR-${String(o.id || '0000').padStart(4, '0')}`;
  const validacion = o.validacion_ia || '';

  const TD = (props) => <td style={{ ...t.cell, ...props.style }}>{props.children}</td>;
  const TH = ({ children, colSpan, w }) => (
    <td colSpan={colSpan || 1} style={{ ...t.cell, ...t.altCell, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: w }}>
      {children}
    </td>
  );

  const MetricCard = ({ label, value, unit }) => (
    <td style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', width: '25%' }}>
      <div style={{ fontSize: 22, fontWeight: 'bold', color: t.header.background || t.check }}>
        {value ?? '—'}{unit}
      </div>
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
            <TD>{o.equipo_nombre || ' '}</TD>
            <TD>{o.equipo_marca || ' '}</TD>
            <TD>{o.equipo_modelo || ' '}</TD>
            <TD>{o.equipo_inventario || ' '}</TD>
            <TD rowSpan={3} style={{ ...t.cell, textAlign: 'center', verticalAlign: 'middle', fontSize: 10, color: t.label.color }}>
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
            <TH colSpan={2}>Horas de Uso Acumuladas</TH>
            <TD colSpan={1}>{o.horas_uso_acumuladas ? `${o.horas_uso_acumuladas} h` : ' '}</TD>
            <TH>Antigüedad del Equipo</TH>
            <TD colSpan={1}>{o.antiguedad_equipo || ' '}</TD>
          </tr>
        </tbody>
      </table>

      {/* ANÁLISIS PREDICTIVO SIGAH (4 métricas IA) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Análisis Predictivo SIGAH" t={t} />
          <tr>
            <MetricCard label="Índice de Salud (/ 100)" value={o.indice_salud}          unit="" />
            <MetricCard label="Probabilidad de Falla"   value={o.probabilidad_falla}    unit="%" />
            <MetricCard label="Ventana Recomendada"     value={o.ventana_recomendada}   unit=" días" />
            <MetricCard label="Confianza del Modelo"    value={o.confianza_modelo}      unit="%" />
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
              {o.componente_riesgo || ' '}
            </TD>
            <TD style={{ minHeight: 50, height: 50, verticalAlign: 'top' }}>
              {o.indicadores_monitoreados || ' '}
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
              {o.descripcion_servicio || o.accion_preventiva || ' '}
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

      {/* VALIDACIÓN DEL INGENIERO BIOMÉDICO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <SecHeader title="Validación del Ingeniero Biomédico" t={t} />
          <tr>
            <TD>
              <div style={{ marginBottom: 6 }}>
                <CB checked={validacion === 'acepta'}   label="Acepta la recomendación" t={t} />
                <CB checked={validacion === 'ajusta'}   label="Ajusta"                  t={t} />
                <CB checked={validacion === 'descarta'} label="Descarta"                t={t} />
              </div>
              <div style={{ fontSize: 10, color: t.label.color, marginBottom: 4 }}>
                Justificación (obligatoria si ajusta o descarta):
              </div>
              <div style={{ ...t.value, minHeight: 28, borderBottom: `1px solid ${t.table.borderColor}` }}>
                {o.justificacion_validacion || ' '}
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
