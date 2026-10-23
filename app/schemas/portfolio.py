"""Request and response schemas for public portfolio content."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints

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
    published: bool = True
    sort_order: int = Field(default=0, ge=0, le=10000)
    image_id: str | None = None


class PortfolioContentRead(PortfolioContentInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    image: PortfolioImageRead | None = None


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
