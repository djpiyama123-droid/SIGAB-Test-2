import { describe, it, expect } from 'vitest';
import { TEMAS_CONFIG, TEMAS_CANONICOS, fmtFecha, normalizeTema } from './formatoThemes';

const HEX = /^#[0-9a-fA-F]{6}$/;

// luminancia relativa W3C — devuelve un número entre 0 (negro) y 1 (blanco).
// se usa para defender contrastes básicos del header (texto blanco o claro
// sobre fondo institucional) sin meter dependencias de color libs.
const relLuminance = (hex) => {
  const h = hex.replace('#', '');
  const srgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

const contrastRatio = (fg, bg) => {
  const a = relLuminance(fg);
  const b = relLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

describe('fmtFecha', () => {
  it("parsea 'YYYY-MM-DD' como fecha local — no retrocede un día en zonas UTC-negativas (bug Tijuana)", () => {
    // Antes del fix, new Date('2026-07-08') era medianoche UTC y en
    // UTC-7/-8 imprimía 7/7/2026. Debe imprimir el 8 de julio local.
    expect(fmtFecha('2026-07-08')).toBe(new Date(2026, 6, 8).toLocaleDateString('es-MX'));
  });

  it('mantiene el comportamiento previo con timestamps que traen hora', () => {
    const ts = '2026-07-08T12:30:00';
    expect(fmtFecha(ts)).toBe(new Date(ts).toLocaleDateString('es-MX'));
  });

  it('devuelve el placeholder con valores vacíos o nulos', () => {
    expect(fmtFecha(null)).toBe('__/__/____');
    expect(fmtFecha(undefined)).toBe('__/__/____');
    expect(fmtFecha('')).toBe('__/__/____');
  });
});

describe('TEMAS_CANONICOS', () => {
  it('expone exactamente los 3 temas institucionales en el orden esperado', () => {
    expect(TEMAS_CANONICOS).toEqual(['blanco-imss', 'verde-imss', 'neon-sigah']);
  });

  it('está congelado contra mutación accidental', () => {
    expect(Object.isFrozen(TEMAS_CANONICOS)).toBe(true);
    // la asignación silenciosa en modo no-estricto no debe alterar el array
    const original = [...TEMAS_CANONICOS];
    try { TEMAS_CANONICOS.push('pirata'); } catch { /* strict mode */ }
    expect([...TEMAS_CANONICOS]).toEqual(original);
  });

  it('coincide 1-a-1 con las claves de TEMAS_CONFIG', () => {
    expect(Object.keys(TEMAS_CONFIG).sort()).toEqual([...TEMAS_CANONICOS].sort());
  });
});

describe('TEMAS_CONFIG — shape invariante por tema', () => {
  const SHAPE_REQUERIDO = [
    'wrapper', 'header', 'sectionTitle', 'table', 'cell', 'altCell',
    'check', 'label', 'value', 'firmaCell', 'iaChip',
  ];

  for (const nombre of TEMAS_CANONICOS) {
    const tema = TEMAS_CONFIG[nombre];

    it(`'${nombre}' tiene exactamente las 11 claves canónicas`, () => {
      expect(Object.keys(tema).sort()).toEqual([...SHAPE_REQUERIDO].sort());
    });

    it(`'${nombre}' no expone valores null/undefined en ninguna clave`, () => {
      for (const k of SHAPE_REQUERIDO) {
        expect(tema[k], `clave ${k} en ${nombre}`).not.toBeNull();
        expect(tema[k], `clave ${k} en ${nombre}`).not.toBeUndefined();
      }
    });

    it(`'${nombre}' usa colores hexadecimales #RRGGBB en header/sectionTitle/check`, () => {
      expect(tema.header.background).toMatch(HEX);
      expect(tema.header.color).toMatch(HEX);
      expect(tema.sectionTitle.background).toMatch(HEX);
      expect(tema.sectionTitle.color).toMatch(HEX);
      expect(tema.check).toMatch(HEX);
    });

    it(`'${nombre}' tiene wrapper.fontFamily no vacío (defensa contra tema monocromo)`, () => {
      expect(typeof tema.wrapper.fontFamily).toBe('string');
      expect(tema.wrapper.fontFamily.trim().length).toBeGreaterThan(0);
    });
  }

  it('los 3 temas comparten exactamente las mismas claves (shape canónico)', () => {
    const shapes = TEMAS_CANONICOS.map((n) => Object.keys(TEMAS_CONFIG[n]).sort().join('|'));
    expect(new Set(shapes).size).toBe(1);
  });
});

describe('TEMAS_CONFIG — colores institucionales', () => {
  it('blanco-imss.header usa el azul institucional IMSS #006CB7', () => {
    expect(TEMAS_CONFIG['blanco-imss'].header.background).toBe('#006CB7');
    expect(TEMAS_CONFIG['blanco-imss'].header.color).toBe('#ffffff');
  });

  it('verde-imss.header usa el verde institucional IMSS #2D6A27', () => {
    expect(TEMAS_CONFIG['verde-imss'].header.background).toBe('#2D6A27');
    expect(TEMAS_CONFIG['verde-imss'].header.color).toBe('#ffffff');
  });

  it('neon-sigah.header es dark-mode con acento verde SIGAH', () => {
    expect(TEMAS_CONFIG['neon-sigah'].header.background).toBe('#065f46');
    expect(TEMAS_CONFIG['neon-sigah'].header.color).toBe('#10B981');
  });

  it('blanco-imss.check coincide con el header.background (coherencia visual)', () => {
    expect(TEMAS_CONFIG['blanco-imss'].check).toBe(TEMAS_CONFIG['blanco-imss'].header.background);
  });

  it('verde-imss.check coincide con el header.background (coherencia visual)', () => {
    expect(TEMAS_CONFIG['verde-imss'].check).toBe(TEMAS_CONFIG['verde-imss'].header.background);
  });

  it('neon-sigah.check coincide con el header.color (coherencia visual dark)', () => {
    expect(TEMAS_CONFIG['neon-sigah'].check).toBe(TEMAS_CONFIG['neon-sigah'].header.color);
  });
});

describe('TEMAS_CONFIG — accesibilidad/contraste del header', () => {
  // Defensa básica: el header es lo primero que ve el operador al imprimir;
  // si un futuro refactor rompe el contraste (#006CB7 con algo distinto a
  // #ffffff, p.ej.), el test falla antes de que llegue al HGR1.
  it('blanco-imss.header contraste header >= 4.5 (AA texto normal)', () => {
    const t = TEMAS_CONFIG['blanco-imss'];
    expect(contrastRatio(t.header.color, t.header.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('verde-imss.header contraste header >= 4.5 (AA texto normal)', () => {
    const t = TEMAS_CONFIG['verde-imss'];
    expect(contrastRatio(t.header.color, t.header.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('neon-sigah.header contraste header >= 3.0 (AA texto grande en dark)', () => {
    const t = TEMAS_CONFIG['neon-sigah'];
    // neon-sigah es dark con acentos; exigimos AA-large mínimo (3.0)
    expect(contrastRatio(t.header.color, t.header.background)).toBeGreaterThanOrEqual(3.0);
  });
});

describe('normalizeTema', () => {
  const blancoImms = TEMAS_CONFIG['blanco-imss'];
  const verdeImms  = TEMAS_CONFIG['verde-imss'];
  const neonSigah  = TEMAS_CONFIG['neon-sigah'];

  it('devuelve el tema exacto cuando el nombre es canónico (blanco-imss)', () => {
    expect(normalizeTema('blanco-imss')).toBe(blancoImms);
  });

  it('devuelve el tema exacto cuando el nombre es canónico (verde-imss)', () => {
    expect(normalizeTema('verde-imss')).toBe(verdeImms);
  });

  it('devuelve el tema exacto cuando el nombre es canónico (neon-sigah)', () => {
    expect(normalizeTema('neon-sigah')).toBe(neonSigah);
  });

  it('cae al fallback (blanco-imss) con nombre desconocido', () => {
    expect(normalizeTema('rosa-flamingo')).toBe(blancoImms);
    expect(normalizeTema('azul-cobalto')).toBe(blancoImms);
  });

  it('cae al fallback con valores vacíos o nulos', () => {
    expect(normalizeTema(null)).toBe(blancoImms);
    expect(normalizeTema(undefined)).toBe(blancoImms);
    expect(normalizeTema('')).toBe(blancoImms);
  });

  it('cae al fallback con valores no-string (números / objetos)', () => {
    expect(normalizeTema(42)).toBe(blancoImms);
    expect(normalizeTema({})).toBe(blancoImms);
    expect(normalizeTema(true)).toBe(blancoImms);
  });

  it('acepta un fallback custom y lo respeta para nombres desconocidos', () => {
    expect(normalizeTema('rosa-flamingo', neonSigah)).toBe(neonSigah);
  });

  it('NO devuelve el fallback cuando el nombre es canónico (incluso con fallback custom)', () => {
    expect(normalizeTema('verde-imss', neonSigah)).toBe(verdeImms);
  });

  it('preserva la equivalencia byte-a-byte con el patrón inline previo', () => {
    // El patrón anterior era `const t = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];`
    // — verificamos que normalizeTema produce el mismo objeto para los mismos inputs.
    for (const tema of TEMAS_CANONICOS.concat([null, undefined, '', 'pirata', 42, {}])) {
      const esperado = TEMAS_CONFIG[tema] || TEMAS_CONFIG['blanco-imss'];
      expect(normalizeTema(tema)).toBe(esperado);
    }
  });
});

describe('formatoThemes — defensa explícita del calendario/heatmap de Reservas', () => {
  it('el módulo no menciona el calendario/heatmap de Reservas', () => {
    // si alguien añade por error un import o referencia al calendario
    // desde el módulo de temas de impresión, este test falla y alerta.
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, 'formatoThemes.js'),
      'utf8',
    );
    expect(src).not.toMatch(/anim-cell-pop|ActividadHeatmap|onDiaClick|porDia|Reservas/i);
  });
});
