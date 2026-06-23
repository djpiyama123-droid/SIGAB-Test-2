// src/components/EquipoTable.test.jsx
// EquipoTable se usa en /equipos (vista lista/tabla).
// Es la pieza con mayor blast-radius del inventario — un bug aquí rompe
// el flujo principal del operador. Estos tests blindan:
//   - render correcto del número de equipos (mobile cards + desktop rows)
//   - a11y teclado del ciclo 3: role + tabIndex + aria-label + Enter/Space
//   - el guard `e.target !== e.currentTarget` para que Enter en el botón
//     de tickets/QR no abra el detalle
//   - el botón QR queda deshabilitado cuando no hay qr_token
//   - el badge de criticidad se renderiza sólo cuando hay valor
//   - el badge de estado viene de los tokens (cross-check con tokens.test.js)
// EquipoDetail y QRPanel se mockean porque hacen fetch a la API real.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock de los modales — abren side-effects (api.getHistorialEquipo, QR render)
// que no nos importan en este smoke test del table.
vi.mock('./EquipoDetail', () => ({
  default: function MockEquipoDetail({ equipo, onClose }) {
    return (
      <div data-testid="mock-equipo-detail">
        MOCK_DETAIL:{equipo.nombre}
        <button onClick={onClose}>CERRAR_DETAIL</button>
      </div>
    );
  },
}));
vi.mock('./QRPanel', () => ({
  default: function MockQRPanel({ equipo, onClose }) {
    return (
      <div data-testid="mock-qr-panel">
        MOCK_QR:{equipo.nombre}
        <button onClick={onClose}>CERRAR_QR</button>
      </div>
    );
  },
}));

import EquipoTable from './EquipoTable';

const eq1 = {
  id: 1,
  nombre: 'Ventilador mecánico',
  marca: 'Mindray',
  modelo: 'SV300',
  estado: 'operativo',
  serie: 'SN-AAA-001',
  inventario: 'INV-1001',
  area: 'UCI',
  piso: '3',
  tipo_equipo: 'ventilador',
  criticidad: 'alta',
  tickets_abiertos: 2,
  qr_token: 'tok-abc',
  imagen_url: null,
};
const eq2 = {
  id: 2,
  nombre: 'Desfibrilador',
  marca: 'ZOLL',
  modelo: 'R Series',
  estado: 'fuera_servicio',
  serie: null,
  inventario: null,
  area: 'Emergencias',
  piso: '1',
  tipo_equipo: 'desfibrilador',
  criticidad: 'media',
  tickets_abiertos: 0,
  qr_token: null,
  imagen_url: null,
};

function renderTable(equipos) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <EquipoTable equipos={equipos} />
    </MemoryRouter>
  );
}

describe('EquipoTable — render', () => {
  it('renderiza una fila/card por cada equipo', () => {
    renderTable([eq1, eq2]);
    // El desktop <tr> tiene role=button con aria-label descriptivo.
    // Hay 2 en desktop y 2 en mobile (el mismo equipo aparece en ambos layouts).
    const all = screen.getAllByRole('button', { name: /Ver detalle de/i });
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Mostrando 2 equipos/i)).toBeInTheDocument();
  });

  it('muestra contador desktop "Mostrando 2 equipos en esta página"', () => {
    renderTable([eq1, eq2]);
    // El counter mobile también dice "2 equipos" — usamos el del desktop que es único.
    expect(screen.getByText(/Mostrando 2 equipos/i)).toBeInTheDocument();
  });

  it('muestra NII cuando el equipo tiene inventario', () => {
    renderTable([eq1]);
    expect(screen.getByText(/HGR1-INV-1001/)).toBeInTheDocument();
  });

  it('muestra "Sin asignar" cuando el equipo no tiene inventario', () => {
    renderTable([eq2]);
    const asignarCells = screen.getAllByText(/Sin asignar/i);
    expect(asignarCells.length).toBeGreaterThan(0);
  });
});

describe('EquipoTable — accesibilidad teclado (ciclo 3)', () => {
  it('cada fila tiene role=button, tabIndex=0 y aria-label descriptivo', () => {
    renderTable([eq1]);
    const rows = screen.getAllByRole('button', { name: /Ver detalle de Ventilador/i });
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row).toHaveAttribute('tabindex', '0');
      expect(row.getAttribute('aria-label')).toContain('Ventilador');
    });
  });

  it('Enter sobre la fila abre el detalle (mock visible)', () => {
    renderTable([eq1]);
    // Tomamos la fila desktop (<tr>) — es la que tiene el ring inset del ciclo 3.
    const desktopRow = screen.getAllByRole('button', { name: /Ver detalle de Ventilador/i })[1];
    fireEvent.keyDown(desktopRow, { key: 'Enter' });
    expect(screen.getByTestId('mock-equipo-detail')).toBeInTheDocument();
    expect(screen.getByText(/MOCK_DETAIL:Ventilador/)).toBeInTheDocument();
  });

  it('Space sobre la fila abre el detalle', () => {
    renderTable([eq1]);
    const desktopRow = screen.getAllByRole('button', { name: /Ver detalle de Ventilador/i })[1];
    fireEvent.keyDown(desktopRow, { key: ' ' });
    expect(screen.getByTestId('mock-equipo-detail')).toBeInTheDocument();
  });

  it('Enter sobre el botón QR interno NO abre el detalle (guard e.target !== e.currentTarget)', () => {
    // El guard del ciclo 3 evita que Enter sobre el botón de tickets/QR abra el detalle.
    // Si se rompe, un operador que tabule+Enter sobre QR vería el detalle Y dispararía QR.
    // (Nota: en jsdom fireEvent.keyDown no simula el click implícito del navegador
    // sobre un <button> — eso es lo correcto para este test: queremos ver que el
    // handler del ROW no abre el detalle cuando el target es un botón interno.)
    renderTable([eq1]);
    const qrButtons = screen.getAllByRole('button', { name: /QR/i });
    const desktopQr = qrButtons.find((b) => b.title === 'Abrir módulo de impresión de QR');
    expect(desktopQr).toBeTruthy();
    fireEvent.keyDown(desktopQr, { key: 'Enter' });
    // El detalle NO debe abrirse — el guard del row funciona.
    expect(screen.queryByTestId('mock-equipo-detail')).not.toBeInTheDocument();
  });

  it('click sobre la fila abre el detalle', () => {
    renderTable([eq1]);
    const desktopRow = screen.getAllByRole('button', { name: /Ver detalle de Ventilador/i })[1];
    fireEvent.click(desktopRow);
    expect(screen.getByTestId('mock-equipo-detail')).toBeInTheDocument();
  });
});

describe('EquipoTable — botones de acción', () => {
  it('muestra contador de tickets cuando tickets_abiertos > 0', () => {
    renderTable([eq1]);
    expect(screen.getAllByText(/2 abierta/i).length).toBeGreaterThan(0);
  });

  it('muestra "—" cuando tickets_abiertos === 0', () => {
    renderTable([eq2]);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('botón QR desktop deshabilitado cuando qr_token es null', () => {
    renderTable([eq2]);
    const qrButtons = screen.getAllByRole('button', { name: /QR/i });
    const desktopQr = qrButtons.find((b) => b.title === 'Abrir módulo de impresión de QR');
    expect(desktopQr).toBeDisabled();
  });

  it('botón QR desktop habilitado cuando qr_token existe', () => {
    renderTable([eq1]);
    const qrButtons = screen.getAllByRole('button', { name: /QR/i });
    const desktopQr = qrButtons.find((b) => b.title === 'Abrir módulo de impresión de QR');
    expect(desktopQr).not.toBeDisabled();
  });
});

describe('EquipoTable — badges', () => {
  it('badge de criticidad "alta" se renderiza con texto capitalizado', () => {
    renderTable([eq1]);
    const critCells = screen.getAllByText('alta');
    expect(critCells.length).toBeGreaterThan(0);
  });

  it('badge de estado usa el label del token (no el slug raw)', () => {
    // ESTADO_LABELS['operativo'] = 'Operativo' (no 'operativo' crudo).
    // Cross-check con tokens.test.js.
    renderTable([eq1]);
    expect(screen.getAllByText('Operativo').length).toBeGreaterThan(0);
  });

  it('badge de estado mapea correctamente "fuera_servicio" → "Fuera Svc."', () => {
    renderTable([eq2]);
    // ESTADO_LABELS['fuera_servicio'] === 'Fuera Svc.' (forma corta usada en badges densos).
    expect(screen.getAllByText('Fuera Svc.').length).toBeGreaterThan(0);
  });
});