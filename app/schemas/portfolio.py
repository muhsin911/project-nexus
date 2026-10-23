"""Request and response schemas for public portfolio content."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class DSAProblemInput(BaseModel):
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
