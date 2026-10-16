
from pydantic import BaseModel, Field
from typing import Literal


class OrderRequest(BaseModel):
    side: Literal["BUY", "SELL"]
    price: int = Field(gt=0, description="Price in integer ticks")
    quantity: int = Field(gt=0, le=1_000_000)


class Trade(BaseModel):
    trade_id: int
    buy_order_id: int
    sell_order_id: int
    price: int
    quantity: int


class OrderResult(BaseModel):
    order_id: int
    side: Literal["BUY", "SELL"]
    price: int
    original_quantity: int
    remaining_quantity: int
    status: Literal["OPEN", "PARTIALLY_FILLED", "FILLED"]
    trades: list[Trade]
