"""
Job Model.
Represents a scraped job posting with spatial indexing via Geohashing.
"""

from sqlalchemy import Float, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Job(Base, UUIDMixin, TimestampMixin):
    """
    Represents a job posting scraped from job boards.
    Optimized for RAG retrieval and ultra-fast spatial queries via Geohash prefix matching.
    """
    __tablename__ = "jobs"

    # Core Job Details
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    is_remote: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Spatial Data (for Geohash computation and fallback)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Geohash: 12 characters = ~3.7cm precision. 
    # Indexed for blazing fast prefix matching (e.g., "Find jobs near me" -> geohash LIKE 'xyz%')
    geohash: Mapped[str | None] = mapped_column(String(12), nullable=True)

    # AI / RAG Metadata
    embedding_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True, doc="ChromaDB document ID")

    __table_args__ = (
        # Exactly ONE index on url: the named unique constraint IS the B-Tree
        # used for O(1) dedup fallback lookups behind the Redis Bloom filter.
        UniqueConstraint("url", name="uq_jobs_url"),
        Index("ix_jobs_geohash_prefix", "geohash"),
        Index("ix_jobs_lat_lng", "latitude", "longitude"),
        {"comment": "Stores job postings with spatial geohash indexing for fast proximity searches"},
    )

    def __repr__(self) -> str:
        return f"<Job(id={self.id}, title='{self.title}', company='{self.company}', remote={self.is_remote})>"