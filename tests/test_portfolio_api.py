"""Tests for authenticated portfolio CMS and public content endpoints."""

from collections.abc import AsyncIterator
from email.message import EmailMessage

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
async def test_owner_auth_cms_dsa_categories_images_and_resume(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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

    test_settings = Settings(
        _env_file=None,
        PORTFOLIO_ADMIN_USERNAME="owner",
        PORTFOLIO_ADMIN_PASSWORD="test-password",
        SECRET_KEY="test-secret-key-that-is-long-enough-for-auth",
    )
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = lambda: test_settings

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        base = "/api/v1/portfolio"
        assert (await client.get(f"{base}/dsa")).json() == []
        assert (await client.get(f"{base}/content")).json() == []
        assert (await client.post(f"{base}/dsa/categories", json={})).status_code == 401
        assert (
            await client.post(
                f"{base}/admin/login",
                json={"username": "owner", "password": "incorrect"},
            )
        ).status_code == 401

        login = await client.post(
            f"{base}/admin/login",
            json={"username": "owner", "password": "test-password"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert (await client.get(f"{base}/admin/session", headers=headers)).status_code == 204
        assert (
            await client.get(f"{base}/admin/session", headers={"Authorization": "Bearer invalid"})
        ).status_code == 401
        assert (await client.get(f"{base}/profile")).json()["full_name"] == "Your Name"
        profile_update = await client.put(
            f"{base}/profile",
            headers=headers,
            json={
                "full_name": "Alex Engineer",
                "headline": "Product Engineer",
                "job_roles": ["Engineer", "Designer"],
                "about_title": "About Alex",
                "about": "A concise introduction.",
                "location": "Remote",
                "email": "alex@example.com",
                "expertise": ["Product engineering"],
                "social_links": [
                    {"label": "GitHub", "url": "https://github.com/alex", "icon": "github"}
                ],
            },
        )
        assert profile_update.status_code == 200
        assert (await client.get(f"{base}/profile")).json()["social_links"][0]["label"] == "GitHub"
        assert (
            await client.put(f"{base}/profile", json={"full_name": "Unauthorized"})
        ).status_code == 401

        experience_response = await client.post(
            f"{base}/experience",
            headers=headers,
            json={
                "company": "NEXUS",
                "designation": "Software Engineer",
                "description": "Built useful software.",
                "year": "2024 — Present",
                "sort_order": 1,
                "published": True,
            },
        )
        assert experience_response.status_code == 201
        experience_id = experience_response.json()["id"]
        assert (await client.get(f"{base}/experience")).json()[0]["company"] == "NEXUS"
        experience_update = await client.put(
            f"{base}/experience/{experience_id}",
            headers=headers,
            json={
                "company": "NEXUS Labs",
                "designation": "Lead Engineer",
                "description": "Updated role.",
                "year": "2024 — Present",
                "sort_order": 0,
                "published": False,
            },
        )
        assert experience_update.status_code == 200
        assert (await client.get(f"{base}/experience")).json() == []

        skill_response = await client.post(
            f"{base}/skills",
            headers=headers,
            json={"name": "TypeScript", "icon": "typescript", "group": "Frontend"},
        )
        assert skill_response.status_code == 201
        skill_id = skill_response.json()["id"]
        assert (await client.get(f"{base}/skills")).json()[0]["icon"] == "typescript"
        assert (
            await client.put(
                f"{base}/skills/{skill_id}",
                headers=headers,
                json={"name": "TypeScript", "icon": "ts", "group": "Language", "published": False},
            )
        ).status_code == 200
        assert (await client.get(f"{base}/skills")).json() == []

        assert (
            await client.post(
                f"{base}/contact",
                json={
                    "name": "Visitor",
                    "email": "visitor@example.com",
                    "subject": "Hello",
                    "message": "A message to the portfolio owner.",
                    "website": "",
                },
            )
        ).status_code == 503
        assert (
            await client.post(
                f"{base}/contact",
                json={
                    "name": "Spam bot",
                    "email": "bot@example.com",
                    "subject": "Hello",
                    "message": "A message to the portfolio owner.",
                    "website": "filled by bot",
                },
            )
        ).status_code == 400

        sent_messages: list[EmailMessage] = []

        class FakeSMTP:
            def __init__(self, host: str, port: int, timeout: int) -> None:
                assert host == "smtp.example.com"
                assert port == 587
                assert timeout == 10

            def __enter__(self) -> "FakeSMTP":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def starttls(self, context: object) -> None:
                assert context is not None

            def send_message(self, message: EmailMessage) -> None:
                sent_messages.append(message)

        monkeypatch.setattr("app.api.v1.endpoints.portfolio.smtplib.SMTP", FakeSMTP)
        test_settings.SMTP_HOST = "smtp.example.com"
        test_settings.SMTP_FROM_EMAIL = "portfolio@example.com"
        test_settings.PORTFOLIO_CONTACT_EMAIL = "owner@example.com"
        delivered = await client.post(
            f"{base}/contact",
            json={
                "name": "Visitor",
                "email": "visitor@example.com",
                "subject": "Hello",
                "message": "A message to the portfolio owner.",
            },
        )
        assert delivered.status_code == 202
        assert len(sent_messages) == 1
        assert sent_messages[0]["To"] == "owner@example.com"
        assert sent_messages[0]["Reply-To"] == "visitor@example.com"

        category_response = await client.post(
            f"{base}/dsa/categories",
            headers=headers,
            json={
                "name": "Hash Tables",
                "slug": "hash-tables",
                "description": "Hash maps and sets.",
            },
        )
        assert category_response.status_code == 201
        category = category_response.json()
        category_update = await client.put(
            f"{base}/dsa/categories/{category['id']}",
            headers=headers,
            json={
                "name": "Hash Tables & Sets",
                "slug": "hash-tables-sets",
                "description": "Hash-based data structures.",
            },
        )
        assert category_update.status_code == 200
        assert category_update.json()["slug"] == "hash-tables-sets"

        problem_response = await client.post(
            f"{base}/dsa",
            headers=headers,
            json={
                "title": "Two Sum",
                "category_id": category["id"],
                "platform": "LeetCode",
                "difficulty": "Easy",
                "problem_url": "https://leetcode.com/problems/two-sum/",
                "tags": ["array", "hash-map"],
                "summary": "Track previously seen values in a hash map.",
                "solution": "Find each complement before inserting the current value.",
                "time_complexity": "O(n)",
                "space_complexity": "O(n)",
                "solved_at": "2026-10-22",
            },
        )
        assert problem_response.status_code == 201
        problem = problem_response.json()
        assert problem["category_id"] == category["id"]
        assert (await client.get(f"{base}/dsa/categories")).json()[0]["slug"] == "hash-tables-sets"
        problem_update = await client.put(
            f"{base}/dsa/{problem['id']}",
            headers=headers,
            json={
                **problem,
                "solution": "Check the matching complement in the hash map first.",
            },
        )
        assert problem_update.status_code == 200
        assert "matching complement" in problem_update.json()["solution"]

        image = await client.post(
            f"{base}/images?filename=cover.png&alt_text=Portfolio%20cover",
            headers={**headers, "Content-Type": "image/png"},
            content=b"\x89PNG\r\n\x1a\nportfolio image bytes",
        )
        assert image.status_code == 201
        image_data = image.json()

        content_response = await client.post(
            f"{base}/content",
            headers=headers,
            json={
                "title": "A project story",
                "slug": "project-story",
                "excerpt": "A short introduction.",
                "body": "Longer project notes.",
                "role": "Full-stack application",
                "tech_stack": ["React", "FastAPI"],
                "repository_url": "https://github.com/example/project",
                "live_url": "https://example.com",
                "published": True,
                "sort_order": 1,
                "image_id": image_data["id"],
            },
        )
        assert content_response.status_code == 201
        content = content_response.json()
        assert content["image"]["url"] == f"/api/v1/portfolio/images/{image_data['id']}"
        assert content["tech_stack"] == ["React", "FastAPI"]
        assert (await client.get(f"{base}/content")).json()[0]["slug"] == "project-story"
        assert (await client.get(f"{base}/images/{image_data['id']}")).content.startswith(
            b"\x89PNG"
        )
        content_update = await client.put(
            f"{base}/content/{content['id']}",
            headers=headers,
            json={**content, "title": "Updated project story", "image": None},
        )
        assert content_update.status_code == 200
        assert content_update.json()["title"] == "Updated project story"

        draft = await client.post(
            f"{base}/content",
            headers=headers,
            json={
                "title": "Private draft",
                "slug": "private-draft",
                "excerpt": "Not public.",
                "body": "Draft notes.",
                "published": False,
            },
        )
        assert draft.status_code == 201
        assert (await client.get(f"{base}/content/private-draft")).status_code == 404
        assert len((await client.get(f"{base}/admin/content", headers=headers)).json()) == 2

        testimonial = await client.post(
            f"{base}/testimonials",
            headers=headers,
            json={
                "name": "Sam Colleague",
                "designation": "Product Lead",
                "content": "A thoughtful collaborator.",
                "image_id": image_data["id"],
            },
        )
        assert testimonial.status_code == 201
        testimonial_id = testimonial.json()["id"]
        assert (await client.get(f"{base}/testimonials")).json()[0]["image"]["id"] == image_data[
            "id"
        ]

        category_in_use = await client.delete(
            f"{base}/dsa/categories/{category['id']}",
            headers=headers,
        )
        assert category_in_use.status_code == 409

        status_url = f"{base}/cv/status"
        assert (await client.get(status_url)).json()["available"] is False
        pdf = b"%PDF-1.7\nportfolio test\n"
        upload = await client.put(
            f"{base}/cv?filename=resume.pdf",
            content=pdf,
            headers={**headers, "Content-Type": "application/pdf"},
        )
        assert upload.status_code == 204
        assert (await client.get(f"{base}/cv")).content == pdf

        assert (
            await client.delete(f"{base}/dsa/{problem['id']}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"{base}/dsa/categories/{category['id']}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"{base}/images/{image_data['id']}", headers=headers)
        ).status_code == 204
        assert (await client.get(f"{base}/testimonials")).json()[0]["image_id"] is None
        assert (
            await client.delete(f"{base}/testimonials/{testimonial_id}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"{base}/experience/{experience_id}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"{base}/skills/{skill_id}", headers=headers)
        ).status_code == 204
        detached_content = await client.get(f"{base}/content/project-story")
        assert detached_content.status_code == 200
        assert detached_content.json()["image_id"] is None
        assert (
            await client.delete(f"{base}/content/{content['id']}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"{base}/content/{draft.json()['id']}", headers=headers)
        ).status_code == 204
        invalid_image = await client.post(
            f"{base}/images?filename=bad.png&alt_text=Bad",
            headers={**headers, "Content-Type": "image/png"},
            content=b"not a png",
        )
        assert invalid_image.status_code == 400

    await engine.dispose()
