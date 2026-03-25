# Company Culture Research Assistant

Evidence-driven employer research: multi-query search, page extraction, theme clustering, and **OpenAI-compatible** (or **mock**) summarization—with **citations**, **confidence**, and explicit **fact vs. opinion** framing.

**Screenshots:** add assets under `docs/screenshots/` (see `docs/screenshots/README.md`).

## Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.11+** (3.12+ recommended)

## One-time setup (copy-paste)

From the **repository root** (`CompanyScraper/`):

```bash
# Frontend dependencies
cd frontend && npm install && cd ..

# Backend venv + dependencies
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..

# Frontend env (API URL must match where uvicorn listens)
cd frontend && cp .env.example .env.local && cd ..
```

Or use the root helper (same steps, Unix/macOS):

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Run locally (two processes)

You need **both** the API (port **8000**) and Next.js (port **3000**).

### Option A — two terminals (works everywhere)

**Terminal 1 — API**

```bash
cd backend
source .venv/bin/activate
# Windows: .venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — web**

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**. The UI calls **http://127.0.0.1:8000** by default (`frontend/.env.example`).

### Option B — single command (macOS / Linux)

Requires a prior backend venv at `backend/.venv` (see one-time setup):

```bash
npm install
npm run dev
```

If `backend/.venv` is missing, use Option A or run `npm run install:all` first.

### Verify the API

```bash
curl -s http://127.0.0.1:8000/health | jq
```

Expect `status`, `version`, and `environment`.

### UI without the API

On **Report**, use **Sample report** to load `public/mock-research-response.json` (no backend required).

## Architecture

| Layer | Stack |
|--------|--------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2 async |
| DB | PostgreSQL or SQLite (`DATABASE_URL`) |
| Search | SerpAPI, Google CSE, or **mock** (no keys) |
| LLM | OpenAI-compatible API or **mock** (no keys) |

**Database:** SQLAlchemy is used on the backend (not Prisma). Postgres/Supabase works via `DATABASE_URL`.

## API contract

- `GET /health` → `{ status, version, environment }`
- `POST /research` → `ResearchResponse` (JSON). Body: `{ "company_name": "...", "force_refresh": false }`
- `GET /research/history/recent?limit=20` → array of history items
- `GET /research/{URL-encoded-name}` → cached report if fresh

**Errors:** JSON `{ "detail": "...", "code": "..." }` (422 may include `errors` for validation).

**CORS:** Set `CORS_ORIGINS` (comma-separated). Optional `CORS_ORIGIN_REGEX` for preview URLs. `allow_credentials` is **false** (cookie-less API).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CORS_ORIGINS`, `CORS_ORIGIN_REGEX` | Browser access to API |
| `ENVIRONMENT`, `API_VERSION` | Health payload |
| `SEARCH_PROVIDER` | Default **`serpapi`** (needs `SERPAPI_API_KEY`); else falls back to mock. Also: `google_cse`, explicit `mock` |
| `LLM_PROVIDER` | `mock` / `openai_compatible` |
| `OPENAI_*`, `SERPAPI_*`, `GOOGLE_*` | Live providers |
| `DATABASE_URL` | SQLite or `postgresql+asyncpg://...` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend → API (no trailing slash) |

Full lists: `backend/.env.example`, `frontend/.env.example`.

## Optional: PostgreSQL

```bash
docker compose up -d
```

Set in `backend/.env`:

`DATABASE_URL=postgresql+asyncpg://culture:culture@localhost:5432/culture`

Tables are created on startup (`create_all`). Use Alembic for production migrations.

## Deploy on Render

This repo now includes a root `render.yaml` Blueprint for:

- `companyscrape-api` as a Python web service
- `companyscrape-web` as a Node/Next.js web service
- `companyscrape-db` as a Render Postgres database

### What the Blueprint configures

- The backend runs with `uvicorn` on `0.0.0.0:$PORT`, matching Render's web-service requirement.
- The frontend is built from `frontend/` and started with `next start --hostname 0.0.0.0 --port $PORT`.
- `NEXT_PUBLIC_API_BASE_URL` is set from the backend service's `RENDER_EXTERNAL_URL`.
- `CORS_ORIGINS` is set from the frontend service's `RENDER_EXTERNAL_URL`.
- `DATABASE_URL` is set from the managed Postgres connection string.
- The app normalizes Render's `postgresql://...` connection string to `postgresql+asyncpg://...` automatically.
- The first deploy works without third-party API keys. Search falls back to fixture data if no live search key is set, and the LLM remains in `mock` mode until you switch `LLM_PROVIDER`.

### Deploy steps

1. In Render, create a new **Blueprint** and point it at this repository.
2. Keep the generated service names or change them consistently in `render.yaml`.
3. During setup, provide any optional secrets you want to enable:
   - `OPENAI_API_KEY`
   - `SERPAPI_API_KEY`
   - `GOOGLE_API_KEY`
   - `GOOGLE_CSE_ID`
4. If you want live OpenAI summaries, set `LLM_PROVIDER=openai_compatible` on the API service.
5. Deploy the Blueprint.
6. Open the `companyscrape-web` URL after both services finish deploying.

### Notes

- If you add a custom domain to the frontend later, update `CORS_ORIGINS` on the API service to include that domain too.
- Free instances are fine for initial deployment, but they can sleep and are not ideal for production traffic.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Repository layout

```
CompanyScraper/
├── package.json            # optional: npm run dev (concurrently)
├── docker-compose.yml
├── backend/                # FastAPI app
├── frontend/               # Next.js app
└── docs/screenshots/
```

## Assumptions

1. **Live search:** `SEARCH_PROVIDER=serpapi` (default) + `SERPAPI_API_KEY` in `backend/.env`. If the key is missing or `SEARCH_PROVIDER=mock`, search uses **fixture URLs** (same “Example Corp”-style hits for every company).
2. **Full mock mode** (`SEARCH_PROVIDER=mock`, `LLM_PROVIDER=mock`) runs with **no API keys** and SQLite.
3. Citation indices in the report are **1-based** and align with `evidence_snippets` order.
4. Many sites block automated fetches; the pipeline supports **partial success** and snippet-only fallbacks.

---

Use compliant with each site’s terms and `robots.txt`; this tool is for research assistance, not bulk scraping.
