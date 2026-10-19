
from collections import deque
from dataclasses import dataclass
from itertools import count
from threading import RLock
from time import perf_counter_ns
from typing import Callable

from models.order import OrderRequest, OrderResult, Trade


@dataclass
class RestingOrder:
    order_id: int
    side: str
    price: int
    remaining_quantity: int
    sequence: int


class OrderBook:
    """Thread-safe in-memory order book with rolling performance metrics."""

    METRICS_WINDOW_SECONDS = 5.0
    NANOSECONDS_PER_SECOND = 1_000_000_000
    METRICS_WINDOW_NS = int(
        METRICS_WINDOW_SECONDS * NANOSECONDS_PER_SECOND
    )

    def __init__(self, clock_ns: Callable[[], int] = perf_counter_ns):
        self._clock_ns = clock_ns
        self._lock = RLock()
        self.bids: list[RestingOrder] = []
        self.asks: list[RestingOrder] = []

        self._order_ids = count(1)
        self._trade_ids = count(1)
        self._sequence = count(1)

        self.trades: list[Trade] = []
        self.processed_orders = 0

        # Latency statistics in nanoseconds.
        self.total_latency_ns = 0
        self.max_latency_ns = 0
        self.last_latency_ns = 0

        self._recent_order_times: deque[int] = deque()

    def submit_order(self, request: OrderRequest) -> OrderResult:
        """Process an order and record its latency and completion time."""
        with self._lock:
            start_ns = self._clock_ns()
            result = self._process_order(request)
            completed_ns = self._clock_ns()
            elapsed_ns = completed_ns - start_ns

            self.last_latency_ns = elapsed_ns
            self.total_latency_ns += elapsed_ns
            self.max_latency_ns = max(self.max_latency_ns, elapsed_ns)
            self.processed_orders += 1

            self._recent_order_times.append(completed_ns)
            self._remove_expired_timestamps(completed_ns)
            return result

    def _remove_expired_timestamps(self, now_ns: int) -> None:
        """Remove timestamps strictly older than the rolling window."""
        while self._recent_order_times:
            oldest_timestamp = self._recent_order_times[0]
            if now_ns - oldest_timestamp <= self.METRICS_WINDOW_NS:
                break
            self._recent_order_times.popleft()

    def _process_order(self, request: OrderRequest) -> OrderResult:
        """Match an order using price-time priority."""
        order_id = next(self._order_ids)
        sequence = next(self._sequence)

        remaining = request.quantity
        executed_trades: list[Trade] = []

        opposite_book = (
            self.asks if request.side == "BUY" else self.bids
        )

        # Best price first; earliest sequence wins equal-price ties.
        opposite_book.sort(
            key=lambda order: (
                order.price
                if order.side == "SELL"
                else -order.price,
                order.sequence,
            )
        )

        while remaining > 0 and opposite_book:
            resting = opposite_book[0]

            crosses = (
                request.price >= resting.price
                if request.side == "BUY"
                else request.price <= resting.price
            )

            if not crosses:
                break

            fill_quantity = min(
                remaining, resting.remaining_quantity
            )

            buy_order_id = (
                order_id
                if request.side == "BUY"
                else resting.order_id
            )
            sell_order_id = (
                resting.order_id
                if request.side == "BUY"
                else order_id
            )

            trade = Trade(
                trade_id=next(self._trade_ids),
                buy_order_id=buy_order_id,
                sell_order_id=sell_order_id,
                price=resting.price,
                quantity=fill_quantity,
            )

            executed_trades.append(trade)
            self.trades.append(trade)

            remaining -= fill_quantity
            resting.remaining_quantity -= fill_quantity

            if resting.remaining_quantity == 0:
                opposite_book.pop(0)

        # Retain unfilled quantity as a resting order.
        if remaining > 0:
            new_order = RestingOrder(
                order_id=order_id,
                side=request.side,
                price=request.price,
                remaining_quantity=remaining,
                sequence=sequence,
            )

            own_book = (
                self.bids if request.side == "BUY" else self.asks
            )
            own_book.append(new_order)

        if remaining == 0:
            status = "FILLED"
        elif remaining < request.quantity:
            status = "PARTIALLY_FILLED"
        else:
            status = "OPEN"

        return OrderResult(
            order_id=order_id,
            side=request.side,
            price=request.price,
            original_quantity=request.quantity,
            remaining_quantity=remaining,
            status=status,
            trades=executed_trades,
        )

    def performance_metrics(self) -> dict:
        """Return latency and trailing order count divided by the five-second window."""
        with self._lock:
            return self._performance_metrics_unlocked(self._clock_ns())

    def _performance_metrics_unlocked(self, now_ns: int) -> dict:
        self._remove_expired_timestamps(now_ns)

        recent_count = len(self._recent_order_times)
        throughput = recent_count / self.METRICS_WINDOW_SECONDS

        average_latency_us = (
            self.total_latency_ns
            / self.processed_orders
            / 1_000
            if self.processed_orders > 0
            else 0.0
        )

        return {
            "processed_orders": self.processed_orders,
            "throughput_window_seconds": self.METRICS_WINDOW_SECONDS,
            "throughput_orders_per_second": round(
                throughput, 2
            ),
            "last_latency_us": round(
                self.last_latency_ns / 1_000, 3
            ),
            "average_latency_us": round(
                average_latency_us, 3
            ),
            "max_latency_us": round(
                self.max_latency_ns / 1_000, 3
            ),
            "trade_count": len(self.trades),
        }

    def snapshot(self) -> dict:
        """Return the current order book and summary."""
        with self._lock:
            return self._snapshot_unlocked()

    def dashboard_metrics(self) -> dict:
        """Return metrics and book prices from one consistent book state."""
        with self._lock:
            metrics = self._performance_metrics_unlocked(self._clock_ns())
            snapshot = self._snapshot_unlocked()
            return {
                **metrics,
                "best_bid": snapshot["best_bid"],
                "best_ask": snapshot["best_ask"],
                "spread": snapshot["spread"],
            }

    def trades_snapshot(self) -> list[Trade]:
        """Return trades newest first from a consistent book state."""
        with self._lock:
            return list(reversed(self.trades))

    def _snapshot_unlocked(self) -> dict:
        bids = sorted(
            self.bids,
            key=lambda order: (-order.price, order.sequence),
        )
        asks = sorted(
            self.asks,
            key=lambda order: (order.price, order.sequence),
        )

        best_bid = bids[0].price if bids else None
        best_ask = asks[0].price if asks else None

        return {
            "bids": [
                {
                    "order_id": order.order_id,
                    "price": order.price,
                    "quantity": order.remaining_quantity,
                }
                for order in bids
            ],
            "asks": [
                {
                    "order_id": order.order_id,
                    "price": order.price,
                    "quantity": order.remaining_quantity,
                }
                for order in asks
            ],
            "best_bid": best_bid,
            "best_ask": best_ask,
            "spread": (
                best_ask - best_bid
                if best_bid is not None and best_ask is not None
                else None
            ),
            "processed_orders": self.processed_orders,
            "trade_count": len(self.trades),
        }
