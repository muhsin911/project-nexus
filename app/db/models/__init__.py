"""
Database Models Registry.
Import all models here so Alembic can discover them for migrations.
"""

from app.db.models.portfolio import (
    DSACategory,
    DSAProblem,
    PortfolioBlogPost,
    PortfolioCertification,
    PortfolioContent,
    PortfolioEducation,
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
    "PortfolioBlogPost",
    "PortfolioCertification",
    "PortfolioContent",
    "PortfolioEducation",
    "PortfolioExperience",
    "PortfolioFAQ",
    "PortfolioImage",
    "PortfolioProfile",
    "PortfolioResume",
    "PortfolioShowcase",
    "PortfolioSkill",
    "PortfolioTestimonial",
]
