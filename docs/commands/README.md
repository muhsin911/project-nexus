# Git, Docker, and Build Command Reference

Run commands from the repository root unless a section says otherwise. This
guide covers common day-to-day commands, not every command Git or Docker
provides. Use their built-in help for the full command list.

## Docker Compose (this project)

Compose manages this project's frontend, backend, and database together:

```powershell
# Check Docker and Compose are installed and running
docker --version
docker compose version
docker info

# Validate the Compose file and show the resolved configuration
docker compose config

# Build images and start services in the foreground (Ctrl+C stops them)
docker compose up --build

# Build and start in the background
docker compose up --build --detach

# List services and their status
docker compose ps

# Follow logs from every service, or just one service
docker compose logs --follow
docker compose logs --follow backend

# Run a command inside a running service
docker compose exec backend sh
docker compose exec backend alembic current

# Build or rebuild images without starting the services
docker compose build
docker compose build backend

# Stop services but keep their containers
docker compose stop
docker compose stop backend

# Start previously stopped services
docker compose start
docker compose start backend

# Restart services
docker compose restart
docker compose restart backend

# Stop and remove containers and the Compose network; named database data remains
docker compose down

# Also delete named volumes, including the local PostgreSQL database (destructive)
docker compose down --volumes

# Remove stopped containers and unused images, networks, and build cache
docker system prune
```

To start optional infrastructure profiles, add the relevant profile flags to
`docker compose up`, for example:

```powershell
docker compose --profile realtime --profile ai --profile messaging up --build
```

## Docker CLI (individual containers and images)

Use Compose for this repository. These commands are useful when working with
individual Docker resources:

```powershell
# List running containers; include stopped containers with --all
docker ps
docker ps --all

# List local images
docker image ls

# Stop, start, or restart a container by name or ID
docker stop <container>
docker start <container>
docker restart <container>

# View container logs or open a shell in a running container
docker logs --follow <container>
docker exec --interactive --tty <container> sh

# Build an image from the current directory's Dockerfile
docker build --tag <image-name>:<tag> .

# Run a container and publish a host port
docker run --detach --name <container> --publish <host-port>:<container-port> <image-name>:<tag>

# Remove a stopped container or an image
docker rm <container>
docker image rm <image-name>:<tag>

# Inspect networks and volumes
docker network ls
docker volume ls

# Show detailed help
docker --help
docker <command> --help
docker compose --help
```

`docker system prune --all --volumes` and `docker compose down --volumes` can
delete data or resources you still need. Review Docker's prompt and the target
volumes before confirming either cleanup.

## Git (common daily workflow)

Git commands operate on the current repository. Replace placeholders such as
`<branch>` and `<remote-url>` with your own values.

```powershell
# Start a repository or copy an existing one
git init
git clone <remote-url>

# Check changes and repository state
git status
git diff
git diff --staged
git log --oneline --graph --decorate --all

# Stage and commit changes
git add <file>
git add .
git commit -m "Describe the change"

# List, create, and switch branches
git branch
git switch <branch>
git switch --create <new-branch>

# Combine branch changes; fetch first to update remote-tracking branches
git fetch
git merge <branch>
git pull
git push
git push --set-upstream origin <branch>

# Temporarily save work and restore it later
git stash
git stash list
git stash pop

# Undo a published commit by creating a new reversing commit
git revert <commit>

# See configured remotes and repository settings
git remote --verbose
git config --get user.name
git config --get user.email
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Browse all command names, guides, or help for a specific command
git help -a
git help -g
git help <command>
```

Be careful with `git reset`, `git clean`, and force-push options: they can
discard local work or rewrite shared history. Check `git status` and the
command's help before using them.

## Build, run, and check this project

The frontend is a React/TypeScript app; the backend is a Python 3.13 FastAPI
package. Docker Compose builds and runs both together. To work on each part
directly:

```powershell
# Frontend: install dependencies and build/check from the repository root
Set-Location frontend
npm ci
npm run build
npm run lint
npm run typecheck
Set-Location ..
```

To run the frontend development server, start it in its own terminal:

```powershell
Set-Location frontend
npm run dev
```

Install and check the backend from a separate terminal at the repository root:

```powershell
# Backend: create and activate a virtual environment from the repository root
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"

# Backend checks
python -m pytest
python -m ruff check .
python -m mypy app

# Build and run the complete local stack
docker compose up --build
```

For other project types, use the build tool already configured by that
project; common examples are:

```powershell
npm run build            # Node.js projects with a build script
python -m pytest         # Python tests (install the project's test dependencies first)
mvn clean package        # Java with Maven
.\gradlew.bat build      # Java/Kotlin with Gradle on Windows
dotnet build             # .NET
go build ./...           # Go
cargo build --release    # Rust
```
