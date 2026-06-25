// src/pages/SuperAdmin.test.jsx
// SuperAdmin es el panel de operación multi-inquilino (panel centralizado
// para gestionar hospitales IMSS en la plataforma SaaS). Concentra
// patrones sutiles:
//
//   - 3 KPIs derivados de listas en useState (Inquilinos Activos filtra
//     estado==='activo'; Nodos Conectados filtra estado==='online'; las
//     "Peticiones Totales" son un valor hardcoded — si alguien rompe los
//     filtros, el panel reporta un número incorrecto de hospitales vivos).
//
//   - Tabla de inquilinos con badge dinámico por plan (Red Metropolitana
//     vs default), badge dinámico por estado (activo→emerald, suspendido→red),
//     y un botón ToggleLeft/ToggleRight que invierte el estado. Si alguien
//     rompe el ternario de clase CSS, un hospital suspendido puede pintarse
//     verde o viceversa — bug silencioso.
//
//   - Formulario "Registrar Hospital" oculto por default. Aparece con
//     framer-motion al click. Valida que nombre Y slug estén presentes
//     antes de crear; hace slug.toLowerCase().replace(/\s+/g, '-') sobre el
//     input. Si alguien rompe el validate, el operador puede registrar
//     un hospital sin nombre y queda en la tabla como fila fantasma.
//
//   - Búsqueda por nombre o slug (case-insensitive). Si alguien rompe el
//     filtro, el operador no puede localizar un hospital específico.
//
//   - Panel de topología con 3 nodos hardcoded (VPS, Terminal Física,
//     Hospital Edge Node). Si alguien borra uno, el panel pierde cobertura.
//
//   - Logs de auditoría con 4 entradas de tipos info/success/warning/error.
//     El ternario de color (text-emerald-600 / amber / red / blue) mapea
//     tipo→color — si alguien refactorea, un "error" puede pintarse verde.
//
//   - Botón "Salir del Panel" invoca useAuth().logout(). Si alguien
//     desconecta el handler, el superadmin no puede salir y la sesión
//     queda atrapada.
//
// Mocks: AuthContext.Provider con logout espía (mismo patrón que
// ProtectedRoute.test.jsx / Login.test.jsx). framer-motion se monta tal
// cual en jsdom — sólo anima opacity/transform, no hay timers externos.
// lucide-react funciona en jsdom sin cambios.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SuperAdmin from './SuperAdmin';

const mockLogout = vi.fn();

beforeEach(() => {
  mockLogout.mockReset();
});

afterEach(() => {
  cleanup();
});

function renderSuperAdmin() {
  const authValue = {
    user: { rol: 'superadmin', nombre: 'Operador' },
    loading: false,
    login: vi.fn(),
    logout: mockLogout,
    setUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <SuperAdmin />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────
// Header / brand
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — header y marca', () => {
  beforeEach(() => renderSuperAdmin());

  it('muestra la marca "SIGAH" + dominio ".mx" en el header', () => {
    expect(screen.getByText('SIGAH')).toBeInTheDocument();
    expect(screen.getByText('.mx')).toBeInTheDocument();
  });

  it('muestra el subtítulo "SuperAdmin Command Center"', () => {
    expect(screen.getByText(/SuperAdmin Command Center/i)).toBeInTheDocument();
  });

  it('muestra el badge "Ollama local: Activo" (estado del LLM)', () => {
    expect(screen.getByText(/Ollama local: Activo/i)).toBeInTheDocument();
  });

  it('muestra el botón "Salir del Panel"', () => {
    expect(screen.getByRole('button', { name: /Salir del Panel/i })).toBeInTheDocument();
  });

  it('click en "Salir del Panel" invoca useAuth().logout()', () => {
    fireEvent.click(screen.getByRole('button', { name: /Salir del Panel/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// KPIs (los 3 cards derivados)
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — KPIs derivados', () => {
  beforeEach(() => renderSuperAdmin());

  it('"Inquilinos Activos" cuenta 2 (3 tenants, 1 suspendido)', () => {
    const card = screen.getByText('Inquilinos Activos').closest('div').parentElement;
    expect(within(card).getByText('2')).toBeInTheDocument();
  });

  it('"Nodos Conectados" cuenta 3 (todos online)', () => {
    const card = screen.getByText('Nodos Conectados').closest('div').parentElement;
    expect(within(card).getByText('3')).toBeInTheDocument();
  });

  it('"Peticiones Totales (Hoy)" muestra 15.5k hardcoded', () => {
    const card = screen.getByText(/Peticiones Totales/i).closest('div').parentElement;
    expect(within(card).getByText('15.5k')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Tabla de inquilinos
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — tabla de inquilinos', () => {
  beforeEach(() => renderSuperAdmin());

  it('renderiza las 3 columnas del header (Nombre, Subdominio, Plan, Base Datos, Estado)', () => {
    expect(screen.getByText('Nombre / ID')).toBeInTheDocument();
    expect(screen.getByText(/Subdominio \/ Slug/i)).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Base Datos')).toBeInTheDocument();
    expect(screen.getByText(/Estado \/ Acciones/i)).toBeInTheDocument();
  });

  it('muestra los 3 tenants hardcoded con su slug.sigah.mx', () => {
    expect(screen.getByText('HGR No. 1 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.getByText('HGR No. 20 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.getByText('HGP Ginecopediatría Tijuana')).toBeInTheDocument();
    // Cada fila muestra el slug con el dominio concatenado
    expect(screen.getByText('hgr-1-tijuana.sigah.mx')).toBeInTheDocument();
    expect(screen.getByText('hgp-tijuana.sigah.mx')).toBeInTheDocument();
  });

  it('el plan "Red Metropolitana" lleva clases distintivas vs el default', () => {
    // Scope a la fila del tenant id 1 (HGR No. 1 — plan Red Metropolitana)
    const redMetroRow = screen.getByText('HGR No. 1 IMSS Tijuana').closest('tr');
    const planBadge = within(redMetroRow).getByText('Red Metropolitana');
    expect(planBadge.className).toContain('bg-blue-500/10');
    expect(planBadge.className).toContain('text-blue-600');
    // Plan default (Hospital Singular) en id 2 usa clases neutras
    const hospitalSingularRow = screen.getByText('HGR No. 20 IMSS Tijuana').closest('tr');
    const planDefault = within(hospitalSingularRow).getByText('Hospital Singular');
    expect(planDefault.className).not.toContain('bg-blue-500/10');
  });

  it('muestra badges "activo" en emerald y "suspendido" en red', () => {
    // Hay 2 badges "activo" en el fixture inicial (id 1, id 2)
    const activos = screen.getAllByText('activo');
    expect(activos.length).toBeGreaterThanOrEqual(2);
    activos.forEach((b) => {
      expect(b.className).toContain('text-emerald-600');
    });
    // El "suspendido" del id 3 lleva clase roja
    const suspendido = screen.getByText('suspendido');
    expect(suspendido.className).toContain('text-red-600');
  });

  it('el botón toggle del tenant #1 muestra ToggleRight (estado activo)', () => {
    // 2 tenants activos → 2 ToggleRight
    const activeToggles = document.querySelectorAll('.text-emerald-600.lucide-toggle-right');
    expect(activeToggles.length).toBe(2);
  });

  it('el botón toggle del tenant suspendido (id 3) muestra ToggleLeft', () => {
    const suspendedToggle = document.querySelector('.lucide-toggle-left');
    expect(suspendedToggle).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────
// Toggle de estado (activo ↔ suspendido)
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — toggle estado de inquilino', () => {
  beforeEach(() => renderSuperAdmin());

  it('click en el toggle del tenant suspendido (id 3) lo cambia a activo', () => {
    // Antes: 2 activos, 1 suspendido
    expect(screen.getAllByText('activo').length).toBe(2);
    expect(screen.getByText('suspendido')).toBeInTheDocument();
    // KPI "Inquilinos Activos" = 2
    const kpiActivos = screen.getByText('Inquilinos Activos').closest('div').parentElement;
    expect(within(kpiActivos).getByText('2')).toBeInTheDocument();

    // Click en el toggle del suspendido
    const suspendedRow = screen.getByText('suspendido').closest('tr');
    const toggleBtn = within(suspendedRow).getByRole('button');
    fireEvent.click(toggleBtn);

    // Después: 3 activos, 0 suspendidos
    expect(screen.getAllByText('activo').length).toBe(3);
    expect(screen.queryByText('suspendido')).not.toBeInTheDocument();
    // KPI se actualiza a 3
    expect(within(kpiActivos).getByText('3')).toBeInTheDocument();
  });

  it('click en el toggle de un activo lo cambia a suspendido', () => {
    // El primer activo (id 1) → click → suspendido
    const activeRow = screen.getByText('HGR No. 1 IMSS Tijuana').closest('tr');
    const toggleBtn = within(activeRow).getByRole('button');
    fireEvent.click(toggleBtn);

    // Tras el click, ese tenant específico muestra "suspendido" (scope a la fila)
    expect(within(activeRow).getByText('suspendido')).toBeInTheDocument();
    // KPIs: 1 activo (id 2)
    const kpiActivos = screen.getByText('Inquilinos Activos').closest('div').parentElement;
    expect(within(kpiActivos).getByText('1')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Formulario "Registrar Hospital"
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — formulario "Registrar Hospital"', () => {
  beforeEach(() => renderSuperAdmin());

  it('el formulario NO está visible inicialmente', () => {
    expect(screen.queryByText('Nuevo Registro')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Hospital de Especialidades No. 2')).not.toBeInTheDocument();
  });

  it('click en "Registrar Hospital" muestra el formulario', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    expect(screen.getByText('Nuevo Registro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hospital de Especialidades No. 2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('hgr-2-tijuana')).toBeInTheDocument();
  });

  it('los inputs de nombre y slug se rellenan con typing', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    const nameInput = screen.getByPlaceholderText('Hospital de Especialidades No. 2');
    const slugInput = screen.getByPlaceholderText('hgr-2-tijuana');
    fireEvent.change(nameInput, { target: { value: 'Hospital Angeles Lindavista' } });
    fireEvent.change(slugInput, { target: { value: 'HA-Lindavista' } });
    expect(nameInput.value).toBe('Hospital Angeles Lindavista');
    expect(slugInput.value).toBe('HA-Lindavista');
  });

  it('submit con nombre y slug vacíos NO agrega tenant (validación)', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    const form = screen.getByText('Nuevo Registro').closest('form');
    fireEvent.submit(form);
    // La tabla sigue teniendo los 3 originales
    expect(screen.getByText('HGR No. 1 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.queryByText('Hospital Angeles Lindavista')).not.toBeInTheDocument();
  });

  it('submit válido agrega un nuevo tenant con slug normalizado (lowercase + dashes)', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    fireEvent.change(screen.getByPlaceholderText('Hospital de Especialidades No. 2'), {
      target: { value: 'Hospital Angeles Lindavista' },
    });
    fireEvent.change(screen.getByPlaceholderText('hgr-2-tijuana'), {
      target: { value: 'HA Lindavista' }, // tiene espacio + mayúsculas
    });
    const form = screen.getByText('Nuevo Registro').closest('form');
    fireEvent.submit(form);

    // Aparece la fila nueva con slug normalizado: "ha-lindavista.sigah.mx"
    expect(screen.getByText('Hospital Angeles Lindavista')).toBeInTheDocument();
    expect(screen.getByText('ha-lindavista.sigah.mx')).toBeInTheDocument();
  });

  it('botón "Cancelar" cierra el formulario y resetea isAddingTenant', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    expect(screen.getByText('Nuevo Registro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    expect(screen.queryByText('Nuevo Registro')).not.toBeInTheDocument();
  });

  it('el select de plan tiene 3 opciones (Hospital Singular, Red Metropolitana, Gubernamental Custom)', () => {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Hospital/i }));
    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(within(select).getByRole('option', { name: 'Hospital Singular' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Red Metropolitana' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Gubernamental Custom' })).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Búsqueda de inquilinos
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — búsqueda de inquilinos', () => {
  beforeEach(() => renderSuperAdmin());

  it('muestra los 3 tenants inicialmente', () => {
    expect(screen.getByText('HGR No. 1 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.getByText('HGR No. 20 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.getByText('HGP Ginecopediatría Tijuana')).toBeInTheDocument();
  });

  it('filtrar por "20" deja solo el tenant #2', () => {
    const search = screen.getByPlaceholderText('Buscar por hospital o slug...');
    fireEvent.change(search, { target: { value: '20' } });
    expect(screen.queryByText('HGR No. 1 IMSS Tijuana')).not.toBeInTheDocument();
    expect(screen.getByText('HGR No. 20 IMSS Tijuana')).toBeInTheDocument();
    expect(screen.queryByText('HGP Ginecopediatría Tijuana')).not.toBeInTheDocument();
  });

  it('filtrar por slug funciona (case-insensitive)', () => {
    const search = screen.getByPlaceholderText('Buscar por hospital o slug...');
    fireEvent.change(search, { target: { value: 'HGP' } });
    expect(screen.getByText('HGP Ginecopediatría Tijuana')).toBeInTheDocument();
    expect(screen.queryByText('HGR No. 1 IMSS Tijuana')).not.toBeInTheDocument();
    expect(screen.queryByText('HGR No. 20 IMSS Tijuana')).not.toBeInTheDocument();
  });

  it('buscar con texto que no matchea deja la tabla vacía', () => {
    const search = screen.getByPlaceholderText('Buscar por hospital o slug...');
    fireEvent.change(search, { target: { value: 'xyz-no-existe' } });
    expect(screen.queryByText('HGR No. 1 IMSS Tijuana')).not.toBeInTheDocument();
    expect(screen.queryByText('HGR No. 20 IMSS Tijuana')).not.toBeInTheDocument();
    expect(screen.queryByText('HGP Ginecopediatría Tijuana')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Topología y nodos
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — panel de topología', () => {
  beforeEach(() => renderSuperAdmin());

  it('muestra el header "Topología y Nodos"', () => {
    expect(screen.getByText(/Topología y Nodos/i)).toBeInTheDocument();
  });

  it('renderiza los 3 nodos hardcoded con su IP + rol + latencia', () => {
    expect(screen.getByText('Bluehost VPS Cloud')).toBeInTheDocument();
    expect(screen.getByText(/129\.121\.100\.147.*Master Server/)).toBeInTheDocument();
    expect(screen.getByText('14 ms')).toBeInTheDocument();

    expect(screen.getByText('ASUS TUF A16')).toBeInTheDocument();
    expect(screen.getByText(/192\.168\.1\.85.*Terminal Física Dev/)).toBeInTheDocument();
    expect(screen.getByText('2 ms')).toBeInTheDocument();

    expect(screen.getByText('Lenovo ThinkCentre Edge')).toBeInTheDocument();
    expect(screen.getByText(/10\.23\.4\.112.*Hospital Edge Node/)).toBeInTheDocument();
    expect(screen.getByText('45 ms')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Auditoría NOM-016 Global (logs)
// ──────────────────────────────────────────────────────────────────
describe('SuperAdmin — logs de auditoría', () => {
  beforeEach(() => renderSuperAdmin());

  it('muestra el header "Auditoría NOM-016 Global"', () => {
    expect(screen.getByText(/Auditoría NOM-016 Global/i)).toBeInTheDocument();
  });

  it('renderiza los 4 logs hardcoded con su mensaje', () => {
    expect(screen.getByText(/Auditoría NOM-016 Quirófano B validada exitosamente/i)).toBeInTheDocument();
    expect(screen.getByText(/Registro de nuevo desfibrilador Mindray D3 por Ing\. Gustavo/i)).toBeInTheDocument();
    expect(screen.getByText(/Alerta preventiva: Mantenimiento programado para Rayos X excedido/i)).toBeInTheDocument();
    expect(screen.getByText(/Intento de consulta bloqueado: Licencia suspendida/i)).toBeInTheDocument();
  });

  it('el tipo "success" se pinta emerald, "warning" amber, "error" red, "info" blue', () => {
    const successLabel = screen.getByText('success');
    expect(successLabel.className).toContain('text-emerald-600');

    const warningLabel = screen.getByText('warning');
    expect(warningLabel.className).toContain('text-amber-600');

    const errorLabel = screen.getByText('error');
    expect(errorLabel.className).toContain('text-red-600');

    const infoLabel = screen.getByText('info');
    expect(infoLabel.className).toContain('text-blue-600');
  });

  it('cada log muestra timestamp + tenant', () => {
    expect(screen.getByText(/10:42:15.*Tenant: HGR No\. 1/)).toBeInTheDocument();
    expect(screen.getByText(/10:38:02.*Tenant: HGR No\. 1/)).toBeInTheDocument();
    expect(screen.getByText(/10:22:45.*Tenant: HGR No\. 20/)).toBeInTheDocument();
    expect(screen.getByText(/09:15:30.*Tenant: HGP Tijuana/)).toBeInTheDocument();
  });
});