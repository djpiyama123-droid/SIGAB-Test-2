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

## LOTE A — COMPLETADO (2026-06-19) — 28 cambios en 8 archivos
- [x] pages/SuperAdmin.jsx — 1 cambio ok (selection color intencional — sin cambio de fondo)
- [x] pages/Reservas.jsx — 10 cambios ok
- [x] pages/QRBatch.jsx — sin cambios (border-slate-200 en fondo blanco — excepción)
- [x] pages/QRScanner.jsx — sin cambios (limpio)
- [x] pages/Trazabilidad.jsx — sin cambios (limpio)
- [x] components/OCRScannerModal.jsx — 1 cambio ok
- [x] components/EventoDetalleModal.jsx — 2 cambios ok
- [x] components/formatos/FormatoViewer.jsx — sin cambios (limpio)
- [x] pages/Equipos.jsx — 1 cambio ok
- [x] pages/Copilot.jsx — 3 cambios ok
- [x] components/EventoAdversoModal.jsx — 1 cambio ok (bg-slate-500/20→var(--content-bg) badge leve)
- [x] components/TripleValidationModal.jsx — 3 cambios ok (loading state, text-white condicional, spinner)
- [x] pages/ChecklistPage.jsx — sin cambios (ya migrado)
- [x] components/HistorialEquipoModal.jsx — sin cambios (ya migrado)
- [x] pages/Reportes.jsx — sin cambios (ya migrado)
- [x] pages/AdminGlobal.jsx — sin cambios (limpio)
- [x] components/ui/Button.jsx — 2 cambios ok (hover:text-white→hover:text-[var(--content-text)] en glass y ghost)
- [x] components/NuevaOrdenModal.jsx — sin cambios (text-white sobre bg-emerald-600 — excepción)
- [x] components/EquipoForm.jsx — 1 cambio ok (placeholder-slate-600→placeholder-[var(--content-muted)])
- [x] pages/Preventivos.jsx — sin cambios (text-white sobre bg-emerald-600 — excepción)
- [x] pages/EquipoPublico.jsx — sin cambios (bg-slate-500/20 badge baja — excepción semántica)
- [x] components/charts/MaintenanceChart.jsx — sin cambios (limpio)
- [x] components/OrdenServicioRapidaModal.jsx — 3 cambios ok
- [x] components/ConfirmDialog.jsx — 2 cambios ok
- [x] components/ProtectedRoute.jsx — sin cambios (limpio)
- [x] components/FilterBar.jsx — sin cambios (placeholder-slate-500 fuera de contrato — sin cambio)

## LOTE B — COMPLETADO (2026-06-19) — 109 cambios en 16 archivos
- [x] pages/Almacen.jsx — sin cambios (ya migrado)
- [x] components/HospitalMap.jsx — 13 cambios ok
- [x] pages/LandingPage.jsx — sin cambios (tema dark propio de marketing — intencional)
- [x] pages/Metrologia.jsx — 6 cambios ok
- [x] pages/Capacitaciones.jsx — 2 cambios ok
- [x] components/OrdenDetalleModal.jsx — 5 cambios ok
- [x] pages/Ordenes.jsx — 18 cambios ok
- [x] pages/TVDashboard.jsx — 5 cambios ok
- [x] pages/Dashboard.jsx — 3 cambios ok
- [x] pages/Analitica.jsx — 6 cambios ok
- [x] pages/Formatos.jsx — 5 cambios ok
- [x] components/EquipoDetail.jsx — 8 cambios ok
- [x] components/QRPanel.jsx — 1 cambio ok
- [x] pages/Tecnovigilancia.jsx — 2 cambios ok
- [x] pages/AuditPage.jsx — 5 cambios ok (bg-slate-500/10 badge audit fuera de contrato — sin cambio)
- [x] components/v2/SigabUI.jsx — sin cambios (design system propio)
- [x] components/OrdenCasillasForm.jsx — 10 cambios ok
- [x] components/EquipoTable.jsx — 8 cambios ok
- [x] components/DashboardCharts.jsx — sin cambios (limpio)
- [x] pages/Login.jsx — sin cambios (limpio)
- [x] pages/Alertas.jsx — 3 cambios ok
- [x] components/charts/DegradationChart.jsx — 1 cambio ok
- [x] components/EquipoCard.jsx — 2 cambios ok (text-white sobre bg de estado — excepción conservada)
- [x] components/ui/ModalWrapper.jsx — sin cambios (limpio)
- [x] components/HistorialModal.jsx — 1 cambio ok
- [x] components/ChangePasswordModal.jsx — sin cambios (text-white sobre bg-emerald-600 — excepción)

> Nota: `components/Header.jsx` ya migrado en Fase 1 (no está en ningún lote).

## Próximos pasos
- [x] `npm run dev` y revisar visualmente los módulos más cambiados — OK visual confirmado
- [x] Push a GitHub (djpiyama123-droid/SIGAB-Test-2, rama v3.0/verde-blanco-imss)
- [x] Deploy a VPS prod /opt/sigab-panel — rsync src + build 7.48s + nginx reload (2026-06-20)
- [x] Cerrar puertos n8n :5678 y bot :3000 — ambos en 127.0.0.1 (2026-06-20)
