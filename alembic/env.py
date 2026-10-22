"""Async Alembic migration environment for Project NEXUS.

Resolves all connection parameters from the validated Pydantic Settings object,
runs migrations through SQLAlchemy's async greenlet bridge, and uses NullPool so
that migration runs never hold idle connections open against free-tier Postgres.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, MetaData, pool
from sqlalchemy.ext.asyncio import AsyncEngine, async_engine_from_config

from app.core.config import settings
from app.db import models  # noqa: F401  — registers every mapper on Base.metadata
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Single source of truth for credentials. Escape "%" so ConfigParser's
# interpolation cannot corrupt URL-encoded passwords (e.g. p%40ss).
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

target_metadata: MetaData = Base.metadata


def include_object(object, name, type_, reflected, compare_to) -> bool:
    """
    Filter out PostGIS and Tiger Geocoder tables from Alembic autogenerate.
    This prevents Alembic from trying to drop built-in spatial tables.
    """
    if type_ == "table":
        # Ignore standard PostGIS metadata tables
        postgis_tables = {
            "spatial_ref_sys", "geometry_columns", "geography_columns",
            "raster_columns", "raster_overviews"
        }
        if name in postgis_tables:
            return False
        
        # Ignore anything in the 'tiger' or 'topology' schemas
        schema = getattr(object, "schema", None)
        if schema in ("tiger", "topology"):
            return False
            
    return True


def _configure_context(connection: Connection) -> None:
    """Bind Alembic to the synchronous proxy of the async connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=False,
        transaction_per_migration=True,
        include_schemas=False,
        version_table="alembic_version",
        include_object=include_object,  # <-- ADDED: Filters out PostGIS tables
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Emit SQL to stdout without opening a connection (CI artifact generation)."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        version_table="alembic_version",
        include_object=include_object,  # <-- ADDED: Filters out PostGIS tables
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Synchronous callback executed inside the async connection's greenlet."""
    _configure_context(connection)


def _build_migration_engine() -> AsyncEngine:
    """Build a migration-only engine with no connection pooling."""
    return async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        echo=settings.DB_ECHO,
        connect_args={
            "timeout": 30,
            "command_timeout": 60,
            "server_settings": {"search_path": "public"},
        },
    )


async def run_async_migrations() -> None:
    """Execute migrations asynchronously, always disposing the engine."""
    engine = _build_migration_engine()
    try:
        async with engine.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await engine.dispose()


def run_migrations_online() -> None:
    """Entry point for connected migration runs."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()