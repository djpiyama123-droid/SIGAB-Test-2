# Expediente del Equipo — rama feat/expediente-equipo-2026

Trabajo dejado por Claude Code la noche del 2026-06-26 (~23:30 PDT) en worktree
aislado `/root/wt-expediente`. **NADA de esto toca prod todavía.** El backend NO
se rebuildeó, la BD NO se tocó, el frontend NO se buildeó. Es código en rama para
que Gustavo revise y apruebe.

## Qué se hizo (seguro, sin tocar prod)
- `database/migrations/010_equipo_documentos.sql` — tabla idempotente para anexar
  contratos/órdenes/dictámenes a un equipo por serie/inventario.
- `sigab-backend/routes/equipo_documentos.py` — endpoint `GET /api/equipos/{id}/expediente`
  (documentos + órdenes por serie/inventario, incluye archivo histórico). Read-only, ownership por tenant.
- `sigab-backend/main.py` — registra el router (2 líneas).
- `sigab-backend/scripts/ingesta_docs_2026.py` — ingesta de los docs 2026. **Dry-run por defecto.**

## Pendiente que SÍ toca prod (requiere TU OK + supervisión, ~10-15 min)
1. **Copiar los PDFs/escaneos faltantes** de la laptop al VPS (hoy solo están los Excels):
   `rsync -av "/mnt/c/Users/djpiy/Desktop/Bioingeneria/2026/DOCUMENTOS ESCANEADOS/" sigab-vps:/opt/sigab/USB_DATA/2026/...`
   (y DICTAMEN DE BAJA, REPORTES, MATENIMIENTOS.../*.pdf). Sin esto, la ficha no tiene PDFs que mostrar.
2. **Cartografía (OpenCode)**: generar `/tmp/audit2026/manifiesto-docs.json` (ver prompt en ~/.hermes/notes/prompt-opencode-cartografia-2026.md).
3. **Backup BD**: `docker exec sigah-mysql mysqldump -u root -p<...> sigab > /opt/sigab/backups/pre_expediente_2026-06-27.sql`
4. **Migración**: `docker exec -i sigah-mysql mysql -u root -p<...> sigab < database/migrations/010_equipo_documentos.sql`
5. **Ingesta dry-run** y luego `--commit` (ver cabecera del script). Destino real = named volume `sigab_uploads`.
6. **Backfill órdenes históricas** por serie (el endpoint /expediente ya las junta en lectura; backfill de equipo_id es opcional).
7. **Deploy**: merge a `pulido/2026-06-16` (o cherry-pick), `docker compose build backend && up -d --force-recreate backend`.
   Frontend: cuando esté listo, `cd sigab-frontend && npm run build`.
8. **Smoke**: `curl -s https://sigab.129-121-100-147.sslip.io/api/equipos/<id>/expediente -H "Authorization: Bearer <jwt>"`

## Rollback
- Código: la rama está aislada; prod sigue en `a1e8ac4`. No hay nada que revertir hasta el deploy.
- BD (si se corrió migración/ingesta): restaurar el dump pre_expediente, o `DROP TABLE equipo_documentos;` (tabla nueva, no afecta equipos).

## Frontend (pendiente de Claude Code)
`sigab-frontend/src/components/EquipoDetail.jsx` (sección Contrato + Órdenes) y
`OrdenDetalleModal.jsx` (formatos funcionales). Consumir `GET /api/equipos/{id}/expediente`.
