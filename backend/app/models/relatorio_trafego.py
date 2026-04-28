"""Relatórios de tráfego pago — admin sobe um PDF por período, sistema parseia.

Estratégia: salvar o PDF original + texto bruto extraído + JSON estruturado com as
métricas que conseguimos parsear. Se algum campo não vier do parser, fica `null` —
admin pode editar via PUT.

`dados` é o objeto canônico exibido no frontend; sua estrutura está em
`backend/app/services/pdf_parser_service.py` (funcao `parse_relatorio`).
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RelatorioTrafego(Base):
    __tablename__ = "relatorios_trafego"

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

    periodo_inicio: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    periodo_fim: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    pdf_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    pdf_nome_original: Mapped[str | None] = mapped_column(String(512), nullable=True)
    texto_bruto: Mapped[str | None] = mapped_column(Text, nullable=True)
    dados: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
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
