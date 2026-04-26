import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FollowersSnapshot(Base):
    __tablename__ = "followers_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    followers_count: Mapped[int] = mapped_column(BigInteger, nullable=False)
    coletado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cliente: Mapped["Cliente"] = relationship(  # noqa: F821
        "Cliente", back_populates="followers_snapshots"
    )
