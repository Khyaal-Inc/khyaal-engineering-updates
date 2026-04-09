# Tech Stack — Khyaal Engineering Pulse

> **Version**: 1.0
> **Date**: 2026-04-09
> **Author**: Gautam (Engineering Lead)
> **Status**: Current

This document is the authoritative inventory of every technology in the stack — what it is, why it was chosen, and what version is pinned (or intentionally unpinned). It is a companion to [`ARCHITECTURE_DECISION_RECORD.md`](./ARCHITECTURE_DECISION_RECORD.md).

---

## 1. Frontend

| Technology | Version | Source | Role |
|-----------|---------|--------|------|
| **Vanilla JavaScript** | ES6+ (no transpilation) | Inline `<script>` | All application logic — views, state, CMS, keyboard shortcuts |
| **Tailwind CSS** | Latest (unpinned) | `cdn.tailwindcss.com` | Utility-first styling |
| **Custom CSS** (`styles.css`) | N/A | Local file | Design tokens (CSS vars), glass morphism, stage/status colors, responsive overrides |
| **Mermaid.js** | 10.8.0 | `cdn.jsdelivr.net/npm/mermaid@10.8.0` | Dependency map diagrams, workflow visualisations |
| **Google Charts** | Latest (unpinned) | `gstatic.com/charts/loader.js` | Velocity charts, burndown, analytics views |
| **Inter font** | Variable (300–700) | `fonts.googleapis.com` | Primary typeface across all views |

### Frontend module map

| File | Lines of concern |
|------|-----------------|
| `core.js` | Constants, helpers, `switchView()`, keyboard shortcuts (13 bindings) |
| `app.js` | `UPDATE_DATA` global, `renderDashboard()`, `normalizeData()` |
| `workflow-nav.js` | Unified Strategic Ribbon, `WORKFLOW_STAGES`, view-to-stage mapping |
| `modes.js` | PM/Dev/Exec persona filtering, `Alt+1/2/3` switching |
| `views.js` | All 19 primary view renderers, `renderItem()`, grooming mode |
| `cms.js` | Edit modal, GitHub sync, ceremony engine, audit records, CRUD |
| `lifecycle-guide.js` | Quick actions, gateway checks, toasts, sprint HUD, cadence nudge |
| `styles.css` | ~47KB CSS — design tokens, glass morphism, responsive breakpoints |

### Tailwind pinning note

The CDN URL `cdn.tailwindcss.com` resolves to the latest v3.x build. This is intentionally unpinned today for simplicity but carries a risk of breaking changes on major version bumps. **Recommended maintenance action**: pin to `https://cdn.tailwindcss.com/3.4.1` when stabilising for production.

---

## 2. Backend / API

| Technology | Details | Role |
|-----------|---------|------|
| **AWS Lambda** | Node.js 20.x runtime | Auth gatekeeper + GitHub API proxy |
| **Lambda region** | `ap-south-1` (Mumbai) | Closest to primary user base (India) |
| **Lambda URL** | Hardcoded as `LAMBDA_URL` constant in `index.html` | Updated after each `deploy_auth.sh` run |
| **Deploy script** | `deploy_auth.sh` | One-shot Lambda deploy; updates env vars |
| **GitHub REST API** | v3 (`api.github.com`) | Read/write `data.json` via Lambda proxy |

### Lambda function: `auth_gatekeeper.js`

Responsibilities:
1. **Auth gate** — validates SHA-256 hash of submitted password against `EXPECTED_PASSWORD_HASH` env var; returns JWT on success
2. **Read proxy** — `GET /repos/{owner}/{repo}/contents/data.json` via `GITHUB_TOKEN`
3. **Write proxy** — `PUT /repos/{owner}/{repo}/contents/data.json` with commit message and SHA

Environment variables (set in AWS Console → Lambda → Configuration):

| Variable | Value | Notes |
|----------|-------|-------|
| `GITHUB_TOKEN` | GitHub PAT (classic) | `repo` scope; used for all data reads/writes |
| `EXPECTED_PASSWORD_HASH` | SHA-256 hex of app password | Generated locally; never stored in code |

---

## 3. Data Layer

### Current state

| Aspect | Detail |
|--------|--------|
| **Store** | `data.json` — single JSON file committed to the GitHub repo |
| **Schema** | `UPDATE_DATA` object: `{ items[], epics[], sprints[], okrs[], releases[], ceremonyAudit[], tracks[] }` |
| **Read path** | Lambda → GitHub REST API → `UPDATE_DATA` global in browser memory |
| **Write path** | CMS modal → `cms.js` → Lambda `PUT` → GitHub commit on `data.json` |
| **Conflict model** | Last-write-wins. No merge, no locking. One editor at a time. |
| **Normalisation** | `normalizeData()` in `app.js` — adds missing fields with defaults; strips unknown fields |

### Planned state (multi-project)

| Aspect | Detail |
|--------|--------|
| **Store** | Per-project `data-{projectId}.json` files on GitHub |
| **Routing** | Lambda accepts `?projectId=` param; resolves correct file |
| **Entity scoping** | All entities gain `projectId` field; `normalizeData()` scopes reads to active project |
| **Migration** | One-time script adds `projectId: 'default'` to all existing entities in current `data.json` |

### Data schema (abridged)

```json
{
  "items":        [{ "id", "title", "type", "status", "priority", "track", "epicId", "sprintId", "projectId" }],
  "epics":        [{ "id", "title", "status", "track", "okrId", "projectId" }],
  "sprints":      [{ "id", "name", "status", "startDate", "endDate", "velocity", "projectId" }],
  "okrs":         [{ "id", "objective", "keyResults[]", "progress", "projectId" }],
  "releases":     [{ "id", "version", "status", "items[]", "projectId" }],
  "ceremonyAudit":[{ "id", "type", "entityId", "timestamp", "data", "projectId" }],
  "tracks":       [{ "id", "name", "color", "projectId" }]
}
```

---

## 4. Hosting & Delivery

| Layer | Technology | Details |
|-------|-----------|---------|
| **Static host** | GitHub Pages | Auto-deploys from `main` branch on every push |
| **CDN** | Fastly (via GitHub Pages) | Global edge caching; no configuration required |
| **Domain** | `khyaal-inc.github.io/khyaal-engineering-updates` | Default GitHub Pages domain; no custom domain today |
| **HTTPS** | Enforced by GitHub Pages | TLS 1.2+ via GitHub's cert management |
| **Deploy trigger** | `git push origin main` | No CI/CD pipeline; direct push deploys |
| **Cache busting** | Asset version constants in `core.js` | Bumped manually on significant releases |

---

## 5. Authentication

| Layer | Technology | Details |
|-------|-----------|---------|
| **App login** | SHA-256 password → Lambda → JWT | Single shared password for all users; no per-user accounts |
| **JWT** | Issued by Lambda on successful auth | Stored in `localStorage`; sent as `Authorization: Bearer` on API calls |
| **CMS write access** | GitHub PAT in `localStorage['gh_pat']` | Entered manually by CMS editor; used to authenticate `PUT` commits |
| **CMS URL flag** | `?cms=true&mode=pm` | Enables CMS mode; no server-side gate |

**Auth gap**: The password gate is global — all authenticated users can read and write all data. Per-project access control is a planned future capability (see ADR §6, Risk #6).

---

## 6. Observability

| Concern | Tool | Coverage |
|---------|------|---------|
| **Lambda logs** | AWS CloudWatch Logs | All Lambda invocations, errors, duration |
| **Lambda metrics** | CloudWatch Metrics | Invocation count, error rate, duration P50/P99 |
| **Frontend errors** | Browser console | No structured error reporting; no Sentry/Datadog |
| **Performance** | Browser DevTools | No RUM (Real User Monitoring) |
| **Uptime** | GitHub Pages SLA (~99.9%) | No external uptime monitor |
| **Alerting** | None today | Recommended: CloudWatch alarm on Lambda error rate > 1% |

**Observability gap**: The frontend has zero structured error reporting. Errors are visible only in browser consoles of affected users. Recommended future addition: a lightweight `window.onerror` → Lambda log forwarding hook (no external dependency required).

---

## 7. Planned Additions

| Addition | Rationale | Effort | Dependency |
|----------|-----------|--------|-----------|
| **Lambda `projectId` routing** | Multi-project data isolation | M | PRODUCT_FLOW.md §5 |
| **Project switcher UI** | Header dropdown to switch active project | M | `workflow-nav.js` |
| **`normalizeData()` projectId scoping** | Prevent cross-project data bleed | S | Lambda routing |
| **Optimistic lock (SHA check)** | Prevent silent concurrent edit collision | M | ADR Risk #1 |
| **Per-project auth scoping** | Prevent cross-project unauthorised access | L | New JWT claim model |
| **SES weekly digest** | Async retention nudge (pure pull today) | L | Lambda cron + AWS SES |
| **Tailwind CDN version pin** | Prevent breaking change from CDN version bump | S | None |
| **`window.onerror` → Lambda log** | Surface frontend errors without external tools | S | None |

---

## 8. Explicitly NOT Used — and Why

| Technology | Why excluded |
|-----------|-------------|
| **React / Vue / Angular** | No build step allowed; CDN-only SPA constraint is hard |
| **npm / bundler (Vite, Webpack)** | Zero-deployment SPA — no build pipeline exists or is planned |
| **TypeScript** | No transpilation step; ES6+ with JSDoc comments is the chosen approach |
| **Relational database (PostgreSQL, MySQL)** | Data volume and access patterns don't justify it; GitHub JSON is sufficient |
| **Redis / Memcached** | No caching layer needed; `UPDATE_DATA` in browser memory is the cache |
| **Kubernetes / ECS** | Single Lambda function; container orchestration is over-engineered by 2 orders of magnitude |
| **GraphQL** | One Lambda endpoint with JSON payloads; GraphQL adds schema overhead with no benefit |
| **WebSockets / SSE** | Pull-based async workflow; real-time is not a requirement |
| **Sentry / Datadog** | External dependency; `window.onerror` → Lambda log forwarding is sufficient at internal scale |
| **shadcn/ui / Radix** | Require npm build step; headless UI patterns implemented in vanilla JS instead |

---

## 9. Maintenance Checklist

| Task | Frequency | Owner |
|------|-----------|-------|
| Rotate `GITHUB_TOKEN` (GitHub PAT) | Every 90 days or on engineer offboarding | Engineering lead |
| Rotate `EXPECTED_PASSWORD_HASH` | On team password change | Engineering lead |
| Update `LAMBDA_URL` in `index.html` | After each `deploy_auth.sh` run | Engineering lead |
| Review CloudWatch Lambda error rate | Weekly | Engineering lead |
| Pin Tailwind CDN version | Before first external-team onboarding | Engineering lead |
| Run `data.json` snapshot backup | Before any multi-project migration | Engineering lead |

---

*Last updated: 2026-04-09. Update this document when any CDN version, Lambda runtime, or AWS region changes.*
