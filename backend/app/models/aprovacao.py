import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.postagem import TipoPostagem


class StatusAprovacao(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    rejeitado = "rejeitado"


class Aprovacao(Base):
    __tablename__ = "aprovacoes_postagens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=False,
    )

    tipo: Mapped[TipoPostagem] = mapped_column(
        Enum(TipoPostagem, name="tipo_postagem"), nullable=False
    )
    url_midia: Mapped[str] = mapped_column(String(1024), nullable=False)
    legenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_agendada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    status: Mapped[StatusAprovacao] = mapped_column(
        Enum(StatusAprovacao, name="status_aprovacao"),
        nullable=False,
        default=StatusAprovacao.pendente,
        index=True,
    )
    comentario_revisao: Mapped[str | None] = mapped_column(Text, nullable=True)
    decidido_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    cliente: Mapped["Cliente"] = relationship("Cliente")  # noqa: F821
    admin: Mapped["Usuario"] = relationship("Usuario")  # noqa: F821
