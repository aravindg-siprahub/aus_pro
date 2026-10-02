from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Read from the environment; falls back to the repo's gitignored .env / .env.local for local work."""

    model_config = SettingsConfigDict(env_file=(ROOT / ".env", ROOT / ".env.local"), extra="ignore")

    database_url: str
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_echo: bool = False

    @field_validator("database_url")
    @classmethod
    def _driver(cls, v: str) -> str:
        if not v.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must start with postgresql+psycopg:// (PostgreSQL via psycopg 3)")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
