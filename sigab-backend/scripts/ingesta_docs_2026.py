#!/usr/bin/env python3
"""
ingesta_docs_2026.py — Ingesta de documentos 2026 al Expediente del Equipo.

Lee el manifiesto de OpenCode (archivo -> serie/clase) y, para cada archivo:
  1. calcula sha256, 2. lo copia a <dest>/<clase>/<serie>__<hash8>.<ext>,
  3. resuelve equipo_id por serie (fallback inventario),
  4. upsertea en equipo_documentos (idempotente por unique key serie+clase+hash).

SEGURO POR DEFECTO: corre en --dry-run (no copia, no toca BD). Para ejecutar
de verdad: --commit. PROD = datos de pacientes; correr SOLO con OK de Gustavo
y backup de BD previo.

Uso:
  python3 ingesta_docs_2026.py --manifest /tmp/audit2026/manifiesto-docs.json \
      --dest /app/static/uploads            # dry-run
  python3 ingesta_docs_2026.py ... --commit  # ejecuta

DB: variables de entorno DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME (las del backend).
Requiere pymysql (pip install pymysql) solo en modo --commit.
"""
import argparse, hashlib, json, os, shutil, sys

EXT2FMT = {".pdf": "pdf", ".xlsx": "xlsx", ".xls": "xlsx", ".docx": "docx",
           ".jpg": "img", ".jpeg": "img", ".png": "img"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--dest", default="/app/static/uploads")
    ap.add_argument("--commit", action="store_true", help="ejecuta (default: dry-run)")
    args = ap.parse_args()

    with open(args.manifest, encoding="utf-8") as f:
        equipos = json.load(f)

    conn = None
    if args.commit:
        import pymysql
        conn = pymysql.connect(
            host=os.environ.get("DB_HOST", "sigah-mysql"),
            port=int(os.environ.get("DB_PORT", "3306")),
            user=os.environ["DB_USER"], password=os.environ["DB_PASS"],
            database=os.environ.get("DB_NAME", "sigab"), charset="utf8mb4",
            autocommit=False,
        )

    plan, copiados, insertados, faltantes = 0, 0, 0, 0
    for eq in equipos:
        serie = (eq.get("serie") or "").strip()
        inv = eq.get("inventario")
        ncontrato = eq.get("numero_contrato")
        for arch in eq.get("archivos", []):
            ruta = arch["ruta"]
            clase = arch.get("clase", "otro")
            if not os.path.isfile(ruta):
                faltantes += 1
                print(f"  ! FALTA archivo: {ruta}")
                continue
            ext = os.path.splitext(ruta)[1].lower()
            fmt = arch.get("formato") or EXT2FMT.get(ext, "otro")
            h = sha256(ruta)
            nombre = os.path.basename(ruta)
            destino_rel = f"{clase}/{serie}__{h[:8]}{ext}"
            destino_abs = os.path.join(args.dest, destino_rel)
            plan += 1
            if not args.commit:
                print(f"  [dry] {serie:16} {clase:11} -> {destino_rel}")
                continue
            os.makedirs(os.path.dirname(destino_abs), exist_ok=True)
            shutil.copy2(ruta, destino_abs); copiados += 1
            cur = conn.cursor()
            cur.execute(
                "SELECT id FROM equipos WHERE serie=%s OR (inventario IS NOT NULL AND inventario=%s) LIMIT 1",
                (serie, inv),
            )
            row = cur.fetchone()
            equipo_id = row[0] if row else None
            cur.execute(
                """INSERT INTO equipo_documentos
                   (equipo_id, serie, inventario, numero_contrato, clase, formato,
                    nombre_archivo, ruta_archivo, hash_archivo, origen, tenant_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)
                   ON DUPLICATE KEY UPDATE equipo_id=VALUES(equipo_id),
                     ruta_archivo=VALUES(ruta_archivo), nombre_archivo=VALUES(nombre_archivo)""",
                (equipo_id, serie, inv, ncontrato, clase, fmt, nombre,
                 destino_rel, h, "carpeta-2026"),
            )
            insertados += 1
            cur.close()

    if conn:
        conn.commit(); conn.close()
    print(f"\nResumen: plan={plan} copiados={copiados} insertados={insertados} faltantes={faltantes}")
    if not args.commit:
        print("DRY-RUN: nada se copió ni se escribió. Usá --commit (con OK + backup) para ejecutar.")


if __name__ == "__main__":
    sys.exit(main())
