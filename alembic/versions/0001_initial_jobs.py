"""initial jobs table with geohash spatial indexing

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-22 00:00:00+00:00

Baseline migration for Project NEXUS.
Creates the jobs table with a B-Tree-geohash strategy for sub-millisecond
proximity pre-filtering, plus a lat/lng composite index for exact-radius
PostGIS fallback queries.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the PostGIS extension (when available) and the jobs table."""
    bind = op.get_bind()

    # Capability probe: local postgis/postgis image and Neon/Supabase expose
    # PostGIS; a vanilla Postgres free tier may not. Never hard-fail a
    # migration over an optional spatial extension.
    has_postgis: bool = bind.execute(
        sa.text(
            "SELECT EXISTS "
            "(SELECT 1 FROM pg_available_extensions WHERE name = 'postgis')"
        )
    ).scalar_one()

    if has_postgis:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "jobs",
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
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=True),
        sa.Column("url", sa.String(length=512), nullable=False),
        sa.Column("is_remote", sa.Boolean(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("geohash", sa.String(length=12), nullable=True),
        sa.Column("embedding_id", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("url", name="uq_jobs_url"),
        comment=(
            "Stores job postings with spatial geohash indexing "
            "for fast proximity searches"
        ),
    )

    # Application-layer lookups (Kanban command center / resume matching)
    op.create_index("ix_jobs_title", "jobs", ["title"], unique=False)
    op.create_index("ix_jobs_company", "jobs", ["company"], unique=False)
    op.create_index(
        "ix_jobs_embedding_id", "jobs", ["embedding_id"], unique=False
    )

    # DSA primitive: 12-char geohash prefix scan via a single B-Tree.
    # "Find jobs within 50km" -> prefix prune, then exact radius refinement.
    op.create_index(
        "ix_jobs_geohash_prefix", "jobs", ["geohash"], unique=False
    )

    # Fallback path for ST_DWithin / exact-distance queries on PostGIS.
    op.create_index(
        "ix_jobs_lat_lng", "jobs", ["latitude", "longitude"], unique=False
    )


def downgrade() -> None:
    """Reverse the baseline. LOCAL DEVELOPMENT ONLY.

    The PostGIS extension is intentionally NOT dropped: extensions are shared
    cluster infrastructure and may be consumed by other schemas, extensions,
    or managed-platform internals. Dropping it is a destructive, out-of-band
    DBA operation, not a migration concern.
    """
    op.drop_index("ix_jobs_lat_lng", table_name="jobs")
    op.drop_index("ix_jobs_geohash_prefix", table_name="jobs")
    op.drop_index("ix_jobs_embedding_id", table_name="jobs")
    op.drop_index("ix_jobs_company", table_name="jobs")
    op.drop_index("ix_jobs_title", table_name="jobs")
    op.drop_table("jobs")