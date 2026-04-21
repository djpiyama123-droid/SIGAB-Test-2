# Plan de Recolección Fin de Semana + Auditoría Lunes 20-abr-2026

**Ventana operativa:** Viernes 17-abr 17:00 h → Lunes 20-abr 08:00 h
**Entorno:** ThinkCentre M720q en oficina de Conservación, Clínica 1, HGR No.1 IMSS Tijuana
**Objetivo:** Capturar al menos **30 eventos reales** (órdenes, preventivos, alertas, tecnovigilancia) vía OpenClaw para demostrar en la presentación del **martes 21-abr** que SIGAB opera con datos de producción reales, no simulados.

---

## 1. Objetivos medibles del fin de semana

| KPI | Meta mínima | Meta ideal |
|---|---:|---:|
| Órdenes de servicio capturadas por WhatsApp | 15 | 25 |
| Mantenimientos preventivos registrados | 5 | 10 |
| Alertas generadas automáticamente | 3 | 8 |
| Reportes de tecnovigilancia NOM-240 | 1 | 3 |
| Consultas al Copilot IA por el personal | 10 | 25 |
| Tiempo promedio de captura (foto → BD) | < 90 s | < 60 s |
| Uptime del ThinkCentre | 100 % | 100 % |
| Pérdida de datos | 0 | 0 |

---

## 2. Cronograma del fin de semana

### Viernes 17-abr (17:00 → 22:00 h) — Arranque tarde

| Hora | Actividad | Responsable | Validación |
|---|---|---|---|
| 17:00 | Salida de Gustavo de Clínica 1 tras instalación | Gustavo | — |
| 17:30 | Primer turno vespertino usa OpenClaw para orden real | Técnico turno T2 | Aparece en /ordenes |
| 18:00 | Verificación remota por SSH desde casa | Gustavo | Dashboard vivo |
| 20:00 | Primera ronda de validación de datos | Gustavo (remoto) | ≥ 3 eventos |
| 22:00 | Backup automático cron 02:00 programado | Sistema | Log limpio |

### Sábado 18-abr (06:00 → 22:00 h) — Día completo

| Hora | Actividad | Responsable | Validación |
|---|---|---|---|
| 06:00 | Primer turno matutino arranca jornada | Técnico turno T1 | — |
| 08:00 | Check-in remoto vía SSH + WhatsApp a Carlos Oswaldo | Gustavo | Sin errores |
| 10:00 | Simulacro de alerta crítica (ventilador) | Gustavo + T1 | Alerta generada |
| 12:00 | Reporte intermedio vía WhatsApp | Carlos Oswaldo | Resumen del día |
| 14:00 | Cambio turno T2 | Personal clínico | Handover limpio |
| 18:00 | Validación de captura vespertina | Gustavo (remoto) | ≥ 8 eventos del día |
| 22:00 | Backup automático | Sistema | Archivo SQL en disco |

### Domingo 19-abr (06:00 → 22:00 h) — Día completo

| Hora | Actividad | Responsable | Validación |
|---|---|---|---|
| 06:00 | Turno T1 con carga reducida | Personal guardia | — |
| 09:00 | Pruebas con el Copilot IA (Gustavo envía preguntas) | Gustavo + Carlos | ≥ 5 respuestas útiles |
| 12:00 | Reporte intermedio WhatsApp | Carlos Oswaldo | Sin incidentes |
| 16:00 | Mini-pruebas de edge cases (foto borrosa, audio ruidoso) | Gustavo | OpenClaw maneja errores |
| 20:00 | Validación total del fin de semana | Gustavo | ≥ 20 eventos capturados |
| 22:00 | Último backup automático | Sistema | OK |
| 23:00 | Compilado de métricas para la auditoría | Gustavo | Reporte preliminar |

### Lunes 20-abr (07:00 → 18:00 h) — Auditoría y cierre

| Hora | Actividad | Responsable | Entregable |
|---|---|---|---|
| 07:00 | Salida de Gustavo a Clínica 1 | Gustavo | — |
| 07:30 | Arribo a Clínica 1 | Gustavo | — |
| 07:45 | Reunión corta con Carlos Oswaldo | Ambos | Apuntes |
| 08:00 | Inicio auditoría técnica (sección 3) | Gustavo | Checklist 3 lleno |
| 10:00 | Auditoría funcional (sección 4) | Gustavo + T1 | Checklist 4 lleno |
| 12:00 | Auditoría normativa NOM-016/240 (sección 5) | Gustavo | Checklist 5 lleno |
| 14:00 | Compilado del reporte de auditoría (sección 6) | Gustavo | Reporte_Auditoria_20abr.md |
| 16:00 | Sesión de retroalimentación con Carlos Oswaldo | Ambos | Carta de conformidad o ajustes |
| 17:00 | Copia final de datos para la presentación martes | Gustavo | SQL dump + capturas |
| 18:00 | Regreso a casa, preparación final martes | Gustavo | — |

---

## 3. Auditoría técnica (lunes 08:00 → 10:00 h)

### 3.1 Integridad del sistema

- [ ] ThinkCentre responde al ping.
- [ ] Los 4 contenedores Docker siguen `running`: `docker compose ps`.
- [ ] MySQL acepta conexiones: `docker exec mysql-sigab mysqladmin ping`.
- [ ] Ollama responde con modelos cargados: `curl localhost:11434/api/tags`.
- [ ] Backend `/health` → `{"status":"ok"}`.
- [ ] Frontend carga en <2 s desde una máquina del hospital.

### 3.2 Integridad de datos

- [ ] `SELECT COUNT(*) FROM ordenes WHERE fecha_creacion >= '2026-04-17 17:00';` → devuelve número ≥ 15.
- [ ] `SELECT COUNT(*) FROM preventivos WHERE fecha_creacion >= '2026-04-17 17:00';` → ≥ 5.
- [ ] `SELECT COUNT(*) FROM alertas WHERE fecha_creacion >= '2026-04-17 17:00';` → ≥ 3.
- [ ] `SELECT COUNT(*) FROM log_actividad WHERE fecha_creacion >= '2026-04-17 17:00';` → registro de TODAS las acciones.
- [ ] No hay órdenes con campos críticos NULL (técnico, equipo, falla).

### 3.3 Logs y errores

- [ ] `docker logs sigab-backend --since 72h | grep -i error` → <5 errores (NO críticos).
- [ ] `docker logs sigab-bot --since 72h | grep -i error` → <5 errores.
- [ ] Ningún contenedor reiniciado inesperadamente: `docker events --since 72h`.
- [ ] Logs de audit trail completos para NOM-016.

### 3.4 Backups

- [ ] 3 backups automáticos generados (vie 02:00 NO aplica; sáb 02:00, dom 02:00, lun 02:00).
- [ ] Cada backup pesa > 100 KB.
- [ ] Restauración de prueba exitosa en instancia local de Gustavo.

---

## 4. Auditoría funcional (lunes 10:00 → 12:00 h)

### 4.1 Flujo OpenClaw (WhatsApp → SIGAB)

- [ ] Tomar foto nueva de orden de servicio → enviar → validar que aparece en <90 s.
- [ ] Enviar audio nuevo 15 s → validar transcripción + clasificación.
- [ ] Enviar imagen borrosa deliberadamente → OpenClaw responde con solicitud de nueva foto.
- [ ] Consultar por WhatsApp: "¿cuántas órdenes abiertas hay?" → Copilot responde con número correcto.

### 4.2 Dashboard y módulos web

- [ ] Dashboard KPIs actualizados (no cacheados viejos).
- [ ] Módulo Equipos: lista completa, filtros funcionan, transiciones de estado OK.
- [ ] Módulo Órdenes: las órdenes del fin de semana aparecen, se pueden cerrar.
- [ ] Módulo Preventivos: calendario actualizado.
- [ ] Módulo Tecnovigilancia: puede crear reporte NOM-240.
- [ ] Módulo Copilot: responde en <8 s.
- [ ] Módulo Trazabilidad: log_actividad íntegro.
- [ ] Módulo Reportes: genera PDF y Excel sin error.

### 4.3 Usuarios y permisos

- [ ] Login de Carlos Oswaldo funciona.
- [ ] Carlos no puede eliminar registros (solo admin_sistema).
- [ ] Técnicos solo ven órdenes asignadas.

---

## 5. Auditoría normativa (lunes 12:00 → 14:00 h)

### 5.1 NOM-016-SSA3-2012 (expediente biomédico)

- [ ] Todo equipo tiene bitácora electrónica completa.
- [ ] Todas las acciones están en `log_actividad` con usuario + timestamp.
- [ ] Se puede exportar la bitácora de un equipo en PDF.
- [ ] Firma electrónica (hash) presente en cada reporte generado.

### 5.2 NOM-240-SSA1-2012 (tecnovigilancia)

- [ ] El formato de reporte de incidente coincide con el Anexo I de la NOM.
- [ ] Campos obligatorios llenos: tipo de incidente, equipo, paciente (si aplica), lote, fecha, descripción.
- [ ] Se genera número de folio único por reporte.

### 5.3 ISO-13485 (gestión de calidad de dispositivos médicos)

- [ ] Trazabilidad hacia atrás: de un reporte, se puede llegar al equipo y al personal involucrado.
- [ ] Control de documentos: versiones de formatos registradas.

### 5.4 LFPDPPP (datos personales)

- [ ] Base de datos local, SIN envío a la nube.
- [ ] Contraseñas hasheadas (bcrypt) — validar con `SELECT password FROM usuarios LIMIT 1;` → no es texto plano.
- [ ] Aviso de privacidad disponible en el login.

---

## 6. Compilado del Reporte de Auditoría (lunes 14:00 → 16:00 h)

**Archivo a producir:** `Reporte_Auditoria_Piloto_20abr2026.md` en `OPERACION/`

Estructura propuesta:

1. **Portada** — Fecha, autor, destinatario (Carlos Oswaldo + Prof. Piña)
2. **Resumen ejecutivo** — 5 bullets del resultado
3. **Métricas reales del fin de semana** — tabla con los KPIs vs. metas
4. **Captura del Dashboard en producción** — imagen con datos reales
5. **Hallazgos técnicos** — checklist 3 consolidado
6. **Hallazgos funcionales** — checklist 4 consolidado
7. **Hallazgos normativos** — checklist 5 consolidado
8. **Incidentes y resoluciones** — si hubo problemas, cómo se resolvieron
9. **Firma de conformidad** — línea para Carlos Oswaldo
10. **Anexos** — SQL dump, screenshots, audios/fotos de ejemplo

---

## 7. Criterios de éxito del piloto

El piloto se considera **EXITOSO** si se cumplen simultáneamente:

1. **Datos reales:** ≥ 20 eventos capturados en 60 h.
2. **Uptime:** ≥ 99 % del tiempo.
3. **Latencia OpenClaw:** < 90 s foto → BD en promedio.
4. **Conformidad:** Carlos Oswaldo firma carta de conformidad.
5. **Cero pérdida de datos:** 3 backups restaurables validados.

Si los 5 criterios pasan → el **martes 21-abr** el proyecto se presenta como un **sistema ya operando en HGR No.1 IMSS Tijuana**, no como un prototipo.

---

## 8. Riesgos del fin de semana y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Corte de luz prolongado en la clínica | Media | Alto | UPS 10 min + apagado seguro automático |
| Pérdida de señal WhatsApp en el técnico | Alta | Medio | Fallback: captura manual en formulario web |
| Falla de Ollama por OOM | Media | Medio | Reinicio automático + modelo reducido `gemma:2b` |
| Carlos Oswaldo no disponible sábado/domingo | Baja | Alto | Personal de guardia capacitado como respaldo |
| Sabotaje involuntario (un técnico borra datos) | Baja | Alto | Roles y log_actividad no permite borrado físico |
| La red del hospital se reconfigura el sábado | Baja | Alto | IP fija registrada + contacto con Informática IMSS |

---

## 9. Contactos de emergencia (fin de semana)

| Rol | Nombre | Teléfono | Horario |
|---|---|---|---|
| Líder técnico SIGAB | Gustavo Aguilar | +52 664 ___ ____ | 24/7 |
| Interlocutor clínico | Ing. Carlos Oswaldo | (pendiente) | 08:00-20:00 |
| Informática IMSS guardia | (a confirmar el viernes) | — | 24/7 |
| Soporte Lenovo (hardware) | — | 01-800-083-4916 | Lunes 08:00 |

---

## 10. Preparación martes 21-abr (prep del martes 08:00)

Antes de la presentación universitaria (hora por confirmar):

- [ ] Exportar dashboard con datos REALES del fin de semana (captura de pantalla).
- [ ] Generar 3 PDFs de reportes NOM-016 con datos reales.
- [ ] Preparar las Ray-Ban Meta Display cargadas al 100 %.
- [ ] Validar conectividad WhatsApp video-call entre Ray-Ban y la laptop Asus.
- [ ] Ensayar la demo en vivo desde Clínica 1 (5 min).
- [ ] Imprimir 3 copias del Reporte de Auditoría para el jurado.
