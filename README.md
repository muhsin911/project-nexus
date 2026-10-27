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

Free plans, quotas, and provider setup screens can change. The following
frontend-first setup deploys the self-contained portfolio before adding the
backend and database.

### Phase 1: Cloudflare Pages frontend

1. Connect this GitHub repository to Cloudflare Pages. Choose the `main`
   production branch, set the root directory to `frontend`, the build command
   to `npm ci && npm run build`, and the build output directory to `dist`.
2. Set these **build-time** variables in Pages:

   ```text
   VITE_STATIC_DEPLOYMENT=true
   VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/<your-form-id>
   ```

   Static mode uses the résumé, project, experience, skills, education, and
   certification data bundled with the frontend; it does not call the
   localhost API. Blog, DSA, and management routes are hidden until the backend
   is connected. The `frontend/public/_redirects` file enables SPA routing.
3. Create a Formspree form, set its allowed domain to the deployed site, and
   place its endpoint URL in `VITE_FORMSPREE_ENDPOINT`. This is a public form
   endpoint, not a secret key. Until it is configured, the form will direct
   visitors to email you instead of showing a false success.
4. Trigger a new Pages deployment after changing build variables. Verify the
   résumé download, social/contact links, project image, and contact form.

### Phase 2: backend and database, when ready

1. Create a PostgreSQL database on Neon. Copy its host, port, database name,
   username, and password into the backend variables below and set
   `POSTGRES_SSL=true`.
2. Create a Render **Web Service** from this repository using the Docker
   runtime, the repository root, and `./Dockerfile`. Set
   `ENVIRONMENT=production`, `DEBUG=false`, a strong private `SECRET_KEY`, and
   private `PORTFOLIO_ADMIN_USERNAME` and `PORTFOLIO_ADMIN_PASSWORD` values.
   Set the health-check path to `/api/v1/health/live`.
3. Set the Cloudflare Pages build variable `VITE_STATIC_DEPLOYMENT=false` and
   set `VITE_API_BASE_URL` to the backend origin, for example
   `https://<your-backend-name>.onrender.com` (do not append `/api/v1`).
   Set the backend's `FRONTEND_ORIGIN` to the Pages HTTPS origin only, without
   a path or trailing slash, then redeploy both services.
4. Verify the public portfolio, `/blog`, `/dsa`, and `/manage`.

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
The accessibility-toolbar screenshot used by the static portfolio is bundled
at `frontend/public/images/accessibility-toolbar.png` and receives a dark teal
overlay to match the site palette.
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
