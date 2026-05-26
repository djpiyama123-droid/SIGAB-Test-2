# SIGAH — Especificación de marca

> **Versión:** 1.0 inicial · Mayo 2026
> **Estado:** borrador para uso interno y onboarding de diseñador externo cuando se contrate el logo.
> **Mantenedor:** Gustavo López Carballo.

---

## 1. Identidad

| Atributo | Valor |
|----------|-------|
| **Nombre** | SIGAH |
| **Significado** | Sistema Integral de Activos Hospitalarios |
| **Empresa** | SIGAH, S. de R.L. de C.V. (en constitución) |
| **Tagline** | Soluciones de Industria 4.0 para el ámbito hospitalario |
| **Tagline corto** | Activos hospitalarios, gestionados con IA |
| **Origen** | Tijuana, Baja California, México. Cliente ancla: HGR No.1 IMSS |
| **Mercado** | Hospitales públicos y privados con departamento de conservación / ingeniería biomédica |

### 1.1 Promesa de marca

> Convertimos la gestión de activos biomédicos —hoy hecha con papel, Excel y reacción— en una operación digital, trazable y anticipada, accesible para cualquier hospital sin importar su tamaño.

### 1.2 Principios

1. **Hospitalario primero, software después.** Cada decisión técnica se valida contra cómo afecta al servicio clínico.
2. **Mexicano, no traducido.** SIGAH habla, mide y opera como el sistema de salud mexicano lo necesita (NOM-016, NOM-240, ISO 13485, IMSS).
3. **Predicción sobre reacción.** La IA está para anticipar, no para reportar lo que ya pasó.
4. **El bioingeniero decide.** La IA sugiere; el ingeniero biomédico valida y firma. Responsabilidad clínica siempre humana.
5. **Multi-tenant por diseño.** Aislamiento de datos absoluto desde la primera línea de código, no como parche posterior.

---

## 2. Paleta de colores

### 2.1 Colores primarios

| Token | Hex | Uso |
|-------|-----|-----|
| `sigah-blue` | `#006CB7` | Acento primario, headers, botones primarios, logo. Reminiscente del azul institucional IMSS. |
| `sigah-blue-dark` | `#00497D` | Hover de botones, headers grandes, énfasis tipográfico. |
| `sigah-blue-light` | `#DCEBF7` | Fondos suaves de cards informativas, callouts, badges info. |

### 2.2 Colores semánticos (estados clínicos)

| Token | Hex | Uso |
|-------|-----|-----|
| `sigah-emerald` | `#059669` | Equipo operativo, "apto para operación", éxito, confirmaciones. |
| `sigah-emerald-light` | `#DCFCE7` | Fondos de cards / badges de éxito. |
| `sigah-amber` | `#B45309` | Mantenimiento en curso, alertas medias, advertencias. |
| `sigah-amber-light` | `#FEF3C7` | Fondos / badges de advertencia. |
| `sigah-red` | `#B91C1C` | Fuera de servicio, crítico, errores destructivos. |
| `sigah-red-light` | `#FEE2E2` | Fondos / badges críticos. |
| `sigah-slate` | `#1E293B` | Texto principal sobre fondo claro. |
| `sigah-gray` | `#64748B` | Texto secundario, etiquetas, hints. |
| `sigah-gray-light` | `#F1F5F9` | Fondos de cards neutras, separadores. |

### 2.3 Reglas de uso

- **Una decisión de color = un significado.** Nunca usar emerald para algo que no sea positivo / operativo, ni red para algo que no sea crítico.
- **Texto sobre fondo coloreado:** siempre el tono oscuro de la misma familia (p. ej. texto `sigah-blue-dark` sobre `sigah-blue-light`). Nunca negro plano.
- **Modo oscuro:** invertir los `-light` por `-dark` y viceversa, manteniendo la familia.

---

## 3. Tipografía

| Familia | Uso |
|---------|-----|
| **Inter** | UI principal — botones, navegación, formularios, body. Carga vía Google Fonts. |
| **Source Sans Pro** | Tablas de datos densas (inventario de equipos, OS, métricas). Mejor lectura en filas largas. |
| **Source Code Pro** (opcional) | Monospace para folios, números de serie, IDs técnicos en UI. |

### 3.1 Escala tipográfica

| Token | px | Peso | Uso |
|-------|----|------|-----|
| `text-2xl` | 24 | 500 | Títulos de página |
| `text-xl` | 20 | 500 | Títulos de sección |
| `text-lg` | 18 | 500 | Subtítulos, headers de card |
| `text-base` | 16 | 400 | Body por defecto |
| `text-sm` | 14 | 400 | Texto secundario, labels |
| `text-xs` | 12 | 500 | Microetiquetas, badges |

### 3.2 Reglas

- **Dos pesos solamente:** 400 regular, 500 semibold. No usar 600/700 — pesa demasiado contra la UI hospitalaria.
- **Mayúsculas:** solo para microetiquetas (badges, headers de columna de tabla). Nunca títulos en `ALL CAPS`.
- **Sentence case** en títulos y botones. "Crear orden de servicio", no "Crear Orden de Servicio".

---

## 4. Logo (especificación para diseñador)

Pendiente de diseño profesional. Mientras tanto, el wordmark vive como texto:

```
SIGAH
```

en `Inter`, peso 500, color `#006CB7`, tracking ligeramente negativo (-1px).

### 4.1 Brief para el diseñador (cuando se contrate)

- **Concepto:** un símbolo que combine el cuidado clínico (cruz, pulso, latido) con la noción de red / multi-hospital (nodos, conexiones). Evitar metáforas de IA tipo "circuito" — el corazón es hospitalario, no tecnológico.
- **Formas:** geometría simple, dos elementos máximo. Que funcione en 16×16 (favicon) y en valla publicitaria.
- **Color:** monocromo en `sigah-blue`. Versiones en blanco (para fondos oscuros) y en negro (para impresión).
- **Tipografía:** wordmark "SIGAH" en Inter 500, ya definido arriba.
- **Entregables:** SVG, PNG (1x, 2x, 3x), favicon ICO, versión cuadrada para redes sociales, versión horizontal para encabezado.

---

## 5. Tono de voz

### 5.1 Principios

| Sí | No |
|----|----|
| Directo y técnico cuando corresponde | Vendedor ("la mejor solución del mercado") |
| Confianza con humildad ("validado en 778 equipos") | Triunfalismo ("revolucionamos la salud") |
| Específico ("99.5 % operativo") | Vago ("excelente confiabilidad") |
| Cercano y respetuoso al ingeniero biomédico | Condescendiente o "tech-bro" |
| Bilingüe técnico cuando suma (SaaS, multi-tenant) | Anglicismos innecesarios cuando hay palabra en español |

### 5.2 Ejemplos

- **Bien:** "La IA sugiere; el ingeniero biomédico decide y firma."
- **Mal:** "Nuestra plataforma de inteligencia artificial revoluciona el mantenimiento predictivo."

- **Bien:** "Cada hospital ve solo su información. Aislamiento absoluto en la base de datos."
- **Mal:** "Seguridad de nivel enterprise garantizada."

### 5.3 Cómo nombramos las cosas

- "Equipo biomédico" (no "dispositivo médico" en UI; sí en documentos normativos).
- "Orden de servicio" (no "ticket", no "incidencia").
- "Reporte de falla" (no "queja", no "incidente").
- "Mantenimiento preventivo / correctivo / predictivo" — los tres nombres formales.
- "Departamento de Conservación" — con mayúscula cuando se refiere a un área formal del hospital.

---

## 6. Convenciones en el código

### 6.1 Tailwind CSS (extender `tailwind.config.js`)

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        sigah: {
          blue: "#006CB7",
          "blue-dark": "#00497D",
          "blue-light": "#DCEBF7",
          emerald: "#059669",
          "emerald-light": "#DCFCE7",
          amber: "#B45309",
          "amber-light": "#FEF3C7",
          red: "#B91C1C",
          "red-light": "#FEE2E2",
          slate: "#1E293B",
          gray: "#64748B",
          "gray-light": "#F1F5F9",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        data: ["Source Sans Pro", "Inter", "ui-sans-serif"],
        mono: ["Source Code Pro", "ui-monospace", "monospace"],
      },
    },
  },
};
```

### 6.2 Variables CSS (alternativa, para HTML puro)

```css
:root {
  --sigah-blue: #006CB7;
  --sigah-blue-dark: #00497D;
  --sigah-blue-light: #DCEBF7;
  --sigah-emerald: #059669;
  --sigah-amber: #B45309;
  --sigah-red: #B91C1C;
  --sigah-slate: #1E293B;
  --sigah-gray: #64748B;
}
```

### 6.3 Iconografía

- **Set:** Tabler Icons (outline). Universal, gratis, mantenido. Mismo set usado en los reportes del proyecto.
- **Tamaños estándar:** 16px (inline), 20px (botones), 24px (decorativo), 32px (cards).
- **Color por defecto:** `currentColor` (heredan del padre).
- Nunca mezclar Tabler con otro set en la misma pantalla.

---

## 7. Dominio y presencia digital

| Recurso | Valor / handle | Estado |
|---------|----------------|--------|
| Dominio raíz | `sigah.mx` | ☐ por registrar (paso 7 del runbook de Hetzner) |
| Dominio alterno | `sigah.com.mx` | considerar registrar a la par para proteger marca |
| Subdominios | `app.sigah.mx` (plataforma), `api.sigah.mx` (backend), `docs.sigah.mx` (documentación pública) | ☐ por configurar |
| Correo institucional | `contacto@sigah.mx`, `gustavo@sigah.mx`, `carlos@sigah.mx` | ☐ por crear |
| LinkedIn | `linkedin.com/company/sigah-mx` | ☐ por reservar |
| X / Twitter | `@sigah_mx` | ☐ por reservar |
| Instagram | `@sigah.mx` | ☐ por reservar |
| GitHub (org futura) | `github.com/sigah-mx` | ☐ por crear cuando se separe el repo SaaS |

---

## 8. Co-uso con la instancia SIGAH en HGR No.1

La instancia desplegada en HGR No.1 conserva el nombre **SIGAH** en su UI por convivencia con el hospital. Eso no rompe la marca SIGAH:

- SIGAH queda como **la primera tenant de SIGAH** — es la prueba viviente, no una marca competidora.
- En materiales comerciales se menciona "SIGAH en HGR No.1" como caso de éxito de SIGAH.
- Cuando convenga, esa instancia puede migrar al branding SIGAH (cambio de logo y nombre en UI), pero no es bloqueante para vender a otros hospitales.

---

## 9. Pendiente para versión 1.1

- Logo profesional (diseñador externo).
- Mockups de landing `sigah.mx` con la paleta aplicada.
- Plantilla de presentación comercial (pitch deck para hospitales).
- Plantillas de correo (firma institucional, plantilla de propuesta comercial).
- Guía de fotografía: cómo se ve el "hospital SIGAH" en una foto (limpio, instrumental visible, sin pacientes identificables).
- Versión en inglés del wordmark para eventual expansión.

---

_Mantenedor: Gustavo. Actualizar este documento cada vez que se tome una decisión de marca._
