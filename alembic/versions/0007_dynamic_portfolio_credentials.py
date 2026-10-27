"""make education and certifications editable portfolio content

Revision ID: 0007_portfolio_credentials
Revises: 0006_portfolio_blog
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_portfolio_credentials"
down_revision: str | None = "0006_portfolio_blog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


education_table = sa.table(
    "portfolio_education",
    sa.column("id", sa.String(length=36)),
    sa.column("degree", sa.String(length=180)),
    sa.column("institution", sa.String(length=180)),
    sa.column("period", sa.String(length=80)),
    sa.column("sort_order", sa.Integer()),
    sa.column("published", sa.Boolean()),
)
certification_table = sa.table(
    "portfolio_certifications",
    sa.column("id", sa.String(length=36)),
    sa.column("name", sa.String(length=240)),
    sa.column("issuer", sa.String(length=180)),
    sa.column("sort_order", sa.Integer()),
    sa.column("published", sa.Boolean()),
)


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
    op.rename_table("jobs", "deferred_job_scraper_data")

    op.create_table(
        "portfolio_education",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("degree", sa.String(length=180), nullable=False),
        sa.Column("institution", sa.String(length=180), nullable=False),
        sa.Column("period", sa.String(length=80), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_education_sort", "portfolio_education", ["sort_order"])
    op.create_table(
        "portfolio_certifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("issuer", sa.String(length=180), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_portfolio_certifications_sort",
        "portfolio_certifications",
        ["sort_order"],
    )

    op.bulk_insert(
        education_table,
        [
            {
                "id": "00000000-0000-4000-8000-000000000701",
                "degree": "M.Sc. Data Science",
                "institution": "Kalasalingam University",
                "period": "2025 — Present",
                "sort_order": 0,
                "published": True,
            },
            {
                "id": "00000000-0000-4000-8000-000000000702",
                "degree": "B.Sc. Physics",
                "institution": "University of Calicut",
                "period": "2016 — 2019",
                "sort_order": 1,
                "published": True,
            },
        ],
    )
    op.bulk_insert(
        certification_table,
        [
            {
                "id": f"00000000-0000-4000-8000-0000000007{index:02}",
                "name": name,
                "issuer": issuer,
                "sort_order": index - 1,
                "published": True,
            }
            for index, (name, issuer) in enumerate(
                [
                    (
                        "Software Engineering Specialization",
                        "The Hong Kong University of Science and Technology",
                    ),
                    ("Generative AI for Software Developers", "DeepLearning.AI, Coursera"),
                    ("Python Master", "Inmakes LearningHub"),
                    ("JavaScript Algorithms and Data Structures", "freeCodeCamp"),
                    ("Front End Development Libraries", "freeCodeCamp"),
                    ("Databases for Developers: Foundations", "Oracle Dev Gym"),
                ],
                start=1,
            )
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_portfolio_certifications_sort", table_name="portfolio_certifications")
    op.drop_table("portfolio_certifications")
    op.drop_index("ix_portfolio_education_sort", table_name="portfolio_education")
    op.drop_table("portfolio_education")
    op.rename_table("deferred_job_scraper_data", "jobs")
