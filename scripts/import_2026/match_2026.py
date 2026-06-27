#!/usr/bin/env python3
"""
match_2026.py — Cruza el staging 2026 contra un inventario de referencia y
reporta cuántos equipos hacen match por serie / inventario.

Fuentes de referencia (--ref):
  legacy:<dump.sql>   extrae series de la tabla `equipomedico` del dump legacy
  csv:<archivo.csv>   CSV con columnas 'serie' (y opcional 'inventario')
  mysql               lee serie/inventario de la tabla `equipos` (usa .env)

NO escribe en ninguna base. Solo lectura + reporte.

Uso:
  python match_2026.py --ref legacy:../../database/BaseDeDatosV2_190326.sql
  python match_2026.py --ref mysql
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

# reusa la normalización del parser
sys.path.insert(0, str(Path(__file__).parent))
from parse_2026 import norm  # noqa: E402

STAGING = Path(__file__).parent / "staging" / "equipos_2026.json"


def ref_from_legacy(sql_path):
    """Extrae (serie, inventario) de equipomedico e inventario_equipo del dump."""
    txt = Path(sql_path).read_text(encoding="utf-8", errors="replace")
    series, invs = set(), set()
    # bloque INSERT INTO `equipomedico` ... ; -> primer campo de cada tupla = Serie
    m = re.search(r"INSERT INTO `?equipomedico`?[^;]*?VALUES\s*(.+?);", txt, re.S | re.I)
    if m:
        for tup in re.finditer(r"\('([^']*)'", m.group(1)):
            n = norm(tup.group(1))
            if n:
                series.add(n)
    # inventario_equipo: para inventarios (si aplica)
    m2 = re.search(r"INSERT INTO `?inventario_equipo`?[^;]*?VALUES\s*(.+?);", txt, re.S | re.I)
    if m2:
        for tup in re.finditer(r"\('([^']*)'", m2.group(1)):
            n = norm(tup.group(1))
            if n:
                invs.add(n)
    return series, invs


def ref_from_csv(csv_path):
    series, invs = set(), set()
    delim = "\t" if str(csv_path).lower().endswith((".tsv", ".tab")) else ","
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter=delim):
            low = {k.lower().strip(): v for k, v in row.items()}
            s = norm(low.get("serie"))
            i = norm(low.get("inventario"))
            if s:
                series.add(s)
            if i:
                invs.add(i)
    return series, invs


def ref_from_mysql():
    import asyncio
    import os
    from dotenv import load_dotenv
    import aiomysql
    backend = Path(__file__).resolve().parents[2] / "sigab-backend"
    load_dotenv(backend / ".env")
    cfg = dict(host=os.getenv("SIGAH_DB_HOST", "127.0.0.1"), port=int(os.getenv("SIGAH_DB_PORT", 3306)),
               user=os.getenv("SIGAH_DB_USER", "sigah_user"), password=os.environ.get("SIGAH_DB_PASS", ""),
               db=os.getenv("SIGAH_DB_NAME", "sigah"), charset="utf8mb4", connect_timeout=8)
    series, invs = set(), set()

    async def go():
        conn = await aiomysql.connect(**cfg)
        async with conn.cursor() as c:
            await c.execute("SELECT serie, inventario FROM equipos")
            for s, i in await c.fetchall():
                if norm(s):
                    series.add(norm(s))
                if norm(i):
                    invs.add(norm(i))
        conn.close()
    asyncio.run(go())
    return series, invs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True, help="legacy:<sql> | csv:<file> | mysql")
    ap.add_argument("--staging", default=str(STAGING))
    args = ap.parse_args()

    recs = json.loads(Path(args.staging).read_text(encoding="utf-8"))

    if args.ref.startswith("legacy:"):
        ref_s, ref_i = ref_from_legacy(args.ref.split(":", 1)[1])
        src = "dump legacy equipomedico"
    elif args.ref.startswith("csv:"):
        ref_s, ref_i = ref_from_csv(args.ref.split(":", 1)[1])
        src = "CSV"
    elif args.ref == "mysql":
        ref_s, ref_i = ref_from_mysql()
        src = "MySQL equipos"
    else:
        print("ref inválida", file=sys.stderr)
        sys.exit(2)

    # dedup staging por serie_norm (un equipo lógico aunque salga en varias fuentes)
    by_serie = {}
    sin_serie = []
    for r in recs:
        s = r["serie_norm"]
        if s:
            by_serie.setdefault(s, []).append(r)
        else:
            sin_serie.append(r)

    match_serie = [s for s in by_serie if s in ref_s]
    match_inv = [r["inventario_norm"] for r in recs
                 if r["inventario_norm"] and r["serie_norm"] not in ref_s and r["inventario_norm"] in ref_i]
    no_match = [s for s in by_serie if s not in ref_s
                and not any(r["inventario_norm"] in ref_i for r in by_serie[s] if r["inventario_norm"])]

    print(f"Referencia: {src}  ({len(ref_s)} series, {len(ref_i)} inventarios)")
    print(f"Staging 2026: {len(recs)} registros -> {len(by_serie)} series únicas + {len(sin_serie)} sin serie")
    print("=" * 60)
    print(f"MATCH por serie:        {len(match_serie):4}  ({100*len(match_serie)//max(1,len(by_serie))}% de series únicas)")
    print(f"MATCH extra por invent: {len(set(match_inv)):4}")
    print(f"SIN match (revisar):    {len(no_match):4}")
    print(f"Registros sin serie:    {len(sin_serie):4}")
    # desglose por tipo de los que SÍ cruzan
    tipo_match = {}
    for s in match_serie:
        for r in by_serie[s]:
            tipo_match[r["tipo_adquisicion"]] = tipo_match.get(r["tipo_adquisicion"], 0) + 1
    print("\nMatch por serie, por tipo_adquisicion (registros):")
    for t, n in sorted(tipo_match.items()):
        print(f"  {t:22} {n}")
    # muestra de no-match para inspección
    print("\nMuestra SIN match (primeras 15 series):")
    for s in no_match[:15]:
        r = by_serie[s][0]
        print(f"  {r['serie_raw'][:22]:22} | {r['nombre'][:30]:30} | {r['tipo_adquisicion']}")

    # vuelca el set de no-match para revisión
    outp = Path(args.staging).parent / "no_match.csv"
    with outp.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["serie_raw", "serie_norm", "inventario_raw", "nombre", "marca", "modelo", "tipo_adquisicion", "fuente"])
        for s in no_match:
            r = by_serie[s][0]
            w.writerow([r["serie_raw"], s, r["inventario_raw"], r["nombre"], r["marca"], r["modelo"], r["tipo_adquisicion"], r["fuente"]])
    print(f"\nno-match -> {outp}")


if __name__ == "__main__":
    main()
