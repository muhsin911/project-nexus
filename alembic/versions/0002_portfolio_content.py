"""add portfolio DSA and resume content

Revision ID: 0002_portfolio
Revises: 0001_initial
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_portfolio"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "dsa_problems",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("platform", sa.String(length=80), nullable=False),
        sa.Column("difficulty", sa.String(length=10), nullable=False),
        sa.Column("problem_url", sa.String(length=2048), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("solution", sa.Text(), nullable=False),
        sa.Column("time_complexity", sa.String(length=120), nullable=False),
        sa.Column("space_complexity", sa.String(length=120), nullable=False),
        sa.Column("solved_at", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dsa_problems_solved_at", "dsa_problems", ["solved_at"], unique=False)
    op.create_table(
        "portfolio_resume",
        sa.Column("id", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("portfolio_resume")
    op.drop_index("ix_dsa_problems_solved_at", table_name="dsa_problems")
    op.drop_table("dsa_problems")
