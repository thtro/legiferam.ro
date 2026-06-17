"""Application settings, loaded from environment (.env)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://legiferam:change-me-in-prod@db:5432/legiferam"

    # Auth (MVP/Demo)
    demo_user: str = "demo"
    demo_pass: str = "demo"
    # The showcase-law co-author the "intră ca un co-autor de lege" button signs in as.
    # Must match a contributor (EDITOR_ROLES) of the seeded main project.
    demo_coauthor_user: str = "radu.pavel"
    demo_coauthor_pass: str = "demo"
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_expire_minutes: int = 720
    jwt_algorithm: str = "HS256"

    # AI / OpenRouter (backend only)
    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-haiku"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_url: str = "https://legiferam.ro"
    openrouter_app_name: str = "Legiferam.ro"

    # In DEMO mode: scripted co-pilot replies (True) or real LLM calls (False)
    ai_demo_scripted: bool = True

    @property
    def ai_enabled(self) -> bool:
        """Whether real LLM calls are possible (a key is configured)."""
        return bool(self.openrouter_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
