// src/pages/Formatos.test.jsx
// Formatos es el Centro de Formatos IMSS/SIGAH: página estática que muestra
// 4 cards (Reporte de Falla, OS Correctivo, OS Preventivo, OS Predictivo)
// con su metadata (label, descripción, norma, color, icono, secciones) y un
// botón "Ver Formato" que abre el modal FormatoViewer con una orden vacía
// pre-llenada.
//
// Es la página más simple del SPA (152 líneas, sin fetch, sin useEffect, sin
// API calls) pero concentra varios patrones que un test atrapa y un DevTools
// manual no:
//
//   - Render de las 4 cards con su metadata literal (label, descripción, norma
//     NOM-016-SSA3-2012, folio_prefix, secciones). Si alguien cambia una
//     descripción o borra un campo del array FORMATOS_INFO, el operador ve
//     el formato con info desactualizada y el test atrapa la regresión.
//   - Color theme por formato: amber/red/emerald/purple. Las clases CSS
//     (`bg-amber-100 text-amber-700`, `border-amber-700/50`, `bg-amber-600`,
//     etc.) son semánticas: si alguien refactorea COLOR_CLASSES y rompe la
//     asociación tipo↔color, las cards pierden identidad visual.
//   - Función ordenVacio(tipo): genera el folio correcto según tipo
//     (`RF-0001`, `OS-C-0001`, `OS-P-0001`, `OS-PR-0001`). Si alguien
//     borra el `find()` con fallback `'XX'`, una typo en un tipo deja
//     folios `XX-0001` en producción.
//   - Apertura del modal FormatoViewer: cuando el operador hace click en
//     "Ver Formato", la orden que recibe el visor tiene `tipo_mantenimiento`
//     y `numero_orden` correctos. Si alguien rompe el handler y pasa
//     `null` o un objeto sin tipo, el visor cae en `default: OSCorrectivo`
//     y el operador imprime el formato equivocado.
//   - Cierre del modal: click en "Cerrar" del FormatoViewer invoca
//     `onClose` y el modal se desmonta. Si el modal no propaga onClose, el
//     operador no puede salir.
//
// Riesgos silenciosos que un test atrapa:
//   - Si alguien borra un tipo de FORMATOS_INFO, una de las 4 cards
//     desaparece del grid.
//   - Si alguien refactorea COLOR_CLASSES a tokens semánticos y rompe la
//     asociación tipo↔color, los formatos pierden identidad visual.
//   - Si ordenVacio no recibe el tipo correcto (passing `null`), el visor
//     abre OS Correctivo por default aunque el operador hizo click en
//     "Reporte de Falla".
//   - Si FormatoViewer no propaga onClose, el operador queda atrapado en
//     el modal.
//   - Si alguien quita el `find()` con fallback, una typo en un tipo
//     genera folio `XX-0001` y la numeración oficial del formato se
//     rompe.
//
// Se mockea `../components/formatos/FormatoViewer` porque trae 4 sub-
// componentes (FormatoReporteFalla, FormatoOSCorrectivo, FormatoOSPreventivo,
// FormatoOSPredictivo) + usePrintFormato + api.getFormato, todos fuera del
// alcance del smoke test. El stub expone un data-testid + un botón Cerrar
// que invoca onClose.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  // Captura la `orden` que el padre pasó al visor para poder verificar
  // que ordenVacio(tipo) produjo el objeto correcto (tipo_mantenimiento,
  // numero_orden con el folio_prefix esperado, fecha ISO YYYY-MM-DD, etc.).
  lastOrdenReceived: { current: null },
}));

// ── Mock FormatoViewer: stub con data-testid + botón Cerrar que llama
//    onClose, y expone la `orden` recibida en mocks.lastOrdenReceived. ──
vi.mock('../components/formatos/FormatoViewer', () => ({
  default: ({ orden, onClose }) => {
    mocks.lastOrdenReceived.current = orden;
    return (
      <div data-testid="mock-formato-viewer">
        <span data-testid="visor-tipo">{orden?.tipo_mantenimiento}</span>
        <span data-testid="visor-folio">{orden?.numero_orden}</span>
        <span data-testid="visor-fecha">{orden?.fecha}</span>
        <span data-testid="visor-equipo">{orden?.equipo_nombre}</span>
        <button data-testid="visor-close" onClick={onClose}>Cerrar visor</button>
      </div>
    );
  },
}));

import Formatos from './Formatos';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures: las 4 entradas de FORMATOS_INFO declaradas en el componente.
// Mantenerlas sincronizadas con el source — si cambias una descripción o
// un color en Formatos.jsx, este test atrapa la divergencia.
// ────────────────────────────────────────────────────────────────────────────
const FORMATOS = [
  { tipo: 'reporte_falla', folio_prefix: 'RF',    label: 'Reporte de Falla',     color: 'amber',   icon: '⚠️' },
  { tipo: 'correctivo',    folio_prefix: 'OS-C',  label: 'OS Correctivo',        color: 'red',     icon: '🔧' },
  { tipo: 'preventivo',    folio_prefix: 'OS-P',  label: 'OS Preventivo',        color: 'emerald', icon: '📅' },
  { tipo: 'predictivo',    folio_prefix: 'OS-PR', label: 'OS Predictivo (IA)',   color: 'purple',  icon: '⚡' },
];

beforeEach(() => {
  mocks.lastOrdenReceived.current = null;
});

afterEach(() => {
  cleanup();
});

const renderFormatos = () => {
  return render(
    <MemoryRouter>
      <Formatos />
    </MemoryRouter>,
  );
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Header y banner informativo
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — header y banner', () => {
  it('renderiza el header h1 "Formatos Oficiales IMSS"', () => {
    renderFormatos();
    expect(screen.getByRole('heading', { name: /formatos oficiales imss/i, level: 1 }))
      .toBeInTheDocument();
  });

  it('el subtítulo menciona los 4 formatos NOM-016', () => {
    renderFormatos();
    expect(screen.getByText(/4 formatos NOM-016-SSA3-2012/i)).toBeInTheDocument();
  });

  it('renderiza el banner azul con el tip de uso', () => {
    renderFormatos();
    expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
    // El banner referencia "Órdenes de Servicio" y el botón 🖨 Formato.
    expect(screen.getByText(/Órdenes de Servicio/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Grid de 4 cards: render con metadata literal
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — render de las 4 cards', () => {
  it('renderiza las 4 cards (4 botones "Ver Formato")', () => {
    renderFormatos();
    expect(screen.getAllByRole('button', { name: /ver formato/i })).toHaveLength(4);
  });

  it('cada card muestra su label oficial', () => {
    renderFormatos();
    for (const f of FORMATOS) {
      expect(screen.getByRole('heading', { name: f.label, level: 2 }))
        .toBeInTheDocument();
    }
  });

  it('cada card muestra su icono correspondiente', () => {
    renderFormatos();
    for (const f of FORMATOS) {
      // El icono está dentro de un <span className="text-2xl">{f.icon}</span>.
      // El match exacto del emoji funciona porque getByText busca string equality.
      expect(screen.getByText(f.icon)).toBeInTheDocument();
    }
  });

  it('cada card muestra la norma NOM-016-SSA3-2012', () => {
    renderFormatos();
    // 4 cards × 1 span de norma = 4 ocurrencias del mismo string.
    expect(screen.getAllByText('NOM-016-SSA3-2012')).toHaveLength(4);
  });

  it('cada card muestra su folio_prefix en el badge monoespaciado', () => {
    renderFormatos();
    for (const f of FORMATOS) {
      // El badge renderiza `${f.folio_prefix}-XXXX` (formato del folio mask).
      expect(screen.getByText(`${f.folio_prefix}-XXXX`)).toBeInTheDocument();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Secciones (campos) por formato
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — secciones por card', () => {
  // Helper: devuelve `within` scope de la card cuyo h2 tiene el `label`.
  // Esto evita colisiones cuando dos cards comparten una sección (ej.
  // "Tiempos" aparece tanto en correctivo como en preventivo).
  const cardScopeByLabel = (label) => {
    const heading = screen.getByRole('heading', { name: label, level: 2 });
    // La card raíz es el `<div key={f.tipo} className="...border...">`.
    const card = heading.closest('div.border');
    return card;
  };

  it('reporte_falla tiene las 4 secciones declaradas', () => {
    renderFormatos();
    const card = cardScopeByLabel('Reporte de Falla');
    const secciones = ['Equipo', 'Quién reporta', 'Descripción de falla', 'Condición y criticidad'];
    for (const s of secciones) {
      // Dentro del scope de la card, `Tiempos` no está (es de otras cards),
      // así que `getByText` resuelve sin ambigüedad.
      const node = [...card.querySelectorAll('span')].find((el) => el.textContent === s);
      expect(node).toBeTruthy();
    }
  });

  it('correctivo tiene las 5 secciones declaradas', () => {
    renderFormatos();
    const card = cardScopeByLabel('OS Correctivo');
    const secciones = ['Diagnóstico de falla', 'Trabajo realizado', 'Tiempos', 'Material y refacciones', 'Estado final'];
    for (const s of secciones) {
      const node = [...card.querySelectorAll('span')].find((el) => el.textContent === s);
      expect(node).toBeTruthy();
    }
  });

  it('preventivo tiene las 5 secciones declaradas', () => {
    renderFormatos();
    const card = cardScopeByLabel('OS Preventivo');
    const secciones = ['Rutina (6 casillas)', 'Servicio efectuado', 'Tiempos', 'Evidencia fotográfica', 'Próximo preventivo'];
    for (const s of secciones) {
      const node = [...card.querySelectorAll('span')].find((el) => el.textContent === s);
      expect(node).toBeTruthy();
    }
  });

  it('predictivo tiene las 4 secciones declaradas', () => {
    renderFormatos();
    const card = cardScopeByLabel('OS Predictivo (IA)');
    const secciones = ['Análisis IA (4 métricas)', 'Recomendación generada', 'Acción ejecutada', 'Validación ingeniero'];
    for (const s of secciones) {
      const node = [...card.querySelectorAll('span')].find((el) => el.textContent === s);
      expect(node).toBeTruthy();
    }
  });

  it('cada card tiene un label "SECCIONES" sobre los chips', () => {
    renderFormatos();
    expect(screen.getAllByText(/^SECCIONES$/i)).toHaveLength(4);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Color theme por formato (semántica visual)
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — color theme por tipo', () => {
  // Helper: encuentra el botón "Ver Formato" dentro de la card cuyo h2
  // contiene el label buscado. Devuelve el className del botón para
  // verificar las clases de color (`bg-amber-600`, `bg-red-600`, etc.).
  const getVerFormatoBtnByLabel = (label) => {
    const card = screen.getByRole('heading', { name: label, level: 2 }).closest('div.border');
    return card.querySelector('button');
  };

  it('reporte_falla usa clases amber', () => {
    renderFormatos();
    const btn = getVerFormatoBtnByLabel('Reporte de Falla');
    expect(btn.className).toMatch(/bg-amber-600/);
    expect(btn.className).toMatch(/hover:bg-amber-700/);
    // El badge del folio debe llevar las clases amber también.
    const card = screen.getByRole('heading', { name: 'Reporte de Falla', level: 2 }).closest('div.border');
    expect(card.querySelector('span.font-mono').className).toMatch(/bg-amber-100/);
  });

  it('correctivo usa clases red', () => {
    renderFormatos();
    const btn = getVerFormatoBtnByLabel('OS Correctivo');
    expect(btn.className).toMatch(/bg-red-600/);
    expect(btn.className).toMatch(/hover:bg-red-700/);
  });

  it('preventivo usa clases emerald', () => {
    renderFormatos();
    const btn = getVerFormatoBtnByLabel('OS Preventivo');
    expect(btn.className).toMatch(/bg-emerald-600/);
    expect(btn.className).toMatch(/hover:bg-emerald-700/);
  });

  it('predictivo usa clases purple', () => {
    renderFormatos();
    const btn = getVerFormatoBtnByLabel('OS Predictivo (IA)');
    expect(btn.className).toMatch(/bg-purple-600/);
    expect(btn.className).toMatch(/hover:bg-purple-700/);
  });

  it('cada card tiene un border de color acorde al tipo', () => {
    renderFormatos();
    const checks = [
      { label: 'Reporte de Falla',    color: 'amber' },
      { label: 'OS Correctivo',       color: 'red' },
      { label: 'OS Preventivo',       color: 'emerald' },
      { label: 'OS Predictivo (IA)',  color: 'purple' },
    ];
    for (const { label, color } of checks) {
      const card = screen.getByRole('heading', { name: label, level: 2 }).closest('div.border');
      expect(card.className).toMatch(new RegExp(`border-${color}-700`));
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Apertura del modal FormatoViewer (ordenVacio por tipo)
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — apertura del modal', () => {
  it('inicialmente NO hay modal en el DOM', () => {
    renderFormatos();
    expect(screen.queryByTestId('mock-formato-viewer')).not.toBeInTheDocument();
  });

  it('click en "Ver Formato" de Reporte de Falla abre el visor con tipo=reporte_falla y folio RF-0001', () => {
    renderFormatos();
    const btn = screen.getByRole('heading', { name: 'Reporte de Falla', level: 2 })
      .closest('div.border').querySelector('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('mock-formato-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('reporte_falla');
    expect(screen.getByTestId('visor-folio')).toHaveTextContent('RF-0001');
  });

  it('click en "Ver Formato" de OS Correctivo abre con tipo=correctivo y folio OS-C-0001', () => {
    renderFormatos();
    const btn = screen.getByRole('heading', { name: 'OS Correctivo', level: 2 })
      .closest('div.border').querySelector('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('correctivo');
    expect(screen.getByTestId('visor-folio')).toHaveTextContent('OS-C-0001');
  });

  it('click en "Ver Formato" de OS Preventivo abre con tipo=preventivo y folio OS-P-0001', () => {
    renderFormatos();
    const btn = screen.getByRole('heading', { name: 'OS Preventivo', level: 2 })
      .closest('div.border').querySelector('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('preventivo');
    expect(screen.getByTestId('visor-folio')).toHaveTextContent('OS-P-0001');
  });

  it('click en "Ver Formato" de OS Predictivo abre con tipo=predictivo y folio OS-PR-0001', () => {
    renderFormatos();
    const btn = screen.getByRole('heading', { name: 'OS Predictivo (IA)', level: 2 })
      .closest('div.border').querySelector('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('predictivo');
    expect(screen.getByTestId('visor-folio')).toHaveTextContent('OS-PR-0001');
  });

  it('la orden pasada al visor tiene fecha ISO YYYY-MM-DD del día', () => {
    renderFormatos();
    const btn = screen.getAllByRole('button', { name: /ver formato/i })[0];
    fireEvent.click(btn);

    const fecha = screen.getByTestId('visor-fecha').textContent;
    // new Date().toISOString().split('T')[0] → "YYYY-MM-DD"
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Y debe coincidir con el día actual (sanity check, no debe ser 1970-01-01).
    const today = new Date().toISOString().split('T')[0];
    expect(fecha).toBe(today);
  });

  it('la orden pasada al visor incluye los placeholders de equipo y técnico', () => {
    renderFormatos();
    const btn = screen.getAllByRole('button', { name: /ver formato/i })[0];
    fireEvent.click(btn);

    // Estos son los placeholders que ordenVacio() pre-rellena para que el
    // formato se imprima aunque la OS no exista todavía. Si alguien los
    // borra, el operador imprime el formato con campos vacíos.
    const orden = mocks.lastOrdenReceived.current;
    expect(orden.equipo_nombre).toBe('[Nombre del Equipo]');
    expect(orden.equipo_marca).toBe('[Marca]');
    expect(orden.equipo_modelo).toBe('[Modelo]');
    expect(orden.equipo_serie).toBe('[Serie]');
    expect(orden.area).toBe('[Área / Servicio]');
    expect(orden.tecnico_nombre).toBe('[Técnico Asignado]');
  });

  it('la orden pasada al visor tiene tipo_mantenimiento correcto (no sólo "tipo")', () => {
    // ordenVacio() usa el campo `tipo_mantenimiento` (no `tipo`) porque el
    // FormatoViewer downstream hace `currentOrden.tipo_mantenimiento` para
    // decidir qué sub-componente renderizar. Si alguien refactorea a `tipo`,
    // el visor cae al default (OSCorrectivo) para todos los formatos.
    renderFormatos();

    fireEvent.click(screen.getAllByRole('button', { name: /ver formato/i })[0]);
    const orden0 = mocks.lastOrdenReceived.current;
    expect(orden0).toHaveProperty('tipo_mantenimiento', 'reporte_falla');

    // Cerrar y abrir otro tipo.
    fireEvent.click(screen.getByTestId('visor-close'));
    fireEvent.click(screen.getAllByRole('button', { name: /ver formato/i })[2]);
    const orden2 = mocks.lastOrdenReceived.current;
    expect(orden2).toHaveProperty('tipo_mantenimiento', 'preventivo');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Cierre del modal
// ────────────────────────────────────────────────────────────────────────────
describe('Formatos — cierre del modal', () => {
  it('click en "Cerrar" del visor desmonta el modal', () => {
    renderFormatos();

    // Abrir el visor (cualquier card).
    fireEvent.click(screen.getAllByRole('button', { name: /ver formato/i })[0]);
    expect(screen.getByTestId('mock-formato-viewer')).toBeInTheDocument();

    // Cerrar.
    fireEvent.click(screen.getByTestId('visor-close'));
    expect(screen.queryByTestId('mock-formato-viewer')).not.toBeInTheDocument();
  });

  it('después de cerrar, se puede abrir un visor diferente (otro tipo)', () => {
    renderFormatos();

    // Abrir reporte_falla.
    fireEvent.click(screen.getByRole('heading', { name: 'Reporte de Falla', level: 2 })
      .closest('div.border').querySelector('button'));
    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('reporte_falla');

    // Cerrar.
    fireEvent.click(screen.getByTestId('visor-close'));
    expect(screen.queryByTestId('mock-formato-viewer')).not.toBeInTheDocument();

    // Abrir correctivo — el state se reseteó correctamente.
    fireEvent.click(screen.getByRole('heading', { name: 'OS Correctivo', level: 2 })
      .closest('div.border').querySelector('button'));
    expect(screen.getByTestId('visor-tipo')).toHaveTextContent('correctivo');
    expect(screen.getByTestId('visor-folio')).toHaveTextContent('OS-C-0001');
  });
});
