# Checklist de Instalación — ThinkCentre M720q · Clínica 1 · HGR No.1 IMSS Tijuana

**Fecha:** Viernes 17 de abril de 2026
**Hora de arribo a Clínica 1 (estimada):** 14:00 h (tras reunión de 12:00 h en Café Quijarro)
**Responsable:** Gustavo Aguilar Urias
**Interlocutor clínico:** Ing. Carlos Oswaldo, Subjefe de Conservación de Equipos Médicos
**Duración estimada:** 2 h 30 min (14:00 → 16:30 h)

---

## 0. Pre-requisitos (validar ANTES de salir de Quijarro)

| # | Item | ¿OK? |
|---|---|---|
| 0.1 | Lenovo ThinkCentre M720q Tiny (i5, 16 GB, 512 GB SSD) — encendido validado en casa |  |
| 0.2 | Cable de corriente C13 | |
| 0.3 | Cable HDMI 1.5 m (para monitor de la oficina de Conservación) | |
| 0.4 | Cable Ethernet Cat 6 (3 m) | |
| 0.5 | Teclado + mouse USB de respaldo | |
| 0.6 | USB booteable Ubuntu 22.04 LTS (respaldo si hay que reinstalar) | |
| 0.7 | Laptop Asus con documentación, guion y código sincronizado | |
| 0.8 | Celular con WhatsApp Business + batería >50 % | |
| 0.9 | Copia impresa del Resumen Ejecutivo (10 pp) | |
| 0.10 | Oficio de autorización firmado por Carlos Oswaldo (o acuse verbal registrado) | |

---

## 1. Recepción y ubicación física (14:00 → 14:20 h)

- [ ] **1.1** Saludo con Carlos Oswaldo y personal de Conservación; entrega del Resumen Ejecutivo impreso.
- [ ] **1.2** Solicitar acceso a la oficina de Conservación de Equipos Médicos (zona propuesta para el micro-servidor).
- [ ] **1.3** Identificar toma de corriente regulada (UPS o regulador de voltaje). Evitar toma compartida con equipo biomédico crítico.
- [ ] **1.4** Identificar toma de red LAN del hospital. Confirmar con informática IMSS el VLAN y rango de IP disponibles (o uso de red administrativa segregada).
- [ ] **1.5** Colocar el ThinkCentre sobre superficie sólida con ventilación lateral libre (10 cm mínimo por lado).

---

## 2. Conexión y encendido inicial (14:20 → 14:40 h)

- [ ] **2.1** Conectar cable de corriente al regulador/UPS.
- [ ] **2.2** Conectar cable HDMI al monitor disponible en Conservación.
- [ ] **2.3** Conectar teclado y mouse USB.
- [ ] **2.4** Conectar cable Ethernet al punto de red asignado.
- [ ] **2.5** Encender equipo → validar POST (logo Lenovo → arranque Ubuntu 22.04 LTS).
- [ ] **2.6** Login con usuario `sigab_admin` (contraseña en gestor local de Gustavo).
- [ ] **2.7** Abrir terminal y ejecutar `ip addr show` — anotar la IP asignada (DHCP o fija).
- [ ] **2.8** Ejecutar `ping 8.8.8.8 -c 4` — verificar conectividad externa (opcional; NO obligatorio porque SIGAB es on-premise).
- [ ] **2.9** Ejecutar `ping <gateway_hospital>` — verificar conectividad interna al gateway del VLAN administrativo.

**IP asignada al ThinkCentre en Clínica 1:** __________________________
**Gateway del VLAN:** __________________________
**DNS interno IMSS:** __________________________

---

## 3. Arranque de la stack SIGAB (14:40 → 15:10 h)

- [ ] **3.1** Ir a la carpeta del proyecto: `cd ~/sigab`
- [ ] **3.2** Validar variables de entorno: `cat .env | grep -v PASSWORD` (revisar DB, puertos, Ollama host).
- [ ] **3.3** Levantar la stack completa: `docker compose up -d`
- [ ] **3.4** Esperar 90 s y validar servicios arriba:
  - [ ] **3.4.1** `docker compose ps` — los 4 servicios deben estar `running`: `sigab-backend`, `sigab-frontend`, `mysql-sigab`, `ollama-gemma`.
  - [ ] **3.4.2** `curl -s localhost:8000/health` → `{"status":"ok"}`
  - [ ] **3.4.3** `curl -s localhost:5173` → HTML con `<title>SIGAB</title>`
  - [ ] **3.4.4** `curl -s localhost:11434/api/tags` → lista de modelos Gemma.
- [ ] **3.5** Validar migraciones MySQL ejecutadas: `docker exec mysql-sigab mysql -usigab -p -e "SHOW TABLES;" sigab` — deben aparecer las 18 tablas (equipos, ordenes, preventivos, alertas, tecnovigilancia, log_actividad, etc.).
- [ ] **3.6** Cargar semilla de equipos de Clínica 1 (si no está precargada): `docker exec sigab-backend python -m scripts.seed_clinica1`

---

## 4. Configuración de red interna y descubrimiento LAN (15:10 → 15:30 h)

- [ ] **4.1** Asignar hostname: `sudo hostnamectl set-hostname sigab-clinica1`
- [ ] **4.2** Configurar IP fija (coordinar con Informática IMSS):
  ```
  sudo nmcli con mod "Wired connection 1" ipv4.method manual \
    ipv4.addresses <IP_FIJA>/24 ipv4.gateway <GATEWAY> ipv4.dns <DNS>
  sudo nmcli con up "Wired connection 1"
  ```
- [ ] **4.3** Abrir puertos en `ufw`:
  ```
  sudo ufw allow 5173/tcp  # Frontend
  sudo ufw allow 8000/tcp  # Backend API
  sudo ufw allow 22/tcp    # SSH (para soporte remoto)
  sudo ufw enable
  ```
- [ ] **4.4** Desde la Asus, navegar a `http://<IP_FIJA>:5173` — validar que el dashboard abre y Carlos Oswaldo puede ver equipos.
- [ ] **4.5** Crear usuario de Carlos Oswaldo en SIGAB (rol: admin_clinico):
  - Email: `coswaldo@imss.gob.mx` (confirmar)
  - Password temporal: `SIGAB2026!` (forzar cambio en primer login)
  - Rol: `admin_clinico`

---

## 5. Integración WhatsApp OpenClaw (15:30 → 15:50 h)

- [ ] **5.1** En la Asus de Gustavo, abrir WhatsApp Business (cuenta OpenClaw).
- [ ] **5.2** Ejecutar `docker logs sigab-bot -f` en el ThinkCentre para ver el QR de enlace.
- [ ] **5.3** Escanear QR desde WhatsApp Business → dispositivos vinculados → "Vincular dispositivo".
- [ ] **5.4** Enviar mensaje de prueba: `"ping"` → OpenClaw debe responder `"pong — SIGAB v2.0 en línea"`.
- [ ] **5.5** Probar OCR con foto: tomar foto de una Orden de Servicio existente, enviarla al número OpenClaw con texto `"OS-PRUEBA"`. Validar en `http://<IP>:5173/ordenes` que aparece la orden nueva con datos extraídos por OCR + Gemma.
- [ ] **5.6** Probar audio: mensaje de voz 10 s describiendo una falla. Validar transcripción y clasificación automática.

---

## 6. Capacitación express a Carlos Oswaldo (15:50 → 16:15 h)

- [ ] **6.1** **Flujo 1 — Consultar estado de equipos (30 s):** abrir Dashboard → ver mapa de colores por servicio (emerald/amber/red/slate).
- [ ] **6.2** **Flujo 2 — Crear Orden de Servicio vía WhatsApp (1 min):** el técnico toma foto del papel → la envía al OpenClaw → verificar en /ordenes.
- [ ] **6.3** **Flujo 3 — Programar mantenimiento preventivo (30 s):** ir a /preventivos → ver calendario → crear nuevo.
- [ ] **6.4** **Flujo 4 — Consultar al Copilot IA (30 s):** /copilot → preguntar "cuántos ventiladores están fuera de servicio hoy".
- [ ] **6.5** **Flujo 5 — Generar reporte NOM-016 mensual (30 s):** /reportes → tipo: Trazabilidad NOM-016 → PDF.
- [ ] **6.6** Entregar a Carlos Oswaldo la **Guía de Uso Rápido** impresa (1 hoja carta, 6 pasos con capturas).
- [ ] **6.7** Confirmar con Carlos que el personal de turno sabrá usar WhatsApp con OpenClaw durante el fin de semana.

---

## 7. Respaldo y cierre (16:15 → 16:30 h)

- [ ] **7.1** Tomar foto del rack/oficina con el ThinkCentre instalado (evidencia).
- [ ] **7.2** Tomar captura del Dashboard funcionando en el monitor de Conservación.
- [ ] **7.3** Ejecutar backup inicial: `docker exec mysql-sigab mysqldump -usigab -p sigab > ~/backups/sigab_clinica1_init_$(date +%Y%m%d_%H%M).sql`
- [ ] **7.4** Copiar backup a USB externo de Gustavo.
- [ ] **7.5** Configurar cron de backup diario 02:00 h: `crontab -e` → `0 2 * * * /home/sigab_admin/scripts/backup_diario.sh`
- [ ] **7.6** Probar conectividad SSH remota desde la Asus: `ssh sigab_admin@<IP_FIJA>` (para soporte de fin de semana).
- [ ] **7.7** Dejar el ThinkCentre **encendido y candado en oficina Conservación**.
- [ ] **7.8** Confirmar con Carlos Oswaldo que la oficina permanece abierta sábado y domingo (personal de guardia).
- [ ] **7.9** Intercambiar números de WhatsApp para incidencias del fin de semana.

---

## 8. Datos a llenar durante la instalación

| Dato | Valor |
|---|---|
| IP fija asignada | |
| Gateway del VLAN administrativo | |
| DNS interno IMSS | |
| Hostname final | `sigab-clinica1` |
| MAC del ThinkCentre | |
| Usuario admin creado para Carlos Oswaldo | `coswaldo` |
| Hora de puesta en marcha | |
| Equipos precargados en la BD | 47 (lista canónica Clínica 1) |
| OpenClaw vinculado con el número | +52 664 ___ ____ |

---

## 9. Criterios de éxito de la instalación

Al finalizar, los 5 criterios DEBEN estar cumplidos:

- [ ] Dashboard accesible desde la red del hospital (`http://<IP_FIJA>:5173`).
- [ ] OpenClaw responde a mensajes de prueba en WhatsApp.
- [ ] OCR procesa al menos 1 imagen de orden de servicio con datos correctos.
- [ ] Carlos Oswaldo tiene credenciales activas y sabe navegar los 5 flujos clave.
- [ ] Backup inicial de MySQL guardado en USB externo.

**Si cualquier criterio falla:** revertir a modo "demo" y escalar a Gustavo antes del lunes 20-abr 08:00 h.

---

## 10. Contingencias rápidas

| Problema | Solución inmediata |
|---|---|
| No hay red LAN en la oficina | Usar hotspot del celular temporalmente, coordinar con informática para el lunes |
| Puerto 5173 bloqueado por firewall IMSS | Cambiar a 443 con nginx reverse-proxy |
| Ollama no arranca (OOM) | `docker compose restart ollama-gemma` + bajar modelo a `gemma:2b` |
| WhatsApp pierde vinculación | Re-escanear QR desde la Asus |
| MySQL no arranca | `docker compose down -v && docker compose up -d` (se pierde data, usar backup) |
| Se va la luz en la clínica | UPS debe sostener 10 min; apagado seguro: `sudo shutdown -h now` |

---

## 11. Siguientes pasos (post-instalación viernes tarde)

- Sábado 18: monitoreo remoto por SSH, validar que lleguen datos reales por WhatsApp.
- Domingo 19: respaldo nocturno automático corriendo.
- Lunes 20 07:30: llegada a Clínica 1 para auditoría del fin de semana (ver `Plan_Recoleccion_Vie_Sab_Dom.md`).
