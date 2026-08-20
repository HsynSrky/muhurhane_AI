"""Arka uç uç noktalarının gecikme ölçümü.

Plan 6. bölümdeki `p95 < 20ms` hedefini doğrular. Ağ gürültüsünü dışarıda
tutmak için istekler yerel sunucuya, ısınma turundan sonra atılır.

Kullanım:
    python backend/scripts/bench_api.py [--base http://127.0.0.1:8000] [-n 200]
"""

from __future__ import annotations

import argparse
import statistics
import sys
import time
from typing import Any, Callable

import httpx

BUDGET_MS = 20.0
WARMUP = 10


def percentile(samples: list[float], fraction: float) -> float:
    ordered = sorted(samples)
    index = min(len(ordered) - 1, int(round(fraction * (len(ordered) - 1))))
    return ordered[index]


def measure(call: Callable[[], Any], runs: int) -> list[float]:
    for _ in range(WARMUP):
        call()
    samples: list[float] = []
    for _ in range(runs):
        start = time.perf_counter()
        response = call()
        samples.append((time.perf_counter() - start) * 1000)
        response.raise_for_status()
    return samples


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("-n", "--runs", type=int, default=200)
    args = parser.parse_args()

    with httpx.Client(base_url=args.base, timeout=10.0) as client:
        cases: list[tuple[str, Callable[[], Any]]] = [
            ("GET /api/catalog", lambda: client.get("/api/catalog")),
            ("GET /api/health", lambda: client.get("/api/health")),
            (
                "POST /api/transliterate",
                lambda: client.post("/api/transliterate", json={"text": "Eren Bey"}),
            ),
            (
                "POST /api/certificate-text",
                lambda: client.post(
                    "/api/certificate-text",
                    json={
                        "frameId": "3.1",
                        "symbolId": "1.1",
                        "tribeId": "2.1",
                        "latinName": "Eren Bey",
                        "styleId": "acik-turkuaz",
                    },
                ),
            ),
        ]

        print()
        print(f"{'UÇ NOKTA':<28}{'ORTALAMA':<12}{'p50':<10}{'p95':<10}{'MAKS':<10}DURUM")
        print("-" * 78)

        failed = False
        for label, call in cases:
            try:
                samples = measure(call, args.runs)
            except httpx.HTTPError as exc:
                print(f"{label:<28}ulaşılamadı: {exc}")
                failed = True
                continue

            p95 = percentile(samples, 0.95)
            ok = p95 < BUDGET_MS
            failed = failed or not ok
            print(
                f"{label:<28}"
                f"{statistics.fmean(samples):<12.2f}"
                f"{percentile(samples, 0.50):<10.2f}"
                f"{p95:<10.2f}"
                f"{max(samples):<10.2f}"
                f"{'GEÇTİ' if ok else 'KALDI'}"
            )

    print("-" * 78)
    print(
        f"{args.runs} istek/uç nokta · bütçe p95 < {BUDGET_MS:.0f}ms · "
        f"{'BAŞARISIZ' if failed else 'tüm uç noktalar bütçe içinde'}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
