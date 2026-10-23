# Project NEXUS

A personal portfolio with a public DSA log and a private content manager for
publishing a résumé and solved problems.

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
Database migrations run before the API starts. Redis, ChromaDB, and RabbitMQ
are not required for the portfolio; optional services and the AI dependency
group are available for the separate agent features.

The owner-only management interface is at `/manage`; it is not linked in the
public navigation. Sign-in issues a short-lived access token, and every
management endpoint verifies it. Stories, images, résumé files, DSA categories,
and solved problems are stored in PostgreSQL. Only published stories and
problem entries are public. Images are limited to JPEG, PNG, and WebP up to
5 MB; résumé PDFs are limited to 10 MB.

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

Put public images such as a profile photo or project screenshots in
`frontend/public/images/` and reference them from the site as
`/images/your-image.webp`. Images in this directory are public; do not put
private files or secrets here.

## Project layout

- `frontend/` — React, TypeScript, and Vite portfolio
- `app/` — FastAPI backend and database models
- `alembic/` — database migration history
- `tests/` — backend tests; `frontend/tests/` contains browser tests
- `docker-compose.yml` — local development stack
