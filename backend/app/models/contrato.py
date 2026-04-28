"""Contratos entre RP Marketing e clientes.

Fluxo simplificado (cliente assina externamente, fora da plataforma):
    rascunho → ativo (admin sobe o PDF assinado e marca como ativo)
    ativo → encerrado | cancelado

`escopo` é um JSONB livre — admin marca quais serviços estão inclusos
(tráfego pago, gestão de redes, branding, etc.). PDF do contrato é anexado
após assinatura externa pelo cliente.
"""
import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusContrato(str, enum.Enum):
    rascunho = "rascunho"
    ativo = "ativo"
    encerrado = "encerrado"
    cancelado = "cancelado"


class ItemEscopoContrato(str, enum.Enum):
    """Catálogo padrão de serviços. Admin pode incluir qualquer combinação."""

    trafego_pago = "trafego_pago"
    gestao_redes_sociais = "gestao_redes_sociais"
    producao_conteudo = "producao_conteudo"
    branding = "branding"
    site = "site"
    consultoria = "consultoria"


class Contrato(Base):
    __tablename__ = "contratos"

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

    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    escopo: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    """Lista de strings (valores de ItemEscopoContrato ou customizados)."""
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    """Texto livre do contrato — cláusulas, condições especiais, etc."""

    valor_mensal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    duracao_meses: Mapped[int] = mapped_column(Integer, nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[StatusContrato] = mapped_column(
        Enum(StatusContrato, name="status_contrato"),
        nullable=False,
        default=StatusContrato.rascunho,
        index=True,
    )

    pdf_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    pdf_nome_original: Mapped[str | None] = mapped_column(String(512), nullable=True)
    assinado_em_externo: Mapped[date | None] = mapped_column(Date, nullable=True)
    """Data em que o cliente assinou externamente (informada pelo admin ao ativar)."""

    cancelado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    motivo_cancelamento: Mapped[str | None] = mapped_column(Text, nullable=True)

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
