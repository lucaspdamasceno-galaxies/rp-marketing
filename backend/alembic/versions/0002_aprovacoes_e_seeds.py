"""aprovacoes_postagens + clientes seed

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-25
"""
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# bcrypt hash de "cliente123" — senha padrão dos clientes seed
SEED_PASSWORD_HASH = "$2b$12$hN7gpJh5QCn7FBnzXaU9JO.vdv0JRJHwd3ED6ig1BydU1qTtJ.Ibu"


def upgrade() -> None:
    op.create_table(
        "aprovacoes_postagens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "tipo",
            postgresql.ENUM(
                "IMAGE", "VIDEO", "CAROUSEL", "REEL",
                name="tipo_postagem",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("url_midia", sa.String(1024), nullable=False),
        sa.Column("legenda", sa.Text(), nullable=True),
        sa.Column("data_agendada", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pendente", "aprovado", "rejeitado", name="status_aprovacao"),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("comentario_revisao", sa.Text(), nullable=True),
        sa.Column("decidido_em", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index(
        "ix_aprovacoes_cliente_id",
        "aprovacoes_postagens",
        ["cliente_id"],
    )
    op.create_index(
        "ix_aprovacoes_status",
        "aprovacoes_postagens",
        ["status"],
    )

    # Seeds: 4 clientes (RP Marketing + 3 demo). Idempotente — só insere se email não existir.
    seeds = [
        {
            "nome_usuario": "RP Marketing",
            "email": "rpmarketing@rpmarketing.com.br",
            "nome_empresa": "RP Marketing",
        },
        {
            "nome_usuario": "Lucas Damasceno",
            "email": "lucas@studioaurora.com",
            "nome_empresa": "Studio Aurora",
        },
        {
            "nome_usuario": "Marina Lopes",
            "email": "marina@casalumen.com.br",
            "nome_empresa": "Casa Lumen",
        },
        {
            "nome_usuario": "Pedro Ferraz",
            "email": "pedro@verdevida.com.br",
            "nome_empresa": "Verde Vida Cosméticos",
        },
    ]

    bind = op.get_bind()
    for seed in seeds:
        existente = bind.execute(
            sa.text("SELECT id FROM usuarios WHERE email = :email"),
            {"email": seed["email"]},
        ).first()
        if existente:
            continue

        usuario_id = uuid4()
        cliente_id = uuid4()

        bind.execute(
            sa.text(
                """
                INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo, created_at, updated_at)
                VALUES (:id, :nome, :email, :senha_hash, 'cliente', true, NOW(), NOW())
                """
            ),
            {
                "id": str(usuario_id),
                "nome": seed["nome_usuario"],
                "email": seed["email"],
                "senha_hash": SEED_PASSWORD_HASH,
            },
        )
        bind.execute(
            sa.text(
                """
                INSERT INTO clientes (id, usuario_id, nome_empresa, created_at, updated_at)
                VALUES (:id, :usuario_id, :nome_empresa, NOW(), NOW())
                """
            ),
            {
                "id": str(cliente_id),
                "usuario_id": str(usuario_id),
                "nome_empresa": seed["nome_empresa"],
            },
        )


def downgrade() -> None:
    op.drop_index("ix_aprovacoes_status", table_name="aprovacoes_postagens")
    op.drop_index("ix_aprovacoes_cliente_id", table_name="aprovacoes_postagens")
    op.drop_table("aprovacoes_postagens")
    sa.Enum(name="status_aprovacao").drop(op.get_bind(), checkfirst=False)
