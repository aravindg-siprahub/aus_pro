from sqlalchemy import text
from sqlalchemy.orm import Session


def check_database(db: Session) -> bool:
    """True when the database answers a trivial query."""
    return db.execute(text("SELECT 1")).scalar_one() == 1
