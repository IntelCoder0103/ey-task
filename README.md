# Atelier: a to-do list edited like a fashion magazine

Atelier is the web client for the **To Do List** engineering challenge. Users sign in from a magazine-cover landing page. They manage their tasks ("looks") in **The Edit**, reorder them by drag-and-drop or keyboard, and open each one as a full article page. It covers the whole CRUD surface of the [todolist API](https://documenter.getpostman.com/view/8858534/SW7dX7JG?version=latest).

| Cover (sign in)                                            | The Edit (list)                                            | Look (detail)                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Oversized serif wordmark, sticker, cover lines and barcode | Numbered looks, hand-drawn strike-through, progress ledger | Headline copy, a hang-tag spec sheet and a "Finished" stamp |

---

## Quick start (macOS)

```bash
# 1. Node 20+ (skip if `node -v` already prints v20 or newer)
brew install nvm && nvm install 22 && nvm use 22

# 2. Install and run
git clone <this repo> atelier && cd atelier
npm ci
npm run dev            # → http://localhost:5173
```

Sign in with the **demo account** (the sign-in page has a one-click "Use demo" button):

```
demo@atelier.studio / atelier2026
```

You can also register a new account from the cover page.

### Which backend?

The Postman collection never defines `{{url}}`. Its historical host (`api-nodejs-todolist.herokuapp.com`) went offline when Heroku ended its free tier, so the client is backend-agnostic:

| `VITE_API_URL`                 | Behaviour                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| _unset_ (default)              | A built-in **MSW** service worker serves a contract-accurate in-browser API. Data lives in `localStorage`, so it survives reloads. |
| `https://your-api.example.com` | Every request goes to that host. Any server implementing the Postman contract works.                                               |

```bash
cp .env.example .env.local   # then set VITE_API_URL=…
```

The mock follows the documented contract: the routes, the `Bearer` auth, the `{ user, token }`, `{ count, data }` and `{ success, data }` envelopes, `?completed`, `?limit` and `?skip`, and the original server's validation messages such as `Unable to login` and `Invalid updates!`. That way the UI exercises the same code paths it would against the real server.

## Scripts

| Command                                                 | What it does                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`                                           | Vite dev server with HMR                                                                          |
| `npm test`                                              | Vitest in watch mode                                                                              |
| `npm run test:coverage`                                 | Full unit and integration suite, with coverage thresholds enforced (85% lines)                    |
| `npm run e2e`                                           | Playwright smoke test against the production build (first run: `npx playwright install chromium`) |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint (strict TS, hooks, no `console`, no TODO/FIXME), `tsc`, Prettier                           |
| `npm run build` / `npm run preview`                     | Production bundle in `dist/`, served locally                                                      |

Current numbers: **89 unit and integration tests**, about **99% line and 95% branch coverage**, and an end-to-end smoke test (sign in → add → reorder → detail → finish → sign out).

---

## Deployment

The app builds to a static bundle (`dist/`), so the natural production shape is **object storage plus a global CDN**. Every request is served from an edge location near the user, and there are no servers to scale.

### Option A: AWS S3 + CloudFront (wired into CI)

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs lint, typecheck, unit tests with coverage, and the Playwright e2e test on every push and pull request. On `main` it also deploys:

1. Builds with `VITE_API_URL` taken from the repo variables.
2. Syncs `dist/assets/*` to S3 with `Cache-Control: immutable` (file names are content-hashed), and the entry files with `no-cache`.
3. Invalidates `index.html` on CloudFront so new releases go live at once.

One-time setup:

```bash
aws s3 mb s3://atelier-web
# CloudFront distribution with the bucket as an Origin Access Control origin and
# a custom error response 403/404 → /index.html (200) for client-side routing.
```

Then add these to the GitHub repo: the secret `AWS_DEPLOY_ROLE_ARN` (an OIDC role, so no long-lived keys), and the variables `AWS_BUCKET`, `AWS_REGION`, `AWS_CLOUDFRONT_ID` and optionally `VITE_API_URL`. The deploy job is skipped until `AWS_BUCKET` is set.

### Option B: Vercel / Netlify / Cloudflare Pages (zero config)

```bash
npm i -g vercel && vercel --prod        # uses vercel.json (SPA rewrites + immutable asset caching)
```

Set `VITE_API_URL` in the project's environment variables to target a real API.

### Option C: Container (Kubernetes, ECS, Cloud Run, Fly.io)

```bash
docker build -t atelier --build-arg VITE_API_URL=https://your-api.example.com .
docker run -p 8080:8080 atelier          # → http://localhost:8080
```

This is a multi-stage build: Node builds the bundle, then a small `nginx:alpine` image serves it. The image includes SPA fallback, long-lived caching for hashed assets, gzip, security headers, and a `/healthz` endpoint for liveness and readiness probes. Running it behind a load balancer with several replicas, or on Cloud Run across regions, needs no shared state.

---

## Architecture

```
src/
  api/        http.ts      composable fetch client: base URL ∘ auth ∘ JSON ∘ assertOk ∘ zod parse
              client.ts    typed endpoint functions (authApi, tasksApi)
              schemas.ts   zod schemas: runtime validation at the trust boundary
              session.ts   token store (observable, persisted) consumed via useSyncExternalStore
  lib/        pure helpers: pipe/pipeAsync, ordering (reconcile/applyOrder/move), validation rules, formatting
  hooks/      useForm, usePersistentState, useUndoable (deferred, cancellable side effects)
  features/
    auth/     sign-in/register cover pages, route guards, session hooks
    tasks/    list, row, composer, filters, detail page, TanStack Query hooks, pure model
    studio/   authenticated layout (masthead + colophon)
  mocks/      MSW handlers + in-memory db shared by the browser demo and the test suite
  ui/         small design-system primitives (Button, Field, ErrorPanel, PageLoader)
```

Key decisions:

- **Async is handled with high-level abstractions.** TanStack Query owns all server state: caching, deduplication, background refetch, and retry limited to transient (network or 5xx) errors. Every mutation goes through one higher-order `useOptimistic(mutationFn, updater)` factory. It snapshots the cache, applies a _pure_ updater (`updaters.add`, `updaters.patch`, `updaters.remove`), rolls back on error, and revalidates when it settles. The UI responds instantly and stays correct when the server disagrees.
- **Undoable deletes are a deferred effect, not a fake.** `useUndoable` hides the task, waits five seconds, then commits the `DELETE`. Undo cancels the timer, and leaving the page flushes anything still pending. The API has no "undelete", so this is the only honest way to offer undo.
- **Ordering lives on the client.** The API has no position field, so the user's order is a list of ids saved per user. Pure functions merge it with server data: `reconcile` drops deleted ids and appends new ones, and `applyOrder` and `move` are immutable. Moves work in filtered views because they act on the full order.
- **The style is functional and declarative.** The HTTP pipeline is composed with `pipe` and `pipeAsync`. Validation is built from small rule functions (`validate({ email: [required('Email'), isEmail] })`). Tallies use `reduce`, and filters are a predicate map. There are no classes, no `any`, and no mutation of shared data.
- **Data is validated at the boundary.** Every response is parsed with zod, so a contract break becomes a friendly "unexpected response" error instead of `undefined` errors deep in the UI. Any 401 on an authenticated request ends the session globally.
- **Accessibility.** Drag-and-drop works with pointer _and_ keyboard (dnd-kit: Space to lift, arrows to move). Explicit ↑ and ↓ buttons are also provided, and every control has a descriptive label. The page has an `aria-live` undo region, visible focus rings, AA-contrast text tokens, and support for `prefers-reduced-motion`.

### Design language

The goal was a light, editorial look, closer to a printed fashion magazine than to a SaaS dashboard. It avoids gradient-blob palettes and rounded-card layouts.

- **Palette:** paper `#F3EDE3`, ink `#1B1A17`, a single vermilion accent `#D6402B` used sparingly, and olive for finished numbers.
- **Type:** _Fraunces_ (variable serif, with the soft and "wonky" italic axes) for display, _Instrument Sans_ for UI text, _JetBrains Mono_ for small-caps metadata.
- **Details:** paper-grain noise, double-rule masthead, issue number counted in weeks since sign-up, a hand-drawn strike-through that draws across wrapped lines, a hang-tag with a punched hole, an ink "Finished" stamp, and undo slips with a burning fuse.

---

## Assignment summary

### Approach

1. Read the Postman contract and found that its host is offline. I made the base URL configurable and built an MSW mock that follows the contract, so the app and the tests run the same code paths a real backend would.
2. **Test-driven** for the core: the pure helpers (`order`, `fp`, `format`, `validation`, `model`) and the HTTP client were written test-first. Integration tests then render the real route tree against the MSW server and drive it as a user would, with Testing Library and user-event.
3. Layered the app as pure domain logic → typed API → query hooks → presentational components. Each layer can be tested without the next.
4. Designed the UI last, around the editorial concept, and checked it in a real browser at desktop and phone widths.

### Features completed

- Sign in, register (with client and server validation), sign out, persistent session, and automatic logout on 401
- Protected routes with redirect back to the page the user came from
- Task list with create, toggle complete and delete (with five-second undo), optimistic updates and rollback on error
- Reordering by drag-and-drop, keyboard, or ↑ ↓ buttons, saved per user
- Filters (Everything / In progress / Finished) stored in the URL (`?view=open`) with live counts and a progress ledger
- Task detail page: edit the copy inline (Enter to save, Esc to cancel), toggle status, two-step delete, previous and next navigation in the user's order, and a 404 "Out of print" state
- Loading, empty and error states throughout, and a responsive layout checked at desktop and phone widths
- CI pipeline, Docker image, Vercel config and an S3 + CloudFront deploy job

### With more time

| Item                                                                                           | Estimate  |
| ---------------------------------------------------------------------------------------------- | --------- |
| Profile page: update name and age, upload and delete avatar (`/user/me`, `/user/me/avatar`)    | ~1 day    |
| Server-side pagination or infinite scroll with `?limit&skip` for large lists                   | ~0.5 day  |
| Due dates, tags and notes. These need API fields; client-side storage is possible meanwhile.   | 1–2 days  |
| Offline support: a service worker caches the shell, and a queue replays mutations on reconnect | ~2 days   |
| Small backend implementing the contract (Node/Express + Mongo), deployed alongside             | ~1–2 days |
| i18n and locale-aware date formatting                                                          | ~0.5 day  |

### Making it more robust

- **Testing:** visual regression snapshots with Playwright, accessibility checks with axe-core in e2e, a cross-browser matrix (WebKit and Firefox), and contract tests against a live API with Pact to catch drift from the Postman spec.
- **Security:** move the token from `localStorage` to an httpOnly cookie, with backend support, to reduce exposure to XSS. Add a strict Content-Security-Policy header at the CDN.
- **Observability:** Sentry (or a similar tool) for error tracking with source maps, web-vitals reporting, and a user-friendly error boundary per route.
- **Data:** sync the user's order across devices once the API supports a position field, resolve concurrent edits using `updatedAt`, and handle the session expiring while there are unsaved edits.
- **Delivery:** preview deployments per pull request, a bundle-size budget in CI, Dependabot or Renovate, and self-hosted fonts so the app has no third-party runtime dependency.
