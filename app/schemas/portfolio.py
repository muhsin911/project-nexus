"""Request and response schemas for public portfolio content."""

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator

from app.core.html_sanitizer import sanitize_blog_html

Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=220)]


class AdminLogin(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class AdminSession(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class DSACategoryInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=96)]
    description: str = Field(default="", max_length=1000)


class DSACategoryRead(DSACategoryInput):
    model_config = ConfigDict(from_attributes=True)

    id: str


class PortfolioImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    content_type: str
    alt_text: str
    url: str


class PortfolioContentInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: Slug
    excerpt: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1, max_length=30000)
    role: str = Field(default="", max_length=160)
    tech_stack: list[str] = Field(default_factory=list, max_length=30)
    repository_url: str | None = Field(default=None, max_length=2048)
    live_url: str | None = Field(default=None, max_length=2048)
    published: bool = True
    featured: bool = False
    sort_order: int = Field(default=0, ge=0, le=10000)
    image_id: str | None = None

    @field_validator("repository_url", "live_url")
    @classmethod
    def validate_project_url(cls, value: str | None) -> str | None:
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("Project links must use HTTP or HTTPS.")
        return value


class PortfolioContentRead(PortfolioContentInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    image: PortfolioImageRead | None = None


class PortfolioBlogPostInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: Slug
    excerpt: str = Field(min_length=1, max_length=500)
    body_html: str = Field(min_length=1, max_length=50000)
    published: bool = False

    @field_validator("body_html")
    @classmethod
    def sanitize_body_html(cls, value: str) -> str:
        sanitized = sanitize_blog_html(value)
        if not sanitized.strip():
            raise ValueError("Add some article content using the supported HTML tags.")
        return sanitized


class PortfolioBlogPostRead(PortfolioBlogPostInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class PortfolioImageInput(BaseModel):
    alt_text: str = Field(min_length=1, max_length=300)


class DSAProblemInput(BaseModel):
    category_id: str
    title: str = Field(min_length=1, max_length=200)
    platform: str = Field(min_length=1, max_length=80)
    difficulty: Literal["Easy", "Medium", "Hard"]
    problem_url: HttpUrl
    tags: list[str] = Field(default_factory=list, max_length=12)
    summary: str = Field(min_length=1, max_length=4000)
    solution: str = Field(min_length=1, max_length=20000)
    time_complexity: str = Field(min_length=1, max_length=120)
    space_complexity: str = Field(min_length=1, max_length=120)
    solved_at: date | None = None


class DSAProblemRead(DSAProblemInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class ResumeStatus(BaseModel):
    available: bool
    filename: str | None = None
    updated_at: datetime | None = None


class PortfolioProfileInput(BaseModel):
    full_name: str = Field(default="", max_length=160)
    headline: str = Field(default="", max_length=240)
    job_roles: list[str] = Field(default_factory=list, max_length=12)
    about_title: str = Field(default="", max_length=240)
    about: str = Field(default="", max_length=5000)
    location: str = Field(default="", max_length=160)
    phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=500)
    email: str = Field(default="", max_length=254)
    booking_url: str = Field(default="", max_length=2048)
    expertise: list[str] = Field(default_factory=list, max_length=24)
    social_links: list["PortfolioSocialLink"] = Field(default_factory=list, max_length=16)

    @field_validator("email")
    @classmethod
    def validate_profile_email(cls, value: str) -> str:
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("booking_url")
    @classmethod
    def validate_booking_url(cls, value: str) -> str:
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("Appointment links must use HTTP or HTTPS.")
        return value


class PortfolioSocialLink(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    url: str = Field(min_length=1, max_length=2048)
    icon: str = Field(default="", max_length=100)

    @field_validator("url")
    @classmethod
    def validate_social_url(cls, value: str) -> str:
        if not value.startswith(("https://", "http://", "mailto:")):
            raise ValueError("Social links must use HTTP, HTTPS, or mailto.")
        return value


class ExperienceInput(BaseModel):
    company: str = Field(min_length=1, max_length=180)
    designation: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=5000)
    year: str = Field(min_length=1, max_length=60)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class ExperienceRead(ExperienceInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class EducationInput(BaseModel):
    degree: str = Field(min_length=1, max_length=180)
    institution: str = Field(min_length=1, max_length=180)
    period: str = Field(min_length=1, max_length=80)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class EducationRead(EducationInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class CertificationInput(BaseModel):
    name: str = Field(min_length=1, max_length=240)
    issuer: str = Field(default="", max_length=180)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class CertificationRead(CertificationInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class SkillInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str = Field(default="", max_length=120)
    group: str = Field(default="Core", max_length=100)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class SkillRead(SkillInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class TestimonialInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    designation: str = Field(min_length=1, max_length=180)
    content: str = Field(min_length=1, max_length=5000)
    image_id: str | None = None
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class TestimonialRead(TestimonialInput):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image: PortfolioImageRead | None = None


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    subject: str = Field(min_length=1, max_length=180)
    purpose: Literal["Freelance", "Interview", "Consultation", "Other"] = "Other"
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("name", "subject")
    @classmethod
    def validate_mail_headers(cls, value: str) -> str:
        if "\r" in value or "\n" in value:
            raise ValueError("Line breaks are not allowed in this field.")
        return value


class FAQInput(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(min_length=1, max_length=5000)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True


class FAQRead(FAQInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class ShowcaseInput(BaseModel):
    eyebrow: str = Field(default="", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    image_id: str | None = None
    action_label: str = Field(default="", max_length=80)
    action_url: str = Field(default="", max_length=2048)
    sort_order: int = Field(default=0, ge=0, le=10000)
    published: bool = True

    @field_validator("action_url")
    @classmethod
    def validate_action_url(cls, value: str) -> str:
        if value and not (
            value.startswith(("https://", "http://", "mailto:", "#"))
            or (value.startswith("/") and not value.startswith("//"))
        ):
            raise ValueError("Slide links must be HTTP, HTTPS, an internal path, or mailto.")
        return value


class ShowcaseRead(ShowcaseInput):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image: PortfolioImageRead | None = None
