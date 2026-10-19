"""Benchmark OrderBook workloads independently of the dashboard metrics."""

import argparse
import json
import math
import statistics
import sys
import time
from collections import Counter
from collections.abc import Sequence
from pathlib import Path
from typing import Any

# Direct script execution puts benchmarks/, not backend/, on sys.path.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.order_book import OrderBook
from models.order import OrderRequest


def percentile(values: Sequence[int], percent: int) -> int:
    """Return the nearest-rank percentile from nanosecond samples."""
    if not 1 <= percent <= 100:
        raise ValueError("percent must be between 1 and 100")
    if not values:
        return 0
    ordered = sorted(values)
    rank = math.ceil(percent / 100 * len(ordered))
    return ordered[rank - 1]


def summarize_run(
    *,
    workload: str,
    requested_orders: int,
    elapsed_ns: int,
    latencies_ns: Sequence[int],
    errors: dict[str, int],
    trade_count: int,
) -> dict[str, Any]:
    """Build a serializable report; latency percentiles cover successes only."""
    successful_orders = len(latencies_ns)
    elapsed_seconds = elapsed_ns / 1_000_000_000
    latency_us = [latency / 1_000 for latency in latencies_ns]

    return {
        "workload": workload,
        "requested_orders": requested_orders,
        "successful_orders": successful_orders,
        "elapsed_seconds": round(elapsed_seconds, 6),
        "throughput_orders_per_second": (
            round(successful_orders / elapsed_seconds, 2)
            if elapsed_seconds > 0
            else 0.0
        ),
        "latency_us": {
            "average": round(statistics.fmean(latency_us), 3)
            if latency_us
            else 0.0,
            "median": round(statistics.median(latency_us), 3)
            if latency_us
            else 0.0,
            "p95": round(percentile(latencies_ns, 95) / 1_000, 3),
            "p99": round(percentile(latencies_ns, 99) / 1_000, 3),
            "maximum": round(max(latency_us), 3) if latency_us else 0.0,
        },
        "errors": {
            "count": sum(errors.values()),
            "details": errors,
        },
        "trade_count": trade_count,
        "measurement": (
            "In-process OrderBook.submit_order calls; elapsed time uses "
            "perf_counter_ns. Latency statistics include successful calls only."
        ),
    }


def make_workload(
    workload: str, order_count: int, quantity: int
) -> list[OrderRequest]:
    """Prebuild requests so request construction is outside the timed section."""
    if workload == "resting":
        return [
            OrderRequest(side="BUY", price=10_000, quantity=quantity)
            for _ in range(order_count)
        ]
    if workload == "matching":
        return [
            OrderRequest(
                side="SELL" if index % 2 == 0 else "BUY",
                price=10_000,
                quantity=quantity,
            )
            for index in range(order_count)
        ]
    raise ValueError(f"Unsupported workload: {workload}")


def run_benchmark(workload: str, order_count: int, quantity: int) -> dict[str, Any]:
    """Run a workload on its own empty OrderBook and return its report."""
    requests = make_workload(workload, order_count, quantity)
    book = OrderBook()
    latencies_ns: list[int] = []
    errors: Counter[str] = Counter()
    trade_count = 0

    started_ns = time.perf_counter_ns()
    for request in requests:
        order_started_ns = time.perf_counter_ns()
        try:
            result = book.submit_order(request)
        except Exception as error:
            errors[f"{type(error).__name__}: {error}"] += 1
        else:
            latencies_ns.append(time.perf_counter_ns() - order_started_ns)
            trade_count += len(result.trades)
    elapsed_ns = time.perf_counter_ns() - started_ns

    return summarize_run(
        workload=workload,
        requested_orders=order_count,
        elapsed_ns=elapsed_ns,
        latencies_ns=latencies_ns,
        errors=dict(errors),
        trade_count=trade_count,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Benchmark ChronosMatch in-process workloads; results are separate "
            "from the API's rolling five-second throughput metric."
        )
    )
    parser.add_argument(
        "--workload",
        choices=("all", "resting", "matching"),
        default="all",
        help="Run all workloads or select one (default: all).",
    )
    parser.add_argument(
        "--orders",
        type=int,
        default=10_000,
        help="Number of submitted orders per workload (default: 10000).",
    )
    parser.add_argument(
        "--quantity",
        type=int,
        default=1,
        help="Quantity per order (default: 1).",
    )
    args = parser.parse_args()
    if args.orders <= 0:
        parser.error("--orders must be greater than zero")
    if not 1 <= args.quantity <= 1_000_000:
        parser.error("--quantity must be between 1 and 1000000")
    return args


def main() -> None:
    args = parse_args()
    workloads = (
        ("resting", "matching")
        if args.workload == "all"
        else (args.workload,)
    )
    reports = [
        run_benchmark(workload, args.orders, args.quantity)
        for workload in workloads
    ]
    print(json.dumps({
        "benchmark": "ChronosMatch in-process OrderBook",
        "dashboard_throughput_metric": (
            "Separate rolling five-second rate; not used for benchmark results."
        ),
        "runs": reports,
    }, indent=2))


if __name__ == "__main__":
    main()
