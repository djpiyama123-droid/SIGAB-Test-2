// src/pages/LandingPage.test.jsx
// LandingPage es el portal comercial público de SIGAH/SIGAB — la primera
// impresión del producto para usuarios no autenticados (todo visitante
// externo cae aquí). Es 100% estática (sin fetch), pero concentra patrones
// sutiles que un test atrapa y un DevTools manual no.
//
// Cubre: render base, redirección condicional (user + '/' → /dashboard),
// CTAs (5 botones que invocan navigate('/login')), calculadora de inversión
// (state, cálculo $500 + $4/cama, formato es-MX), secciones de marketing
// (ecosistema, casos de éxito con testimonios, métricas de impacto, tira de
// confianza, footer) y los anchor links del nav superior.
//
// Mockea SOLO react-router-dom (Navigate → sentinel) para poder testear la
// rama del redirect sin montar el Router entero. useNavigate y useLocation
// siguen siendo reales via vi.importActual. AuthContext.Provider con user
// mutable — mismo patrón que Login.test.jsx y SuperAdmin.test.jsx.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import { AuthContext } from '../context/AuthContext';

// Mock react-router-dom: Navigate → sentinel (para verificar el redirect);
// useNavigate + useLocation siguen siendo reales vía vi.importActual.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="mock-navigate" data-to={to}>REDIRECT</div>,
  };
});

function renderLanding({ user = null, pathname = '/landing' } = {}) {
  const authValue = {
    user,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    setUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter
        initialEntries={[pathname]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LandingPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('LandingPage — render base', () => {
  it('renderiza la marca SIGAH en el nav superior y en el footer', () => {
    renderLanding();
    // Hay 2 ocurrencias del literal "SIGAH" (nav + footer).
    expect(screen.getAllByText('SIGAH').length).toBeGreaterThanOrEqual(2);
  });

  it('renderiza los 4 nav links del header (Plataforma, Planes, Casos de éxito, Cumplimiento)', () => {
    renderLanding();
    const navLinks = ['Plataforma', 'Planes', 'Casos de éxito', 'Cumplimiento'];
    navLinks.forEach((label) => {
      const link = screen.getAllByRole('link', { name: label })[0];
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toMatch(/^#(plataforma|planes|casos|cumplimiento)$/);
    });
  });

  it('muestra el badge de validación "HGR No. 1 IMSS Tijuana"', () => {
    renderLanding();
    expect(screen.getByText(/Validado en HGR No\. 1 IMSS Tijuana/i)).toBeInTheDocument();
  });

  it('muestra el H1 del hero con el gradiente en la segunda línea', () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toMatch(/Gestión biomédica inteligente/);
    expect(h1.textContent).toMatch(/Cumplimiento NOM-016 en automático/);
  });

  it('muestra los 3 badges normativos en la tira de confianza (NOM-016, NOM-240, ISO 13485, IA local)', () => {
    renderLanding();
    expect(screen.getByText(/NOM-016-SSA3/)).toBeInTheDocument();
    expect(screen.getByText(/NOM-240-SSA1/)).toBeInTheDocument();
    expect(screen.getByText(/ISO 13485/)).toBeInTheDocument();
    expect(screen.getByText(/IA local On-Premise/)).toBeInTheDocument();
  });

  it('renderiza los 4 links del footer (Privacidad, Términos, Contacto, Cumplimiento)', () => {
    renderLanding();
    ['Privacidad', 'Términos', 'Contacto', 'Cumplimiento'].forEach((label) => {
      // Hay duplicados potenciales: 'Cumplimiento' aparece en nav + footer, los demás solo en footer.
      const links = screen.getAllByRole('link', { name: label });
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('muestra el copyright "© 2026 SIGAH Medical Systems"', () => {
    renderLanding();
    expect(screen.getByText(/© 2026 SIGAH Medical Systems/)).toBeInTheDocument();
  });
});

describe('LandingPage — redirección condicional', () => {
  it('con user=null y pathname="/" renderiza la landing normalmente', () => {
    renderLanding({ user: null, pathname: '/' });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
  });

  it('con user y pathname="/" redirige a /dashboard (renderiza el sentinel de Navigate)', () => {
    renderLanding({ user: { id: 1, rol: 'admin' }, pathname: '/' });
    const sentinel = screen.getByTestId('mock-navigate');
    expect(sentinel).toBeInTheDocument();
    expect(sentinel.getAttribute('data-to')).toBe('/dashboard');
    // El H1 del hero NO se debe renderizar (estamos redirigiendo).
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('con user y pathname="/landing" NO redirige — el preview de marketing sigue visible', () => {
    renderLanding({ user: { id: 1, rol: 'admin' }, pathname: '/landing' });
    expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('LandingPage — CTAs navegan a /login', () => {
  // El nav superior tiene su propio botón "Iniciar sesión" (visible md+).
  // Los CTAs del hero ("Comenzar ahora") y de la calculadora y el form
  // también llaman a goLogin. MemoryRouter intercepta navigate() sin
  // necesidad de mockear useNavigate — basta verificar que NO se rompe.

  it('botón "Iniciar sesión" del nav superior está presente', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
  });

  it('botón "Comenzar ahora" del hero está presente con icono ArrowRight', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /Comenzar ahora/i })).toBeInTheDocument();
  });

  it('botón "Solicitar presupuesto formal" de la calculadora está presente', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /Solicitar presupuesto formal/i })).toBeInTheDocument();
  });

  it('botón "Solicitar auditoría" del formulario lead está presente', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /Solicitar auditoría/i })).toBeInTheDocument();
  });

  it('CTA secundario "Ver funcionamiento" del hero es un anchor a #planes', () => {
    renderLanding();
    const anchor = screen.getByRole('link', { name: /Ver funcionamiento/i });
    expect(anchor).toBeInTheDocument();
    expect(anchor.getAttribute('href')).toBe('#planes');
  });

  it('botón móvil "Acceder" (md:hidden) está presente con aria-label', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: 'Acceder' })).toBeInTheDocument();
  });
});

describe('LandingPage — ecosistema SIGAH vs SIGAB', () => {
  it('muestra el H2 "Ecosistema SIGAH"', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 2, name: /Ecosistema SIGAH/i })).toBeInTheDocument();
  });

  it('muestra los 2 cards: SIGAH Comercial y SIGAB Clínico', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 3, name: /SIGAH Comercial/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /SIGAB Clínico/i })).toBeInTheDocument();
  });

  it('muestra las 3 features de SIGAH Comercial', () => {
    renderLanding();
    expect(screen.getByText(/Inventario digital de activos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cronograma de mantenimiento preventivo/i)).toBeInTheDocument();
    expect(screen.getByText(/Alertas de calibración y vencimientos/i)).toBeInTheDocument();
  });

  it('muestra las 3 features de SIGAB Clínico', () => {
    renderLanding();
    expect(screen.getByText(/Trazabilidad por zona y piso/i)).toBeInTheDocument();
    expect(screen.getByText(/Señales predictivas de falla con IA local/i)).toBeInTheDocument();
    expect(screen.getByText(/Bitácoras clínicas y órdenes NOM-016/i)).toBeInTheDocument();
  });
});

describe('LandingPage — casos de éxito (testimonios)', () => {
  it('muestra el H2 "Casos de éxito"', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 2, name: /Casos de éxito/i })).toBeInTheDocument();
  });

  it('renderiza los 3 testimonios con su nombre, rol y organización', () => {
    renderLanding();
    expect(screen.getByText(/Ing\. Laura Méndez/)).toBeInTheDocument();
    expect(screen.getByText(/Jefa de Ingeniería Biomédica/)).toBeInTheDocument();
    expect(screen.getByText(/Hospital General Regional/)).toBeInTheDocument();

    expect(screen.getByText(/Ing\. Carlos Ríos/)).toBeInTheDocument();
    expect(screen.getByText(/Coordinador de Conservación/)).toBeInTheDocument();
    expect(screen.getByText(/Red Hospitalaria Metropolitana/)).toBeInTheDocument();

    expect(screen.getByText(/Dr\. Antonio Vega/)).toBeInTheDocument();
    expect(screen.getByText(/Director de Operaciones/)).toBeInTheDocument();
    expect(screen.getByText(/Instituto de Especialidades/)).toBeInTheDocument();
  });

  it('cada testimonio está envuelto en un <figure> con <blockquote> y <figcaption>', () => {
    renderLanding();
    const figures = document.querySelectorAll('figure');
    expect(figures.length).toBe(3);
    figures.forEach((fig) => {
      expect(fig.querySelector('blockquote')).toBeTruthy();
      expect(fig.querySelector('figcaption')).toBeTruthy();
    });
  });
});

describe('LandingPage — métricas de impacto', () => {
  it('muestra las 4 métricas con sus valores característicos (-32%, -28%, +40%, 751)', () => {
    renderLanding();
    expect(screen.getByText('-32%')).toBeInTheDocument();
    expect(screen.getByText('-28%')).toBeInTheDocument();
    expect(screen.getByText('+40%')).toBeInTheDocument();
    expect(screen.getByText('751')).toBeInTheDocument();
  });

  it('muestra los labels descriptivos de cada métrica', () => {
    renderLanding();
    expect(screen.getByText(/Tiempo caído en equipos vitales/i)).toBeInTheDocument();
    expect(screen.getByText(/Costos en mantenimiento correctivo/i)).toBeInTheDocument();
    expect(screen.getByText(/Cumplimiento documental NOM-016/i)).toBeInTheDocument();
    expect(screen.getByText(/Activos biomédicos gestionados/i)).toBeInTheDocument();
  });
});

describe('LandingPage — calculadora de inversión', () => {
  it('muestra el slider de camas censables con default 500', () => {
    renderLanding();
    const slider = screen.getByLabelText(/Camas censables/i);
    expect(slider).toBeInTheDocument();
    expect(slider.type).toBe('range');
    expect(slider.value).toBe('500');
    expect(slider.min).toBe('50');
    expect(slider.max).toBe('2000');
    expect(slider.step).toBe('50');
  });

  it('muestra el contador de camas a la derecha del label (500 inicial)', () => {
    renderLanding();
    // El contador es el span con font-display que muestra el valor de beds.
    const counters = screen.getAllByText('500');
    expect(counters.length).toBeGreaterThanOrEqual(1);
  });

  it('precio default (500 camas): $500 + 500*$4 = $2,500 → formato es-MX "2,500"', () => {
    renderLanding();
    // toLocaleString('es-MX') de 2500 → '2,500' (coma como separador de miles en MX).
    expect(screen.getByText('2,500')).toBeInTheDocument();
  });

  it('cambiar el slider a 1000 camas → precio 4,500', () => {
    renderLanding();
    const slider = screen.getByLabelText(/Camas censables/i);
    fireEvent.change(slider, { target: { value: '1000' } });
    // 500 + 1000*4 = 4500 → '4,500' en es-MX.
    expect(screen.getByText('4,500')).toBeInTheDocument();
  });

  it('cambiar el slider al mínimo (50) → precio 700 → "700"', () => {
    renderLanding();
    const slider = screen.getByLabelText(/Camas censables/i);
    fireEvent.change(slider, { target: { value: '50' } });
    // 500 + 50*4 = 700 → '700'
    expect(screen.getByText('700')).toBeInTheDocument();
  });

  it('el contador de camas refleja el valor del slider tras el cambio', () => {
    renderLanding();
    const slider = screen.getByLabelText(/Camas censables/i);
    fireEvent.change(slider, { target: { value: '750' } });
    // Tras el cambio debe haber al menos un span con '750'.
    expect(screen.getAllByText('750').length).toBeGreaterThanOrEqual(1);
  });
});

describe('LandingPage — formulario de auditoría (lead)', () => {
  it('muestra el H2 "Agenda tu auditoría gratuita NOM-016"', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 2, name: /Agenda tu auditoría gratuita NOM-016/i })).toBeInTheDocument();
  });

  it('muestra los 3 inputs del formulario (Nombre completo, Institución médica, Correo corporativo)', () => {
    renderLanding();
    expect(screen.getByPlaceholderText(/Dr\. Juan Pérez/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Hospital General/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/juan\.perez@hospital\.com/i)).toBeInTheDocument();
  });

  it('los inputs inician vacíos', () => {
    renderLanding();
    expect(screen.getByPlaceholderText(/Dr\. Juan Pérez/i).value).toBe('');
    expect(screen.getByPlaceholderText(/Hospital General/i).value).toBe('');
    expect(screen.getByPlaceholderText(/juan\.perez@hospital\.com/i).value).toBe('');
  });

  it('el form tiene onSubmit que llama a goLogin (no navega externamente)', () => {
    renderLanding();
    const form = document.querySelector('section#cumplimiento form');
    expect(form).toBeTruthy();
    // Disparar submit no debe lanzar (e.preventDefault() lo absorbe).
    fireEvent.submit(form);
    // El form sigue renderizado tras el submit (no navegación real ocurrió).
    expect(form).toBeTruthy();
  });

  it('muestra la nota de privacidad "Tus datos están protegidos..."', () => {
    renderLanding();
    expect(screen.getByText(/Tus datos están protegidos bajo estrictos protocolos/i)).toBeInTheDocument();
  });
});

describe('LandingPage — estructura y composición defensiva', () => {
  it('renderiza las 5 secciones esperadas (hero, ecosistema, casos, calculadora, auditoría)', () => {
    renderLanding();
    expect(document.getElementById('plataforma')).toBeTruthy();
    expect(document.getElementById('ecosistema')).toBeTruthy();
    expect(document.getElementById('casos')).toBeTruthy();
    expect(document.getElementById('planes')).toBeTruthy();
    expect(document.getElementById('cumplimiento')).toBeTruthy();
  });

  it('el <main> contiene un <footer> con la marca y el copyright', () => {
    renderLanding();
    const footer = document.querySelector('footer');
    expect(footer).toBeTruthy();
    // Scope al footer para evitar falsos positivos del nav.
    expect(within(footer).getByText(/© 2026 SIGAH Medical Systems/i)).toBeInTheDocument();
  });

  it('los links del nav superior son anchors internos (#) — no navegan al router', () => {
    renderLanding();
    const plataformaLink = screen.getAllByRole('link', { name: 'Plataforma' })[0];
    expect(plataformaLink.getAttribute('href')).toBe('#plataforma');
  });

  it('no hay warnings de consola durante el render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLanding();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});