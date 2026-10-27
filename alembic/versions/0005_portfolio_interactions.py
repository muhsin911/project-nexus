"""add portfolio FAQs and homepage showcase carousel

Revision ID: 0005_portfolio_interactions
Revises: 0004_portfolio_sections
Create Date: 2026-10-24
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_portfolio_interactions"
down_revision: str | None = "0004_portfolio_sections"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "portfolio_faqs",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("question", sa.String(length=300), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_faqs_sort", "portfolio_faqs", ["sort_order"])
    op.create_table(
        "portfolio_showcase",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("eyebrow", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_id", sa.String(length=36), nullable=True),
        sa.Column("action_label", sa.String(length=80), nullable=False),
        sa.Column("action_url", sa.String(length=2048), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["portfolio_images.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_showcase_sort", "portfolio_showcase", ["sort_order"])


def downgrade() -> None:
    op.drop_index("ix_portfolio_showcase_sort", table_name="portfolio_showcase")
    op.drop_table("portfolio_showcase")
    op.drop_index("ix_portfolio_faqs_sort", table_name="portfolio_faqs")
    op.drop_table("portfolio_faqs")
