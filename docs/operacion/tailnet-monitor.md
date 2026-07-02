# 📡 SIGAB — Monitor de Tailnet + Alertas
**Fecha:** 2026-07-01

## Qué hace

`scripts/tailnet-monitor.sh` corre cada 5 min vía cron y:

1. Lee `tailscale status --json`.
2. Compara contra el último snapshot guardado.
3. Si un nodo crítico (`sigab-vps` o `sigah-thinkcentre-m720q`) transiciona online↔offline, emite una alerta.
4. Persiste el estado en `/var/lib/sigab/tailnet-state.json`.
5. Log timestamped en `/var/log/sigab/tailnet-monitor.jsonl`.
6. Si `OPENCLAW_GATEWAY_URL` + `OPENCLAW_GATEWAY_TOKEN` están en `.env`, envía la alerta al gateway de OpenClaw → Telegram.

## Instalación

```bash
sudo cp scripts/tailnet-monitor.sh /usr/local/bin/sigab-tailnet-monitor
sudo chmod +x /usr/local/bin/sigab-tailnet-monitor

# Cron cada 5 min (idempotente con flock)
cat | sudo tee /etc/cron.d/sigab-tailnet-monitor <<'EOF'
*/5 * * * * root /usr/local/bin/sigab-tailnet-monitor
EOF

# Logrotate (evita que el jsonl crezca infinito)
cat | sudo tee /etc/logrotate.d/sigab-tailnet-monitor <<'EOF'
/var/log/sigab/tailnet-monitor.jsonl {
    daily
    rotate 14
    compress
    missingok
    notifempty
}
EOF

sudo systemctl restart cron
```

## Verificación manual

```bash
sudo /usr/local/bin/sigab-tailnet-monitor
echo $?   # 0=ok, 1=cambio detectado, 2=error tailscale
tail -5 /var/log/sigab/tailnet-monitor.jsonl | jq .
```

## Probar alertas (simular caída)

```bash
# Bajar manualmente el ThinkCentre (no hacerlo en prod):
ssh sigah-thinkcentre-m720q 'sudo systemctl stop tailscaled'
sleep 60
tail -10 /var/log/sigab/tailnet-monitor.jsonl | jq .
# Debe verse la alerta "🔴 sigah-thinkcentre-m720q CAYÓ"
```

## Alertas a Telegram vía OpenClaw

Para activar las alertas a Telegram, el script ya hace POST al gateway. Solo hay que confirmar que la ruta `/v1/notify` exista en OpenClaw con auth Bearer. Si no existe aún, adaptar:

- Cambiar la URL en `tailnet-monitor.sh` línea `OPENCLAW_GATEWAY_URL/v1/notify` por la ruta real.
- O llamar directo al bot API de Telegram si tenés el token.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Falsos positivos si Tailscale tiene lag | El script compara snapshots consecutivos, no hace rate limiting. Si te molesta el ruido, agregar cooldown de 3 detecciones consecutivas en offline. |
| Log crece infinito | Logrotate configurado (14 días) |
| Cron se cae | Monitorear el jsonl externamente (segundo watchdog opcional con `find -mmin`) |