"""Database models for public portfolio content."""

from datetime import date

from sqlalchemy import JSON, Date, Index, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class DSAProblem(Base, UUIDMixin, TimestampMixin):
    """A solved algorithm problem displayed in the public portfolio."""

    __tablename__ = "dsa_problems"
    __table_args__ = (Index("ix_dsa_problems_solved_at", "solved_at"),)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[str] = mapped_column(String(80), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    problem_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    solution: Mapped[str] = mapped_column(Text, nullable=False)
    time_complexity: Mapped[str] = mapped_column(String(120), nullable=False)
    space_complexity: Mapped[str] = mapped_column(String(120), nullable=False)
    solved_at: Mapped[date | None] = mapped_column(Date, nullable=True)


class PortfolioResume(Base, TimestampMixin):
    """The single downloadable PDF resume managed by the portfolio owner."""

    __tablename__ = "portfolio_resume"

    id: Mapped[str] = mapped_column(String(20), primary_key=True, default="current")
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
