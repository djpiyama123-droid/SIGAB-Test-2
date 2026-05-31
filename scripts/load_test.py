#!/usr/bin/env python3
"""
scripts/load_test.py — Load testing asíncrono para la API SIGAH.

Uso:
    python3 load_test.py                          # local (localhost:8000)
    python3 load_test.py --base https://sigab.129-121-100-147.sslip.io
    python3 load_test.py --users 20 --duration 30
    python3 load_test.py --endpoint /api/dashboard/resumen --users 50

Requiere:
    pip install httpx

El script obtiene un JWT de /api/auth/login antes de correr el test.
Configura usuario/pass con variables de entorno o flags --user / --password.
"""
import argparse
import asyncio
import os
import statistics
import time
from dataclasses import dataclass, field
from typing import List, Optional

try:
    import httpx
except ImportError:
    raise SystemExit("Instala httpx: pip install httpx")


# ── Configuración por defecto ────────────────────────────────────────────────

DEFAULT_BASE    = "http://localhost:8000"
DEFAULT_MATRICULA = os.getenv("SIGAH_TEST_MATRICULA", "99024980")
DEFAULT_PASS    = os.getenv("SIGAH_TEST_PASS",  "admin123")
DEFAULT_USERS   = 10
DEFAULT_SECONDS = 20

ENDPOINTS_DEFAULT = [
    "/health",
    "/api/dashboard/resumen",
    "/api/dashboard/mapa",
    "/api/alertas/pendientes",
    "/api/equipos?limit=20",
    "/api/ordenes?limit=20",
    "/api/preventivos/proximos",
    "/api/equipos/areas/catalogo",
    "/api/formatos/correctivo",
    "/api/reportes/diario",
]


# ── Modelos de resultado ─────────────────────────────────────────────────────

@dataclass
class RequestResult:
    url:     str
    status:  int
    elapsed: float   # segundos
    error:   Optional[str] = None


@dataclass
class EndpointSummary:
    endpoint:  str
    total:     int = 0
    ok:        int = 0
    errors:    int = 0
    latencies: List[float] = field(default_factory=list)

    @property
    def p50(self):  return statistics.median(self.latencies)    if self.latencies else 0
    @property
    def p95(self):
        if not self.latencies:
            return 0
        s = sorted(self.latencies)
        idx = int(len(s) * 0.95)
        return s[min(idx, len(s)-1)]
    @property
    def p99(self):
        if not self.latencies:
            return 0
        s = sorted(self.latencies)
        idx = int(len(s) * 0.99)
        return s[min(idx, len(s)-1)]
    @property
    def rps(self):  return self.total / max(sum(self.latencies), 0.001)
    @property
    def error_rate(self): return self.errors / max(self.total, 1) * 100


# ── Auth ─────────────────────────────────────────────────────────────────────

async def get_token(base: str, username: str, password: str) -> str:
    async with httpx.AsyncClient(base_url=base, timeout=15) as client:
        r = await client.post("/api/auth/login", json={"matricula": username, "password": password})
        if r.status_code != 200:
            raise SystemExit(
                f"Login fallido ({r.status_code}): {r.text[:200]}\n"
                f"Configura SIGAH_TEST_MATRICULA / SIGAH_TEST_PASS o usa --matricula / --password"
            )
        return r.json()["access_token"]


# ── Worker ────────────────────────────────────────────────────────────────────

async def worker(
    worker_id: int,
    base: str,
    token: str,
    endpoints: List[str],
    stop_at: float,
    results: List[RequestResult],
    semaphore: asyncio.Semaphore,
):
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url=base, headers=headers, timeout=10) as client:
        idx = worker_id % len(endpoints)
        while time.monotonic() < stop_at:
            url = endpoints[idx % len(endpoints)]
            idx += 1
            t0 = time.monotonic()
            try:
                async with semaphore:
                    r = await client.get(url)
                elapsed = time.monotonic() - t0
                results.append(RequestResult(url=url, status=r.status_code, elapsed=elapsed))
            except Exception as exc:
                elapsed = time.monotonic() - t0
                results.append(RequestResult(url=url, status=0, elapsed=elapsed, error=str(exc)))


# ── Análisis ──────────────────────────────────────────────────────────────────

def analyze(results: List[RequestResult], duration: float) -> List[EndpointSummary]:
    summaries: dict[str, EndpointSummary] = {}
    for r in results:
        ep = r.url.split("?")[0]
        if ep not in summaries:
            summaries[ep] = EndpointSummary(endpoint=ep)
        s = summaries[ep]
        s.total += 1
        s.latencies.append(r.elapsed * 1000)  # → ms
        if r.error or r.status >= 400:
            s.errors += 1
        else:
            s.ok += 1
    return sorted(summaries.values(), key=lambda x: -x.p95)


def print_report(summaries: List[EndpointSummary], total_results: int, duration: float):
    print(f"\n{'─'*80}")
    print(f"  SIGAH Load Test — {total_results} requests en {duration:.1f}s  "
          f"({total_results/duration:.1f} req/s global)")
    print(f"{'─'*80}")
    print(f"  {'Endpoint':<42}  {'Total':>6}  {'Err%':>6}  {'p50ms':>7}  {'p95ms':>7}  {'p99ms':>7}")
    print(f"  {'─'*42}  {'─'*6}  {'─'*6}  {'─'*7}  {'─'*7}  {'─'*7}")
    for s in summaries:
        ep = s.endpoint[-42:] if len(s.endpoint) > 42 else s.endpoint
        mark = " ⚠" if s.error_rate > 5 else ("  ✓" if s.error_rate == 0 else " △")
        print(
            f"  {ep:<42}  {s.total:>6}  {s.error_rate:>5.1f}%"
            f"  {s.p50:>7.1f}  {s.p95:>7.1f}  {s.p99:>7.1f}{mark}"
        )
    print(f"{'─'*80}\n")

    # Alertas de rendimiento
    slow = [s for s in summaries if s.p95 > 500]
    if slow:
        print("  ⚠  Endpoints con p95 > 500ms (considerar caché adicional):")
        for s in slow:
            print(f"     • {s.endpoint}  →  p95={s.p95:.0f}ms")
        print()


# ── Main ──────────────────────────────────────────────────────────────────────

async def run(args):
    print(f"\n  Conectando a {args.base} como '{args.matricula}' …")
    token = await get_token(args.base, args.matricula, args.password)
    print(f"  ✓ JWT obtenido  |  usuarios virtuales={args.users}  duración={args.duration}s")

    endpoints = [args.endpoint] if args.endpoint else ENDPOINTS_DEFAULT

    results: List[RequestResult] = []
    semaphore = asyncio.Semaphore(args.users)
    stop_at = time.monotonic() + args.duration

    print(f"  Iniciando test ({len(endpoints)} endpoints) …\n")
    t_start = time.monotonic()

    workers = [
        asyncio.create_task(worker(i, args.base, token, endpoints, stop_at, results, semaphore))
        for i in range(args.users)
    ]
    await asyncio.gather(*workers)

    elapsed = time.monotonic() - t_start
    summaries = analyze(results, elapsed)
    print_report(summaries, len(results), elapsed)


def main():
    parser = argparse.ArgumentParser(description="SIGAH Load Tester")
    parser.add_argument("--base",     default=DEFAULT_BASE,    help="URL base de la API")
    parser.add_argument("--matricula", default=DEFAULT_MATRICULA, help="Matrícula del usuario SIGAH")
    parser.add_argument("--password", default=DEFAULT_PASS,    help="Contraseña")
    parser.add_argument("--users",    type=int, default=DEFAULT_USERS,   help="Usuarios concurrentes")
    parser.add_argument("--duration", type=int, default=DEFAULT_SECONDS, help="Segundos de test")
    parser.add_argument("--endpoint", default=None, help="Testear un único endpoint")
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
