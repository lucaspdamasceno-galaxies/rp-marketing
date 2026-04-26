import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TipoPostagem(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    CAROUSEL = "CAROUSEL"
    REEL = "REEL"


class Postagem(Base):
    __tablename__ = "postagens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    instagram_media_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    tipo: Mapped[TipoPostagem] = mapped_column(
        Enum(TipoPostagem, name="tipo_postagem"), nullable=False
    )
    url_midia: Mapped[str] = mapped_column(Text, nullable=False)
    permalink: Mapped[str | None] = mapped_column(Text, nullable=True)
    legenda: Mapped[str | None] = mapped_column(Text, nullable=True)

    curtidas: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    comentarios: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    visualizacoes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    alcance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    data_publicacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    cliente: Mapped["Cliente"] = relationship("Cliente", back_populates="postagens")  # noqa: F821
