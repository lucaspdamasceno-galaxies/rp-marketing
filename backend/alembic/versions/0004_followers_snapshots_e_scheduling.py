"""followers_snapshots + drop impressoes + clientes.sync_cron/sync_scheduler_job

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "followers_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("followers_count", sa.BigInteger(), nullable=False),
        sa.Column("coletado_em", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_followers_snapshots_cliente_coletado",
        "followers_snapshots",
        ["cliente_id", sa.text("coletado_em DESC")],
    )

    op.drop_column("postagens", "impressoes")

    op.add_column(
        "clientes",
        sa.Column("sync_cron", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "clientes",
        sa.Column("sync_scheduler_job", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clientes", "sync_scheduler_job")
    op.drop_column("clientes", "sync_cron")

    op.add_column(
        "postagens",
        sa.Column(
            "impressoes",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
    )

    op.drop_index(
        "ix_followers_snapshots_cliente_coletado",
        table_name="followers_snapshots",
    )
    op.drop_table("followers_snapshots")
