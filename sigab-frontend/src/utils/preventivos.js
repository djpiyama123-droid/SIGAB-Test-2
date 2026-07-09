// Utilidad pura de pages/Preventivos.jsx — separada del componente para que
// sea testeable sin arrastrar la cadena de imports pesados de la página
// (react-router-dom, axios, sileo) al entorno node de vitest.

// Días restantes (positivo) o vencidos (negativo) hasta `fecha`. null si no hay fecha.
export function diasRestantes(fecha) {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha) - new Date()) / 86400000);
  return diff;
}
