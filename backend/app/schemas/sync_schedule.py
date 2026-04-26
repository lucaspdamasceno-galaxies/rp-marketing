from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SyncScheduleIn(BaseModel):
    cron: str = Field(min_length=9, max_length=64, description="Cron expression UNIX (5 campos)")

    @field_validator("cron")
    @classmethod
    def validate_cron(cls, v: str) -> str:
        v = v.strip()
        partes = v.split()
        if len(partes) != 5:
            raise ValueError("cron deve ter 5 campos (m h dom mon dow)")
        return v


class SyncScheduleOut(BaseModel):
    cliente_id: UUID
    cron: str | None = None
    scheduler_job: str | None = None
