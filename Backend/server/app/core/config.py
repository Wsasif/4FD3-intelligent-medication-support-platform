from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Intelligent Medication Support Platform API"
    database_url: str                                   # required: Supabase Session pooler URI
    supabase_url: str                                   # base project URL, used for token checks
    cors_origins: list[str] = ["http://localhost:5173"] # Vite dev server


@lru_cache
def get_settings() -> Settings:
    return Settings()