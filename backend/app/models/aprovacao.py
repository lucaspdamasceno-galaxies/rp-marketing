"""Aprovação de postagens — fluxo estilo Trello.

Cada `Aprovacao` é um card com:
  - título + descrição (legenda do post)
  - uma ou mais mídias (uploads, não link externo)
  - dois trilhos paralelos de revisão: status_texto e status_arte
  - thread de comentários (chat entre admin e cliente)
  - flag `postado_em` quando o card termina o ciclo

Status por trilho: pendente → aprovado | rejeitado.
Card vai pro estado "postado" quando admin marca após publicar no Instagram.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, Text, func
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

    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[TipoPostagem] = mapped_column(
        Enum(TipoPostagem, name="tipo_postagem"), nullable=False
    )
    legenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_agendada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    status_texto: Mapped[StatusAprovacao] = mapped_column(
        Enum(StatusAprovacao, name="status_aprovacao"),
        nullable=False,
        default=StatusAprovacao.pendente,
        index=True,
    )
    status_arte: Mapped[StatusAprovacao] = mapped_column(
        Enum(StatusAprovacao, name="status_aprovacao"),
        nullable=False,
        default=StatusAprovacao.pendente,
        index=True,
    )

    decidido_texto_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decidido_arte_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    postado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
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
    midias: Mapped[list["AprovacaoMidia"]] = relationship(
        "AprovacaoMidia",
        back_populates="aprovacao",
        cascade="all, delete-orphan",
        order_by="AprovacaoMidia.ordem",
    )
    comentarios: Mapped[list["AprovacaoComentario"]] = relationship(
        "AprovacaoComentario",
        back_populates="aprovacao",
        cascade="all, delete-orphan",
        order_by="AprovacaoComentario.created_at",
    )


class AprovacaoMidia(Base):
    __tablename__ = "aprovacao_midias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aprovacao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("aprovacoes_postagens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    nome_original: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    tamanho_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    aprovacao: Mapped[Aprovacao] = relationship("Aprovacao", back_populates="midias")


class AprovacaoComentario(Base):
    __tablename__ = "aprovacao_comentarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aprovacao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("aprovacoes_postagens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    autor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=False,
    )
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    anexos_paths: Mapped[str | None] = mapped_column(Text, nullable=True)
    """Lista de paths separados por `\n` (mídias anexadas ao comentário). Vazio = sem anexos."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    aprovacao: Mapped[Aprovacao] = relationship("Aprovacao", back_populates="comentarios")
    autor: Mapped["Usuario"] = relationship("Usuario")  # noqa: F821
