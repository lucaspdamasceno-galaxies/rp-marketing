"""Métricas manuais de redes sociais — inseridas pelo admin em qualquer período.

Cada registro representa um snapshot consolidado dentro do range
[data_inicio, data_fim]. Permite ao cliente acompanhar desempenho sem
integração com Instagram, em qualquer granularidade (dia, semana, mês,
campanha específica, etc.).
"""
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MetricasMensais(Base):
    __tablename__ = "metricas_mensais"

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

    data_inicio: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False, index=True)

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

    campos_customizados: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb"), default=list
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
