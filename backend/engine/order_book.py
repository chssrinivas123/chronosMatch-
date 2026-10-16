
from dataclasses import dataclass
from itertools import count

from models.order import OrderRequest, OrderResult, Trade


@dataclass
class RestingOrder:
    order_id: int
    side: str
    price: int
    remaining_quantity: int
    sequence: int


class OrderBook:
    """Single-process limit order book using price-time priority."""

    def __init__(self):
        self.bids: list[RestingOrder] = []
        self.asks: list[RestingOrder] = []
        self._order_ids = count(1)
        self._trade_ids = count(1)
        self._sequence = count(1)
        self.trades: list[Trade] = []
        self.processed_orders = 0

    def submit_order(self, request: OrderRequest) -> OrderResult:
        order_id = next(self._order_ids)
        sequence = next(self._sequence)
        remaining = request.quantity
        executed_trades: list[Trade] = []

        opposite_book = self.asks if request.side == "BUY" else self.bids

        # Best price first; FIFO sequence breaks ties.
        opposite_book.sort(
            key=lambda order: (
                order.price if order.side == "SELL" else -order.price,
                order.sequence,
            )
        )

        while remaining > 0 and opposite_book:
            resting = opposite_book[0]

            # A buy crosses the lowest ask; a sell crosses the highest bid.
            crosses = (
                request.price >= resting.price
                if request.side == "BUY"
                else request.price <= resting.price
            )
            if not crosses:
                break

            fill_quantity = min(remaining, resting.remaining_quantity)
            buy_order_id = order_id if request.side == "BUY" else resting.order_id
            sell_order_id = resting.order_id if request.side == "BUY" else order_id

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

        # Any unfilled quantity rests on the order book.
        if remaining > 0:
            new_order = RestingOrder(
                order_id=order_id,
                side=request.side,
                price=request.price,
                remaining_quantity=remaining,
                sequence=sequence,
            )
            own_book = self.bids if request.side == "BUY" else self.asks
            own_book.append(new_order)

        self.processed_orders += 1

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

    def snapshot(self) -> dict:
        bids = sorted(self.bids, key=lambda o: (-o.price, o.sequence))
        asks = sorted(self.asks, key=lambda o: (o.price, o.sequence))

        best_bid = bids[0].price if bids else None
        best_ask = asks[0].price if asks else None

        return {
            "bids": [
                {
                    "order_id": o.order_id,
                    "price": o.price,
                    "quantity": o.remaining_quantity,
                }
                for o in bids
            ],
            "asks": [
                {
                    "order_id": o.order_id,
                    "price": o.price,
                    "quantity": o.remaining_quantity,
                }
                for o in asks
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
