"""Public portfolio data and protected content-management endpoints."""

from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Annotated
from urllib.parse import quote

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
    PortfolioContent,
    PortfolioImage,
    PortfolioResume,
)
from app.db.session import get_db
from app.schemas.portfolio import (
    AdminLogin,
    AdminSession,
    DSACategoryInput,
    DSACategoryRead,
    DSAProblemInput,
    DSAProblemRead,
    PortfolioContentInput,
    PortfolioContentRead,
    PortfolioImageInput,
    PortfolioImageRead,
    ResumeStatus,
)

router = APIRouter(tags=["Portfolio"])
bearer_scheme = HTTPBearer(auto_error=False)
MAX_RESUME_BYTES = 10 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
}

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
        published=content.published,
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
        .order_by(PortfolioContent.sort_order, PortfolioContent.created_at.desc())
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
        .order_by(PortfolioContent.sort_order, PortfolioContent.created_at.desc())
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
