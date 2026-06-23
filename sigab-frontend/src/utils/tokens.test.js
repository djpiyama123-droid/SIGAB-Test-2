// src/utils/tokens.test.js
// Red de seguridad: tokens.js es la fuente única de verdad para colores
// de estado (operativo, fuera_servicio, etc.) que aparecen en KPICard,
// EquipoCard, EquipoTable, gráficos recharts y badges. Si alguien
// renombra o borra una clave, estos tests fallan antes de que el
// dashboard se vea sin colores.
import { describe, it, expect } from 'vitest';
import {
  STATUS,
  STATUS_HEX,
  ESTADO_COLORS,
  ESTADO_LABELS,
  ESTADO_DOT_COLORS,
  Z,
  CHART_COLORS,
  PRIORIDAD,
  TV_ESTADO_COLORS,
} from './tokens';

describe('design tokens — STATUS', () => {
  const estados = ['operativo', 'en_mantenimiento', 'fuera_servicio', 'en_traslado', 'baja'];

  it('expone los 5 estados canónicos del inventario', () => {
    expect(Object.keys(STATUS).sort()).toEqual([...estados].sort());
  });

  it('cada estado tiene bg/dot/badge/label con clases Tailwind válidas', () => {
    for (const e of estados) {
      expect(STATUS[e], `estado ${e}`).toBeDefined();
      expect(STATUS[e].bg).toMatch(/^bg-/);
      expect(STATUS[e].dot).toMatch(/^bg-/);
      expect(STATUS[e].badge).toMatch(/^bg-/);
      expect(STATUS[e].label).toBeTruthy();
    }
  });

  it('STATUS_HEX tiene exactamente los mismos estados y son hex de 7 caracteres', () => {
    expect(Object.keys(STATUS_HEX).sort()).toEqual([...estados].sort());
    for (const e of estados) {
      expect(STATUS_HEX[e]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('design tokens — aliases re-exportados', () => {
  it('ESTADO_COLORS mapea al .bg de STATUS (consumido por badges y dots)', () => {
    for (const [k, v] of Object.entries(ESTADO_COLORS)) {
      expect(v).toBe(STATUS[k].bg);
    }
  });

  it('ESTADO_LABELS mapea al .label de STATUS (consumido por tablas y cards)', () => {
    for (const [k, v] of Object.entries(ESTADO_LABELS)) {
      expect(v).toBe(STATUS[k].label);
    }
  });

  it('ESTADO_DOT_COLORS mapea al .dot de STATUS (consumido por el mapa del hospital)', () => {
    for (const [k, v] of Object.entries(ESTADO_DOT_COLORS)) {
      expect(v).toBe(STATUS[k].dot);
    }
  });
});

describe('design tokens — z-index, prioridad, tecnovigilancia', () => {
  it('z-index escala de menor (dropdown) a mayor (toast) sin colisiones', () => {
    const orden = ['dropdown', 'sticky', 'overlay', 'modal', 'modalNested', 'confirm', 'toast'];
    const valores = orden.map(k => Z[k]);
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i], `z ${orden[i]} debe ser > ${orden[i - 1]}`).toBeGreaterThan(valores[i - 1]);
    }
  });

  it('PRIORIDAD cubre los 4 niveles (critica, alta, media, baja)', () => {
    expect(Object.keys(PRIORIDAD).sort()).toEqual(['alta', 'baja', 'critica', 'media']);
    expect(PRIORIDAD.critica).toMatch(/red/);
    expect(PRIORIDAD.alta).toMatch(/orange/);
  });

  it('TV_ESTADO_COLORS incluye los 6 estados del flujo NOM-240', () => {
    const esperados = ['reportado', 'en_investigacion', 'documentado', 'escalado_cofepris', 'cerrado', 'cancelado'];
    expect(Object.keys(TV_ESTADO_COLORS).sort()).toEqual([...esperados].sort());
  });

  it('CHART_COLORS es una paleta no vacía de hex (consumido por recharts)', () => {
    expect(CHART_COLORS.length).toBeGreaterThan(0);
    for (const c of CHART_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});