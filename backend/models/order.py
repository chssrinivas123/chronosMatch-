
import math
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class OrderRequest(BaseModel):
    side: Literal["BUY", "SELL"]
    price: int = Field(gt=0, description="Price in integer ticks")
    quantity: int = Field(gt=0, le=1_000_000)

    @field_validator("price", mode="before")
    @classmethod
    def validate_price(cls, value):
        if isinstance(value, bool):
            raise ValueError("Price must be a positive integer.")

        if isinstance(value, int):
            if value <= 0:
                raise ValueError("Price must be greater than zero.")
            return value

        if isinstance(value, float):
            if not math.isfinite(value) or value <= 0 or not value.is_integer():
                raise ValueError("Price must be a positive integer.")
            return int(value)

        if isinstance(value, str):
            try:
                numeric = float(value)
            except ValueError as exc:
                raise ValueError("Price must be a positive integer.") from exc

            if not math.isfinite(numeric) or numeric <= 0 or not numeric.is_integer():
                raise ValueError("Price must be a positive integer.")
            return int(numeric)

        raise ValueError("Price must be a positive integer.")

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_quantity(cls, value):
        if isinstance(value, bool):
            raise ValueError("Quantity must be a positive integer.")

        if isinstance(value, int):
            if value <= 0:
                raise ValueError("Quantity must be greater than zero.")
            return value

        if isinstance(value, float):
            if not math.isfinite(value) or value <= 0 or not value.is_integer():
                raise ValueError("Quantity must be a positive integer.")
            return int(value)

        if isinstance(value, str):
            try:
                numeric = float(value)
            except ValueError as exc:
                raise ValueError("Quantity must be a positive integer.") from exc

            if not math.isfinite(numeric) or numeric <= 0 or not numeric.is_integer():
                raise ValueError("Quantity must be a positive integer.")
            return int(numeric)

        raise ValueError("Quantity must be a positive integer.")


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
