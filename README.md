# Project NEXUS

A personal portfolio with an authenticated content manager for profile details,
featured projects, experience, education, certifications, categorized skills,
blog articles, a résumé, and categorized DSA solutions.

## Local development with Docker

Install Docker Desktop, then from the repository root run:

```powershell
Copy-Item .env.example .env
```

Set `PORTFOLIO_ADMIN_USERNAME` and a strong `PORTFOLIO_ADMIN_PASSWORD` in
`.env` before starting the services.

Then start the portfolio:

```powershell
docker compose up --build
```

- Portfolio: <http://localhost:5174>
- Private content manager: <http://localhost:5174/manage>
- Backend health check: <http://localhost:8001/api/v1/health/live>
- Backend API docs: <http://localhost:8001/docs>

Compose starts the React/Vite frontend, FastAPI backend, and PostgreSQL.
Database migrations run before the API starts. Redis, ChromaDB, RabbitMQ, and
the job-scraper/AI modules are deferred and are not part of the active portfolio,
blog, or DSA API. Existing job rows are preserved in the
`deferred_job_scraper_data` table rather than removed.

The owner-only management interface is at `/manage`; sign-in issues a
short-lived access token, and every management endpoint verifies it. Profile
information, featured projects, experience, education, certifications, skills,
blog articles, images, résumé files, DSA categories, and solved problems are
stored in PostgreSQL. These sections can be managed dynamically in the content
studio. Draft entries remain private. Project lists prioritize featured work,
then newer projects; the public portfolio initially shows three projects and
offers a load-more button. Images are limited to JPEG, PNG, and WebP up to 5 MB;
résumé PDFs are limited to 10 MB.

The public `/blog` page lists published articles, with individual pages at
`/blog/<slug>`. Owners can write and publish articles in the **Blog** tab in
`/manage` using HTML. The backend sanitizes HTML on save: it preserves common
article formatting, images, and safe links while dropping scripts, embedded
content, event handlers, and unsafe URL schemes.

The site uses a restrained animated background and a cursor-responsive floating
desktop model. Skill categories form a mouse- and touch-draggable horizontal
carousel. The large About-section portrait at
`frontend/public/images/profile.webp` was copied from the original portfolio;
replace that file to use a newer photo.

The decorative desktop model is "Gaming Desktop PC" by Yolala1232, used under
CC BY 4.0. See `frontend/public/models/desktop_pc/license.txt` for the required
attribution and license details.

The content studio also edits public contact details (including the optional
phone number, address, email, and booking URL). The portfolio presents the
phone as a `tel:` link. Visitors can also use the contact form and select
Freelance, Interview, Consultation, or Other as the inquiry purpose. To deliver
contact messages, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
`SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `PORTFOLIO_CONTACT_EMAIL`. STARTTLS is
enabled by default and can be disabled with `SMTP_STARTTLS=false` only when the
mail server expects a non-TLS connection. Without SMTP settings, the contact
form reports that email delivery is unavailable; it does not pretend that
messages were sent.

The latest editable résumé is `CV/Abdul_Muhsin_K_Software_Engineer_CV.docx`;
its matching PDF is served from the public portfolio and stored in the CMS.

Stop the services with `Ctrl+C` or `docker compose down`. The database is kept
in a named Docker volume. Do not use `docker compose down --volumes` unless you
intend to permanently remove that local data.

## Free-tier deployment

The suggested starter setup is a Render static site for the frontend and a
Render Docker web service with Neon PostgreSQL for the backend. Free plans,
quotas, and provider setup screens can change. This guide prepares the project
for hosting; it does not create provider accounts or deploy anything.

1. Create a PostgreSQL database on Neon. Copy its host, port, database name,
   username, and password into the backend variables below and set
   `POSTGRES_SSL=true`.
2. Create a Render **Web Service** from this repository using the Docker
   runtime, the repository root, and `./Dockerfile`. Set
   `ENVIRONMENT=production`, `DEBUG=false`, a strong private `SECRET_KEY`, and
   private `PORTFOLIO_ADMIN_USERNAME` and `PORTFOLIO_ADMIN_PASSWORD` values.
   Set the health-check path to `/api/v1/health/live`.
3. Create a Render **Static Site** from the same repository. Set root
   directory to `frontend`, build command to `npm ci && npm run build`, and
   publish directory to `dist`. Add the build-time variable
   `VITE_API_BASE_URL` with the backend origin, for example
   `https://<your-backend-name>.onrender.com` (do not append `/api/v1`).
4. Configure a rewrite on the static site from `/*` to `/index.html` with
   status `200`, so direct visits and refreshes on `/manage` load the SPA.
5. Set the backend's `FRONTEND_ORIGIN` to the static site's HTTPS origin only,
   without a path or trailing slash. Redeploy the backend and test both the
   public portfolio and `/manage`.

Backend environment variables:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_SERVER
POSTGRES_PORT
POSTGRES_DB
POSTGRES_SSL=true
SECRET_KEY
PORTFOLIO_ADMIN_USERNAME
PORTFOLIO_ADMIN_PASSWORD
PORTFOLIO_ACCESS_TOKEN_MINUTES=60
SMTP_HOST
SMTP_PORT=587
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_EMAIL
PORTFOLIO_CONTACT_EMAIL
SMTP_STARTTLS=true
ENVIRONMENT=production
DEBUG=false
FRONTEND_ORIGIN
```

Redis and the separate AI/agent features are optional and are not needed by
the public portfolio or content manager. A free backend may sleep when idle,
so its first request can take extra time while it starts. Keep database
credentials and the owner password in the hosting provider's private
environment settings, never in Git or frontend build variables.

## Portfolio images

Put your portrait in `frontend/public/images/` as `profile.webp`; it appears
beside your name in the introduction. For CV project screenshots, prepare
landscape images such as `atb-accessibility-toolbar.webp` and
`production-tracking-platform.webp`, then upload them in `/manage` → Images and
select them while editing each project. These become the project covers; their
3D nodes link to the work section. Use JPEG, PNG, or WebP, up to 5 MB. Images
in `frontend/public/` are public; do not put private files or secrets there.
The interactive desktop computer is based on the model provided in
`Sample Project Ideas/reactjs18-3d-portfolio-main` and is bundled in
`frontend/public/models/desktop_pc/`. Its MIT license is included alongside
the model.

The selected Software Engineer CV is available at
`frontend/public/cv/Software_Engineer_CV_Abdul_Muhsin_K.pdf` as the default
download. Upload a replacement from `/manage` to publish a newer PDF through
the content manager.

## Project layout

- `frontend/` — React, TypeScript, and Vite portfolio
- `app/` — FastAPI backend and database models
- `alembic/` — database migration history
- `tests/` — backend tests; `frontend/tests/` contains browser tests
- `docker-compose.yml` — local development stack
