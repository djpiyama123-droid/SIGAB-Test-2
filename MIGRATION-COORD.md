# SIGAB v3.0 — Coordinación de migración dark→Verde-Blanco IMSS

> **FASE 2 COMPLETADA — 2026-06-19**
> 52 archivos procesados en paralelo (Lote A + Lote B). ~137 cambios aplicados.

## Estado del tema (Fase 1 — YA HECHO)
- `index.css`: tema `[data-theme="green"]` = Verde-Blanco IMSS (light). Default en `ThemeContext` = `green`.
- Variables disponibles: `--content-bg`, `--content-surface`, `--content-border`, `--content-text`,
  `--content-muted`, `--accent` (#047857), `--accent-dark` (#065F46), `--accent-light` (#E0F0E9),
  `--sidebar-*`, `--header-*`.
- Shell ya migrado: `Layout.jsx`, `Sidebar.jsx`, `Header.jsx` (NO retocar).

## CONTRATO de migración (idéntico para ambas sesiones)
Objetivo: que cada módulo se vea bien en fondo CLARO. Reemplazar colores oscuros hardcodeados
por variables de tema. **NO tocar lógica, JSX, imports ni handlers — solo clases/estilos de color.**

| Hardcoded (era oscura) | Reemplazo (tema claro) |
|---|---|
| `text-white` como texto de contenido | `text-[var(--content-text)]` |
| `text-slate-100/200` | `text-[var(--content-text)]` |
| `text-slate-300/400` | `text-[var(--content-muted)]` |
| `bg-slate-900/950` (página) | `bg-[var(--content-bg)]` |
| `bg-slate-800` (tarjeta/superficie/input) | `bg-[var(--content-surface)]` |
| `bg-slate-700` (hover/elevated) | `bg-[var(--content-bg)]` |
| `border-slate-700/800` | `border-[var(--content-border)]` |
| `#0f172a` / `#1e293b` (hex dark) | `var(--content-bg)` / `var(--content-surface)` |

### Excepciones — NO cambiar a variable (el color es intencional):
1. **`text-white` sobre fondo de color sólido o gradiente** (botones `bg-emerald-600`, `bg-blue-600`,
   `bg-red-600`, badges de color, headers con gradiente) → se queda `text-white`.
2. **Colores semánticos de estado** (significan algo, se conservan):
   operativo=emerald, fuera de servicio=red/rose, mantenimiento=amber/yellow, traslado=blue.
   PERO si son `text-{color}-400` sobre fondo que ahora es claro → subir tono a `-600/-700`
   para contraste legible (p.ej. `text-emerald-400` → `text-emerald-700`).
3. Etiquetas QR / print (`.qr-label-*`) y SVG de gráficas con color propio: no tocar.

Tras migrar: el componente no debe tener texto blanco invisible sobre fondo blanco.

---

## LOTE A — COMPLETADO (2026-06-19) — 6 cambios en 5 archivos
- [x] pages/SuperAdmin.jsx — sin cambios (text-white sobre gradientes — excepción)
- [x] pages/Reservas.jsx — 1 cambio: text-slate-400→muted
- [x] pages/QRBatch.jsx — sin cambios (excepciones)
- [x] pages/QRScanner.jsx — sin cambios (excepciones)
- [x] pages/Trazabilidad.jsx — sin cambios (excepción)
- [x] components/OCRScannerModal.jsx — 1 cambio: bg-slate-950/80→black/60 backdrop
- [x] components/EventoDetalleModal.jsx — 1 cambio: text-white→content-text (carga)
- [x] components/formatos/FormatoViewer.jsx — sin cambios (excepciones)
- [x] pages/Equipos.jsx — sin cambios (excepciones)
- [x] pages/Copilot.jsx — sin cambios (excepciones)
- [x] components/EventoAdversoModal.jsx — sin cambios (excepción)
- [x] components/TripleValidationModal.jsx — sin cambios (excepciones)
- [x] pages/ChecklistPage.jsx — sin cambios
- [x] components/HistorialEquipoModal.jsx — sin cambios
- [x] pages/Reportes.jsx — sin cambios
- [x] pages/AdminGlobal.jsx — sin cambios
- [x] components/ui/Button.jsx — sin cambios (excepciones)
- [x] components/NuevaOrdenModal.jsx — sin cambios (excepción)
- [x] components/EquipoForm.jsx — sin cambios (excepción)
- [x] pages/Preventivos.jsx — sin cambios (excepción)
- [x] pages/EquipoPublico.jsx — 1 cambio: bg hex #1e293b→var(--content-surface) en STATUS_CONFIG
- [x] components/charts/MaintenanceChart.jsx — 2 cambios: CartesianGrid stroke + Tooltip bg/border
- [x] components/OrdenServicioRapidaModal.jsx — sin cambios (excepción)
- [x] components/ConfirmDialog.jsx — sin cambios (excepción)
- [x] components/ProtectedRoute.jsx — sin cambios
- [x] components/FilterBar.jsx — sin cambios

## LOTE B — COMPLETADO (2026-06-19) — ~131 cambios en 24 archivos
- [x] pages/Almacen.jsx — 20 cambios (modales NuevaRefaccion/AjustarStock)
- [x] components/HospitalMap.jsx — 15 cambios (bg hex, tooltips, filtros de piso)
- [x] pages/LandingPage.jsx — sin cambios (tema dark propio de marketing — intencional)
- [x] pages/Metrologia.jsx — 14 cambios (modal NuevaCalibracion, tabla, stats)
- [x] pages/Capacitaciones.jsx — 10 cambios (modal, card grid)
- [x] components/OrdenDetalleModal.jsx — 3 cambios (loading, close, filename)
- [x] pages/Ordenes.jsx — 3 cambios (mobile card, td, divide)
- [x] pages/TVDashboard.jsx — 13 cambios (bg layout, header, stats, alerts, footer)
- [x] pages/Dashboard.jsx — 4 cambios (h1, títulos, ring-offset hex)
- [x] pages/Analitica.jsx — 7 cambios (h1, KPIs, divide, hover, MTBF/MTTR)
- [x] pages/Formatos.jsx — 7 cambios (h1, cards, labels, tags)
- [x] components/EquipoDetail.jsx — 3 cambios (close, criticidad, traslados)
- [x] components/QRPanel.jsx — 2 cambios (close, download)
- [x] pages/Tecnovigilancia.jsx — 1 cambio (nombre dispositivo)
- [x] pages/AuditPage.jsx — 4 cambios (h1, divide, hover, usuario)
- [x] components/v2/SigabUI.jsx — sin cambios (design system propio)
- [x] components/OrdenCasillasForm.jsx — 2 cambios (placeholder textareas)
- [x] components/EquipoTable.jsx — 2 cambios (mobile card, scrollbar)
- [x] components/DashboardCharts.jsx — 5 cambios (Tooltip, CartesianGrid, Axes)
- [x] pages/Login.jsx — 4 cambios (h2, placeholders, ring-offset)
- [x] pages/Alertas.jsx — 2 cambios (botón, mensaje)
- [x] components/charts/DegradationChart.jsx — 4 cambios (salud, CartesianGrid, Axes)
- [x] components/EquipoCard.jsx — sin cambios (ya migrado)
- [x] components/ui/ModalWrapper.jsx — 1 cambio (close hover)
- [x] components/HistorialModal.jsx — 1 cambio (close hover)
- [x] components/ChangePasswordModal.jsx — 3 cambios (placeholders inputs)

> Nota: `components/Header.jsx` ya migrado en Fase 1 (no está en ningún lote).

## Próximos pasos
- [ ] `npm run dev` y revisar visualmente los módulos más cambiados (Almacen, HospitalMap, Metrologia, TVDashboard)
- [ ] Crear repo GitHub `sigab-app-web-v3.0` y push (requiere visto bueno)
- [ ] Deploy a VPS prod `/opt/sigab` (requiere visto bueno explícito)
- [ ] Cerrar puertos n8n :5678 y bot :3000 expuestos (hallazgo auditoría VPS)
