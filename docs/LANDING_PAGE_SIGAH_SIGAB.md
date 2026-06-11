# Investigación y Planeación — Landing Page SIGAH / SIGAB

> Documento de estrategia para la página de aterrizaje comercial del ecosistema
> **SIGAH** (marca SaaS multi-tenant) y su aplicación clínica **SIGAB**
> (Sistema Integral de Gestión de Activos Biomédicos).
> Última actualización: 2026-05-30.

---

## 1. Contexto y objetivos

### 1.1 Qué es cada cosa
- **SIGAH** = marca comercial / ecosistema SaaS multi-tenant. Es lo que se vende.
- **SIGAB** = la aplicación clínica concreta (módulo biomédico) que opera en el
  HGR No. 1 IMSS Tijuana. Es la prueba viva de que el producto funciona.

La landing vive en `sigab-frontend/src/pages/LandingPage.jsx`, se sirve en la raíz
pública (`/`) y redirige al dashboard si el usuario ya tiene sesión.

### 1.2 Objetivo de negocio
Convertir visitantes (jefaturas de conservación, ingeniería biomédica,
direcciones administrativas de hospitales y delegaciones IMSS) en **solicitudes
de demo / contacto**. No es e-commerce: el CTA primario es "Solicitar Demo /
Contacto", el secundario es "Acceso Portal" (clientes existentes).

### 1.3 Audiencias
1. **Jefatura de Conservación / Biomédica** — dolor: auditorías NOM-016 en papel,
   equipos fuera de servicio sin trazabilidad. Busca control y cumplimiento.
2. **Dirección administrativa / financiera** — dolor: costos de mantenimiento
   correctivo, vida útil de activos. Busca ahorro y ROI.
3. **TI / Seguridad institucional** — dolor: datos sensibles en la nube. Le
   importa: on-premise, IA local offline, aislamiento multi-tenant.
4. **Delegación / nivel estatal IMSS** — busca consolidación de varios hospitales
   bajo un panel SuperAdmin.

---

## 2. Análisis del estado actual

> **Importante (mapa de código):** la landing pública real
> (`https://sigah.129-121-100-147.sslip.io/`) la sirve el proyecto **`portal-sigah/`**
> (React + TypeScript + Vite + Tailwind v4 + Chart.js), desplegado en el VPS como
> el contenedor `sigah-portal` sirviendo `/opt/sigab/sigah-portal/dist`. **No** la
> sirve `sigab-frontend/src/pages/LandingPage.jsx` (ese archivo existe pero está
> sin rutear → es código muerto en el bundle del app clínico).

La landing de producción ya tiene una base sólida y un diseño claro institucional:

| Sección | Estado | Notas |
|---|---|---|
| `Navbar` (sticky) | OK | Branding SIGAH, CTA a login |
| `Hero` | OK | Propuesta de valor + CTA |
| `InstitutionalContext` | OK | Origen universitario + tabla de inventario piloto |
| **`#casos` Casos de éxito** | **NUEVO (este cambio)** | Métricas de impacto + testimonios |
| `ScrollVideoEngine` | OK | Narrativa visual por scroll |
| `ServicePlans` | OK | Planes de servicio SaaS |
| `FinancialProjection` | OK | Gráfica Chart.js (ingresos/costos/hospitales) + tabla |
| `MasterPlanTimeline` | OK | Cronograma del plan maestro |
| `Footer` | OK | — |

**Paleta y sistema visual** (Tailwind v4 `@theme` en `src/index.css`): tema **claro**
`bg-bg-principal #F1F5F9` sobre `bg-white`; azul IMSS `sigah-blue #006CB7` /
`sigah-blue-dark #00497D`; `esmeralda #059669`, `ambar`, `rojo`; bordes `card-border`
`#C9D6E2`; tipografía `font-sans` (Inter) + `font-data` (Source Sans 3) + mono;
iconografía `@tabler/icons-react`. Estilo sobrio, profesional, institucional.

### 2.1 Brechas detectadas
1. **Prueba social ausente** → resuelto con la nueva sección `#casos`
   (testimonios + métricas -32% / -28% / +40% / 751 activos), en el estilo claro
   del portal.
2. **Formulario / captura de leads** — el portal cierra con CTA a login; falta un
   formulario de contacto con backend para captura comercial.
3. **Sin sellos de confianza normativa** visibles (NOM-016 / NOM-240 / ISO-13485
   como badges).
4. **SEO / meta tags** — el `<title>` y `description` existen; falta Open Graph e
   imagen social.
5. **Accesibilidad** — revisar contraste de `text-slate-400/500` y foco de teclado
   en navbar/CTAs (objetivo WCAG AA).
6. **Bundle** — `index.js` ~537 kB (171 kB gzip); ya hay code-splitting por páginas
   del panel. Margen para dividir más Chart.js / vendor.

---

## 3. Propuesta de estructura (orden de secciones)

```
1.  Navbar (sticky)
2.  Hero — promesa + CTA
3.  Sellos de confianza            [NUEVO sugerido]  IMSS · NOM-016 · NOM-240 · ISO-13485
4.  InstitutionalContext — origen + inventario piloto
5.  #casos — Casos de éxito: métricas de impacto + testimonios   [IMPLEMENTADO]
6.  ScrollVideoEngine — narrativa visual
7.  ServicePlans — planes de servicio SaaS
8.  FinancialProjection — proyección financiera
9.  MasterPlanTimeline — plan maestro
10. FAQ                            [NUEVO sugerido]  cumplimiento, datos, migración
11. Contacto / captura de leads    [NUEVO sugerido]  formulario con backend
12. Footer
```

> La sección `#casos` se ubicó **tras `InstitutionalContext`**: el inventario piloto
> establece el contexto real y los casos/métricas lo convierten en prueba social
> antes de la narrativa de producto y los planes.

El principio: **alternar "qué es / qué hace" con "por qué confiar"
(sellos, casos, FAQ)** para sostener la narrativa de credibilidad hasta el CTA.

---

## 4. Mensajería por sección

- **Hero**: ya define bien el ángulo ("Orquestación Inteligente… IA local
  offline, NOM-016, telemetría en tiempo real"). Mantener.
- **#casos** (implementado):
  - Métricas: -32% tiempo fuera de servicio · -28% costos correctivos ·
    +40% cumplimiento documental NOM-016 · 751 activos bajo control.
  - 3 testimonios atribuidos a roles (Jefatura de Conservación, Ingeniería
    Biomédica, Coordinación Médica) del HGR No. 1.
  - **Pendiente**: validar las cifras con datos reales antes de publicitarlas
    como verificadas (hoy son representativas del piloto).
- **#pricing**: precios "Contacto / Cotización" (correcto para venta consultiva
  institucional). Mantener "Recomendado" en Red Metropolitana.

---

## 5. Roadmap de mejora (priorizado)

### Fase 1 — Credibilidad (alto impacto, bajo esfuerzo)  ← este entregable
- [x] Componente `portal-sigah/src/components/CasosImpacto.tsx` (métricas + testimonios).
- [x] Integrado en `PublicApp.tsx` tras `InstitutionalContext`.
- [x] Build local verificado y desplegado al portal de producción (`sigah-portal`).
- [ ] Añadir enlace `Casos de éxito` en `Navbar` (ancla `#casos`).
- [ ] Banda de sellos de confianza (IMSS / NOM-016 / NOM-240 / ISO-13485).
- [ ] Validar cifras de impacto con datos reales del piloto.

### Fase 2 — Conversión
- [ ] Conectar el formulario `#contact` a un endpoint backend (lead capture +
      correo/notificación al equipo comercial).
- [ ] Validación de campos + estado de envío (loading / éxito / error) con toast.
- [ ] Sección FAQ (datos on-premise, migración, soporte, normativas).

### Fase 3 — Rendimiento y SEO
- [ ] Code-split de la landing pública (ruta lazy, evitar cargar bundle de app).
- [ ] Meta tags: `<title>`, `description`, Open Graph, favicon, `lang="es"`.
- [ ] Auditoría Lighthouse (objetivo: Performance > 85, Accesibilidad > 95).

### Fase 4 — Pulido
- [ ] Revisión de contraste WCAG AA en textos `slate-400`.
- [ ] Navegación por teclado y `focus-visible` en navbar y CTAs.
- [ ] Versión responsive del node-monitor terminal en móvil.

---

## 6. Notas técnicas
- **Proyecto**: `portal-sigah/` (React + TypeScript + Vite + Tailwind v4 + Chart.js
  + `@tabler/icons-react`). Entrada pública: `src/PublicApp.tsx`.
- **Tema**: claro institucional vía Tailwind v4 `@theme` en `src/index.css`
  (tokens `sigah-blue`, `bg-principal`, `card-border`, `esmeralda`, fuentes Inter /
  Source Sans 3). El nuevo componente reutiliza estos tokens.
- **Build verificado**: `tsc --noEmit` OK + `vite build` OK con la sección `#casos`
  (nota: en local hizo falta reinstalar `@rollup/rollup-linux-x64-gnu` por el bug de
  dependencias opcionales de npm).
- **Despliegue**: el portal se construye localmente y su `dist/` se sincroniza al VPS
  en `/opt/sigab/sigah-portal/dist` (contenedor `sigah-portal`, `nginx:alpine` con
  bind-mount de sólo lectura, ruteado por Traefik en `sigah.129-121-100-147.sslip.io`).
  Este deploy usó `rsync --backup` (respaldo de archivos reemplazados en
  `dist.bak-20260530`) + `docker restart sigah-portal`.
- **Nota de limpieza**: el app clínico (`sigab-frontend`, contenedor `sigah-frontend`)
  quedó con un `LandingPage.jsx` modificado y un `LandingPage.jsx.bak-20260530` por un
  despliegue inicial al objetivo equivocado; es inofensivo (código no rutado) pero
  conviene restaurar el `.bak` para dejar el árbol de producción limpio.

---

## 7. Métricas de éxito de la landing
- Tasa de envío del formulario de contacto (conversión).
- Tiempo en sección `#casos` y `#pricing` (interés).
- Clics en "Solicitar Demo" vs "Acceso Portal".
- Lighthouse Performance / Accesibilidad como gates de calidad.
