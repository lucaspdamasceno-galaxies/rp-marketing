from uuid import UUID

from pydantic import BaseModel, Field


class InstagramConectarIn(BaseModel):
    cliente_id: UUID
    code: str = Field(min_length=1)
    redirect_uri: str | None = None


class InstagramConectarOut(BaseModel):
    cliente_id: UUID
    instagram_account_id: str
    token_expires_at: str | None = None
