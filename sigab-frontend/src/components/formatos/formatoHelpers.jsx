import { getMediaUrl } from '../../api/sigah';
export function CB({ checked, label, t }) {
  return (
    <span style={{ color: checked ? t.check : t.cell.color, marginRight: 14, fontSize: 13, whiteSpace: 'nowrap' }}>
      <span style={{ color: checked ? t.check : t.cell.color, fontSize: 15 }}>{checked ? '☑' : '☐'}</span>
      {' '}{label}
    </span>
  );
}

export function SecHeader({ title, t, colSpan = 10 }) {
  return (
    <tr>
      <td colSpan={colSpan} style={t.sectionTitle}>{title}</td>
    </tr>
  );
}

/**
 * FormatoEvidenciaFotografica — sección numerada "Evidencia Fotográfica del
 * Proceso", compartida por los formatos LARGOS (Preventivo, Correctivo) que
 * reciben `o.fotos`. Cuadrícula de 2 columnas print-friendly; cada foto lleva
 * pie numerado ("Evidencia N — descripción" si el elemento trae descripción,
 * si no solo el número) y `break-inside: avoid` para que ninguna foto se
 * corte entre páginas al imprimir. No renderiza nada si la orden no trae
 * fotos — evita secciones vacías en el impreso.
 *
 * Acepta `fotos` como array de strings (URL/base64, forma actual de o.fotos)
 * o de objetos `{ url, descripcion }` para soportar pie de foto sin requerir
 * cambios de backend.
 */
export function FormatoEvidenciaFotografica({ fotos, t, titulo = 'Evidencia Fotográfica del Proceso' }) {
  if (!Array.isArray(fotos) || fotos.length === 0) return null;

  const items = fotos
    .map((f) => {
      if (f && typeof f === 'object') {
        return { url: f.url || f.src || f.ruta_archivo || '', descripcion: f.descripcion || f.desc || '' };
      }
      return { url: f, descripcion: '' };
    })
    .filter((it) => it.url);

  if (items.length === 0) return null;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
      <tbody>
        <SecHeader title={titulo} t={t} />
        <tr>
          <td style={{ padding: '8px 4px', border: `1px solid ${t.table.borderColor}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    border: `1px solid ${t.table.borderColor}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 140, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={getMediaUrl(it.url)} alt={`Evidencia ${i + 1}`} style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'contain' }} />
                  </div>
                  <div style={{
                    fontSize: 10, color: t.label.color, padding: '4px 6px',
                    borderTop: `1px solid ${t.table.borderColor}`, textAlign: 'center',
                    background: t.altCell.background,
                  }}>
                    {it.descripcion ? `Evidencia ${i + 1} — ${it.descripcion}` : `Evidencia ${i + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
