
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ChronosMatch API", version="0.1.0")

# Allow the local React + Vite frontend to call the API.
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
        "engine": "not_started",
    }
