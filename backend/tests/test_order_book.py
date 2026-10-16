
from engine.order_book import OrderBook
from models.order import OrderRequest


def test_buy_order_stays_open():
    book = OrderBook()

    result = book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )

    assert result.status == "OPEN"
    assert result.remaining_quantity == 10
    assert len(result.trades) == 0


def test_sell_order_matches_buy():
    book = OrderBook()

    book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )

    result = book.submit_order(
        OrderRequest(side="SELL", price=9900, quantity=4)
    )

    assert result.status == "FILLED"
    assert result.remaining_quantity == 0
    assert len(result.trades) == 1
    assert result.trades[0].price == 10000
    assert result.trades[0].quantity == 4


def test_partial_fill_leaves_buy_quantity():
    book = OrderBook()

    book.submit_order(
        OrderRequest(side="BUY", price=10000, quantity=10)
    )

    book.submit_order(
        OrderRequest(side="SELL", price=9900, quantity=4)
    )

    snapshot = book.snapshot()

    assert snapshot["bids"][0]["quantity"] == 6
    assert snapshot["trade_count"] == 1

def test_best_sell_price_matches_first():
    book = OrderBook()

    # Two sell orders: the second has a better (lower) price.
    book.submit_order(
        OrderRequest(side="SELL", price=10200, quantity=5)
    )
    book.submit_order(
        OrderRequest(side="SELL", price=10100, quantity=5)
    )

    result = book.submit_order(
        OrderRequest(side="BUY", price=10300, quantity=5)
    )

    assert result.status == "FILLED"
    assert result.trades[0].price == 10100


def test_first_order_at_same_price_matches_first():
    book = OrderBook()

    first = book.submit_order(
        OrderRequest(side="SELL", price=10100, quantity=3)
    )
    second = book.submit_order(
        OrderRequest(side="SELL", price=10100, quantity=4)
    )

    result = book.submit_order(
        OrderRequest(side="BUY", price=10100, quantity=3)
    )

    assert result.status == "FILLED"
    assert result.trades[0].sell_order_id == first.order_id

    snapshot = book.snapshot()
    remaining = [
        order for order in snapshot["asks"]
        if order["order_id"] == second.order_id
    ]
    assert len(remaining) == 1
    assert remaining[0]["quantity"] == 4
