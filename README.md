# Project NEXUS

An interactive 3D portfolio and AI career assistant.

## Local development with Docker

Install Docker Desktop, then from the repository root run:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The first build can take several minutes. When the services are ready:

- Frontend: <http://localhost:5174>
- Backend API docs: <http://localhost:8001/docs>
- Backend health check: <http://localhost:8001/api/v1/health/live>
- ChromaDB: <http://localhost:8000>
- RabbitMQ management: <http://localhost:15672>

Compose starts the React/Vite frontend, FastAPI backend, Postgres/PostGIS, and
Redis. The backend waits for its database and Redis health checks, runs the
database migrations, then starts the API. Source files are mounted for
development reloads.

The default backend image installs only the API's core dependencies. The AI
modules use large machine-learning dependencies, so set `INSTALL_AI=true` in
`.env` and run `docker compose --profile ai up --build` if you want those
packages and ChromaDB locally. RabbitMQ is available with the `messaging`
profile. These optional services add substantial download and storage
requirements and are not needed for the portfolio/API health checks.

The host ports are configurable in `.env`; see [.env.example](./.env.example).
The Vite URLs in `VITE_API_BASE_URL` and `VITE_WEBSOCKET_URL` are browser-facing,
so they must use `localhost` when you open the site on your computer. Containers
use Compose service names to reach one another.

Stop the services with `Ctrl+C` or `docker compose down`. The database and
infrastructure data are stored in named Docker volumes and remain after stopping
the services. Do not use `docker compose down --volumes` unless you intend to
permanently remove that local data.

## Free-tier deployment

The suggested starter setup is a Render static site for the frontend, a Render
Docker web service for the backend, Neon for PostgreSQL, and Upstash for Redis.
Free plans, quotas, and provider setup screens can change. This guide prepares
the project for hosting; it does not create provider accounts or deploy anything.

1. Create a PostgreSQL database on Neon. From its connection details, copy the
   host, port, database name, username, and password into the backend variables
   listed below. Set `POSTGRES_SSL=true`; do not paste the entire connection URL
   into a password field.
2. Create a Redis database on Upstash. Use its Redis connection details (not a
   REST URL). Copy its host, port, username if provided (commonly `default`),
   and password. Set `REDIS_USE_TLS=true`.
3. In Render, create a **Web Service** from this repository using the Docker
   runtime, the repository root as the root directory, and `./Dockerfile` as
   the Dockerfile path. Add the backend environment variables below. Set
   `ENVIRONMENT=production`, `DEBUG=false`, and a unique, private `SECRET_KEY`.
   The Docker image runs database migrations and listens on Render's `PORT`.
   Set the service health-check path to `/api/v1/health/live`.
4. In Render, create a **Static Site** from the same repository. Set the root
   directory to `frontend`, the build command to `npm ci && npm run build`, and
   the publish directory to `dist`. Add the build-time variable
   `VITE_WEBSOCKET_URL` with the backend's secure WebSocket address:
   `wss://<your-backend-name>.onrender.com/ws`.
5. Copy the static site's HTTPS origin (for example,
   `https://<your-site-name>.onrender.com`) into the backend's
   `FRONTEND_ORIGIN` variable, then redeploy the backend. It must be the site
   origin only, without a path or trailing slash.
6. Open the static site and test it. The backend's liveness endpoint is
   `https://<your-backend-name>.onrender.com/api/v1/health/live`.

Backend environment variables to add in Render:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_SERVER
POSTGRES_PORT
POSTGRES_DB
POSTGRES_SSL=true
REDIS_HOST
REDIS_PORT
REDIS_USERNAME (if your provider supplies one)
REDIS_PASSWORD
REDIS_USE_TLS=true
SECRET_KEY (generate a strong private value; do not reuse the example)
ENVIRONMENT=production
DEBUG=false
FRONTEND_ORIGIN
```

The free backend may sleep when idle, so its first request or WebSocket
connection can take extra time while it starts. PostgreSQL and Redis are
required for the backend to start. Keep credentials in the hosting provider's
private environment settings, never in Git or frontend variables.

## Portfolio images

Put public images such as a profile photo or project screenshots in
`frontend/public/images/` and reference them from the site as
`/images/your-image.webp`. Images in this directory are included in the public
website; do not put private files or secrets here.

## Project layout

- `frontend/` — React, TypeScript, Vite, and the 3D portfolio
- `app/` — FastAPI backend, database, WebSocket, and AI modules
- `alembic/` — database migration history
- `tests/` — backend tests; `frontend/tests/` contains browser tests
- `docker-compose.yml` — local development stack