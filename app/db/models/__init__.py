"""
Database Models Registry.
Import all models here so Alembic can discover them for migrations.
"""

from app.db.models.job import Job
from app.db.models.portfolio import (
    DSACategory,
    DSAProblem,
    PortfolioBlogPost,
    PortfolioContent,
    PortfolioExperience,
    PortfolioFAQ,
    PortfolioImage,
    PortfolioProfile,
    PortfolioResume,
    PortfolioShowcase,
    PortfolioSkill,
    PortfolioTestimonial,
)

__all__ = [
    "DSACategory",
    "DSAProblem",
    "Job",
    "PortfolioContent",
    "PortfolioBlogPost",
    "PortfolioExperience",
    "PortfolioFAQ",
    "PortfolioImage",
    "PortfolioProfile",
    "PortfolioResume",
    "PortfolioShowcase",
    "PortfolioSkill",
    "PortfolioTestimonial",
]
