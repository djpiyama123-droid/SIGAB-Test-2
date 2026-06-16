# Capa 1 en Traefik — rate limiting de borde para SIGAB

Producción usa **Traefik** (no Nginx directo), así que la Capa 1 del
`DISENO_RATE_LIMITING.md` se implementa con el middleware `rateLimit` de
Traefik. Esto **complementa** la Capa 2 ya implementada en la app
(`sigab-backend/middleware/rate_limit.py`), no la reemplaza.

> ⚠️ No se aplicó automáticamente para **no tocar el routing vivo** (regla "no
> romper producción"). Estas labels son additivas y reversibles; aplicarlas
> requiere `docker compose up -d` en el VPS, con OK de Gustavo.

## Labels a añadir al servicio `backend` en `docker-compose.yml`

```yaml
    labels:
      # ... labels de routing existentes (NO tocar) ...

      # ── Rate limit de borde (Capa 1) ──────────────────────────────────
      # Límite promedio por IP cliente, con ráfaga. Traefik usa la IP real
      # vía depth del X-Forwarded-For (estamos detrás de su propio proxy).
      - "traefik.http.middlewares.sigab-rl.ratelimit.average=20"
      - "traefik.http.middlewares.sigab-rl.ratelimit.burst=40"
      - "traefik.http.middlewares.sigab-rl.ratelimit.period=1s"
      - "traefik.http.middlewares.sigab-rl.ratelimit.sourcecriterion.ipstrategy.depth=1"

      # Encadenar el middleware a AMBOS routers (web y websecure) del API,
      # junto al redirect ya existente:
      - "traefik.http.routers.sigah-api.middlewares=sigah-redirect@docker,sigab-rl@docker"
      - "traefik.http.routers.sigah-api-s.middlewares=sigab-rl@docker"
```

Notas:
- Traefik responde **429 Too Many Requests** al exceder el límite (consistente
  con la app). No emite `Retry-After` por sí mismo; la Capa 2 sí lo hace.
- `sourcecriterion.ipstrategy.depth=1` toma la IP del último salto en
  `X-Forwarded-For`. Ajustar el `depth` si hay más proxies por delante.
- La **allowlist LAN** fina (límites holgados para el hospital/Tailscale) se
  resuelve mejor en la Capa 2 (ya lo hace por CIDR). Si se quiere también en
  Traefik, usar un router aparte con `ipallowlist` para la subred del hospital
  apuntado al backend SIN el middleware `sigab-rl`.

## Verificación tras aplicar (en el VPS)

```bash
# Debe empezar a devolver 429 al pasar el burst. Nota: /api/cache/stats ahora
# exige sesión, así que sin token verás 401 hasta que el cubo se agota y luego
# 429 (el rate limit corre ANTES del auth). El 429 es la señal a observar:
for i in $(seq 1 60); do \
  curl -s -o /dev/null -w "%{http_code} " https://sigab.129-121-100-147.sslip.io/api/cache/stats; \
done; echo
docker logs traefik --tail 20   # ver entradas de rate limit
```
