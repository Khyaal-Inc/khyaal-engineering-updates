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

## 4. Multi-Project Architecture (Primary Decision)

### Current state

All data is global. Tracks are a flat filter layer — they label items but do not isolate them. `data.json` is the single source of truth for all views, all personas, all teams.

### Target state

```
Project Switcher (header dropdown)
    ├── Project A  →  data-proj-a.json  →  Tracks: iOS / Android
    └── Project B  →  data-proj-b.json  →  Tracks: Frontend / Backend
                             ↓
                  All 19 views filtered by active Project + Track
```

### Data model

```json
Project {
  "id": "proj-a",
  "name": "iOS Platform",
  "tracks": ["iOS", "Android"],
  "members": ["gautam", "priya"],
  "createdAt": "2026-04-09"
}
```

All entities (`items`, `epics`, `sprints`, `okrs`, `releases`) gain a `projectId` field. Lambda resolves `data-{projectId}.json` from the `projectId` query param on every read/write request.

### Lambda routing change (pseudocode)

```javascript
// auth_gatekeeper.js — additive change only
const projectId = event.queryStringParameters?.projectId || 'default'
const dataFile = `data-${projectId}.json`
// read: GET /repos/{owner}/{repo}/contents/{dataFile}
// write: PUT /repos/{owner}/{repo}/contents/{dataFile}
```

### File ownership post-multi-project

| File | Change required | Scope |
|------|----------------|-------|
| `auth_gatekeeper.js` (Lambda) | Accept `projectId` param; resolve correct JSON file | Backend |
| `app.js` — `normalizeData()` | Scope all entity IDs to active project; add `projectId` field on load | Data layer |
| `cms.js` | Include `projectId` in all read/write payloads; route Lambda calls with `?projectId=` | CMS layer |
| `workflow-nav.js` | Store active `projectId` in state; persist across view changes; render project switcher | Navigation |
| `modes.js` | Per-project persona state (PM for Project A may be Dev for Project B) | Persona layer |
| `core.js` | Add `ACTIVE_PROJECT_ID` constant; expose `switchProject()` helper | Constants |

---

## 5. Consequences

### Positive

- **Zero infra overhead** — no new AWS services; Lambda free tier handles the load
- **Auditability by default** — every project's data is a separate git-tracked file; full history without extra tooling
- **Reversible isolation** — projects can be merged, archived, or forked via git; no database migrations
- **Team velocity preserved** — no framework migration, no new language, no CI/CD pipeline required
- **Cost predictability** — GitHub Pages ($0) + Lambda ($0 at internal scale) + GitHub API (free for private repos within rate limits)

### Negative

- **Last-write-wins conflict model** — two users editing the same project simultaneously will overwrite each other's changes. No merge strategy exists. Mitigation: document the constraint; add optimistic lock warning toast (check last-commit timestamp before write).
- **No real-time collaboration** — not a push-based system; data is stale between page loads. Acceptable for internal async PM workflow.
- **No per-project auth today** — the Lambda password gate is global; all users who know the password can access all projects. Per-project access control requires a more complex auth model (ADR for future sprint).
- **GitHub API rate limits** — 5,000 req/hr for authenticated requests. At internal scale with ~5 users, this is not a concern today. Monitor if team grows beyond 20 active users.
- **Data grows linearly with projects** — each project adds one JSON file to the repo. No pagination or archival strategy exists. Acceptable up to ~50 projects; beyond that, a separate data store should be evaluated.

---

## 6. Risks & Mitigations

| # | Risk | Severity | Likelihood | Mitigation | Effort |
|---|------|----------|-----------|------------|--------|
| 1 | **Concurrent edit collision** — two users save simultaneously, one overwrites the other | High | Medium | Add optimistic lock: compare `last-commit SHA` before write; show warning toast if SHA has changed since page load | M |
| 2 | **Lambda cold start latency** — first request after idle takes 1–3s | Low | High | Acceptable at internal scale; add CloudWatch alarm if P95 > 5s; consider provisioned concurrency if UX degrades | S |
| 3 | **GitHub API rate limit hit** — automated or bulk operations exhaust 5k req/hr | Medium | Low | Add rate limit header check in Lambda response; surface remaining quota in CMS debug mode | S |
| 4 | **`normalizeData()` scope creep** — adding `projectId` to all entities without migration breaks existing `data.json` | High | High | Write a one-time migration script to add `projectId: 'default'` to all existing entities before deploying multi-project Lambda; test on a data.json snapshot | M |
| 5 | **Accidental cross-project data bleed** — a bug in `cms.js` writes an item to the wrong project file | High | Low | Add `projectId` assertion in Lambda before every write: reject if payload `projectId` !== URL param `projectId` | S |
| 6 | **No per-project access control** — global password grants access to all projects | Medium | Medium | Short-term: document constraint; warn in project switcher UI. Long-term: add per-project token or JWT claim. ADR for future sprint | L |
| 7 | **Stale data after project switch** — `UPDATE_DATA` in memory reflects previous project | Medium | High | Clear `UPDATE_DATA` on `switchProject()`; force `normalizeData()` + `renderDashboard()` call; show loading state during fetch | S |
| 8 | **CDN version drift** — unpinned Tailwind CDN (`cdn.tailwindcss.com`) ships a breaking change | Low | Low | Pin to a specific Tailwind CDN version (e.g., `cdn.tailwindcss.com/3.4.1`); add to TECH_STACK.md as a maintenance reminder | S |

**Effort key**: S = hours, M = 1–2 days, L = 1 week

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
