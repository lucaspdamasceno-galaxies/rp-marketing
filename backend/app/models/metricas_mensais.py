"""Métricas mensais de redes sociais — inseridas manualmente pelo admin.

Cada registro representa um snapshot consolidado de um mês (ano_mes = 'YYYY-MM').
Permite ao cliente acompanhar crescimento mês a mês mesmo sem integração com Instagram.
"""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MetricasMensais(Base):
    __tablename__ = "metricas_mensais"
    __table_args__ = (
        UniqueConstraint("cliente_id", "ano_mes", name="uq_metricas_cliente_ano_mes"),
    )

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

    ano_mes: Mapped[str] = mapped_column(String(7), nullable=False, index=True)

    seguidores: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    seguidores_ganhos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    seguidores_perdidos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    alcance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    impressoes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    visualizacoes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    curtidas: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    comentarios: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    compartilhamentos: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    salvamentos: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    visitas_perfil: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    cliques_site: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_postagens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_stories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_reels: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
