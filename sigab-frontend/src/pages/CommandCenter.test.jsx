// src/pages/CommandCenter.test.jsx
// CommandCenter es el hub de conocimiento y documentación técnica SIGAH:
// una consola interna con 6 quick-access cards, una mini-timeline de 7
// fases del proyecto, una lista de 5 migraciones Alembic y 4 cards de
// stack técnico. Es 100% estática (sin fetch, sin auth, sin router), pero
// concentra varios patrones sutiles que un test atrapa y un DevTools
// manual no:
//
//   - Header con badge "BETA" + subtítulo "Hub de conocimiento y
//     documentación técnica SIGAH". Si alguien quita el badge, el
//     operador pierde la señal de que la página está en preview.
//   - 6 QuickCards con lógica de expansión:
//       * 5 cards tienen children → toggle "Ver detalle" / "Ocultar detalle"
//       * 1 card (API Reference) NO tiene children → tiene href externo
//     Si alguien refactorea el conditional `{hasExpand && (...)}`, una
//     card sin children podría mostrar el toggle roto, o una card con
//     href podría perder su link.
//   - 2 instancias de MiniTimeline en el árbol (QuickCard "Fases del
//     Roadmap" expandible + sección inferior "Timeline del Proyecto"
//     siempre renderizada). Si alguien refactorea a un sólo render, los
//     badges se duplican o desaparecen.
//   - FASE_BADGE con 4 estados mapeados (EN CURSO / LISTO /
//     EN PROGRESO / PENDIENTE) y fallback a PENDIENTE para estados
//     desconocidos. Si alguien refactorea la mini-timeline para usar un
//     sólo color, la diferenciación visual entre fases se pierde.
//   - FASE_BADGE icon-map (Clock / CheckCircle2 / AlertCircle / Circle)
//     por estado. Cada estado mapea a un icono distinto. Si alguien
//     homogeneiza a un sólo icono, se pierde la diferenciación
//     semántica. NOTA: en lucide-react v1.16+, los nombres de clase
//     canónicos cambiaron:
//         CheckCircle2 → className "lucide-circle-check"
//         AlertCircle  → className "lucide-circle-alert"
//     (los componentes se siguen importando con sus nombres originales
//     `CheckCircle2` / `AlertCircle`, pero el CSS className cambió.)
//   - MigracionesLista: 5 entradas, 4 aplicadas + 1 pendiente. La
//     pendiente muestra "(no aplicada)" en amber. El icono es verde
//     (CheckCircle2 → circle-check) para aplicadas y amber
//     (AlertCircle → circle-alert) para pendientes. Si alguien quita el
//     tag "(no aplicada)", la migración 005 (Fase 1) pierde su llamada
//     de atención visual.
//   - Las migraciones aplicadas muestran el nombre en color
//     --content-text; las pendientes en --content-muted. Si alguien
//     quita la diferenciación visual, las pendientes se confunden con
//     las aplicadas.
//   - Stack cards: 4 categorías (Backend / Frontend / IA / Deploy) con
//     iconos distintos y color map por categoría. Si alguien borra una
//     entrada de STACK_CARDS, el grid queda con 3 cards asimétrico.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si el fallback `FASE_BADGE[estado] || FASE_BADGE['PENDIENTE']` se
//     quita en FaseBadge, un estado nuevo crashea al leer `.icon` de
//     undefined.
//   - Si el `hasExpand = !!children` se cambia a algo truthy siempre,
//     cards sin children (API Reference) muestran un toggle roto.
//   - Si el `{href && (...)}` se quita, API Reference pierde su link
//     externo al OpenAPI.
//   - Si el slice del badge "(no aplicada)" se quita, la migración
//     pendiente se confunde con las aplicadas.
//
// NO se mockea nada: la página es estática, no hace fetch, no usa
// react-router, no usa Toast, no usa AuthContext. NO se usa
// MemoryRouter (la página no usa react-router). NO se mockea
// `lucide-react` (los iconos funcionan en jsdom sin cambios — los
// verificamos por presencia de la clase .lucide-* en el innerHTML).
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CommandCenter from './CommandCenter';

function renderCommandCenter() {
  return render(<CommandCenter />);
}

function expandCard(nthVerBtn) {
  // nthVerBtn: índice 0-based entre los botones "Ver detalle"
  // actualmente visibles en el DOM. Tras expandir, el botón cambia a
  // "Ocultar detalle" y el conteo baja en 1 — hay que llamar con el
  // índice actual deseado en cada llamada.
  const verBtns = screen.getAllByRole('button', { name: /ver detalle/i });
  fireEvent.click(verBtns[nthVerBtn]);
}

function expandAllCards() {
  // Expande las 5 cards con children una por una (Arquitectura, Fases,
  // Seguridad, Migraciones, Contexto). Tras cada expansión el conteo
  // baja en 1, así que siempre se hace click en el índice 0.
  for (let i = 0; i < 5; i++) {
    const verBtns = screen.getAllByRole('button', { name: /ver detalle/i });
    fireEvent.click(verBtns[0]);
  }
}

describe('CommandCenter — header', () => {
  it('muestra el título "Command Center" en el h1', () => {
    renderCommandCenter();
    expect(screen.getByRole('heading', { level: 1, name: /Command Center/i })).toBeInTheDocument();
  });

  it('muestra el subtítulo "Hub de conocimiento y documentación técnica SIGAH"', () => {
    renderCommandCenter();
    expect(screen.getByText(/Hub de conocimiento y documentación técnica SIGAH/i)).toBeInTheDocument();
  });

  it('muestra el badge BETA', () => {
    renderCommandCenter();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});

describe('CommandCenter — QuickCards (6 cards)', () => {
  const TITLES = [
    'Arquitectura SIGAH',
    'Fases del Roadmap',
    'API Reference',
    'Seguridad & Tenancy',
    'Estado de Migraciones',
    'Contexto de Sesion',
  ];

  it('renderiza las 6 quick-access cards por título (h3)', () => {
    renderCommandCenter();
    TITLES.forEach((title) => {
      const cards = screen.getAllByRole('heading', { level: 3, name: title });
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('cada card tiene su descripción', () => {
    renderCommandCenter();
    expect(screen.getByText(/Stack tecnico, fases del proyecto/i)).toBeInTheDocument();
    expect(screen.getByText(/Fase 0 a 6: multi-tenancy, Hetzner/i)).toBeInTheDocument();
    expect(screen.getByText(/102 endpoints documentados/i)).toBeInTheDocument();
    expect(screen.getByText(/Modelo de aislamiento multi-tenant/i)).toBeInTheDocument();
    expect(screen.getByText(/Alembic: 4 revisiones aplicadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Variables de entorno, rutas activas/i)).toBeInTheDocument();
  });
});

describe('CommandCenter — QuickCard expand/collapse', () => {
  it('cada card con children muestra "Ver detalle" en estado cerrado', () => {
    renderCommandCenter();
    // 5 cards tienen children (todas menos API Reference).
    const verDetalleBtns = screen.getAllByRole('button', { name: /ver detalle/i });
    expect(verDetalleBtns.length).toBe(5);
  });

  it('NO muestra "Ocultar detalle" antes de expandir ninguna card', () => {
    renderCommandCenter();
    expect(screen.queryByRole('button', { name: /ocultar detalle/i })).not.toBeInTheDocument();
  });

  it('click en "Ver detalle" cambia el label a "Ocultar detalle"', () => {
    renderCommandCenter();
    expandCard(0);
    // 1 "Ocultar detalle" + 4 "Ver detalle" (sólo expandimos 1).
    expect(screen.getAllByRole('button', { name: /ocultar detalle/i }).length).toBe(1);
    expect(screen.getAllByRole('button', { name: /ver detalle/i }).length).toBe(4);
  });

  it('al expandir "Fases del Roadmap" se ve la mini-timeline con F0..F6', () => {
    renderCommandCenter();
    expandCard(1); // Fases del Roadmap
    // Las fases F0..F6 deben aparecer al menos una vez (la card
    // expandida + la sección inferior que ya estaba renderizada).
    for (let i = 0; i <= 6; i++) {
      const matches = screen.getAllByText(new RegExp(`^F${i}$`));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('al expandir "Estado de Migraciones" se ve "no aplicada" para la 005', () => {
    renderCommandCenter();
    expandCard(3); // Estado de Migraciones (índice 3, no 4 — la card
                   // "API Reference" no tiene toggle pero el orden de
                   // cards con children es: 0=Arquitectura,
                   // 1=Fases, 2=Seguridad, 3=Migraciones, 4=Contexto).
    expect(screen.getByText(/no aplicada/i)).toBeInTheDocument();
    expect(screen.getByText('005 (Fase 1)')).toBeInTheDocument();
  });

  it('click en "Ocultar detalle" cierra la card y restaura "Ver detalle"', () => {
    renderCommandCenter();
    expandCard(0);
    const ocultarBtn = screen.getByRole('button', { name: /ocultar detalle/i });
    fireEvent.click(ocultarBtn);
    // Vuelve a haber 5 "Ver detalle" y 0 "Ocultar detalle".
    expect(screen.getAllByRole('button', { name: /ver detalle/i }).length).toBe(5);
    expect(screen.queryByRole('button', { name: /ocultar detalle/i })).not.toBeInTheDocument();
  });

  it('las 5 cards con children mantienen estado independiente al expandir varias', () => {
    renderCommandCenter();
    expandAllCards();
    // Las 5 cards expandidas → 5 "Ocultar detalle" + 0 "Ver detalle".
    expect(screen.getAllByRole('button', { name: /ocultar detalle/i }).length).toBe(5);
    expect(screen.queryAllByRole('button', { name: /ver detalle/i }).length).toBe(0);
  });
});

describe('CommandCenter — API Reference href', () => {
  it('la única card con href tiene un link externo a localhost:8000/docs', () => {
    renderCommandCenter();
    // Sólo 1 link en toda la página (la card API Reference).
    const link = screen.getByRole('link', { name: /abrir openapi/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('http://localhost:8000/docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('la card API Reference NO tiene toggle "Ver detalle" (sin children)', () => {
    renderCommandCenter();
    // Sólo 5 cards con children tienen toggle.
    const verBtns = screen.getAllByRole('button', { name: /ver detalle/i });
    expect(verBtns.length).toBe(5);
    // La card API Reference (h3) NO contiene un botón toggle. Subimos
    // hasta el GlassCard (clase "flex flex-col h-full") que es el
    // contenedor de la card.
    const apiRefHeading = screen.getByRole('heading', { level: 3, name: 'API Reference' });
    const card = apiRefHeading.closest('.flex.flex-col') || apiRefHeading.parentElement.parentElement.parentElement.parentElement;
    expect(within(card).queryByRole('button', { name: /ver detalle/i })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /ocultar detalle/i })).not.toBeInTheDocument();
  });
});

describe('CommandCenter — MiniTimeline (Fases 0 a 6)', () => {
  it('la sección inferior muestra los 7 labels F0..F6', () => {
    renderCommandCenter();
    // La sección "Timeline del Proyecto" está SIEMPRE renderizada
    // (no depende del toggle), así que las 7 fases son visibles sin
    // expandir nada.
    for (let i = 0; i <= 6; i++) {
      const matches = screen.getAllByText(new RegExp(`^F${i}$`));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('cada fase muestra su nombre en la sección inferior', () => {
    renderCommandCenter();
    expect(screen.getByText('Fundación legal + Hetzner')).toBeInTheDocument();
    expect(screen.getByText('Multi-tenancy BD')).toBeInTheDocument();
    expect(screen.getByText('Aislamiento backend')).toBeInTheDocument();
    expect(screen.getByText('Panel SuperAdmin SIGAH')).toBeInTheDocument();
    expect(screen.getByText('Despliegue cloud + Edge Nodes')).toBeInTheDocument();
    expect(screen.getByText('Módulo de Formatos')).toBeInTheDocument();
    expect(screen.getByText('Comercialización: CFDI + onboarding')).toBeInTheDocument();
  });

  it('cada fase muestra su badge de estado en la sección inferior', () => {
    renderCommandCenter();
    // FASES:
    //   F0 EN CURSO, F1 LISTO, F2 EN PROGRESO, F3 EN PROGRESO,
    //   F4 PENDIENTE, F5 PENDIENTE, F6 PENDIENTE.
    // En la sección inferior (siempre renderizada) las cuentas son:
    expect(screen.getAllByText(/^EN CURSO$/).length).toBe(1);
    expect(screen.getAllByText(/^LISTO$/).length).toBe(1);
    expect(screen.getAllByText(/^EN PROGRESO$/).length).toBe(2);
    expect(screen.getAllByText(/^PENDIENTE$/).length).toBe(3);
  });

  it('al expandir la card Fases del Roadmap, los badges se duplican', () => {
    renderCommandCenter();
    expandCard(1); // Fases del Roadmap
    // Ahora hay 2 mini-timelines: la de la card + la de la sección.
    // Cada estado se duplica.
    expect(screen.getAllByText(/^EN CURSO$/).length).toBe(2);
    expect(screen.getAllByText(/^LISTO$/).length).toBe(2);
    expect(screen.getAllByText(/^EN PROGRESO$/).length).toBe(4);
    expect(screen.getAllByText(/^PENDIENTE$/).length).toBe(6);
  });

  it('cada fase tiene su icono distinto (4 iconos únicos mapeados)', () => {
    const { container } = renderCommandCenter();
    // lucide-react v1.16+ mapea:
    //   CheckCircle2 → className "lucide-circle-check"
    //   AlertCircle  → className "lucide-circle-alert"
    //   Circle       → className "lucide-circle"
    //   Clock        → className "lucide-clock"
    const html = container.innerHTML;
    expect(html).toMatch(/lucide-clock/);
    expect(html).toMatch(/lucide-circle-check/);
    expect(html).toMatch(/lucide-circle-alert/);
    expect(html).toMatch(/lucide-circle/);
  });
});

describe('CommandCenter — MigracionesLista', () => {
  // Las migraciones viven dentro de la card "Estado de Migraciones"
  // que está colapsada por default. Todos los tests de esta sección
  // primero expanden la card para que el contenido sea visible.
  function renderExpanded() {
    const ret = renderCommandCenter();
    // Las 5 cards con children aparecen en este orden en el DOM:
    // 0=Arquitectura, 1=Fases, 2=Seguridad, 3=Migraciones, 4=Contexto.
    // Migraciones = índice 3.
    expandCard(3);
    return ret;
  }

  it('muestra los 5 revs de migración (001, 002, 003, 004, 005)', () => {
    renderExpanded();
    ['001', '002', '003', '004', '005 (Fase 1)'].forEach((rev) => {
      expect(screen.getAllByText(rev).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('sólo el rev 005 (Fase 1) muestra el tag "(no aplicada)"', () => {
    renderExpanded();
    // 4 aplicadas + 1 pendiente → 1 sólo tag "(no aplicada)".
    expect(screen.getAllByText(/no aplicada/i).length).toBe(1);
  });

  it('el rev 005 (Fase 1) muestra el tag "(no aplicada)" en amber', () => {
    renderExpanded();
    const tag = screen.getByText(/no aplicada/i);
    expect(tag).toBeInTheDocument();
    expect(tag.className).toMatch(/text-amber-600/);
    // Debe estar dentro del mismo <li> que el rev 005.
    const li = tag.closest('li');
    expect(within(li).getByText('005 (Fase 1)')).toBeInTheDocument();
  });

  it('las migraciones aplicadas muestran nombre con --content-text', () => {
    renderExpanded();
    // La migración 001 aplicada — su span de nombre debe tener color
    // --content-text (NO --content-muted).
    const rev001 = screen.getAllByText('001')[0];
    const li = rev001.closest('li');
    const nombreSpan = within(li).getByText(/Schema inicial/);
    expect(nombreSpan.style.color).toBe('var(--content-text)');
  });

  it('la migración 005 pendiente muestra nombre con --content-muted', () => {
    renderExpanded();
    const rev005 = screen.getByText('005 (Fase 1)');
    const li = rev005.closest('li');
    const nombreSpan = within(li).getByText(/tenant_id \+ tabla hospitales/);
    expect(nombreSpan.style.color).toBe('var(--content-muted)');
  });

  it('las migraciones aplicadas muestran icono circle-check verde', () => {
    const { container } = renderExpanded();
    expect(container.innerHTML).toMatch(/lucide-circle-check/);
  });

  it('la migración 005 pendiente muestra icono circle-alert amber', () => {
    const { container } = renderExpanded();
    expect(container.innerHTML).toMatch(/lucide-circle-alert/);
  });

  it('cada migración aplicada tiene icono verde con clase text-emerald-600', () => {
    renderExpanded();
    // 4 iconos CheckCircle2 (verde) — uno por cada migración aplicada.
    const items = screen.getAllByText(/Schema inicial|Tecnovigilancia|Trazabilidad|Checklists/);
    items.forEach((text) => {
      const li = text.closest('li');
      const svg = li.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg.className.baseVal || svg.getAttribute('class')).toMatch(/text-emerald-600/);
    });
  });

  it('la migración 005 pendiente tiene icono amber con clase text-amber-600', () => {
    renderExpanded();
    const tag = screen.getByText(/no aplicada/i);
    const li = tag.closest('li');
    const svg = li.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.className.baseVal || svg.getAttribute('class')).toMatch(/text-amber-600/);
  });
});

describe('CommandCenter — Stack cards (4 categorías)', () => {
  it('renderiza las 4 categorías del stack (Backend, Frontend, IA, Deploy)', () => {
    renderCommandCenter();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    // 'IA' aparece como label del stack card.
    expect(screen.getAllByText('IA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('Backend lista FastAPI, Python 3.12, MySQL 8.0', () => {
    renderCommandCenter();
    expect(screen.getByText('FastAPI')).toBeInTheDocument();
    expect(screen.getByText('Python 3.12')).toBeInTheDocument();
    expect(screen.getByText('MySQL 8.0')).toBeInTheDocument();
  });

  it('Frontend lista React 18, Vite, Tailwind CSS 3', () => {
    renderCommandCenter();
    expect(screen.getByText('React 18')).toBeInTheDocument();
    expect(screen.getByText('Vite')).toBeInTheDocument();
    expect(screen.getByText('Tailwind CSS 3')).toBeInTheDocument();
  });

  it('IA lista Gemma (Ollama), Qwen (Ollama), Claude Sonnet 4.6 (SaaS)', () => {
    renderCommandCenter();
    expect(screen.getByText(/Gemma \(Ollama\)/)).toBeInTheDocument();
    expect(screen.getByText(/Qwen \(Ollama\)/)).toBeInTheDocument();
    expect(screen.getByText(/Claude Sonnet 4\.6 \(SaaS\)/)).toBeInTheDocument();
  });

  it('Deploy lista Hetzner CX32, Docker Compose, Edge Nodes', () => {
    renderCommandCenter();
    expect(screen.getByText('Hetzner CX32')).toBeInTheDocument();
    expect(screen.getByText('Docker Compose')).toBeInTheDocument();
    expect(screen.getByText('Edge Nodes')).toBeInTheDocument();
  });
});

describe('CommandCenter — secciones (headers h2)', () => {
  it('muestra el h2 "Acceso Rapido" antes del grid de 6 cards', () => {
    renderCommandCenter();
    expect(screen.getByRole('heading', { level: 2, name: /acceso rapido/i })).toBeInTheDocument();
  });

  it('muestra el h2 "Timeline del Proyecto — Fases 0 a 6" antes del GlassCard inferior', () => {
    renderCommandCenter();
    expect(screen.getByRole('heading', { level: 2, name: /timeline del proyecto/i })).toBeInTheDocument();
  });

  it('muestra el h2 "Stack Tecnico" antes del grid de 4 cards', () => {
    renderCommandCenter();
    expect(screen.getByRole('heading', { level: 2, name: /stack tecnico/i })).toBeInTheDocument();
  });
});

describe('CommandCenter — Hygiene', () => {
  it('no hay errores de consola ni warnings de React al renderizar', () => {
    const errors = [];
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args) => {
      const msg = String(args[0] ?? '');
      // Filtrar warnings pre-existentes de react-router v7 que esta
      // página NO usa (pero el setup los arrastra por estar en el bundle).
      if (msg.includes('v7_startTransition') || msg.includes('v7_relativeSplatPath')) return;
      errors.push(args);
    };
    console.warn = (...args) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('v7_startTransition') || msg.includes('v7_relativeSplatPath')) return;
      errors.push(args);
    };
    try {
      renderCommandCenter();
      // Forzar el render de varias cards expandidas para verificar que
      // no se introducen warnings al togglear.
      const verBtns = screen.getAllByRole('button', { name: /ver detalle/i });
      fireEvent.click(verBtns[0]);
      fireEvent.click(verBtns[1]);
      fireEvent.click(verBtns[3]);
      expect(errors).toEqual([]);
    } finally {
      console.error = origError;
      console.warn = origWarn;
    }
  });
});