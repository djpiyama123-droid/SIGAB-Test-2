export const TEMAS_CONFIG = {
  'blanco-imss': {
    wrapper:      { background: '#ffffff', color: '#111', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 },
    header:       { background: '#006CB7', color: '#ffffff' },
    sectionTitle: { background: '#dbe9f7', color: '#004f8a', borderLeft: '4px solid #006CB7', padding: '4px 8px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
    table:        { borderColor: '#aaaaaa' },
    cell:         { background: '#ffffff', color: '#111', border: '1px solid #aaaaaa', padding: '5px 7px', verticalAlign: 'top' },
    altCell:      { background: '#f4f7fb', color: '#111' },
    check:        '#006CB7',
    label:        { color: '#555', fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },
    value:        { color: '#111', fontSize: 12, borderBottom: '1px solid #999', minHeight: 18, display: 'block' },
    firmaCell:    { border: '1px solid #aaa', padding: '24px 8px 4px', textAlign: 'center', color: '#555', fontSize: 10 },
    iaChip:       { background: '#e0edff', color: '#003b7a', border: '1px solid #006CB7', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 'bold' },
  },
  'verde-imss': {
    wrapper:      { background: '#ffffff', color: '#111', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 },
    header:       { background: '#2D6A27', color: '#ffffff' },
    sectionTitle: { background: '#e5f3e3', color: '#1e4b1a', borderLeft: '4px solid #2D6A27', padding: '4px 8px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
    table:        { borderColor: '#999999' },
    cell:         { background: '#ffffff', color: '#111', border: '1px solid #999999', padding: '5px 7px', verticalAlign: 'top' },
    altCell:      { background: '#f3faf2', color: '#111' },
    check:        '#2D6A27',
    label:        { color: '#555', fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },
    value:        { color: '#111', fontSize: 12, borderBottom: '1px solid #999', minHeight: 18, display: 'block' },
    firmaCell:    { border: '1px solid #999', padding: '24px 8px 4px', textAlign: 'center', color: '#555', fontSize: 10 },
    iaChip:       { background: '#d7f0d3', color: '#1e4b1a', border: '1px solid #2D6A27', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 'bold' },
  },
  'neon-sigah': {
    wrapper:      { background: '#0F172A', color: '#E2E8F0', fontFamily: '"Courier New", Courier, monospace', fontSize: 12 },
    header:       { background: '#065f46', color: '#10B981' },
    sectionTitle: { background: '#1e293b', color: '#10B981', borderLeft: '4px solid #10B981', padding: '4px 8px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' },
    table:        { borderColor: '#1e3a5f' },
    cell:         { background: '#0F172A', color: '#E2E8F0', border: '1px solid #1e3a5f', padding: '5px 7px', verticalAlign: 'top' },
    altCell:      { background: '#1e293b', color: '#94a3b8' },
    check:        '#10B981',
    label:        { color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },
    value:        { color: '#E2E8F0', fontSize: 12, borderBottom: '1px solid #1e3a5f', minHeight: 18, display: 'block' },
    firmaCell:    { border: '1px solid #1e3a5f', padding: '24px 8px 4px', textAlign: 'center', color: '#64748b', fontSize: 10 },
    iaChip:       { background: '#064e3b', color: '#10B981', border: '1px solid #10B981', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 'bold' },
  },
};

// Lista cerrada y ordenada de los 3 temas canónicos; congelada contra
// mutación accidental. FormatoViewer.jsx y cualquier selector de tema
// debe iterar / validar contra esta lista en vez de hardcodear los
// nombres en otro archivo.
export const TEMAS_CANONICOS = Object.freeze(['blanco-imss', 'verde-imss', 'neon-sigah']);

// Resuelve el objeto de estilos para `tema`. Si el tema es desconocido,
// vacío o no es string, devuelve el fallback (por defecto blanco-imss).
// Reemplaza el patrón antes repetido en los 5 Formato*.jsx:
//   `const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];`
export const normalizeTema = (tema, fallback = TEMAS_CONFIG['blanco-imss']) => {
  const t = typeof tema === 'string' ? TEMAS_CONFIG[tema] : undefined;
  return t && typeof t === 'object' ? t : fallback;
};

export const fmtFecha = (f) => {
  if (!f) return '__/__/____';
  try {
    // 'YYYY-MM-DD' sin hora: new Date(string) lo interpreta como medianoche
    // UTC y al formatear en hora local (Tijuana, UTC-7/-8) retrocede un día
    // (2026-07-08 imprimía 7/7/2026). Se parsea como fecha LOCAL solo en ese
    // caso; los timestamps con hora se dejan igual que antes.
    const m = String(f).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(f);
    return d.toLocaleDateString('es-MX');
  } catch { return f; }
};
