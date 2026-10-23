"""
Database Models Registry.
Import all models here so Alembic can discover them for migrations.
"""

from app.db.models.job import Job
from app.db.models.portfolio import (
    DSACategory,
    DSAProblem,
    PortfolioContent,
    PortfolioImage,
    PortfolioResume,
)

__all__ = [
    "DSACategory",
    "DSAProblem",
    "Job",
    "PortfolioContent",
    "PortfolioImage",
    "PortfolioResume",
]
