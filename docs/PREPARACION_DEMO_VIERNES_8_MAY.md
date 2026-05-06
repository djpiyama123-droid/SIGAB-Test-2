# Preparación Demo Directivos HGR No.1 — Viernes 8 May 2026

**Audiencia**: Carlos Oswaldo Ramírez González (Jefe de Conservación), Salvador Soltero, equipo directivo
**Sistema**: SIGAB v2.0 — https://sigab.129-121-100-147.sslip.io

---

## Pre-flight Checklist (jueves noche / viernes mañana)

### Infraestructura VPS
- [ ] VPS uptime: `ssh sigab-vps "uptime && docker ps"`
- [ ] Todos los contenedores healthy: `sigab-backend`, `sigab-mysql`, `sigab-frontend`, `traefik`
- [ ] HTTPS responde: `curl -I https://sigab.129-121-100-147.sslip.io`
- [ ] API auth funciona: `curl -s https://sigab.129-121-100-147.sslip.io/api/equipos/` → debe retornar `401`
- [ ] Health endpoint: `curl https://sigab.129-121-100-147.sslip.io/health` → `{"status":"ok"}`

### Funcionalidad Core
- [ ] Login OK con cuenta demo (admin/admin123 o cuenta asignada)
- [ ] Dashboard carga KPIs distintos de 0
- [ ] Mapa de equipos renderiza sin errores de JS
- [ ] Tooltip del mapa NO se corta en orillas (threshold 280px)
- [ ] Scroll del mapa fluido (GPU will-change: transform)

### Mobile (375×667px)
- [ ] Bottom navigation visible
- [ ] FAB visible en Órdenes y Tecnovigilancia
- [ ] Sidebar colapsa a hamburguesa

### Módulos Demo
- [ ] Equipos: listado carga, CSV exporta correctamente
- [ ] Órdenes: crear OS nueva, cambiar estado a en_progreso
- [ ] PDF cierre: abrir OrdenDetalleModal → botón "📋 Físico" genera PDF Poka-Yoke
- [ ] PDF cierre: botón "🖨️ PDF" genera carta de conformidad
- [ ] Tecnovigilancia: registrar evento NOM-240
- [ ] HTML imprimible: https://sigab.129-121-100-147.sslip.io/orden-servicio-v2.html

### Datos de Demo
- [ ] Al menos 5 equipos registrados con estado variado (operativo/mantenimiento)
- [ ] Al menos 2 órdenes de servicio cerradas (para mostrar historial)
- [ ] Al menos 1 orden abierta (para mostrar flujo en vivo)

---

## Escenarios de Demo (5-7 min cada uno)

### Escenario 1: Captura desde campo (técnico en campo)
1. Abrir módulo Órdenes → botón "+" (FAB en mobile)
2. Mostrar formulario con validación Poka-Yoke
3. Crear OS nueva para equipo X
4. Cambiar estado → "Iniciar Trabajo"
5. Subir evidencia fotográfica (antes/durante)
6. Finalizar y cerrar → generar PDF Poka-Yoke con datos reales
7. **Mostrar**: folio ISO 8601 (`OS-YYYYMMDD-XXXX`), asteriscos rojos, checkboxes

### Escenario 2: Dashboard en tiempo real
1. Abrir Dashboard → mostrar KPIs: equipos operativos, órdenes abiertas, alertas
2. Mapa de pisos → hover sobre equipo → tooltip con información detallada
3. Mostrar mobile view (375px) → bottom nav, mapa funcional
4. **Mostrar**: actualizaciones en tiempo real tras crear OS en Escenario 1

### Escenario 3: PDF Poka-Yoke imprimible
1. Ir a https://sigab.129-121-100-147.sslip.io/orden-servicio-v2.html
2. Mostrar formato físico: campo serie destacado (amarillo), checkboxes, bloque rojo validación
3. Ctrl+P → preview de impresión en A4/Letter
4. Mostrar PDF generado desde sistema: OrdenDetalleModal → "📋 Físico"
5. **Mostrar**: folio pre-rellenado, datos del equipo, firma en 3 bloques

### Escenario 4: Tecnovigilancia NOM-240
1. Módulo Tecnovigilancia → registrar evento adverso
2. Mostrar flujo: Reportado → En Investigación → Escalado a COFEPRIS
3. Descargar PDF NOM-240
4. **Mostrar**: cumplimiento normativo integrado en el flujo de trabajo

---

## Backup Plan (si VPS cae durante demo)

### Screenshots pre-grabados (tomar el jueves noche)
Guardar en `~/Desktop/sigab-demo-backup/`:
- `dashboard-desktop.png` — KPIs, gráficas, mapa
- `dashboard-mobile.png` — Bottom nav, FAB, mapa 375px
- `ordenes-list.png` — Listado con filtros
- `ordenes-detail.png` — Modal detalle OS abierta
- `poka-yoke-formato.pdf` — PDF generado con datos reales
- `orden-servicio-v2-print.pdf` — HTML imprimible guardado como PDF
- `tecnovigilancia.png` — Módulo NOM-240

### Contingencia de red
- Configurar hotspot 4G antes de la demo (jueves)
- Pre-cargar todas las páginas con caché activo (visitar cada módulo el jueves noche)
- Si falla HTTPS: acceso directo por IP `http://129.121.100.147:8000/docs` (Swagger)

---

## Datos Técnicos para Preguntas del Directivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde viven los datos? | MySQL 8.0 en el mismo servidor VPS (on-premise, sin cloud) |
| ¿Cumple NOM-016? | Sí — audit trail en `log_actividad`, hash SHA-256 por entrada |
| ¿Cumple NOM-240? | Sí — flujo completo de tecnovigilancia con escalado a COFEPRIS |
| ¿Backup de datos? | Volumen Docker persistente + script `sigab_full_dump.sql` |
| ¿Acceso mobile? | Sí — PWA-ready, bottom nav, FAB, responsive Tailwind CSS |
| ¿IA integrada? | Copilot con Gemma 3:4b (Ollama local) + Gemini Vision API |
| ¿PDF de OS? | Dos formatos: cierre digital + Poka-Yoke físico imprimible |

---

## Confirmación de Agenda

- [ ] Reconfirmar con Salvador Soltero disponibilidad Carlos Oswaldo (jueves 7 noche)
- [ ] Sala con proyector o TV disponible
- [ ] Laptop con cargador
- [ ] Demo user creado con datos representativos

---

*Generado: 2026-05-06 | SIGAB v2.0 | Branch: feature/pulido-vps-sem-4-8-may*
