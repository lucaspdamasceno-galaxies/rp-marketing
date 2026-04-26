from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rp_marketing"
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_REDIRECT_URI: str = "http://localhost:3000/admin/conectar-instagram"

    CORS_ORIGINS: str = "http://localhost:3000"

    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Cloud Scheduler — opcional em dev. Em produção precisam estar setados
    # para o agendamento por cliente funcionar.
    GCP_PROJECT_ID: str = ""
    GCP_LOCATION: str = "southamerica-east1"
    SCHEDULER_TIMEZONE: str = "America/Sao_Paulo"
    SCHEDULER_TARGET_BASE_URL: str = ""
    INTERNAL_SYNC_TOKEN: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
