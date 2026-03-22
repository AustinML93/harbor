# Contributing to Harbor

Thanks for your interest in contributing. Harbor is a community tool — built for homelabbers, by homelabbers.

---

## Before You Start

- Check the [open issues](../../issues) to avoid duplicating work.
- For larger features or breaking changes, open an issue first to discuss the approach.
- Read `ARCHITECTURE.md` to understand the system design and `CLAUDE.md` for code conventions.

---

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- A running Docker daemon (for container management features)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set up environment
cp ../.env.example .env
# Edit .env — set SECRET_KEY and PASSWORD_HASH

# Generate a password hash for local dev
python -c "from app.core.security import get_password_hash; print(get_password_hash('dev'))"

uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/api/docs` once running.

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to `localhost:8000` automatically.

### Full stack with Docker Compose

```bash
cp .env.example .env        # Edit with your values
cp services.example.yml services.yml
docker compose up -d
# Open http://localhost:3000
```

---

## Making Changes

### Branching

Use descriptive branch names:
- `feat/container-log-streaming`
- `fix/ws-reconnect-on-token-expiry`
- `chore/upgrade-fastapi`

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add container resource usage graphs
fix: prevent duplicate WS connections on hot reload
chore: bump python-jose to 3.4.0
docs: add webhook notification setup guide
```

### Python code style

- Format with **black** (`pip install black && black .`)
- Lint with **ruff** (`pip install ruff && ruff check .`)
- Type-check with **mypy** (`pip install mypy && mypy app/`)
- Follow the conventions in `CLAUDE.md` — thin route handlers, logic in service classes, no business logic in routes.

### TypeScript code style

- Format with **Prettier** (`npm run format`)
- Lint with **ESLint** (`npm run lint`)
- No `any` types without a comment explaining why.
- All component props defined as an `interface Props`.

---

## Testing

### Backend tests

```bash
cd backend
pip install pytest pytest-anyio httpx
pytest
```

- Unit tests go in `backend/tests/`.
- Use real SQLite (`:memory:`) for DB tests — don't mock the database.
- Mock Docker SDK calls in tests since contributors may not have a daemon running.

### Frontend tests

```bash
cd frontend
npm test
```

---

## Pull Requests

1. Keep PRs focused — one feature or fix per PR.
2. Update `BUILD_PLAN.md` checkboxes if your PR completes a task.
3. Add or update tests for changed behaviour.
4. Screenshots are appreciated for UI changes.
5. The PR description should explain *why*, not just *what* — the diff shows what changed.

### PR title format

Follow the same Conventional Commits style as commit messages:
```
feat: add dark/light theme toggle with localStorage persistence
fix: handle Docker socket permission error gracefully
```

---

## Reporting Bugs

Open an issue with:
- Harbor version (or commit hash)
- Host OS and Docker version
- Steps to reproduce
- Expected vs actual behaviour
- Logs if relevant (`docker compose logs backend`)

---

## Feature Requests

Open an issue tagged `enhancement`. Include:
- The use case (what are you trying to do?)
- Why existing functionality doesn't cover it
- Any implementation ideas you have

Check the **Deferred / Future Phases** section in `BUILD_PLAN.md` first — some features are already on the roadmap.

---

## Code of Conduct

Be kind. We're all here because we enjoy building things. Treat everyone with respect regardless of experience level, background, or homelab setup. Issues and PRs that are dismissive or hostile will be closed.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
