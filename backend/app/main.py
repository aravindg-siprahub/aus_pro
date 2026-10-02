from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.health import check_database

app = FastAPI(title="Atelier Nine backend", docs_url=None, redoc_url=None)


@app.get("/healthz")
def healthz():
    """Liveness for the host's health check: answers while the server runs, independent of the database."""
    return {"ok": True}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    """Liveness for the database only. Returns no connection details."""
    try:
        return {"ok": check_database(db)}
    except Exception:
        return JSONResponse({"ok": False}, status_code=503)
