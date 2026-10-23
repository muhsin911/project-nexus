"""Tests for public portfolio content and protected management endpoints."""

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import get_db


@pytest.mark.asyncio
async def test_portfolio_content_can_be_managed_and_read_publicly() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session
            await session.commit()

    test_settings = Settings(_env_file=None, PORTFOLIO_ADMIN_TOKEN="test-secret")
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = lambda: test_settings

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        dsa_url = "/api/v1/portfolio/dsa"
        assert (await client.get(dsa_url)).json() == []
        unauthorized = await client.post(dsa_url, json={})
        assert unauthorized.status_code == 401

        problem_response = await client.post(
            dsa_url,
            headers={"Authorization": "Bearer test-secret"},
            json={
                "title": "Two Sum",
                "platform": "LeetCode",
                "difficulty": "Easy",
                "problem_url": "https://leetcode.com/problems/two-sum/",
                "tags": ["array", "hash-map"],
                "summary": "Track previously seen values in a hash map.",
                "solution": "For each value, look up its complement before inserting it.",
                "time_complexity": "O(n)",
                "space_complexity": "O(n)",
                "solved_at": "2026-10-22",
            },
        )
        assert problem_response.status_code == 201
        problem = problem_response.json()
        assert problem["title"] == "Two Sum"

        public_list = await client.get(dsa_url)
        assert public_list.status_code == 200
        assert public_list.json()[0]["id"] == problem["id"]

        edited_problem = {**problem, "title": "Two Sum — reviewed"}
        update_response = await client.put(
            f"{dsa_url}/{problem['id']}",
            headers={"Authorization": "Bearer test-secret"},
            json=edited_problem,
        )
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Two Sum — reviewed"

        status_url = "/api/v1/portfolio/cv/status"
        assert (await client.get(status_url)).json() == {
            "available": False,
            "filename": None,
            "updated_at": None,
        }
        pdf = b"%PDF-1.7\nportfolio test\n"
        upload = await client.put(
            "/api/v1/portfolio/cv?filename=resume.pdf",
            content=pdf,
            headers={
                "Authorization": "Bearer test-secret",
                "Content-Type": "application/pdf",
            },
        )
        assert upload.status_code == 204
        assert (await client.get(status_url)).json()["available"] is True
        download = await client.get("/api/v1/portfolio/cv")
        assert download.content == pdf
        assert download.headers["content-type"] == "application/pdf"

        invalid_upload = await client.put(
            "/api/v1/portfolio/cv?filename=not-a-pdf.pdf",
            content=b"not a PDF",
            headers={
                "Authorization": "Bearer test-secret",
                "Content-Type": "application/pdf",
            },
        )
        assert invalid_upload.status_code == 400

        deleted = await client.delete(
            f"{dsa_url}/{problem['id']}",
            headers={"Authorization": "Bearer test-secret"},
        )
        assert deleted.status_code == 204
        assert (await client.get(dsa_url)).json() == []

    await engine.dispose()
