"""add authenticated portfolio CMS, images, and DSA categories

Revision ID: 0003_portfolio_cms
Revises: 0002_portfolio
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_portfolio_cms"
down_revision: str | None = "0002_portfolio"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_CATEGORY_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.create_table(
        "dsa_categories",
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
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=96), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_dsa_categories_name"),
        sa.UniqueConstraint("slug", name="uq_dsa_categories_slug"),
    )
    op.bulk_insert(
        sa.table(
            "dsa_categories",
            sa.column("id", sa.String),
            sa.column("name", sa.String),
            sa.column("slug", sa.String),
            sa.column("description", sa.Text),
        ),
        [
            {
                "id": DEFAULT_CATEGORY_ID,
                "name": "Uncategorized",
                "slug": "uncategorized",
                "description": "Legacy solved problems awaiting categorization.",
            }
        ],
    )
    op.add_column("dsa_problems", sa.Column("category_id", sa.String(length=36), nullable=True))
    op.execute(
        sa.text("UPDATE dsa_problems SET category_id = :category_id").bindparams(
            category_id=DEFAULT_CATEGORY_ID
        )
    )
    op.alter_column("dsa_problems", "category_id", nullable=False)
    op.create_foreign_key(
        "fk_dsa_problems_category_id",
        "dsa_problems",
        "dsa_categories",
        ["category_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_dsa_problems_category_id", "dsa_problems", ["category_id"])

    op.create_table(
        "portfolio_images",
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
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=40), nullable=False),
        sa.Column("alt_text", sa.String(length=300), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "portfolio_content",
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
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("excerpt", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("image_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["image_id"], ["portfolio_images.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_portfolio_content_slug"),
    )
    op.create_index(
        "ix_portfolio_content_published_sort",
        "portfolio_content",
        ["published", "sort_order"],
    )


def downgrade() -> None:
    op.drop_index("ix_portfolio_content_published_sort", table_name="portfolio_content")
    op.drop_table("portfolio_content")
    op.drop_table("portfolio_images")
    op.drop_index("ix_dsa_problems_category_id", table_name="dsa_problems")
    op.drop_constraint("fk_dsa_problems_category_id", "dsa_problems", type_="foreignkey")
    op.drop_column("dsa_problems", "category_id")
    op.drop_table("dsa_categories")
