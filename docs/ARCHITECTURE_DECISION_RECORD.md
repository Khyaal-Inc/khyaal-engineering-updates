# Architecture Decision Record — Khyaal Engineering Pulse

> **Status**: Accepted
> **Date**: 2026-04-09
> **Deciders**: Gautam (Engineering Lead, Technical Architect)
> **Supersedes**: N/A — first formal ADR for this codebase

---

## 1. Context

Khyaal Engineering Pulse is an internal product management SPA serving ~5 users across 3 persona types (PM / Dev / Exec). Hard constraints:

- **No build pipeline** — Tailwind CDN + Vanilla JS; no npm, no bundler, no framework
- **GitHub Pages hosting** — static files only; no server-side rendering
- **Single AWS Lambda** (`ap-south-1`) — auth gatekeeper + GitHub API proxy
- **Data lives on GitHub** — `data.json` committed via Lambda; last-write-wins

**Primary ADR driver**: The multi-project requirement — each team or initiative must operate in full data isolation (separate `data-{projectId}.json` per project), with Lambda routing requests by `projectId`. This is the highest-leverage architectural change and touches every layer.

**Scale context**: Internal tool. Not a scale problem. Not a cost problem. An architecture-fit and evolution problem — specifically, how to extend the current model to support multi-team use without introducing operational complexity that a small team cannot sustain.

---

## 2. Architecture Options Considered

| Dimension | Modular Monolith (current) | Microservices | Serverless / Edge (chosen) |
|-----------|--------------------------|---------------|---------------------------|
| **Dev velocity** | High — one JS file per concern, no contracts | Low — service contracts, local infra, API versioning | High — Lambda functions deploy independently in minutes |
| **Cost** | Near-zero (GH Pages free + Lambda free tier covers ~1M req/mo) | High — VMs, managed k8s, DBs, network egress | Low — pay-per-request; free tier sufficient at internal scale |
| **Operational complexity** | Minimal — no infra to manage | Very high — orchestration, service discovery, health checks | Low — no servers, no patching, CloudWatch is sufficient |
| **Multi-project support** | Requires in-file routing hacks; data.json becomes a shared collision point | Per-service DB isolation possible but over-engineered | Natural — Lambda accepts `projectId` param; routes to `data-{projectId}.json` |
| **No-build constraint** | Frontend-compatible | Backend-only concern | Frontend-compatible; Lambda stays Node.js |
| **Data isolation** | Single `data.json` today — a shared mutable global | Per-service DB (overkill for 5 users) | Per-project `data-{projectId}.json` on GitHub — cheap, auditable, reversible |
| **Auditability** | Git history on `data.json` | Requires dedicated audit service | Git commit history per project file — free, durable |

### Rejected options

**Microservices**: Over-engineered for a 5-person internal tool. Service contracts, local dev orchestration (docker-compose), API versioning, and observability tooling would consume more engineering time than the product itself generates value from. Eliminated early.

**Pure Modular Monolith (stay as-is)**: Valid for the frontend — and we keep it. Rejected as the complete answer because it doesn't solve data isolation. A single `data.json` becomes a write-conflict surface the moment two teams use the tool simultaneously.

---

## 3. Decision

**Chosen architecture: Serverless / Edge backend + Modular Monolith frontend**

The frontend remains a vanilla JS Modular Monolith — one file per concern, no framework, no bundler. This is not a compromise; it is the right pattern for a no-build SPA where view renderers are pure functions over a single global `UPDATE_DATA` state.

The backend (Lambda) adopts a serverless routing model, extended to accept `projectId` and resolve the correct `data-{projectId}.json` file on GitHub. No new infrastructure is introduced — Lambda already does auth, read, and write proxying. Multi-project is an additive change to Lambda routing logic, not an architectural shift.

**Why this is the right call at this scale:**
- Zero new operational surface — no new services, no new databases, no new IAM roles beyond per-project GitHub file access
- Cost remains near-zero — GitHub Pages and Lambda free tier absorb internal-scale traffic
- Reversible — each `data-{projectId}.json` is a standalone JSON file on GitHub; projects can be archived, forked, or merged via standard git operations
- Matches team skill profile — the team built this in Vanilla JS; a microservices migration would require a capability hire before it could be maintained

---

## 4. Multi-Project + Role-Based Auth Architecture (Primary Decision)

### Confirmed organisational model — Shipped

**Hierarchy: Workspace → Project → Track → Subtrack → Item**

| Tier | Storage | Isolation boundary |
|------|---------|-------------------|
| **Workspace** | `users.json → projects[]` entry; each has a `filePath` | Full data isolation — one `data-{id}.json` per workspace on GitHub |
| **Project** | `[workspace].json → projects[]` entry | Logical grouping within a workspace's data file — no sub-file per project |
| **Track** | `project.tracks[]` | Functional area filter |
| **Subtrack** | `track.subtracks[]` | Sub-area within a track |
| **Item** | `subtrack.items[]` | Individual task / card |

Switching **Workspace** = Lambda fetches a new data file. Switching **Project** = filters already-loaded data.

### Current state (shipped)

```
Workspace: Core Platform Engineering  (users.json → projects[] → data.json)
├── Project: Khyaal Platform
│   ├── Track: Khyaal Platform
│   │   ├── Subtrack: Website
│   │   ├── Subtrack: API
│   │   └── Subtrack: Backlog
│   └── Track: ... (other tracks)
├── Project: Pulse Analytics & CXP
└── Project: DevOps & Infrastructure

Workspace: Khyaal Mobile  (users.json → projects[] → data-mobile.json)
└── Project: Main Project
    └── Track: ... (mobile tracks)

User "Gautam"    → grants: [{ projectId: 'default', mode: 'pm' }, { projectId: 'mobile', mode: 'pm' }]
User "Vivek"     → grants: [{ projectId: 'default', mode: 'dev' }, { projectId: 'mobile', mode: 'dev' }]
User "Pritish"   → grants: [{ projectId: 'default', mode: 'exec' }, { projectId: 'mobile', mode: 'exec' }]
```

### Data files on GitHub

```
data.json                ← legacy (projectId: 'default') — kept for backward compatibility
data-platform.json       ← Platform Project
data-ai-agent.json       ← AI Agent Project
users.json               ← User registry (admin-managed, never in browser localStorage)
```

### User and grant data model

```json
// users.json — stored on GitHub, read by Lambda on every auth request
{
  "users": [
    {
      "id": "gautam",
      "name": "Gautam",
      "passwordHash": "<sha256 of their password>",
      "grants": [
        { "projectId": "platform", "mode": "pm" },
        { "projectId": "ai-agent", "mode": "exec" }
      ]
    },
    {
      "id": "priya",
      "name": "Priya",
      "passwordHash": "<sha256>",
      "grants": [
        { "projectId": "platform", "mode": "dev" }
      ]
    }
  ]
}
```

**Grant semantics:**
- A grant gives access to exactly one project at exactly one maximum mode
- The persona switcher in the UI disables modes above the user's grant level for the active project
- A user with no grant for a project cannot see it in the Project Switcher
- The admin (any user with `mode: 'pm'` on the admin-designated project) can edit `users.json` via a dedicated admin CMS panel

### JWT payload (issued by Lambda on successful auth)

```json
{
  "userId": "gautam",
  "name": "Gautam",
  "grants": [
    { "projectId": "platform", "mode": "pm" },
    { "projectId": "ai-agent", "mode": "exec" }
  ],
  "iat": 1712620800,
  "exp": 1712707200
}
```

Lambda validates the JWT on every request and checks `grants[]` before touching any data file.

### Lambda routing (updated auth_gatekeeper.js)

```javascript
// Action: 'auth' — validate user, issue JWT with grants
const { username, passwordHash } = body
const users = await fetchFromGitHub(token, 'users.json')
const user = users.users.find(u => u.id === username && u.passwordHash === passwordHash)
if (!user) return { statusCode: 401, ... }
const jwt = signJWT({ userId: user.id, name: user.name, grants: user.grants })
return { authenticated: true, token: jwt }

// Action: 'read' — validate grant then fetch project file
const projectId = queryParams.projectId || 'default'
const grant = jwt.grants.find(g => g.projectId === projectId)
if (!grant) return { statusCode: 403, body: 'No access to this project' }
const dataFile = projectId === 'default' ? 'data.json' : `data-${projectId}.json`
return fetchFromGitHub(token, dataFile)

// Action: 'write' — validate grant + assert pm/dev mode, then write
if (!grant || grant.mode === 'exec') return { statusCode: 403, body: 'Write not permitted' }
// ... write data-{projectId}.json
```

### File ownership changes

| File | Change required | Scope | Phase |
|------|----------------|-------|-------|
| `auth_gatekeeper.js` | User lookup in `users.json`; JWT with `grants[]`; per-request grant validation | Backend | ✅ |
| `core.js` | `ACTIVE_PROJECT_ID`, `PROJECT_REGISTRY`, `CURRENT_USER` globals; `switchProject()` | Constants | ✅ |
| `app.js` — `normalizeData()` | Stamp `projectId` on all entities; enforce max-mode from JWT grant | Data layer | ✅ |
| `cms.js` | All reads/writes include `?projectId=`; localStorage scoped by projectId | CMS layer | ✅ |
| `workflow-nav.js` | Project Switcher shows only granted projects; enforce mode on switch | Navigation | ✅ |
| `modes.js` | Disable persona switcher options above grant's `mode` for active project | Persona layer | ✅ |
| `users.json` | User registry with `name` on each grant for human-readable project switcher labels | Data | ✅ |
| `index.html` — `initLocalLoad()` | Guard pre-auth fast-render to default project only; fix non-default project boot path | Boot | ✅ |

---

## 5. Consequences

### Positive

- **Zero infra overhead** — no new AWS services; Lambda free tier handles the load
- **Auditability by default** — every project's data and `users.json` are git-tracked; full history without extra tooling
- **Reversible isolation** — projects can be merged, archived, or forked via git; no database migrations
- **Team velocity preserved** — no framework migration, no new language, no CI/CD pipeline required
- **Cost predictability** — GitHub Pages ($0) + Lambda ($0 at internal scale) + GitHub API (free for private repos within rate limits)
- **Role enforcement at JWT level** — Lambda validates grants on every request; frontend persona enforcement is defence-in-depth on top

### Negative

- **`users.json` is a single point of auth failure** — if corrupted or deleted, no one can log in. Mitigation: keep a local backup of `users.json`; Lambda returns a clear 500 with a diagnostic message if the file is missing.
- **Last-write-wins conflict model** — two users editing the same project simultaneously overwrite each other. Mitigation: optimistic lock (SHA check before write); show warning toast if SHA changed.
- **No real-time collaboration** — pull-based system; data is stale between page loads. Acceptable for internal async PM workflow.
- **GitHub API rate limits** — 5,000 req/hr for authenticated requests. Not a concern at ≤20 users. Each auth call reads `users.json` + the project data file = 2 requests per login. Monitor if team grows.
- **Data grows linearly with projects** — each project adds one JSON file. Acceptable up to ~50 projects.
- **Admin user management requires `users.json` edit or admin CMS panel** — no self-serve password reset today.

---

## 6. Risks & Mitigations

| # | Risk | Severity | Likelihood | Mitigation | Effort | Phase |
|---|------|----------|-----------|------------|--------|-------|
| 1 | **Concurrent edit collision** — two users save simultaneously, one overwrites the other | High | Medium | Optimistic lock: compare `last-commit SHA` before write; show warning toast if SHA changed | M | 1 |
| 2 | **`users.json` corruption or deletion** — no one can log in | High | Low | Keep a local backup; Lambda returns `503` with a clear diagnostic if file is missing; add CloudWatch alarm on 5xx spike | S | 2 |
| 3 | **JWT grant bypass from client** — a user manually upgrades their JWT mode in localStorage | High | Low | Lambda validates grants on every request server-side; client persona state is display-only | S | 2 |
| 4 | **Accidental cross-workspace data bleed** — `cms.js` writes an item to the wrong workspace file | High | Low | Lambda asserts: `payload.projectId === queryParam.projectId`; reject with 400 if mismatch | S | 2 |
| 5 | **`normalizeData()` migration** — adding `projectId` without migrating existing `data.json` breaks entity lookups | High | High | `normalizeData()` stamps `projectId: 'default'` on entities that lack it (idempotent, implemented) | ✅ done | 1 |
| 6 | **Stale data after workspace switch** — `UPDATE_DATA` reflects the previous workspace | Medium | High | `switchProject()` is async: fetches new workspace data from Lambda, then calls `normalizeData()` + `renderDashboard()`. Both `#global-team-filter` and `#project-filter` `dataset.populated` flags are cleared before fetch so they repopulate from new data. | ✅ done | ✅ |
| 7 | **Persona escalation** — user granted `dev` switches to `pm` via keyboard shortcut | Medium | Medium | `switchProject()` enforces max-mode from JWT grant; persona switcher greys out modes above grant | ✅ done | ✅ |
| 8 | **GitHub API rate limit** — 5k req/hr shared across all users | Medium | Low | 2 req per login × 20 users × 10 logins/day = 400 req/day — well within limit. Add header check if team grows | S | 2 |
| 9 | **`users.json` admin UX** — raw JSON editing is error-prone; a typo locks someone out | Medium | Medium | Full-screen Admin view (`switchView('admin')`): PM-only, two tabs (Users & Grants / Structure), inline forms, no `prompt()` dialogs, saves `users.json` via Lambda | ✅ done | ✅ |
| 10 | **Lambda cold start on auth** — first login after idle reads `users.json` + project file (2 GitHub calls) | Low | High | Acceptable at internal scale (<3s total); add provisioned concurrency if P95 > 5s in CloudWatch | S | 2 |
| 11 | **CDN version drift** — unpinned Tailwind CDN ships a breaking change | Low | Low | Pin to `cdn.tailwindcss.com/3.4.1` in `index.html` | S | 1 |
| 12 | **SaaS path breaks `users.json` model** — per-org user management needs more than a flat file | Low | Low (now) | When productizing: move user/grant store to a managed DB (DynamoDB or Supabase); JWT structure stays identical | L | future |

**Effort key**: S = hours, M = 1–2 days, L = 1 week
**Phase key**: 1 = in progress, 2 = next sprint, 3 = backlog, future = productization

---

## 7. Finance & Cost Analysis

| Layer | Current cost | At 10x scale (50 users) | Notes |
|-------|-------------|------------------------|-------|
| GitHub Pages hosting | $0 | $0 | Included in GitHub free/Team plans |
| AWS Lambda | $0 (free tier: 1M req/mo, 400K GB-s compute) | ~$0.02/mo | 5 users × 200 req/day × 30 days = 30K req/mo — well within free tier |
| GitHub API | $0 | $0 | 5K authenticated req/hr; internal team never approaches this |
| Tailwind CDN | $0 | $0 | jsDelivr / unpkg CDN; free for open-source builds |
| Total | **$0/mo** | **< $1/mo** | Multi-project adds zero marginal cost |

The architecture's cost profile is near-zero by design. The only plausible cost trigger is Lambda invocations exceeding 1M/mo, which requires ~33K req/day — roughly 6,600 users making 5 requests each. Not a concern for an internal tool.

---

## 8. Related Documents

- [`./docs/PRODUCT_FLOW.md`](./PRODUCT_FLOW.md) — §5 (Multi-Project Architecture) and §8 (ADR inputs)
- [`./docs/TECH_STACK.md`](./TECH_STACK.md) — full stack inventory
- [`./docs/PRD.md`](./PRD.md) — product requirements and scale context
- [`./docs/UX_RECOMMENDATION.md`](./UX_RECOMMENDATION.md) — UX patterns including project switcher placement

---

*This ADR is a living document. Update the Status field and add a supersession note when a follow-up ADR replaces any section.*
