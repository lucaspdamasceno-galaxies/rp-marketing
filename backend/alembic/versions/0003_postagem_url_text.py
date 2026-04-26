"""postagens.url_midia e permalink: VARCHAR(1024) -> TEXT

URLs assinadas de mídia do Instagram (especialmente Reels) ultrapassam 1024 chars.

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "postagens", "url_midia",
        existing_type=sa.String(length=1024),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        "postagens", "permalink",
        existing_type=sa.String(length=1024),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "postagens", "permalink",
        existing_type=sa.Text(),
        type_=sa.String(length=1024),
        existing_nullable=True,
    )
    op.alter_column(
        "postagens", "url_midia",
        existing_type=sa.Text(),
        type_=sa.String(length=1024),
        existing_nullable=False,
    )
