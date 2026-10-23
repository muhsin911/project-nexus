"""expand portfolio profile and structured content

Revision ID: 0004_portfolio_sections
Revises: 0003_portfolio_cms
Create Date: 2026-10-24
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_portfolio_sections"
down_revision: str | None = "0003_portfolio_cms"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
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
    ]


def upgrade() -> None:
    op.add_column(
        "portfolio_content",
        sa.Column("role", sa.String(length=160), server_default="", nullable=False),
    )
    op.add_column(
        "portfolio_content",
        sa.Column("tech_stack", sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
    )
    op.add_column(
        "portfolio_content", sa.Column("repository_url", sa.String(length=2048), nullable=True)
    )
    op.add_column("portfolio_content", sa.Column("live_url", sa.String(length=2048), nullable=True))

    op.create_table(
        "portfolio_profile",
        sa.Column("id", sa.String(length=20), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "portfolio_experiences",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("company", sa.String(length=180), nullable=False),
        sa.Column("designation", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("year", sa.String(length=60), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_experiences_sort", "portfolio_experiences", ["sort_order"])
    op.create_table(
        "portfolio_skills",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("icon", sa.String(length=120), nullable=False),
        sa.Column("group", sa.String(length=100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_portfolio_skills_name"),
    )
    op.create_table(
        "portfolio_testimonials",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("designation", sa.String(length=180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_id", sa.String(length=36), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["portfolio_images.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_testimonials_sort", "portfolio_testimonials", ["sort_order"])


def downgrade() -> None:
    op.drop_index("ix_portfolio_testimonials_sort", table_name="portfolio_testimonials")
    op.drop_table("portfolio_testimonials")
    op.drop_index("ix_portfolio_experiences_sort", table_name="portfolio_experiences")
    op.drop_table("portfolio_skills")
    op.drop_table("portfolio_experiences")
    op.drop_table("portfolio_profile")
    op.drop_column("portfolio_content", "live_url")
    op.drop_column("portfolio_content", "repository_url")
    op.drop_column("portfolio_content", "tech_stack")
    op.drop_column("portfolio_content", "role")
