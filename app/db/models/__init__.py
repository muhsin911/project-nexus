"""
Database Models Registry.
Import all models here so Alembic can discover them for migrations.
"""

from app.db.models.job import Job
from app.db.models.portfolio import DSAProblem, PortfolioResume

__all__ = [
    "DSAProblem",
    "Job",
    "PortfolioResume",
]
