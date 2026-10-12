"""Entry point for the FastAPI backend.

Run from the server/ folder with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI

app = FastAPI(
    title="Intelligent Medication Support Platform API",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    """Simple check that the API is running."""
    return {"status": "ok"}
