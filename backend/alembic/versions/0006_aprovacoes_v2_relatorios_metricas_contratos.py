"""aprovacoes v2 (trello-like) + relatorios_trafego + metricas_mensais + contratos

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-28

Mudanças nas aprovações (estilo Trello):
  - drop coluna `url_midia` (mídias passam para tabela separada `aprovacao_midias`)
  - drop coluna `comentario_revisao` (chat encadeado em `aprovacao_comentarios`)
  - drop coluna `decidido_em` (substituída por `decidido_texto_em` e `decidido_arte_em`)
  - drop coluna `status` (substituída por `status_texto` e `status_arte`)
  - add `titulo`, `status_texto`, `status_arte`, `decidido_texto_em`,
    `decidido_arte_em`, `postado_em`

Novas tabelas: `aprovacao_midias`, `aprovacao_comentarios`,
`relatorios_trafego`, `metricas_mensais`, `contratos`.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- aprovacoes_postagens v2 ---
    op.drop_index("ix_aprovacoes_status", table_name="aprovacoes_postagens")
    op.drop_column("aprovacoes_postagens", "status")
    op.drop_column("aprovacoes_postagens", "url_midia")
    op.drop_column("aprovacoes_postagens", "comentario_revisao")
    op.drop_column("aprovacoes_postagens", "decidido_em")

    op.add_column(
        "aprovacoes_postagens",
        sa.Column("titulo", sa.String(length=255), nullable=False, server_default=""),
    )
    op.alter_column("aprovacoes_postagens", "titulo", server_default=None)

    op.add_column(
        "aprovacoes_postagens",
        sa.Column(
            "status_texto",
            postgresql.ENUM(
                "pendente", "aprovado", "rejeitado",
                name="status_aprovacao", create_type=False,
            ),
            nullable=False,
            server_default="pendente",
        ),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column(
            "status_arte",
            postgresql.ENUM(
                "pendente", "aprovado", "rejeitado",
                name="status_aprovacao", create_type=False,
            ),
            nullable=False,
            server_default="pendente",
        ),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column("decidido_texto_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column("decidido_arte_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column("postado_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_aprovacoes_status_texto",
        "aprovacoes_postagens",
        ["status_texto"],
    )
    op.create_index(
        "ix_aprovacoes_status_arte",
        "aprovacoes_postagens",
        ["status_arte"],
    )
    op.create_index(
        "ix_aprovacoes_postado_em",
        "aprovacoes_postagens",
        ["postado_em"],
    )

    # --- aprovacao_midias ---
    op.create_table(
        "aprovacao_midias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "aprovacao_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aprovacoes_postagens.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("path", sa.String(length=1024), nullable=False),
        sa.Column("nome_original", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("tamanho_bytes", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- aprovacao_comentarios ---
    op.create_table(
        "aprovacao_comentarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "aprovacao_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aprovacoes_postagens.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "autor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("anexos_paths", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- relatorios_trafego ---
    op.create_table(
        "relatorios_trafego",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("periodo_inicio", sa.Date(), nullable=False, index=True),
        sa.Column("periodo_fim", sa.Date(), nullable=False, index=True),
        sa.Column("pdf_path", sa.String(length=1024), nullable=True),
        sa.Column("pdf_nome_original", sa.String(length=512), nullable=True),
        sa.Column("texto_bruto", sa.Text(), nullable=True),
        sa.Column(
            "dados",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- metricas_mensais ---
    op.create_table(
        "metricas_mensais",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("ano_mes", sa.String(length=7), nullable=False, index=True),
        sa.Column("seguidores", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("seguidores_ganhos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("seguidores_perdidos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("alcance", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("impressoes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("visualizacoes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("curtidas", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("comentarios", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("compartilhamentos", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("salvamentos", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("visitas_perfil", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("cliques_site", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total_postagens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_stories", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_reels", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("cliente_id", "ano_mes", name="uq_metricas_cliente_ano_mes"),
    )

    # --- contratos ---
    status_contrato = postgresql.ENUM(
        "rascunho", "ativo", "encerrado", "cancelado",
        name="status_contrato",
    )
    status_contrato.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "contratos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column(
            "escopo",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("valor_mensal", sa.Numeric(12, 2), nullable=True),
        sa.Column("duracao_meses", sa.Integer(), nullable=False),
        sa.Column("data_inicio", sa.Date(), nullable=False),
        sa.Column("data_fim", sa.Date(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "rascunho", "ativo", "encerrado", "cancelado",
                name="status_contrato",
                create_type=False,
            ),
            nullable=False,
            server_default="rascunho",
            index=True,
        ),
        sa.Column("pdf_path", sa.String(length=1024), nullable=True),
        sa.Column("pdf_nome_original", sa.String(length=512), nullable=True),
        sa.Column("assinado_em_externo", sa.Date(), nullable=True),
        sa.Column("cancelado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("motivo_cancelamento", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("contratos")
    postgresql.ENUM(name="status_contrato").drop(op.get_bind(), checkfirst=True)

    op.drop_table("metricas_mensais")
    op.drop_table("relatorios_trafego")
    op.drop_table("aprovacao_comentarios")
    op.drop_table("aprovacao_midias")

    op.drop_index("ix_aprovacoes_postado_em", table_name="aprovacoes_postagens")
    op.drop_index("ix_aprovacoes_status_arte", table_name="aprovacoes_postagens")
    op.drop_index("ix_aprovacoes_status_texto", table_name="aprovacoes_postagens")

    op.drop_column("aprovacoes_postagens", "postado_em")
    op.drop_column("aprovacoes_postagens", "decidido_arte_em")
    op.drop_column("aprovacoes_postagens", "decidido_texto_em")
    op.drop_column("aprovacoes_postagens", "status_arte")
    op.drop_column("aprovacoes_postagens", "status_texto")
    op.drop_column("aprovacoes_postagens", "titulo")

    op.add_column(
        "aprovacoes_postagens",
        sa.Column("decidido_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column("comentario_revisao", sa.Text(), nullable=True),
    )
    op.add_column(
        "aprovacoes_postagens",
        sa.Column("url_midia", sa.String(length=1024), nullable=False, server_default=""),
    )
    op.alter_column("aprovacoes_postagens", "url_midia", server_default=None)
    op.add_column(
        "aprovacoes_postagens",
        sa.Column(
            "status",
            postgresql.ENUM(
                "pendente", "aprovado", "rejeitado",
                name="status_aprovacao", create_type=False,
            ),
            nullable=False,
            server_default="pendente",
        ),
    )
    op.create_index("ix_aprovacoes_status", "aprovacoes_postagens", ["status"])
