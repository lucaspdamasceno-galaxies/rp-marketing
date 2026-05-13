"""metricas_mensais: substitui ano_mes por data_inicio/data_fim (range livre).

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("metricas_mensais", sa.Column("data_inicio", sa.Date(), nullable=True))
    op.add_column("metricas_mensais", sa.Column("data_fim", sa.Date(), nullable=True))

    # backfill: data_inicio = primeiro dia do ano_mes, data_fim = último dia
    op.execute(
        """
        UPDATE metricas_mensais
        SET data_inicio = to_date(ano_mes || '-01', 'YYYY-MM-DD'),
            data_fim   = (to_date(ano_mes || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
        WHERE data_inicio IS NULL
        """
    )

    op.alter_column("metricas_mensais", "data_inicio", nullable=False)
    op.alter_column("metricas_mensais", "data_fim", nullable=False)

    op.drop_constraint("uq_metricas_cliente_ano_mes", "metricas_mensais", type_="unique")
    op.drop_index("ix_metricas_mensais_ano_mes", table_name="metricas_mensais")
    op.drop_column("metricas_mensais", "ano_mes")

    op.create_index(
        "ix_metricas_mensais_cliente_periodo",
        "metricas_mensais",
        ["cliente_id", "data_inicio", "data_fim"],
    )


def downgrade() -> None:
    op.drop_index("ix_metricas_mensais_cliente_periodo", table_name="metricas_mensais")
    op.add_column(
        "metricas_mensais",
        sa.Column("ano_mes", sa.String(length=7), nullable=True),
    )
    op.execute(
        "UPDATE metricas_mensais SET ano_mes = to_char(data_inicio, 'YYYY-MM')"
    )
    op.alter_column("metricas_mensais", "ano_mes", nullable=False)
    op.create_index(
        "ix_metricas_mensais_ano_mes", "metricas_mensais", ["ano_mes"]
    )
    op.create_unique_constraint(
        "uq_metricas_cliente_ano_mes",
        "metricas_mensais",
        ["cliente_id", "ano_mes"],
    )
    op.drop_column("metricas_mensais", "data_fim")
    op.drop_column("metricas_mensais", "data_inicio")
