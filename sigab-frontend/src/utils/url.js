// Normaliza una ruta a URL absoluta contra el origen actual.
// Los archivos en /static/uploads los sirve nginx (prod) o el proxy de Vite (dev),
// ambos en window.location.origin. Una URL ya absoluta se devuelve tal cual.
// ponytail: window.location.origin cubre dev y prod; no se necesita API base.
export function absUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Normaliza el campo `fotos` (array, JSON string, CSV o URL única) a un array de URLs.
// Antes esto era un JSON.parse() inline que fallaba en silencio con CSV/URL única y
// no mostraba la galería. Devuelve [] ante cualquier entrada vacía o inválida.
export function parseFotos(fotos) {
  if (Array.isArray(fotos)) return fotos.filter(Boolean);
  if (typeof fotos !== 'string' || !fotos.trim()) return [];
  const raw = fotos.trim();
  try {
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : [raw]).filter(Boolean);
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}
