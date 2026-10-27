"""Database models for public portfolio content."""

from datetime import date

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class DSAProblem(Base, UUIDMixin, TimestampMixin):
    """A solved algorithm problem displayed in the public portfolio."""

    __tablename__ = "dsa_problems"
    __table_args__ = (Index("ix_dsa_problems_solved_at", "solved_at"),)

    category_id: Mapped[str] = mapped_column(
        ForeignKey("dsa_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    category: Mapped["DSACategory"] = relationship(back_populates="problems")
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


class DSACategory(Base, UUIDMixin, TimestampMixin):
    """An algorithm topic used to organize solved problems."""

    __tablename__ = "dsa_categories"
    __table_args__ = (
        UniqueConstraint("name", name="uq_dsa_categories_name"),
        UniqueConstraint("slug", name="uq_dsa_categories_slug"),
    )

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(96), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    problems: Mapped[list[DSAProblem]] = relationship(back_populates="category")


class PortfolioImage(Base, UUIDMixin, TimestampMixin):
    """An owner-uploaded image used by portfolio content entries."""

    __tablename__ = "portfolio_images"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(40), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    entries: Mapped[list["PortfolioContent"]] = relationship(back_populates="image")
    testimonials: Mapped[list["PortfolioTestimonial"]] = relationship(back_populates="image")
    showcases: Mapped[list["PortfolioShowcase"]] = relationship(back_populates="image")


class PortfolioContent(Base, UUIDMixin, TimestampMixin):
    """A publishable project or editorial content item."""

    __tablename__ = "portfolio_content"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_portfolio_content_slug"),
        Index("ix_portfolio_content_published_sort", "published", "sort_order"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False)
    excerpt: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    tech_stack: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    repository_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    live_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    published: Mapped[bool] = mapped_column(default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
    image_id: Mapped[str | None] = mapped_column(
        ForeignKey("portfolio_images.id", ondelete="SET NULL"), nullable=True
    )
    image: Mapped[PortfolioImage | None] = relationship(back_populates="entries")


class PortfolioProfile(Base):
    """Editable single-owner identity and portfolio introduction."""

    __tablename__ = "portfolio_profile"

    id: Mapped[str] = mapped_column(String(20), primary_key=True, default="current")
    data: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)


class PortfolioExperience(Base, UUIDMixin, TimestampMixin):
    """A role in the owner's professional experience."""

    __tablename__ = "portfolio_experiences"
    __table_args__ = (Index("ix_portfolio_experiences_sort", "sort_order"),)

    company: Mapped[str] = mapped_column(String(180), nullable=False)
    designation: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[str] = mapped_column(String(60), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PortfolioEducation(Base, UUIDMixin, TimestampMixin):
    """An education entry displayed on the public portfolio."""

    __tablename__ = "portfolio_education"
    __table_args__ = (Index("ix_portfolio_education_sort", "sort_order"),)

    degree: Mapped[str] = mapped_column(String(180), nullable=False)
    institution: Mapped[str] = mapped_column(String(180), nullable=False)
    period: Mapped[str] = mapped_column(String(80), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PortfolioCertification(Base, UUIDMixin, TimestampMixin):
    """A certification displayed on the public portfolio."""

    __tablename__ = "portfolio_certifications"
    __table_args__ = (Index("ix_portfolio_certifications_sort", "sort_order"),)

    name: Mapped[str] = mapped_column(String(240), nullable=False)
    issuer: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PortfolioSkill(Base, UUIDMixin, TimestampMixin):
    """A skill and its icon identifier."""

    __tablename__ = "portfolio_skills"
    __table_args__ = (UniqueConstraint("name", name="uq_portfolio_skills_name"),)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    group: Mapped[str] = mapped_column(String(100), nullable=False, default="Core")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PortfolioTestimonial(Base, UUIDMixin, TimestampMixin):
    """A testimonial with attribution and optional portrait."""

    __tablename__ = "portfolio_testimonials"
    __table_args__ = (Index("ix_portfolio_testimonials_sort", "sort_order"),)

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    designation: Mapped[str] = mapped_column(String(180), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_id: Mapped[str | None] = mapped_column(
        ForeignKey("portfolio_images.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image: Mapped[PortfolioImage | None] = relationship(back_populates="testimonials")


class PortfolioFAQ(Base, UUIDMixin, TimestampMixin):
    """A frequently asked question shown on the public portfolio."""

    __tablename__ = "portfolio_faqs"
    __table_args__ = (Index("ix_portfolio_faqs_sort", "sort_order"),)

    question: Mapped[str] = mapped_column(String(300), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PortfolioShowcase(Base, UUIDMixin, TimestampMixin):
    """An owner-managed slide in the homepage highlight carousel."""

    __tablename__ = "portfolio_showcase"
    __table_args__ = (Index("ix_portfolio_showcase_sort", "sort_order"),)

    eyebrow: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_id: Mapped[str | None] = mapped_column(
        ForeignKey("portfolio_images.id", ondelete="SET NULL"), nullable=True
    )
    action_label: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    action_url: Mapped[str] = mapped_column(String(2048), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image: Mapped[PortfolioImage | None] = relationship(back_populates="showcases")


class PortfolioBlogPost(Base, UUIDMixin, TimestampMixin):
    """An owner-managed long-form blog article."""

    __tablename__ = "portfolio_blog_posts"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_portfolio_blog_posts_slug"),
        Index("ix_portfolio_blog_posts_published_created", "published", "created_at"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False)
    excerpt: Mapped[str] = mapped_column(String(500), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PortfolioResume(Base, TimestampMixin):
    """The single downloadable PDF resume managed by the portfolio owner."""

    __tablename__ = "portfolio_resume"

    id: Mapped[str] = mapped_column(String(20), primary_key=True, default="current")
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
