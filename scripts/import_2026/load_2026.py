#!/usr/bin/env python3
"""
load_2026.py — DRY-RUN. Genera el plan de carga aditiva del staging 2026
sobre `equipos`, comparándolo contra el estado actual de prod.

NO escribe en ninguna base. Produce:
  staging/plan_update.sql   sentencias aditivas (solo RELLENO de huecos) — para revisar/aplicar
  staging/conflictos.csv    series donde 2026 difiere de un valor ya presente en prod
  + reporte de conteos por campo

Política aditiva:
  - RELLENO  : prod vacío y 2026 trae valor  -> se genera sentencia.
  - IGUAL    : ya coinciden                   -> nada.
  - CONFLICTO: prod tiene valor distinto      -> NO se toca; va a conflictos.csv.
  Nunca se escribe NULL.

Cruce por serie (fallback inventario). La sentencia apunta a la serie REAL de prod.
Los valores se escapan con sql_str(); el archivo se revisa antes de aplicar.

Uso:
  python load_2026.py            # dry-run contra staging/prod_equipos_full.tsv
"""
import csv
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parse_2026 import norm  # noqa: E402


def fold(s):
    """Compara texto libre ignorando acentos, caso y espacios (mismo proveedor)."""
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.upper().split())

HERE = Path(__file__).parent
STAGING = HERE / "staging" / "equipos_2026.json"
PRODTSV = HERE / "staging" / "prod_equipos_full.tsv"

# prioridad de tipo_adquisicion si una serie aparece en varias carpetas
TIPO_PRIO = {"contrato_consolidado": 3, "garantia": 2, "recurso_propio": 1, "subrogado": 0}


def sql_str(v):
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def load_prod(path):
    """serie_norm -> dict(estado actual). También indexa por inventario_norm."""
    by_serie, by_inv = {}, {}
    # prod tiene encoding mixto latin1/utf8 en textos; series/inventarios son ASCII
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            sn = norm(row["serie"])
            rec = {k: (row.get(k) or "").strip() for k in row}
            rec["_serie_real"] = row["serie"]
            if sn:
                by_serie[sn] = rec
            inv = norm(row.get("inventario"))
            if inv:
                by_inv[inv] = rec
    return by_serie, by_inv


def combine_staging(recs):
    """Dedup por serie_norm: combina fuentes de un mismo equipo."""
    out = {}
    for r in recs:
        sn = r["serie_norm"]
        if not sn:
            continue
        cur = out.setdefault(sn, {"serie_norm": sn, "serie_raw": r["serie_raw"],
                                  "inventario_norm": r["inventario_norm"],
                                  "tipo_adquisicion": r["tipo_adquisicion"],
                                  "proveedor": "", "numero_contrato": ""})
        if TIPO_PRIO.get(r["tipo_adquisicion"], 0) > TIPO_PRIO.get(cur["tipo_adquisicion"], 0):
            cur["tipo_adquisicion"] = r["tipo_adquisicion"]
        if not cur["proveedor"] and r.get("proveedor"):
            cur["proveedor"] = r["proveedor"]
        if not cur["numero_contrato"] and r.get("numero_contrato"):
            cur["numero_contrato"] = r["numero_contrato"]
        if not cur["inventario_norm"] and r.get("inventario_norm"):
            cur["inventario_norm"] = r["inventario_norm"]
    return out


# mapeo: columna destino en equipos  <-  clave en staging combinado
FIELDS = [
    ("tipo_adquisicion", "tipo_adquisicion"),
    ("proveedor_servicio", "proveedor"),
    ("numero_contrato", "numero_contrato"),
    ("numero_contrato_servicio", "numero_contrato"),
]


def build_stmt(serie_real, sets):
    """Construye una sentencia de actualización (valores ya escapados)."""
    asg = ", ".join(col + "=" + sql_str(val) for col, val in sets.items())
    return "UPDATE equipos SET " + asg + " WHERE serie=" + sql_str(serie_real) + ";"


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--reclasificar-tipo", action="store_true",
                    help="incluye en el plan la sobrescritura de tipo_adquisicion en conflicto (cédula 2026 gana)")
    args = ap.parse_args()

    recs = json.loads(STAGING.read_text(encoding="utf-8"))
    by_serie, by_inv = load_prod(PRODTSV)
    combined = combine_staging(recs)
    reclasif = 0

    updates = []
    fill = {c: 0 for c, _ in FIELDS}
    conflict = {c: 0 for c, _ in FIELDS}
    igual = {c: 0 for c, _ in FIELDS}
    no_match = []
    conflict_rows = []
    matched = 0

    for sn, s in combined.items():
        prod = by_serie.get(sn)
        via = "serie"
        if not prod and s["inventario_norm"]:
            prod = by_inv.get(s["inventario_norm"])
            via = "inventario"
        if not prod:
            no_match.append(s)
            continue
        matched += 1
        sets = {}
        for col, key in FIELDS:
            new = (s.get(key) or "").strip()
            if not new:
                continue
            cur = (prod.get(col) or "").strip()
            if not cur:
                sets[col] = new
                fill[col] += 1
            elif fold(cur) == fold(new) or norm(cur) == norm(new):
                igual[col] += 1
            elif col == "tipo_adquisicion" and args.reclasificar_tipo:
                # cédula 2026 gana: sobrescritura controlada y registrada
                sets[col] = new
                reclasif += 1
                conflict_rows.append({"serie": prod["_serie_real"], "via": via, "campo": col,
                                      "prod_actual": cur, "valor_2026": new + " [RECLASIFICADO]"})
            else:
                conflict[col] += 1
                conflict_rows.append({"serie": prod["_serie_real"], "via": via, "campo": col,
                                      "prod_actual": cur, "valor_2026": new})
        if sets:
            updates.append((prod["_serie_real"], sets))

    # ── archivos ───────────────────────────────────────────────────
    sqlp = HERE / "staging" / "plan_update.sql"
    lines = ["-- DRY-RUN plan de carga aditiva 2026 -> equipos (solo RELLENO de huecos)",
             "-- Revisar antes de aplicar. No sobreescribe valores existentes.",
             "START TRANSACTION;"]
    for serie_real, sets in updates:
        lines.append(build_stmt(serie_real, sets))
    lines.append("-- COMMIT;  -- descomentar para confirmar")
    lines.append("ROLLBACK;   -- por defecto no aplica nada")
    sqlp.write_text("\n".join(lines) + "\n", encoding="utf-8")

    cfp = HERE / "staging" / "conflictos.csv"
    with cfp.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["serie", "via", "campo", "prod_actual", "valor_2026"])
        w.writeheader()
        w.writerows(conflict_rows)

    # ── reporte ────────────────────────────────────────────────────
    print("Staging combinado: " + str(len(combined)) + " series únicas")
    print("Match contra prod: " + str(matched) + "  (sin match: " + str(len(no_match)) + ")")
    print("Equipos a actualizar: " + str(len(updates)) + "  (reclasificaciones de tipo: " + str(reclasif) + ")")
    print("=" * 60)
    print("%-28s %9s %7s %10s" % ("campo", "rellenar", "igual", "conflicto"))
    for c, _ in FIELDS:
        print("%-28s %9d %7d %10d" % (c, fill[c], igual[c], conflict[c]))
    print("=" * 60)
    print("plan SQL     -> " + str(sqlp))
    print("conflictos   -> " + str(cfp) + "  (" + str(len(conflict_rows)) + " filas)")
    if conflict_rows:
        print("\nMuestra de conflictos (revisar política antes de forzar):")
        for r in conflict_rows[:8]:
            print("  %-18s %-24s prod='%s' 2026='%s'" % (
                r["serie"][:18], r["campo"], r["prod_actual"][:20], r["valor_2026"][:20]))


if __name__ == "__main__":
    main()
