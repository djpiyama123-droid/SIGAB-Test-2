// src/components/ConfirmDialog.test.jsx
// ConfirmDialog es el modal reutilizable más invocado del frontend
// (borrar equipo, cerrar orden, eliminar reserva, etc.). Valida que:
//   - role="dialog" + aria-modal="true" + aria-labelledby están presentes
//     (ciclo 4: añadido para compatibilidad con lectores de pantalla)
//   - Escape cierra el modal (a11y teclado)
//   - El click sobre el overlay cierra el modal (a11y ratón)
//   - El click dentro del modal NO cierra (stopPropagation)
//   - La variante 'peligro' cambia el color del botón de confirmar
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog — accesibilidad', () => {
  it('expone role=dialog, aria-modal y aria-labelledby apuntando al título', () => {
    render(<ConfirmDialog open titulo="¿Borrar equipo?" onConfirmar={() => {}} onCancelar={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    expect(screen.getByRole('heading', { name: '¿Borrar equipo?' })).toHaveAttribute('id', 'confirm-dialog-title');
  });

  it('Escape cierra el modal (a11y teclado)', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={() => {}} onCancelar={onCancelar} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('NO escucha Escape cuando el modal está cerrado (no fuga eventos)', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open={false} onConfirmar={() => {}} onCancelar={onCancelar} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('otras teclas no cierran el modal', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={() => {}} onCancelar={onCancelar} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });
    expect(onCancelar).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog — interacción', () => {
  it('click en overlay cierra el modal', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={() => {}} onCancelar={onCancelar} />);
    // El overlay es el contenedor fixed; el contenido interior hace stopPropagation.
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('click DENTRO del modal NO cierra (stopPropagation)', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={() => {}} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('botón Confirmar dispara onConfirmar (no onCancelar)', () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={onConfirmar} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('botón Cancelar dispara onCancelar', () => {
    const onCancelar = vi.fn();
    render(<ConfirmDialog open onConfirmar={() => {}} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('renderiza textos custom de título/mensaje/botones', () => {
    render(
      <ConfirmDialog
        open
        titulo="Eliminar reservación"
        mensaje="Esta acción no se puede deshacer."
        textoConfirmar="Sí, eliminar"
        textoCancelar="No, volver"
        onConfirmar={() => {}}
        onCancelar={() => {}}
      />
    );
    expect(screen.getByText('Eliminar reservación')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, volver' })).toBeInTheDocument();
  });

  it('no renderiza nada cuando open=false', () => {
    const { container } = render(<ConfirmDialog open={false} onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ConfirmDialog — variante', () => {
  it('variante "peligro" pinta el botón de confirmar en rojo', () => {
    render(<ConfirmDialog open variante="peligro" onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('bg-red-600');
  });

  it('variante "normal" pinta el botón de confirmar en verde', () => {
    render(<ConfirmDialog open variante="normal" onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('bg-emerald-600');
  });
});