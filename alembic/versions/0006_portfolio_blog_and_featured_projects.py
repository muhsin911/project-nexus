"""add owner-managed blog posts and featured projects

Revision ID: 0006_portfolio_blog
Revises: 0005_portfolio_interactions
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_portfolio_blog"
down_revision: str | None = "0005_portfolio_interactions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "portfolio_content",
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "portfolio_blog_posts",
        sa.Column("id", sa.String(length=36), nullable=False),
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
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("excerpt", sa.String(length=500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_portfolio_blog_posts_slug"),
    )
    op.create_index(
        "ix_portfolio_blog_posts_published_created",
        "portfolio_blog_posts",
        ["published", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_portfolio_blog_posts_published_created",
        table_name="portfolio_blog_posts",
    )
    op.drop_table("portfolio_blog_posts")
    op.drop_column("portfolio_content", "featured")
