
import main
from engine.order_book import OrderBook
from models.order import OrderRequest


class FakeClock:
    def __init__(self, now_ns=0, step_ns=0):
        self.now_ns = now_ns
        self.step_ns = step_ns

    def __call__(self):
        now_ns = self.now_ns
        self.now_ns += self.step_ns
        return now_ns


def test_metrics_endpoint_uses_order_submission_book(monkeypatch):
    book = OrderBook(clock_ns=FakeClock(step_ns=1))
    monkeypatch.setattr(main, "order_book", book)

    main.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )
    main.submit_order(
        OrderRequest(side="SELL", price=10000, quantity=4)
    )
    metrics = main.get_metrics()

    assert metrics["processed_orders"] == 2
    assert metrics["throughput_orders_per_second"] == 0.4
    assert metrics["trade_count"] == 1
    assert metrics["best_bid"] == 10000
    assert metrics["throughput_window_seconds"] == 5.0


def test_metrics_are_zero_before_orders():
    book = OrderBook(clock_ns=FakeClock())

    metrics = book.performance_metrics()

    assert metrics["processed_orders"] == 0
    assert metrics["throughput_orders_per_second"] == 0.0
    assert metrics["last_latency_us"] == 0.0
    assert metrics["average_latency_us"] == 0.0
    assert metrics["max_latency_us"] == 0.0
    assert metrics["trade_count"] == 0


def test_throughput_returns_to_zero_after_all_orders_expire():
    clock = FakeClock()
    book = OrderBook(clock_ns=clock)

    book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )
    clock.now_ns += 3 * book.NANOSECONDS_PER_SECOND
    book.submit_order(
        OrderRequest(side="SELL", price=10000, quantity=4)
    )
    assert book.performance_metrics()["throughput_orders_per_second"] == 0.4

    clock.now_ns += 2 * book.NANOSECONDS_PER_SECOND + 1
    assert book.performance_metrics()["throughput_orders_per_second"] == 0.2

    clock.now_ns += 3 * book.NANOSECONDS_PER_SECOND
    metrics = book.performance_metrics()

    assert metrics["processed_orders"] == 2
    assert metrics["throughput_orders_per_second"] == 0.0
    assert metrics["trade_count"] == 1


def test_throughput_retains_timestamp_at_exact_window_boundary():
    clock = FakeClock()
    book = OrderBook(clock_ns=clock)

    book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )
    clock.now_ns += book.METRICS_WINDOW_NS

    assert book.performance_metrics()["throughput_orders_per_second"] == 0.2


def test_latency_metrics_use_injected_monotonic_clock():
    book = OrderBook(clock_ns=FakeClock(step_ns=2_000_000))
    book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )

    metrics = book.performance_metrics()

    assert metrics["processed_orders"] == 1
    assert metrics["last_latency_us"] == 2000.0
    assert metrics["average_latency_us"] == 2000.0
    assert metrics["max_latency_us"] == 2000.0
    assert metrics["trade_count"] == 0


def test_concurrent_submissions_are_serialized():
    from concurrent.futures import ThreadPoolExecutor

    book = OrderBook()
    request = OrderRequest(side="BUY", price=10000, quantity=1)

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(book.submit_order, [request] * 100))

    snapshot = book.snapshot()
    metrics = book.performance_metrics()

    assert len({result.order_id for result in results}) == 100
    assert snapshot["processed_orders"] == 100
    assert len(snapshot["bids"]) == 100
    assert metrics["processed_orders"] == 100
