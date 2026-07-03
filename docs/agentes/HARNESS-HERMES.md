# Harness — Ops: Hermes (VPS + Telegram)

**Dónde corre:** VPS, `hermes-gateway.service` (systemd), un solo proceso
`hermes_cli.main gateway run --replace`. Canal: Telegram (usuario 8964199835).

**Rol en la orquestación:** ojos y voz del ecosistema — NO toca git ni
despliega código de SIGAB.
1. **Notificaciones:** recibe los avisos del loop (deploy 🟢 / rollback 🔴 /
   gates fallidos) y se los pasa a Gustavo por Telegram.
2. **Ops de infraestructura:** tailnet-monitor (cron 5 min), salud de
   contenedores, discos, certificados. Puede reparar INFRA (reiniciar un
   contenedor caído, rotar un log) pero nunca editar código de la app.
3. **Manos de Gustavo por Telegram:** cuando Gustavo le pide algo que
   requiere código, Hermes NO lo implementa en la rama oficial: deja la
   petición en `/home/cloud/proyectos/PETICIONES-LOOP.md` del VPS, y el
   director la recoge en su siguiente ciclo como backlog priorizado.

**Contexto que debe conocer:** `docs/cerebro/CONTEXTO-COMPARTIDO.md`,
`versions.json` (para responder "¿qué versión corre?" por Telegram).

**Reglas duras:** un solo poller de Telegram por token (--replace ya lo
garantiza); no montar failovers propios sin registrarlos en systemd; no
apagar servicios de otros agentes — reportar en vez de actuar (lección de la
disputa del 29-jun). CUIDADO técnico conocido: `pkill -f "hermes gateway"`
desde un script se auto-mata; filtrar por `comm=python`/`ppid=1`.
