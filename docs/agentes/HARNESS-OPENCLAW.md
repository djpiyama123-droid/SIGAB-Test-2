# Harness — Gateway IA: OpenClaw (VPS, contenedor)

**Dónde corre:** VPS, contenedor `openclaw` (junto a `sigah-bot` WhatsApp).
Rol: gateway de automatización e IA del bot (auth JWT vía bot-login,
endpoint /v1/notify para notificaciones).

**Rol en la orquestación:**
1. Canal de notificaciones programáticas (`POST /v1/notify` → Telegram/
   WhatsApp) que usan el runner del loop y el monitor del tailnet.
2. Backend IA del bot de WhatsApp del piloto (respuestas a técnicos en piso).

**Estado (2026-07-03):** el panel superadmin lo marca "Caído" pero docker lo
reporta `healthy` — el problema es la SONDA del panel (endpoint/puerto
desactualizado en panel-api), no el servicio. Ver diagnóstico en la nota de
la versión que corrija el panel.

**Reglas duras:** no toca git ni código de SIGAB; sus cambios de config
viven en el compose del VPS y los aplica Gustavo o un humano; si su token o
puertos cambian, actualizar la sonda del panel Y el NOTIFY_URL del runner
del loop en el mismo cambio (contrato de pareja).
