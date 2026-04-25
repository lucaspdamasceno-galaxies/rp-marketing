"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "cliente", name="role_usuario"),
            nullable=False,
        ),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "clientes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("nome_empresa", sa.String(255), nullable=False),
        sa.Column("instagram_account_id", sa.String(255), nullable=True),
        sa.Column("access_token", sa.String(1024), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "postagens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("instagram_media_id", sa.String(255), nullable=False, unique=True),
        sa.Column(
            "tipo",
            sa.Enum("IMAGE", "VIDEO", "CAROUSEL", "REEL", name="tipo_postagem"),
            nullable=False,
        ),
        sa.Column("url_midia", sa.String(1024), nullable=False),
        sa.Column("permalink", sa.String(1024), nullable=True),
        sa.Column("legenda", sa.Text(), nullable=True),
        sa.Column("curtidas", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("comentarios", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("visualizacoes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("alcance", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("impressoes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("data_publicacao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_postagens_cliente_id", "postagens", ["cliente_id"])
    op.create_index("ix_postagens_instagram_media_id", "postagens", ["instagram_media_id"], unique=True)
    op.create_index("ix_postagens_data_publicacao", "postagens", ["data_publicacao"])


def downgrade() -> None:
    op.drop_index("ix_postagens_data_publicacao", table_name="postagens")
    op.drop_index("ix_postagens_instagram_media_id", table_name="postagens")
    op.drop_index("ix_postagens_cliente_id", table_name="postagens")
    op.drop_table("postagens")
    op.drop_table("clientes")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")
    sa.Enum(name="tipo_postagem").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="role_usuario").drop(op.get_bind(), checkfirst=False)
