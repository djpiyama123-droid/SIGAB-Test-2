// ============================================================
// Toast.jsx — Wrapper de compatibilidad: el legacy useToast() ahora delega en Sileo.
//
// Se mantiene la API publica para no tocar los 15+ archivos consumidores:
//   import { ToastProvider, useToast } from './Toast';
//   const toast = useToast();
//   toast.success('Equipo creado');
//   toast.error('No se pudo guardar');
//   const tid = toast.loading('Guardando...');
//   toast.success('Listo', { id: tid });   // reemplaza el pendiente
//
// La libreria real de toasts es Sileo (instalada en App.jsx con <Toaster />).
// ToastProvider queda como pass-through (no-op) para preservar la cadena de imports.
// El adapter completo vive en src/lib/toast.js.
// ============================================================
import toast from '../lib/toast';

// ToastProvider ahora es solo pass-through. La instancia visual la monta App.jsx.
export function ToastProvider({ children }) {
  return children;
}

// useToast() devuelve el adapter compatible (ver src/lib/toast.js).
export function useToast() {
  return toast;
}

// Re-export por compatibilidad si algun archivo importa `toast` por default.
export default toast;
