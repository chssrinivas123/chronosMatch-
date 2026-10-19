import pytest

from benchmarks.order_book_benchmark import (
    make_workload,
    percentile,
    run_benchmark,
    summarize_run,
)


def test_percentile_uses_nearest_rank():
    assert percentile([50, 10, 40, 20, 30], 50) == 30
    assert percentile([50, 10, 40, 20, 30], 95) == 50
    assert percentile([], 95) == 0


def test_percentile_rejects_invalid_percent():
    with pytest.raises(ValueError):
        percentile([1], 0)


def test_summary_calculates_throughput_latency_and_errors():
    report = summarize_run(
        workload="test",
        requested_orders=5,
        elapsed_ns=2_000_000_000,
        latencies_ns=[1_000, 2_000, 3_000, 4_000],
        errors={"RuntimeError: failed": 1},
        trade_count=2,
    )

    assert report["successful_orders"] == 4
    assert report["throughput_orders_per_second"] == 2.0
    assert report["latency_us"] == {
        "average": 2.5,
        "median": 2.5,
        "p95": 4.0,
        "p99": 4.0,
        "maximum": 4.0,
    }
    assert report["errors"] == {
        "count": 1,
        "details": {"RuntimeError: failed": 1},
    }
    assert report["trade_count"] == 2


def test_benchmark_workloads_run_on_fresh_books():
    resting_report = run_benchmark("resting", order_count=4, quantity=1)
    matching_report = run_benchmark("matching", order_count=4, quantity=1)

    assert resting_report["successful_orders"] == 4
    assert resting_report["trade_count"] == 0
    assert resting_report["errors"]["count"] == 0
    assert matching_report["successful_orders"] == 4
    assert matching_report["trade_count"] == 2
    assert matching_report["errors"]["count"] == 0


def test_matching_workload_alternates_maker_and_taker_orders():
    requests = make_workload("matching", order_count=4, quantity=3)

    assert [request.side for request in requests] == [
        "SELL", "BUY", "SELL", "BUY"
    ]
    assert all(request.quantity == 3 for request in requests)
