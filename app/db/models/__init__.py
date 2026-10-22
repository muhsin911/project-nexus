"""
Database Models Registry.
Import all models here so Alembic can discover them for migrations.
"""

from app.db.models.job import Job

__all__ = [
    "Job",
]