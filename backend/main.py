"""Entry point for Railway's Railpack builder, which looks for main.py at the service root.

The application itself lives in app/main.py; the deploy start command (railway.json) runs it directly.
"""

from app.main import app

__all__ = ["app"]
