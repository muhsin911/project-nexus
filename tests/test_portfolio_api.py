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
from app.db.models.portfolio import PortfolioContent, PortfolioProfile
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
        initial_profile = (await client.get(f"{base}/profile")).json()
        assert initial_profile["full_name"] == "Abdul Muhsin K"
        assert initial_profile["about_title"] == "Software that makes work simpler."
        assert initial_profile["about"] == (
            "I build full-stack applications that turn complex workflows into clear, "
            "reliable products. At Yatnam Technologies, I developed 25+ REST API "
            "endpoints and helped improve response times by 30%. I also streamlined "
            "development with Docker and CI/CD, reducing setup time by 40% and "
            "deployments by 50%. My work spans Python, Django, FastAPI, React, and "
            "applied generative AI."
        )
        assert initial_profile["phone"] == "+971 55 355 2442"
        assert initial_profile["email"] == "amkmuhsinzsb@gmail.com"
        assert {link["label"] for link in initial_profile["social_links"]} == {"LinkedIn", "GitHub"}
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
                "phone": "+1 555 010 0123",
                "address": "Remote, Earth",
                "email": "alex@example.com",
                "booking_url": "https://cal.com/alex",
                "expertise": ["Product engineering"],
                "social_links": [
                    {"label": "GitHub", "url": "https://github.com/alex", "icon": "github"}
                ],
            },
        )
        assert profile_update.status_code == 200
        assert (await client.get(f"{base}/profile")).json()["social_links"][0]["label"] == "GitHub"
        assert (await client.get(f"{base}/profile")).json()["phone"] == "+1 555 010 0123"
        async with session_factory() as session:
            stored_profile = await session.get(PortfolioProfile, "current")
            assert stored_profile is not None
            stored_profile.data = {
                key: value
                for key, value in stored_profile.data.items()
                if key not in {"phone", "address", "booking_url"}
            }
            await session.commit()
        legacy_profile = (await client.get(f"{base}/profile")).json()
        assert legacy_profile["phone"] == ""
        assert legacy_profile["address"] == ""
        assert legacy_profile["booking_url"] == ""
        assert (
            await client.put(
                f"{base}/profile",
                headers=headers,
                json={
                    **legacy_profile,
                    "phone": "+1 555 010 0123",
                    "address": "Remote, Earth",
                    "booking_url": "https://cal.com/alex",
                },
            )
        ).status_code == 200
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
                "purpose": "Interview",
                "message": "A message to the portfolio owner.",
            },
        )
        assert delivered.status_code == 202
        assert len(sent_messages) == 1
        assert sent_messages[0]["To"] == "owner@example.com"
        assert sent_messages[0]["Reply-To"] == "visitor@example.com"
        assert sent_messages[0]["Subject"] == "Portfolio interview inquiry: Hello"
        assert "Purpose: Interview" in sent_messages[0].get_content()

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

        faq_response = await client.post(
            f"{base}/faq",
            headers=headers,
            json={"question": "How can we work together?", "answer": "Send a message."},
        )
        assert faq_response.status_code == 201
        faq_id = faq_response.json()["id"]
        assert (await client.get(f"{base}/faq")).json()[0][
            "question"
        ] == "How can we work together?"
        hidden_faq = await client.put(
            f"{base}/faq/{faq_id}",
            headers=headers,
            json={
                "question": "How can we work together?",
                "answer": "Send a message.",
                "published": False,
            },
        )
        assert hidden_faq.status_code == 200
        assert (await client.get(f"{base}/faq")).json() == []
        assert (await client.get(f"{base}/admin/faq", headers=headers)).json()[0]["id"] == faq_id
        assert (await client.get(f"{base}/admin/faq")).status_code == 401

        showcase_response = await client.post(
            f"{base}/showcase",
            headers=headers,
            json={
                "eyebrow": "FEATURED",
                "title": "A highlight",
                "description": "A short story.",
                "image_id": image_data["id"],
                "action_label": "See more",
                "action_url": "/#work",
            },
        )
        assert showcase_response.status_code == 201
        showcase_id = showcase_response.json()["id"]
        assert showcase_response.json()["image"]["id"] == image_data["id"]
        assert (await client.get(f"{base}/showcase")).json()[0]["title"] == "A highlight"
        assert (
            await client.post(
                f"{base}/showcase",
                headers=headers,
                json={
                    "title": "Unsafe link",
                    "description": "Should be rejected.",
                    "action_url": "//example.com",
                },
            )
        ).status_code == 422
        assert (
            await client.post(
                f"{base}/showcase",
                headers=headers,
                json={
                    "title": "Missing image",
                    "description": "Should be rejected.",
                    "image_id": "missing-image",
                },
            )
        ).status_code == 422
        assert (await client.get(f"{base}/admin/showcase")).status_code == 401
        showcase_update = await client.put(
            f"{base}/showcase/{showcase_id}",
            headers=headers,
            json={
                "eyebrow": "UPDATED",
                "title": "Updated highlight",
                "description": "An updated story.",
                "image_id": image_data["id"],
                "action_label": "Open",
                "action_url": "https://example.com",
                "published": False,
            },
        )
        assert showcase_update.status_code == 200
        assert (await client.get(f"{base}/showcase")).json() == []
        assert (await client.get(f"{base}/admin/showcase", headers=headers)).json()[0][
            "title"
        ] == "Updated highlight"

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
        assert (await client.get(f"{base}/admin/showcase", headers=headers)).json()[0][
            "image_id"
        ] is None
        assert (
            await client.delete(f"{base}/showcase/{showcase_id}", headers=headers)
        ).status_code == 204
        assert (await client.delete(f"{base}/faq/{faq_id}", headers=headers)).status_code == 204
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


@pytest.mark.asyncio
async def test_blog_cms_sanitizes_html_and_orders_featured_projects() -> None:
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

    settings = Settings(
        _env_file=None,
        PORTFOLIO_ADMIN_USERNAME="owner",
        PORTFOLIO_ADMIN_PASSWORD="test-password",
        SECRET_KEY="test-secret-key-that-is-long-enough-for-auth",
    )
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = lambda: settings

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        base = "/api/v1/portfolio"
        assert (await client.get(f"{base}/blog")).json() == []
        assert (await client.post(f"{base}/blog", json={})).status_code == 401
        assert (await client.get(f"{base}/admin/blog")).status_code == 401
        login = await client.post(
            f"{base}/admin/login",
            json={"username": "owner", "password": "test-password"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        article = await client.post(
            f"{base}/blog",
            headers=headers,
            json={
                "title": "Safe HTML",
                "slug": "safe-html",
                "excerpt": "A test post.",
                "body_html": (
                    '<h2 onclick="run()">A note</h2><script>alert(1)</script>'
                    '<p><a href="javascript:alert(1)">safe link</a></p>'
                    '<img src="https://example.com/image.png" alt="Diagram" onerror="run()">'
                ),
                "published": True,
            },
        )
        assert article.status_code == 201
        safe_body = article.json()["body_html"]
        assert "<script" not in safe_body
        assert "onclick" not in safe_body and "onerror" not in safe_body
        assert "javascript:" not in safe_body
        assert '<img src="https://example.com/image.png" alt="Diagram">' in safe_body
        assert (await client.get(f"{base}/blog/safe-html")).json()["id"] == article.json()["id"]

        draft = await client.post(
            f"{base}/blog",
            headers=headers,
            json={
                "title": "Draft",
                "slug": "draft",
                "excerpt": "Not public.",
                "body_html": "<p>Private draft.</p>",
            },
        )
        assert draft.status_code == 201
        assert (await client.get(f"{base}/blog/draft")).status_code == 404
        assert len((await client.get(f"{base}/admin/blog", headers=headers)).json()) == 2
        duplicate_slug = await client.post(
            f"{base}/blog",
            headers=headers,
            json={
                "title": "Duplicate",
                "slug": "safe-html",
                "excerpt": "Duplicate slug.",
                "body_html": "<p>Duplicate.</p>",
            },
        )
        assert duplicate_slug.status_code == 409
        hidden_article = await client.put(
            f"{base}/blog/{article.json()['id']}",
            headers=headers,
            json={
                "title": "Safe HTML",
                "slug": "safe-html",
                "excerpt": "A test post.",
                "body_html": "<p>Updated.</p>",
                "published": False,
            },
        )
        assert hidden_article.status_code == 200
        assert (await client.get(f"{base}/blog/safe-html")).status_code == 404
        restored_article = await client.put(
            f"{base}/blog/{article.json()['id']}",
            headers=headers,
            json={
                "title": "Safe HTML",
                "slug": "safe-html",
                "excerpt": "A test post.",
                "body_html": "<p>Updated.</p>",
                "published": True,
            },
        )
        assert restored_article.status_code == 200
        assert (await client.get(f"{base}/blog/safe-html")).status_code == 200
        assert (
            await client.delete(f"{base}/blog/{article.json()['id']}", headers=headers)
        ).status_code == 204
        assert (await client.get(f"{base}/blog/safe-html")).status_code == 404

        async with session_factory() as session:
            session.add_all(
                [
                    PortfolioContent(
                        title="Older",
                        slug="older-project",
                        excerpt="An older project.",
                        body="Project details.",
                        featured=False,
                        published=True,
                        sort_order=0,
                    ),
                    PortfolioContent(
                        title="Newer",
                        slug="newer-project",
                        excerpt="A newer project.",
                        body="Project details.",
                        featured=False,
                        published=True,
                        sort_order=100,
                    ),
                    PortfolioContent(
                        title="Featured",
                        slug="featured-project",
                        excerpt="A featured project.",
                        body="Project details.",
                        featured=True,
                        published=True,
                        sort_order=10000,
                    ),
                ]
            )
            await session.commit()
        projects = (await client.get(f"{base}/content")).json()
        assert [project["title"] for project in projects] == ["Featured", "Newer", "Older"]
        assert projects[0]["featured"] is True

    await engine.dispose()
