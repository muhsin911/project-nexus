"""Public portfolio data and protected content-management endpoints."""

import asyncio
import logging
import re
import smtplib
import ssl
import time
from datetime import UTC, datetime
from email.message import EmailMessage
from pathlib import PurePosixPath
from typing import Annotated
from urllib.parse import quote

import anyio
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.admin_auth import issue_admin_token, require_admin_token, verify_admin_password
from app.core.config import Settings, get_settings
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
from app.db.session import get_db
from app.schemas.portfolio import (
    AdminLogin,
    AdminSession,
    ContactMessage,
    DSACategoryInput,
    DSACategoryRead,
    DSAProblemInput,
    DSAProblemRead,
    ExperienceInput,
    ExperienceRead,
    FAQInput,
    FAQRead,
    PortfolioBlogPostInput,
    PortfolioBlogPostRead,
    PortfolioContentInput,
    PortfolioContentRead,
    PortfolioImageInput,
    PortfolioImageRead,
    PortfolioProfileInput,
    ResumeStatus,
    ShowcaseInput,
    ShowcaseRead,
    SkillInput,
    SkillRead,
    TestimonialInput,
    TestimonialRead,
)

router = APIRouter(tags=["Portfolio"])
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)
MAX_RESUME_BYTES = 10 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
}
CONTACT_WINDOW_SECONDS = 600
CONTACT_LIMIT = 3
_contact_requests: dict[str, list[float]] = {}
_contact_lock = asyncio.Lock()

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
PortfolioSettings = Annotated[Settings, Depends(get_settings)]


async def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: PortfolioSettings,
) -> None:
    """Require a valid short-lived owner access token."""
    require_admin_token(credentials, settings)


AdminAccess = Annotated[None, Depends(require_admin)]


async def validate_content_references(
    db: AsyncSession,
    content: PortfolioContentInput,
    current_id: str | None = None,
) -> None:
    existing_slug = await db.scalar(
        select(PortfolioContent.id).where(
            PortfolioContent.slug == content.slug,
            PortfolioContent.id != (current_id or ""),
        )
    )
    if existing_slug:
        raise HTTPException(status_code=409, detail="A content entry already uses this slug.")
    if content.image_id and await db.get(PortfolioImage, content.image_id) is None:
        raise HTTPException(status_code=422, detail="Choose an existing portfolio image.")


def image_read(image: PortfolioImage) -> PortfolioImageRead:
    return PortfolioImageRead(
        id=image.id,
        filename=image.filename,
        content_type=image.content_type,
        alt_text=image.alt_text,
        url=f"/api/v1/portfolio/images/{image.id}",
    )


def content_read(content: PortfolioContent) -> PortfolioContentRead:
    return PortfolioContentRead(
        id=content.id,
        title=content.title,
        slug=content.slug,
        excerpt=content.excerpt,
        body=content.body,
        role=content.role,
        tech_stack=content.tech_stack,
        repository_url=content.repository_url,
        live_url=content.live_url,
        published=content.published,
        featured=content.featured,
        sort_order=content.sort_order,
        image_id=content.image_id,
        image=image_read(content.image) if content.image else None,
    )


@router.post("/admin/login", response_model=AdminSession)
async def login_admin(credentials: AdminLogin, settings: PortfolioSettings) -> AdminSession:
    """Authenticate the single portfolio owner and issue a short-lived token."""
    if not settings.PORTFOLIO_ADMIN_USERNAME or not settings.PORTFOLIO_ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Portfolio owner login is not configured.",
        )
    if not verify_admin_password(credentials.username, credentials.password, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The username or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AdminSession(
        access_token=issue_admin_token(credentials.username, settings),
        expires_in=settings.PORTFOLIO_ACCESS_TOKEN_MINUTES * 60,
    )


@router.get("/admin/session", status_code=status.HTTP_204_NO_CONTENT)
async def verify_admin_session(_: AdminAccess) -> Response:
    """Confirm an owner token is still valid."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


DEFAULT_PROFILE: dict[str, object] = {
    "full_name": "Abdul Muhsin K",
    "headline": "Software Engineer | Python, Django & FastAPI",
    "job_roles": ["Software Engineer", "Python Developer", "AI Engineer"],
    "about_title": "Software that makes work simpler.",
    "about": (
        "I build full-stack applications that turn complex workflows into clear, "
        "reliable products. At Yatnam Technologies, I developed 25+ REST API "
        "endpoints and helped improve response times by 30%. I also streamlined "
        "development with Docker and CI/CD, reducing setup time by 40% and "
        "deployments by 50%. My work spans Python, Django, FastAPI, React, and "
        "applied generative AI."
    ),
    "location": "Dubai, UAE",
    "phone": "+971 55 355 2442",
    "address": "",
    "email": "amkmuhsinzsb@gmail.com",
    "booking_url": "",
    "expertise": [
        "Python & Django",
        "FastAPI & REST APIs",
        "React",
        "PostgreSQL & MySQL",
        "Docker & CI/CD",
        "Generative AI & RAG",
    ],
    "social_links": [
        {
            "label": "LinkedIn",
            "url": "https://linkedin.com/in/muhsin911",
            "icon": "linkedin",
        },
        {
            "label": "GitHub",
            "url": "https://github.com/muhsin911",
            "icon": "github",
        },
    ],
}


@router.get("/profile", response_model=PortfolioProfileInput)
async def get_portfolio_profile(db: DatabaseSession) -> dict[str, object]:
    profile = await db.get(PortfolioProfile, "current")
    return PortfolioProfileInput.model_validate(
        profile.data if profile else DEFAULT_PROFILE
    ).model_dump(mode="json")


@router.put("/profile", response_model=PortfolioProfileInput)
async def update_portfolio_profile(
    profile: PortfolioProfileInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> dict[str, object]:
    record = await db.get(PortfolioProfile, "current")
    data = profile.model_dump(mode="json")
    if record is None:
        record = PortfolioProfile(id="current", data=data)
        db.add(record)
    else:
        record.data = data
    await db.flush()
    return data


@router.get("/experience", response_model=list[ExperienceRead])
async def list_experience(db: DatabaseSession) -> list[PortfolioExperience]:
    result = await db.execute(
        select(PortfolioExperience)
        .where(PortfolioExperience.published.is_(True))
        .order_by(PortfolioExperience.sort_order, PortfolioExperience.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/admin/experience", response_model=list[ExperienceRead])
async def list_all_experience(db: DatabaseSession, _: AdminAccess) -> list[PortfolioExperience]:
    result = await db.execute(
        select(PortfolioExperience).order_by(
            PortfolioExperience.sort_order, PortfolioExperience.created_at.desc()
        )
    )
    return list(result.scalars().all())


@router.post("/experience", response_model=ExperienceRead, status_code=status.HTTP_201_CREATED)
async def create_experience(
    entry: ExperienceInput, db: DatabaseSession, _: AdminAccess
) -> PortfolioExperience:
    record = PortfolioExperience(**entry.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/experience/{entry_id}", response_model=ExperienceRead)
async def update_experience(
    entry_id: str, entry: ExperienceInput, db: DatabaseSession, _: AdminAccess
) -> PortfolioExperience:
    record = await db.get(PortfolioExperience, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Experience entry not found.")
    for key, value in entry.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/experience/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(entry_id: str, db: DatabaseSession, _: AdminAccess) -> Response:
    record = await db.get(PortfolioExperience, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Experience entry not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/skills", response_model=list[SkillRead])
async def list_skills(db: DatabaseSession) -> list[PortfolioSkill]:
    result = await db.execute(
        select(PortfolioSkill)
        .where(PortfolioSkill.published.is_(True))
        .order_by(PortfolioSkill.sort_order, PortfolioSkill.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/admin/skills", response_model=list[SkillRead])
async def list_all_skills(db: DatabaseSession, _: AdminAccess) -> list[PortfolioSkill]:
    result = await db.execute(
        select(PortfolioSkill).order_by(PortfolioSkill.sort_order, PortfolioSkill.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/skills", response_model=SkillRead, status_code=status.HTTP_201_CREATED)
async def create_skill(skill: SkillInput, db: DatabaseSession, _: AdminAccess) -> PortfolioSkill:
    if await db.scalar(select(PortfolioSkill.id).where(PortfolioSkill.name == skill.name)):
        raise HTTPException(status_code=409, detail="A skill with this name already exists.")
    record = PortfolioSkill(**skill.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/skills/{skill_id}", response_model=SkillRead)
async def update_skill(
    skill_id: str, skill: SkillInput, db: DatabaseSession, _: AdminAccess
) -> PortfolioSkill:
    record = await db.get(PortfolioSkill, skill_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Skill not found.")
    if await db.scalar(
        select(PortfolioSkill.id).where(
            PortfolioSkill.name == skill.name, PortfolioSkill.id != skill_id
        )
    ):
        raise HTTPException(status_code=409, detail="A skill with this name already exists.")
    for key, value in skill.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str, db: DatabaseSession, _: AdminAccess) -> Response:
    record = await db.get(PortfolioSkill, skill_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Skill not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def testimonial_read(record: PortfolioTestimonial) -> TestimonialRead:
    return TestimonialRead(
        id=record.id,
        name=record.name,
        designation=record.designation,
        content=record.content,
        image_id=record.image_id,
        sort_order=record.sort_order,
        published=record.published,
        image=image_read(record.image) if record.image else None,
    )


async def _list_testimonials(db: AsyncSession, public: bool) -> list[TestimonialRead]:
    statement = select(PortfolioTestimonial).options(selectinload(PortfolioTestimonial.image))
    if public:
        statement = statement.where(PortfolioTestimonial.published.is_(True))
    result = await db.execute(
        statement.order_by(PortfolioTestimonial.sort_order, PortfolioTestimonial.created_at.desc())
    )
    return [testimonial_read(record) for record in result.scalars().all()]


@router.get("/testimonials", response_model=list[TestimonialRead])
async def list_testimonials(db: DatabaseSession) -> list[TestimonialRead]:
    return await _list_testimonials(db, True)


@router.get("/admin/testimonials", response_model=list[TestimonialRead])
async def list_all_testimonials(db: DatabaseSession, _: AdminAccess) -> list[TestimonialRead]:
    return await _list_testimonials(db, False)


async def validate_testimonial_image(db: AsyncSession, image_id: str | None) -> None:
    if image_id and await db.get(PortfolioImage, image_id) is None:
        raise HTTPException(status_code=422, detail="Choose an existing portfolio image.")


@router.post("/testimonials", response_model=TestimonialRead, status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    entry: TestimonialInput, db: DatabaseSession, _: AdminAccess
) -> TestimonialRead:
    await validate_testimonial_image(db, entry.image_id)
    record = PortfolioTestimonial(**entry.model_dump())
    db.add(record)
    await db.flush()
    if record.image_id:
        record.image = await db.get(PortfolioImage, record.image_id)
    return testimonial_read(record)


@router.put("/testimonials/{entry_id}", response_model=TestimonialRead)
async def update_testimonial(
    entry_id: str, entry: TestimonialInput, db: DatabaseSession, _: AdminAccess
) -> TestimonialRead:
    record = await db.get(PortfolioTestimonial, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Testimonial not found.")
    await validate_testimonial_image(db, entry.image_id)
    for key, value in entry.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    record.image = await db.get(PortfolioImage, record.image_id) if record.image_id else None
    return testimonial_read(record)


@router.delete("/testimonials/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testimonial(entry_id: str, db: DatabaseSession, _: AdminAccess) -> Response:
    record = await db.get(PortfolioTestimonial, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Testimonial not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/faq", response_model=list[FAQRead])
async def list_faqs(db: DatabaseSession) -> list[PortfolioFAQ]:
    result = await db.execute(
        select(PortfolioFAQ)
        .where(PortfolioFAQ.published.is_(True))
        .order_by(PortfolioFAQ.sort_order, PortfolioFAQ.created_at)
    )
    return list(result.scalars().all())


@router.get("/admin/faq", response_model=list[FAQRead])
async def list_all_faqs(db: DatabaseSession, _: AdminAccess) -> list[PortfolioFAQ]:
    result = await db.execute(
        select(PortfolioFAQ).order_by(PortfolioFAQ.sort_order, PortfolioFAQ.created_at)
    )
    return list(result.scalars().all())


@router.post("/faq", response_model=FAQRead, status_code=status.HTTP_201_CREATED)
async def create_faq(entry: FAQInput, db: DatabaseSession, _: AdminAccess) -> PortfolioFAQ:
    record = PortfolioFAQ(**entry.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/faq/{entry_id}", response_model=FAQRead)
async def update_faq(
    entry_id: str, entry: FAQInput, db: DatabaseSession, _: AdminAccess
) -> PortfolioFAQ:
    record = await db.get(PortfolioFAQ, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="FAQ entry not found.")
    for key, value in entry.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/faq/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(entry_id: str, db: DatabaseSession, _: AdminAccess) -> Response:
    record = await db.get(PortfolioFAQ, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="FAQ entry not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def showcase_read(record: PortfolioShowcase) -> ShowcaseRead:
    return ShowcaseRead(
        id=record.id,
        eyebrow=record.eyebrow,
        title=record.title,
        description=record.description,
        image_id=record.image_id,
        action_label=record.action_label,
        action_url=record.action_url,
        sort_order=record.sort_order,
        published=record.published,
        image=image_read(record.image) if record.image else None,
    )


async def _list_showcase(db: AsyncSession, public: bool) -> list[ShowcaseRead]:
    statement = select(PortfolioShowcase).options(selectinload(PortfolioShowcase.image))
    if public:
        statement = statement.where(PortfolioShowcase.published.is_(True))
    result = await db.execute(
        statement.order_by(PortfolioShowcase.sort_order, PortfolioShowcase.created_at)
    )
    return [showcase_read(record) for record in result.scalars().all()]


@router.get("/showcase", response_model=list[ShowcaseRead])
async def list_showcase(db: DatabaseSession) -> list[ShowcaseRead]:
    return await _list_showcase(db, True)


@router.get("/admin/showcase", response_model=list[ShowcaseRead])
async def list_all_showcase(db: DatabaseSession, _: AdminAccess) -> list[ShowcaseRead]:
    return await _list_showcase(db, False)


async def validate_showcase_image(db: AsyncSession, image_id: str | None) -> None:
    if image_id and await db.get(PortfolioImage, image_id) is None:
        raise HTTPException(status_code=422, detail="Choose an existing portfolio image.")


@router.post("/showcase", response_model=ShowcaseRead, status_code=status.HTTP_201_CREATED)
async def create_showcase_slide(
    entry: ShowcaseInput, db: DatabaseSession, _: AdminAccess
) -> ShowcaseRead:
    await validate_showcase_image(db, entry.image_id)
    record = PortfolioShowcase(**entry.model_dump())
    db.add(record)
    await db.flush()
    if record.image_id:
        record.image = await db.get(PortfolioImage, record.image_id)
    return showcase_read(record)


@router.put("/showcase/{entry_id}", response_model=ShowcaseRead)
async def update_showcase_slide(
    entry_id: str, entry: ShowcaseInput, db: DatabaseSession, _: AdminAccess
) -> ShowcaseRead:
    record = await db.get(PortfolioShowcase, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Showcase slide not found.")
    await validate_showcase_image(db, entry.image_id)
    for key, value in entry.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    record.image = await db.get(PortfolioImage, record.image_id) if record.image_id else None
    return showcase_read(record)


@router.delete("/showcase/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_showcase_slide(entry_id: str, db: DatabaseSession, _: AdminAccess) -> Response:
    record = await db.get(PortfolioShowcase, entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Showcase slide not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _send_contact_message(settings: Settings, data: ContactMessage) -> None:
    assert settings.SMTP_HOST and settings.SMTP_FROM_EMAIL and settings.PORTFOLIO_CONTACT_EMAIL
    message = EmailMessage()
    message["Subject"] = f"Portfolio {data.purpose.lower()} inquiry: {data.subject}"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = settings.PORTFOLIO_CONTACT_EMAIL
    message["Reply-To"] = data.email
    message.set_content(
        f"Purpose: {data.purpose}\nFrom: {data.name} <{data.email}>\n\n{data.message}"
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        if settings.SMTP_STARTTLS:
            smtp.starttls(context=ssl.create_default_context())
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
        smtp.send_message(message)


@router.post("/contact", status_code=status.HTTP_202_ACCEPTED)
async def send_contact_message(
    data: ContactMessage, request: Request, settings: PortfolioSettings
) -> dict[str, str]:
    if data.website:
        raise HTTPException(status_code=400, detail="Invalid contact submission.")
    if not all((settings.SMTP_HOST, settings.SMTP_FROM_EMAIL, settings.PORTFOLIO_CONTACT_EMAIL)):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The contact form is not configured yet.",
        )
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", data.email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    async with _contact_lock:
        attempts = [
            timestamp
            for timestamp in _contact_requests.get(client_ip, [])
            if now - timestamp < CONTACT_WINDOW_SECONDS
        ]
        if len(attempts) >= CONTACT_LIMIT:
            raise HTTPException(
                status_code=429, detail="Please wait before sending another message."
            )
        attempts.append(now)
        _contact_requests[client_ip] = attempts
    try:
        await anyio.to_thread.run_sync(_send_contact_message, settings, data)
    except (OSError, smtplib.SMTPException, ssl.SSLError):
        logger.exception("Portfolio contact email could not be delivered.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Your message could not be delivered. Please try again later.",
        ) from None
    return {"message": "Thanks for reaching out. Your message has been sent."}


@router.get("/dsa/categories", response_model=list[DSACategoryRead])
async def list_dsa_categories(db: DatabaseSession) -> list[DSACategory]:
    result = await db.execute(select(DSACategory).order_by(DSACategory.name))
    return list(result.scalars().all())


@router.post(
    "/dsa/categories",
    response_model=DSACategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dsa_category(
    category: DSACategoryInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> DSACategory:
    if await db.scalar(select(DSACategory.id).where(DSACategory.slug == category.slug)):
        raise HTTPException(status_code=409, detail="A DSA category already uses this slug.")
    record = DSACategory(**category.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/dsa/categories/{category_id}", response_model=DSACategoryRead)
async def update_dsa_category(
    category_id: str,
    category: DSACategoryInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> DSACategory:
    record = await db.get(DSACategory, category_id)
    if record is None:
        raise HTTPException(status_code=404, detail="DSA category not found.")
    if await db.scalar(
        select(DSACategory.id).where(
            DSACategory.slug == category.slug,
            DSACategory.id != category_id,
        )
    ):
        raise HTTPException(status_code=409, detail="A DSA category already uses this slug.")
    for key, value in category.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/dsa/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dsa_category(
    category_id: str,
    db: DatabaseSession,
    _: AdminAccess,
) -> Response:
    record = await db.get(DSACategory, category_id)
    if record is None:
        raise HTTPException(status_code=404, detail="DSA category not found.")
    problem_count = await db.scalar(
        select(func.count()).select_from(DSAProblem).where(DSAProblem.category_id == category_id)
    )
    if problem_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Move or remove solved problems in this category before deleting it.",
        )
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/dsa", response_model=list[DSAProblemRead])
async def list_dsa_problems(db: DatabaseSession) -> list[DSAProblem]:
    """Return solved DSA problems in reverse chronological order."""
    result = await db.execute(
        select(DSAProblem).order_by(
            DSAProblem.solved_at.desc().nullslast(),
            DSAProblem.created_at.desc(),
        )
    )
    return list(result.scalars().all())


@router.get("/content", response_model=list[PortfolioContentRead])
async def list_published_content(db: DatabaseSession) -> list[PortfolioContentRead]:
    result = await db.execute(
        select(PortfolioContent)
        .options(selectinload(PortfolioContent.image))
        .where(PortfolioContent.published.is_(True))
        .order_by(PortfolioContent.featured.desc(), PortfolioContent.created_at.desc())
    )
    return [content_read(record) for record in result.scalars().all()]


@router.get("/content/{slug}", response_model=PortfolioContentRead)
async def get_published_content(slug: str, db: DatabaseSession) -> PortfolioContentRead:
    record = await db.scalar(
        select(PortfolioContent)
        .options(selectinload(PortfolioContent.image))
        .where(
            PortfolioContent.slug == slug,
            PortfolioContent.published.is_(True),
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Published portfolio content not found.")
    return content_read(record)


@router.get("/admin/content", response_model=list[PortfolioContentRead])
async def list_all_content(
    db: DatabaseSession,
    _: AdminAccess,
) -> list[PortfolioContentRead]:
    result = await db.execute(
        select(PortfolioContent)
        .options(selectinload(PortfolioContent.image))
        .order_by(PortfolioContent.featured.desc(), PortfolioContent.created_at.desc())
    )
    return [content_read(record) for record in result.scalars().all()]


@router.post("/content", response_model=PortfolioContentRead, status_code=status.HTTP_201_CREATED)
async def create_content(
    content: PortfolioContentInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> PortfolioContentRead:
    await validate_content_references(db, content)
    record = PortfolioContent(**content.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    if record.image_id:
        record.image = await db.get(PortfolioImage, record.image_id)
    return content_read(record)


@router.get("/blog", response_model=list[PortfolioBlogPostRead])
async def list_published_blog_posts(db: DatabaseSession) -> list[PortfolioBlogPost]:
    result = await db.execute(
        select(PortfolioBlogPost)
        .where(PortfolioBlogPost.published.is_(True))
        .order_by(PortfolioBlogPost.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/blog/{slug}", response_model=PortfolioBlogPostRead)
async def get_published_blog_post(slug: str, db: DatabaseSession) -> PortfolioBlogPost:
    post = await db.scalar(
        select(PortfolioBlogPost).where(
            PortfolioBlogPost.slug == slug,
            PortfolioBlogPost.published.is_(True),
        )
    )
    if post is None:
        raise HTTPException(status_code=404, detail="Published blog post not found.")
    return post


@router.get("/admin/blog", response_model=list[PortfolioBlogPostRead])
async def list_all_blog_posts(
    db: DatabaseSession,
    _: AdminAccess,
) -> list[PortfolioBlogPost]:
    result = await db.execute(
        select(PortfolioBlogPost).order_by(PortfolioBlogPost.created_at.desc())
    )
    return list(result.scalars().all())


async def validate_blog_slug(
    db: AsyncSession,
    post: PortfolioBlogPostInput,
    current_id: str | None = None,
) -> None:
    existing_id = await db.scalar(
        select(PortfolioBlogPost.id).where(
            PortfolioBlogPost.slug == post.slug,
            PortfolioBlogPost.id != (current_id or ""),
        )
    )
    if existing_id:
        raise HTTPException(status_code=409, detail="A blog post already uses this slug.")


@router.post(
    "/blog",
    response_model=PortfolioBlogPostRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_blog_post(
    post: PortfolioBlogPostInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> PortfolioBlogPost:
    await validate_blog_slug(db, post)
    record = PortfolioBlogPost(**post.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/blog/{post_id}", response_model=PortfolioBlogPostRead)
async def update_blog_post(
    post_id: str,
    post: PortfolioBlogPostInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> PortfolioBlogPost:
    record = await db.get(PortfolioBlogPost, post_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Blog post not found.")
    await validate_blog_slug(db, post, current_id=post_id)
    for key, value in post.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/blog/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: str,
    db: DatabaseSession,
    _: AdminAccess,
) -> Response:
    record = await db.get(PortfolioBlogPost, post_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Blog post not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/content/{content_id}", response_model=PortfolioContentRead)
async def update_content(
    content_id: str,
    content: PortfolioContentInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> PortfolioContentRead:
    record = await db.get(PortfolioContent, content_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Portfolio content not found.")
    await validate_content_references(db, content, content_id)
    for key, value in content.model_dump().items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    if record.image_id:
        record.image = await db.get(PortfolioImage, record.image_id)
    else:
        record.image = None
    return content_read(record)


@router.delete("/content/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: str,
    db: DatabaseSession,
    _: AdminAccess,
) -> Response:
    record = await db.get(PortfolioContent, content_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Portfolio content not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/images", response_model=PortfolioImageRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    db: DatabaseSession,
    _: AdminAccess,
    image_info: Annotated[PortfolioImageInput, Depends()],
    filename: Annotated[str, Query(min_length=1, max_length=255)],
    content_type: Annotated[str | None, Header(alias="Content-Type")] = None,
) -> PortfolioImageRead:
    if content_type not in IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Use a JPEG, PNG, or WebP image.",
        )
    chunks = bytearray()
    async for chunk in request.stream():
        if len(chunks) + len(chunk) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Images must be 5 MB or smaller.")
        chunks.extend(chunk)
    expected_signature = IMAGE_TYPES[content_type]
    if not chunks.startswith(expected_signature) or (
        content_type == "image/webp" and chunks[8:12] != b"WEBP"
    ):
        raise HTTPException(
            status_code=400, detail="The uploaded file does not match its image type."
        )
    safe_filename = PurePosixPath(filename.replace("\\", "/")).name.strip()
    record = PortfolioImage(
        filename=safe_filename,
        content_type=content_type,
        alt_text=image_info.alt_text,
        content=bytes(chunks),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return image_read(record)


@router.get("/admin/images", response_model=list[PortfolioImageRead])
async def list_images(
    db: DatabaseSession,
    _: AdminAccess,
) -> list[PortfolioImageRead]:
    result = await db.execute(select(PortfolioImage).order_by(PortfolioImage.created_at.desc()))
    return [image_read(image) for image in result.scalars().all()]


@router.get("/images/{image_id}")
async def get_image(image_id: str, db: DatabaseSession) -> Response:
    image = await db.get(PortfolioImage, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Portfolio image not found.")
    return Response(
        content=image.content,
        media_type=image.content_type,
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600"},
    )


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: str,
    db: DatabaseSession,
    _: AdminAccess,
) -> Response:
    image = await db.get(PortfolioImage, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Portfolio image not found.")
    await db.delete(image)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/dsa",
    response_model=DSAProblemRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dsa_problem(
    problem: DSAProblemInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> DSAProblem:
    """Create a solved DSA problem."""
    values = problem.model_dump()
    values["problem_url"] = str(problem.problem_url)
    if await db.get(DSACategory, problem.category_id) is None:
        raise HTTPException(status_code=422, detail="Choose an existing DSA category.")
    record = DSAProblem(**values)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.put("/dsa/{problem_id}", response_model=DSAProblemRead)
async def update_dsa_problem(
    problem_id: str,
    problem: DSAProblemInput,
    db: DatabaseSession,
    _: AdminAccess,
) -> DSAProblem:
    """Replace a solved DSA problem."""
    record = await db.get(DSAProblem, problem_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Solved problem not found.")
    values = problem.model_dump()
    values["problem_url"] = str(problem.problem_url)
    if await db.get(DSACategory, problem.category_id) is None:
        raise HTTPException(status_code=422, detail="Choose an existing DSA category.")
    for key, value in values.items():
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/dsa/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dsa_problem(
    problem_id: str,
    db: DatabaseSession,
    _: AdminAccess,
) -> Response:
    """Delete a solved DSA problem."""
    record = await db.get(DSAProblem, problem_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Solved problem not found.")
    await db.delete(record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/cv/status", response_model=ResumeStatus)
async def get_resume_status(db: DatabaseSession) -> ResumeStatus:
    """Return whether a public resume is available without exposing its contents."""
    resume = await db.get(PortfolioResume, "current")
    if resume is None:
        return ResumeStatus(available=False)
    return ResumeStatus(
        available=True,
        filename=resume.filename,
        updated_at=resume.updated_at,
    )


@router.get("/cv")
async def download_resume(db: DatabaseSession) -> Response:
    """Download the currently published PDF resume."""
    resume = await db.get(PortfolioResume, "current")
    if resume is None:
        raise HTTPException(status_code=404, detail="No resume has been uploaded.")
    filename = quote(resume.filename, safe="")
    return Response(
        content=resume.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.put("/cv", status_code=status.HTTP_204_NO_CONTENT)
async def upload_resume(
    request: Request,
    db: DatabaseSession,
    _: AdminAccess,
    filename: Annotated[str, Query(min_length=1, max_length=255)],
    content_type: Annotated[str | None, Header(alias="Content-Type")] = None,
) -> Response:
    """Replace the resume with a validated PDF saved in PostgreSQL."""
    if content_type is None or content_type.split(";", 1)[0].strip().lower() != "application/pdf":
        raise HTTPException(status_code=415, detail="The resume must be uploaded as a PDF.")

    chunks = bytearray()
    async for chunk in request.stream():
        if len(chunks) + len(chunk) > MAX_RESUME_BYTES:
            raise HTTPException(status_code=413, detail="The PDF must be 10 MB or smaller.")
        chunks.extend(chunk)

    if not chunks.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")

    safe_filename = PurePosixPath(filename.replace("\\", "/")).name.strip()
    if not safe_filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="The resume filename must end in .pdf.")

    resume = await db.get(PortfolioResume, "current")
    if resume is None:
        resume = PortfolioResume(id="current", filename=safe_filename, content=bytes(chunks))
        db.add(resume)
    else:
        resume.filename = safe_filename
        resume.content = bytes(chunks)
        resume.updated_at = datetime.now(UTC)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
