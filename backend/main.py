
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from engine.order_book import OrderBook
from models.order import OrderRequest

app = FastAPI(title="ChronosMatch API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory engine for the first development stage.
order_book = OrderBook()


@app.get("/")
def home():
    return {
        "project": "ChronosMatch",
        "status": "running",
        "message": "Trading simulator API is ready",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "engine": "running",
    }


@app.post("/api/orders")
def submit_order(order: OrderRequest):
    return order_book.submit_order(order)


@app.get("/api/order-book")
def get_order_book():
    return order_book.snapshot()


@app.get("/api/trades")
def get_trades():
    return [trade.model_dump() for trade in order_book.trades_snapshot()]


@app.get("/api/metrics")
def get_metrics():
    return order_book.dashboard_metrics()
