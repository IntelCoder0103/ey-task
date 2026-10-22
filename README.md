# Atelier: a to-do list edited like a fashion magazine

A full-stack To Do List application. It has a **React + TypeScript web client** and a **Node/Express REST API**.
Users sign in from a magazine-cover landing page. They manage their tasks ("looks") in **The Edit**, where they can
search, filter, reorder by drag-and-drop or keyboard, and open each task as a full article page to view or edit it.

| Cover (sign in)                                            | The Edit (list)                                                                | Look (detail)                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Oversized serif wordmark, sticker, cover lines and barcode | Numbered looks, server-side search, hand-drawn strike-through, progress ledger | Headline copy, a hang-tag spec sheet and a "Finished" stamp |

---

## Quick start (macOS)

```bash
# 1. Node 20+ (skip if `node -v` already prints v20 or newer)
brew install nvm && nvm install 22 && nvm use 22

# 2. Install and run both apps
git clone <this repo> atelier && cd atelier
npm ci
npm run dev            # API → http://127.0.0.1:4000 · Web → http://127.0.0.1:5173
```

Open http://127.0.0.1:5173 and sign in with the **demo account**. The sign-in page has a one-click "Use demo" button.

```
demo@atelier.studio / atelier2026
```

You can also register a new account. Data is saved to `server/data/db.json`, so it survives restarts. Delete that
file to reset to the seeded demo data.

### With Docker instead

```bash
docker compose up --build   # → http://localhost:8080
```

This runs two containers. `web` is nginx serving the built client and proxying `/api` to `api`, the Node server.
Data is kept in a named volume.

## Scripts

Run from the repository root. It's an npm workspace: the root package is the web client, and `server/` is the API.

| Command                                                 | What it does                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                           | API (`tsx watch`) and web (Vite) together. Vite proxies `/api/*` to the API.                                                                     |
| `npm run dev:api` / `npm run dev:web`                   | Run either one on its own                                                                                                                        |
| `npm test`                                              | Vitest workspace (web + server) in watch mode                                                                                                    |
| `npm run test:coverage`                                 | All 127 tests with coverage. CI fails below 85% lines / 80% branches.                                                                            |
| `npm run e2e`                                           | Playwright: builds and starts the real API and the production web build, then runs the smoke test (first run: `npx playwright install chromium`) |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint (strict TS, hooks, no `console`, no TODO/FIXME), `tsc -b` across all projects, Prettier                                                   |
| `npm run build`                                         | Typecheck, web bundle (`dist/`), API bundle (`server/dist/index.js`)                                                                             |

Current numbers: **127 unit, integration and API tests** (35 server, 92 web), about **99% line and 96% branch
coverage**, plus an end-to-end smoke test (sign in → add → reorder → reload → search → detail → finish → sign out).

### Configuration

| Web (build time) | Default                   | Purpose                                 |
| ---------------- | ------------------------- | --------------------------------------- |
| `VITE_API_URL`   | `/api` on the same origin | API base URL when it's hosted elsewhere |
| `VITE_DEMO_HINT` | `true` in development     | Show the demo-account shortcut          |

| API (runtime)       | Default        | Purpose                                                                           |
| ------------------- | -------------- | --------------------------------------------------------------------------------- |
| `PORT`              | `4000`         | HTTP port                                                                         |
| `DATA_FILE`         | `data/db.json` | JSON storage file. Set it empty for in-memory only.                               |
| `SEED_DEMO`         | `true`         | Seed the demo account when the store is empty                                     |
| `CORS_ORIGIN`       | _(none)_       | Comma-separated origins allowed cross-origin (not needed behind the `/api` proxy) |
| `BCRYPT_ROUNDS`     | `10`           | Password hashing cost                                                             |
| `SESSION_TTL_HOURS` | `168`          | Session lifetime                                                                  |

The API validates its environment with zod when it starts. A bad value stops the boot instead of failing later.

---

## REST API

JSON in and out. Authenticated routes need `Authorization: Bearer <token>`.

| Method & path                                         | Success                                         | Errors                                        |
| ----------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `POST /auth/register` `{name, email, password, age?}` | `201 {user, token}`                             | `400` validation, `409` email taken           |
| `POST /auth/login` `{email, password}`                | `200 {user, token}`                             | `400` validation, `401` bad credentials       |
| `POST /auth/logout`                                   | `204` (revokes this token)                      | `401`                                         |
| `GET /users/me`                                       | `200 user`                                      | `401`                                         |
| `GET /tasks?q=&completed=&limit=&skip=`               | `200 {data: Task[], total}` in the user's order | `400` bad query, `401`                        |
| `POST /tasks` `{description}`                         | `201 Task` (appended to the end)                | `400`, `401`                                  |
| `GET /tasks/:id`                                      | `200 Task`                                      | `401`, `404`                                  |
| `PATCH /tasks/:id` `{description?, completed?}`       | `200 Task`                                      | `400` unknown/empty fields, `401`, `404`      |
| `PUT /tasks/order` `{ids: string[]}`                  | `200 {data, total}`                             | `400` if `ids` isn't exactly the user's tasks |
| `DELETE /tasks/:id`                                   | `204` (later positions close the gap)           | `401`, `404`                                  |
| `GET /health`                                         | `200 {status: "ok"}`                            |                                               |

`Task = { id, description, completed, position, createdAt, updatedAt }`. Errors are always `{ error, details? }`,
where `details` lists each field's validation problem. Another user's task returns **404**, not 403, so the API
never confirms that someone else's id exists.

---

## Deployment

### Option A: AWS (distributed, wired into CI)

```
           ┌──────────── CloudFront (global edge) ────────────┐
 browser ──┤  /*      → S3 bucket (static web build)           │
           │  /api/*  → App Runner / ECS Fargate (API image)   │
           └───────────────────────────────────────────────────┘
```

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs lint, typecheck, all tests with coverage, and the e2e test
on every push and pull request. On `main` it also:

1. **Builds and pushes both Docker images** to GitHub Container Registry (`ghcr.io/<repo>/api`, `…/web`).
2. **Deploys the web build** to S3. Hashed assets get `Cache-Control: immutable` and `index.html` gets `no-cache`. Then it
   invalidates CloudFront. Authentication uses GitHub OIDC (`AWS_DEPLOY_ROLE_ARN`), so there are no long-lived keys.

Run the API image on **AWS App Runner** or **ECS Fargate** (health check: `GET /health`, port 4000). Add it as a
second CloudFront origin for `/api/*` so the web app and API share one origin, which means no CORS. If they live on different domains
instead, build the web app with `VITE_API_URL=https://api.example.com` and start the API with
`CORS_ORIGIN=https://app.example.com`.

Repo settings: the secret `AWS_DEPLOY_ROLE_ARN`, and the variables `AWS_BUCKET`, `AWS_REGION`, `AWS_CLOUDFRONT_ID` and
optionally `VITE_API_URL`. The web deploy is skipped until `AWS_BUCKET` is set.

> **Storage note:** the JSON-file store is ideal for one instance with a persistent volume (App Runner with EFS,
> Fly.io volume, a VM). To run several API replicas, replace `store/` with a database adapter (for example Postgres). The
> routes only depend on the `Store` interface, so nothing else changes.

### Option B: Containers anywhere (Fly.io, Cloud Run, Kubernetes)

```bash
docker build -f server/Dockerfile -t atelier-api .
docker build -t atelier-web --build-arg VITE_DEMO_HINT=true .
docker run -d --name api -v atelier-data:/data atelier-api
docker run -d -p 8080:8080 --link api -e API_UPSTREAM=http://api:4000/ atelier-web
```

Both images run as stateless services with health checks: `/health` on the API and `/healthz` on nginx. The API runs as a non-root user,
and the web image's nginx config is templated (`API_UPSTREAM`) so the same image works in every environment.

### Option C: Vercel (web) + any Node host (API)

`vercel --prod` uses [vercel.json](vercel.json) (SPA rewrites and immutable asset caching). Set `VITE_API_URL` to
the deployed API and `CORS_ORIGIN` on the API to the Vercel domain.

---

## Architecture

```
server/src/                         (Express 5 + TypeScript)
  index.ts          boot: config → store → seed → listen → graceful shutdown
  config.ts         zod-validated environment
  app.ts            createApp({ store, … }): helmet, CORS, JSON, routes, 404, error handler
  http/             route() helper (zod-validated input → Reply), requireAuth, HttpError, error handler
  routes/           auth.ts, tasks.ts: thin handlers composed from domain functions
  domain/           pure functions: query/search/paginate, positions, reorder, users, security
  store/            createStore(): immutable state + serialised transitions; file persistence
  seed.ts           demo account

src/                                (React 18 + TypeScript + Vite)
  api/              composable fetch client (auth ∘ json ∘ signal → send → assertOk → zod), typed endpoints, session store
  features/auth     cover sign-in / register pages, route guards, session hooks
  features/tasks    The Edit (list, search, filters, reorder, undo), detail page, TanStack Query hooks, pure model
  hooks/ lib/ ui/   generic hooks (debounce, undo, forms), pure helpers, design-system primitives
```

**Key decisions**

- **The REST API follows standard semantics:** resource URLs, `201`/`204`, `400` with field details, `401`, `404`,
  `409`. Every request part (body, query, params) goes through a zod schema inside the `route()` higher-order function.
  Handlers receive typed input and **return** a reply instead of writing to `res`, which keeps them small and easy to test.
- **The domain logic is pure.** Searching, filtering, pagination, positions, reorder and delete-with-renumber are
  plain functions over arrays, composed with small combinators (`allOf(ownedBy(owner), matches(q), withStatus(c))`).
  Routes only wire them to HTTP.
- **Concurrency is controlled by a serial write queue.** `store.update(transition)` runs every state transition through a
  promise-chain queue: read the current state, compute the next state immutably, persist (temp file + atomic rename),
  then commit. Concurrent requests can't interleave a read-modify-write. If persisting fails, the in-memory state is not
  changed.
- **Security:** bcrypt password hashes, and opaque random session tokens stored only as SHA-256 hashes, so a leaked data
  file doesn't contain usable tokens. Tokens are revocable on logout and expire. Login compares against a decoy hash for unknown emails so response
  timing doesn't reveal which emails exist. helmet headers, a JSON body size limit, and no `x-powered-by`.
- **The client handles async through TanStack Query.** Every mutation (create, edit, toggle, reorder, delete) goes through one
  higher-order `useOptimistic(mutationFn, pureUpdater)` factory. It snapshots every cached list, applies the update
  instantly, rolls back on error and revalidates. The client's pure updaters mirror the server's position rules, so the UI
  and the API agree.
- **Search runs on the server, through a debounce.** Typing updates `?q=` in the URL at once, `useDebouncedValue` waits
  250 ms, and then the query key changes. TanStack cancels the stale request (an `AbortSignal` passes through the HTTP pipeline)
  and keeps the previous results on screen while the new ones load. Task numbers come from `position`, so a task keeps its
  number in search results. Reordering pauses during a search.
- **Undoable deletes:** `useUndoable` hides the task, waits five seconds, then commits the `DELETE`. Undo cancels it,
  and leaving the page flushes any pending deletes.
- **Real full-stack tests.** The web integration tests start the **real Express app** in-process. MSW only bridges
  jsdom's `/api` origin to it, and can inject faults (500s, revoked tokens) for a single test. No logic is mocked.

### Design language

A light, editorial look inspired by printed fashion magazines rather than SaaS dashboards. Paper `#F3EDE3`, ink
`#1B1A17`, one vermilion accent `#D6402B`. Typefaces: _Fraunces_ (variable serif), _Instrument Sans_, _JetBrains Mono_.
Details include paper grain, a double-rule masthead, an issue number counted in weeks since sign-up, a hand-drawn
strike-through, a hang-tag detail card with a punched hole, an ink "Finished" stamp, and undo slips with a burning fuse. The layout is responsive from
phone to desktop. All motion is disabled under `prefers-reduced-motion`.

---

## Assignment summary

### Approach

1. **Contract first.** I designed a small REST API around the UX requirements: user-scoped tasks, server-owned order, and
   search. Then I wrote the server **test-first**: pure domain functions, then the store and its write queue, then the HTTP
   behaviour with supertest. The tests drove the implementation from red to green.
2. **Layered both sides the same way:** pure logic, then an I/O boundary (store / HTTP client), then thin adapters (routes / hooks),
   then presentation. Each layer can be tested without the next.
3. **The client is built on a validated boundary.** Every response is parsed with zod, so contract drift fails loudly.
4. **Tested the real thing.** Client integration tests drive the UI against the real API in-process, and Playwright runs
   the production build against the real server.
5. **Checked the UI in a browser** at desktop and phone widths. That caught and fixed a strike-through rendering bug on wrapped
   lines and drag handles that stayed visible during search.

### Features completed

- **Backend:** register, login, logout (token revocation), profile. Task CRUD with ownership isolation. Search,
  completion filter and pagination. Server-side ordering with atomic reorder. Validation with field-level errors.
  Persistent JSON storage with serialised writes. Health check, security headers, graceful shutdown.
- **Frontend:** sign in and register with client and server validation. Protected routes with redirect-back. Task list with
  create, toggle, delete with undo, optimistic updates and rollback. Debounced server search kept in the URL. Status
  filters. Drag-and-drop, keyboard and button reordering, saved to the server. Task detail with inline editing, status
  toggle, confirmed delete, and previous/next navigation. Loading, empty and error states. Responsive layout.
- **Delivery:** npm workspace, Docker images for both apps, docker-compose, CI (lint, typecheck, coverage, e2e,
  image publishing, S3 + CloudFront deploy), and Vercel config.

### With more time

| Item                                                                            | Estimate |
| ------------------------------------------------------------------------------- | -------- |
| Postgres adapter for the store (with migrations) to allow several API replicas  | ~1 day   |
| Profile page: update name and age, change password, delete account              | ~1 day   |
| Due dates, tags and notes on tasks (API fields + UI)                            | 1–2 days |
| Infinite scroll on the client using the API's `limit`/`skip`                    | ~0.5 day |
| OpenAPI spec generated from the zod schemas, plus a typed client                | ~0.5 day |
| Offline support: service worker and a queue that replays mutations on reconnect | ~2 days  |

### Making it more robust

- **Auth:** httpOnly, `SameSite` cookies instead of bearer tokens in `localStorage`. Rate limiting and lockout on
  login. Refresh tokens and a "sign out everywhere" option.
- **Data:** a real database with transactions and indexes. Optimistic concurrency (`If-Match`/`updatedAt`) so
  concurrent edits on two devices don't silently overwrite each other. Backups.
- **Observability:** structured request logs with request ids (pino), metrics, error tracking with source maps (Sentry), and
  web-vitals reporting.
- **Testing:** contract tests generated from an OpenAPI spec, axe-core accessibility checks and visual regression in
  Playwright, a cross-browser matrix, and load tests on the write queue.
- **Delivery:** preview environments per pull request, a bundle-size budget, Renovate, self-hosted fonts and a strict
  Content-Security-Policy.
