"""Public portfolio data and protected content-management endpoints."""

import secrets
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.models.portfolio import DSAProblem, PortfolioResume
from app.db.session import get_db
from app.schemas.portfolio import DSAProblemInput, DSAProblemRead, ResumeStatus

router = APIRouter(tags=["Portfolio"])
bearer_scheme = HTTPBearer(auto_error=False)
MAX_RESUME_BYTES = 10 * 1024 * 1024

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
PortfolioSettings = Annotated[Settings, Depends(get_settings)]


async def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: PortfolioSettings,
) -> None:
    """Require the private owner token for portfolio write operations."""
    if not settings.PORTFOLIO_ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Portfolio management is not configured.",
        )
    if credentials is None or not secrets.compare_digest(
        credentials.credentials, settings.PORTFOLIO_ADMIN_TOKEN
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid portfolio admin token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )


AdminAccess = Annotated[None, Depends(require_admin)]


@router.post("/admin/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_admin_token(_: AdminAccess) -> Response:
    """Check an admin token before opening the management interface."""
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
