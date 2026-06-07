# Seguridad — SIGAH / SIGAB

Registro de la auditoría de seguridad y la remediación aplicada en la rama
`fix/security-hardening-2026-06` (2026-06-07).

## Resumen de hallazgos y estado

| # | Severidad | Hallazgo | Estado |
|---|-----------|----------|--------|
| 1 | 🔴 CRÍTICO | Contraseña de **producción** en texto plano en `CLAUDE.md` y `portal-sigah/PROMPT_ANCLA.md` (archivos versionados) | Redactada ✅ — **requiere rotación** (sigue en historial git) |
| 2 | 🔴 CRÍTICO | Credenciales por defecto hardcodeadas (`config.py`, `docker-compose.yml`, `setup.sh`, `scripts/start_sigab.sh`) | Resuelto ✅ |
| 3 | 🟠 ALTO | Sin rate limiting en `/auth/login` (fuerza bruta) | Resuelto ✅ |
| 4 | 🟠 ALTO | Política de contraseña débil (mínimo 6 caracteres) | Resuelto ✅ |
| 5 | 🟡 MEDIO | CORS con IP LAN hardcodeada (`192.168.1.125`) | Resuelto ✅ |
| 6 | 🟡 MEDIO | Uploads validados solo por extensión, sin límite de tamaño | Resuelto ✅ |
| 7 | 🟢 BAJO | SQL dinámico (ya parametrizado, sin inyección) | Documentado ✅ |

## Detalle de la remediación

### #2 — Credenciales: fail-fast en producción
- `sigab-backend/config.py`: nueva variable `SIGAH_ENV`. Con `SIGAH_ENV=production`
  los secretos `SIGAH_DB_PASS` y `SIGAH_JWT_SECRET` son **obligatorios**; si faltan,
  el backend aborta el arranque (`_require_secret`) en lugar de caer a un valor conocido.
  En desarrollo se conservan defaults locales claramente marcados.
- `docker-compose.yml`: los secretos pasan de `${VAR:-default}` a `${VAR:?error}`
  (Compose se niega a renderizar sin ellos) y el backend corre con `SIGAH_ENV=production`.
- `setup.sh`: ya no hardcodea contraseñas; genera credenciales aleatorias
  (`openssl rand`) por instalación, las reutiliza desde `.env` en re-ejecuciones
  (idempotente) y escribe el `.env` con permisos `600`.
- `scripts/start_sigab.sh`: carga credenciales desde el `.env` del backend y aborta
  si `SIGAH_DB_PASS` no está definido (sin fallback hardcodeado).
- `sigab-backend/.env.example`: corregido el prefijo (`SIGAB_`→`SIGAH_`, que era el
  que el código realmente lee) y añadido `SIGAH_ENV`.

### #3 — Rate limiting en login
- `sigab-backend/auth/rate_limit.py` (nuevo): limitador in-memory por IP
  (ventana deslizante), sin dependencias externas. Respeta `X-Forwarded-For` (Traefik).
- Aplicado a `POST /api/auth/login`: **10 intentos por minuto por IP** → `429` con `Retry-After`.
- Nota: es por-proceso. Para múltiples workers/nodos, migrar a Redis.

### #4 — Política de contraseña
- `sigab-backend/auth/password.py`: `validate_password_strength()` exige
  **≥10 caracteres + al menos una letra y un número**. Aplicado en `change-password`.

### #5 — CORS
- `config.py`: eliminada la IP LAN hardcodeada. Los orígenes LAN se configuran
  vía `SIGAH_CORS_EXTRA` (separados por coma).

### #6 — Uploads
- `sigab-backend/utils/file_validation.py` (nuevo): `validate_upload()` valida
  **magic bytes** (PNG/JPEG/WEBP/PDF/DOC/DOCX) además de la extensión, y un
  **tamaño máximo** (`MAX_UPLOAD_MB`, 10 MB → `413`).
- Aplicado en `routes/ordenes.py` y `routes/tecnovigilancia.py`.

## ⚠️ Acciones manuales pendientes (requieren acceso al VPS — no automatizables desde aquí)

1. **Rotar la contraseña de producción de MySQL** (la antigua quedó expuesta en el
   historial git, redactarla del archivo actual NO la borra del historial):
   ```sh
   ssh sigab-vps
   # generar nueva
   NEW_PASS="$(openssl rand -hex 16)"
   docker exec -i sigah-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
     -e "ALTER USER 'sigab_user'@'%' IDENTIFIED BY '$NEW_PASS'; FLUSH PRIVILEGES;"
   # actualizar /opt/sigab/.env (DB_PASS) y recrear el stack
   cd /opt/sigab && docker compose up -d --force-recreate
   ```
2. **Rotar el `SIGAH_JWT_SECRET` de producción** (invalida sesiones activas) y
   definir `SIGAH_ENV=production` en `/opt/sigab/.env`.
3. (Opcional, recomendado) Purgar los secretos del historial git con
   `git filter-repo` o BFG, y forzar rotación de cualquier credencial que haya estado
   versionada. Mientras no se haga, **la rotación del paso 1–2 es la mitigación real**.
4. Confirmar que `/opt/sigab/.env` existe con `DB_ROOT_PASS`, `DB_PASS` y
   `SIGAH_JWT_SECRET` fuertes antes del próximo `docker compose up` (ahora es obligatorio).
