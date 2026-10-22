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