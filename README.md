# Khyaal Engineering Pulse

> Zero-deployment, GitHub-backed engineering dashboard. Frontend-only SPA — no build step, no server. Data lives in `data.json` on GitHub.

---

## What It Is

A fully client-side engineering command center for product, engineering, and leadership teams. It renders your `data.json` from GitHub into a living dashboard — ceremonies, lifecycle stages, OKR tracking, sprint boards, capacity planning, and more. Nothing to deploy beyond static files and one AWS Lambda.

For a full product guide (personas, views, ceremonies, how to use), see [GUIDE.md](GUIDE.md).  
For technical architecture and developer patterns, see [DEVELOPER.md](DEVELOPER.md).

---

## Architecture

```
Browser
  └── index.html          (HTML shell, auth, view containers)
       ├── core.js         (constants, helpers, switchView, keyboard shortcuts)
       ├── app.js          (UPDATE_DATA, renderDashboard, normalizeData)
       ├── modes.js        (PM/Dev/Exec personas, STAGE_TO_VIEWS, stage tabs, nav)
       ├── views.js        (Track, Backlog, Sprint, Status, Priority, Contributor, Releases, Gantt, Roadmap, Epics, Workflow, Discovery)
       ├── cms.js          (edit modal, GitHub sync, ceremony engine, audit system)
       ├── lifecycle-guide.js  (quick actions, gateway checks, toasts, sprint HUD)
       ├── okr-module.js   (OKR view + progress calculation)
       ├── kanban-view.js  (drag-drop Kanban board)
       ├── dependency-view.js  (Mermaid dependency graph)
       ├── analytics.js    (Google Charts velocity/burndown)
       ├── capacity-planning.js (team workload)
       ├── dev-focus.js    (Developer "My Tasks" view)
       ├── executive-dashboard.js (Exec KPI summary)
       ├── workflow-nav.js (Engineering Playbook)
       └── styles.css      (full design system)
```

**Stack**: Vanilla JS ES6+ · Tailwind CSS (CDN) · Mermaid.js · Google Charts · AWS Lambda

**Data flow:**
```
GitHub (data.json) → Lambda gatekeeper → UPDATE_DATA (memory + localStorage)
                                              ↓ CMS edits
                                         saveToLocalStorage()
                                              ↓ "Save to GitHub" button
                                         saveToGithub() → GitHub PUT API
```

---

## Setup & Authentication

### Site Auth
Password → SHA-256 hash → Lambda validates against `EXPECTED_PASSWORD_HASH` → dashboard loads.  
Session cached in `localStorage['khyaal_site_auth']` — auto-login on return.

### CMS Auth (edit mode)
1. Navigate to `?cms=true`
2. Enter GitHub Personal Access Token (PAT) when prompted → stored in `localStorage['gh_pat']`
3. CMS buttons appear: Add items, Edit, Delete, Save to GitHub, Archive, Settings, Logout

### Lambda Setup (one-time)
```sh
sh deploy_auth.sh
# Set GITHUB_TOKEN env var in Lambda
# Update LAMBDA_URL constant in index.html
```

---

## Three Persona Modes

Switch with `Alt+1` / `Alt+2` / `Alt+3` or use the PM / Dev / Exec buttons in the app bar. Mode persists in `localStorage['khyaal_mode']`.

| Mode | Key | Default View | Theme | What They See |
|------|-----|-------------|-------|---------------|
| 👨‍💼 Product Manager | `pm` | OKRs | Blue | Everything — all 5 stages, all views, full CMS |
| 👩‍💻 Developer | `dev` | My Tasks | Green | Execution-only — tasks assigned to current user |
| 👔 Executive | `exec` | Dashboard | Purple | Strategic only — OKRs, Epics, Roadmap, Analytics, Releases |

**Developer mode:**
- Prompts user selection on first switch (stored in `localStorage['khyaal_current_user']`)
- Filters items to only those assigned to the selected user
- Strategic fields are readonly (🔒) in the edit modal
- CMS pillars shown in execution-first order: WHERE → HOW → WHAT → WHEN

**Executive mode:**
- Only 3 CMS pillars (no Sync & Effort / HOW panel)
- Filters to high-priority, blocked, and active (`now`) items only

---

## Navigation: 5-Stage Lifecycle

The app bar has two rows:
- **Row 1**: `KP logo | Project selector | Stage tabs (center) | PM/Dev/Exec switcher | ⚙️ CMS`
- **Row 2**: View sub-tabs for the active stage

Stages and their views (PM mode):

| Stage | Icon | Views |
|-------|------|-------|
| Discover | 🔍 | Ideation, Spikes |
| Vision | 🌟 | OKRs, Epics |
| Plan | 📐 | Roadmap, Backlog, Sprints, Gantt, Capacity |
| Build | ⚡ | Kanban, Tracks, Dependencies, By Status, By Priority, By Contributor |
| Ship | 🏁 | Releases, Analytics, Dashboard, Playbook |

---

## All Views

| View ID | Stage | Personas | Description |
|---------|-------|---------|-------------|
| `ideation` | Discover | PM, Exec | Idea capture — items tagged `#idea` |
| `spikes` | Discover | PM, Dev | Technical spike investigations |
| `okr` | Vision | PM, Exec | OKRs with auto-calculated KR progress |
| `epics` | Vision | PM, Exec | Strategic initiatives with health tracking |
| `roadmap` | Plan | PM, Exec | Planning horizons (1M/3M/6M/1Y) |
| `backlog` | Plan | PM | Grooming hub — story points, epics, priorities |
| `sprint` | Plan | PM, Dev | 2-week cycles, velocity tracking, HUD |
| `gantt` | Plan | PM | Timeline bar chart |
| `capacity` | Plan | PM | Team workload vs. sprint capacity |
| `kanban` | Build | PM, Dev | Drag-and-drop 8-column board |
| `track` | Build | PM, Dev | Work grouped by project/subtrack |
| `dependency` | Build | PM, Dev | Mermaid.js dependency graph |
| `status` | Build | PM | Items grouped by delivery status |
| `priority` | Build | PM | High/Medium/Low sorting |
| `contributor` | Build | PM | Per-person task breakdown |
| `releases` | Ship | PM, Exec | Versioned milestones |
| `analytics` | Ship | PM, Exec | Velocity charts, burndown, KPIs |
| `dashboard` | Ship | PM, Exec | Executive KPI summary |
| `workflow` | Ship | PM, Dev | Engineering Playbook — 5-stage lifecycle guide |
| `my-tasks` | Build | Dev | Developer personal task view |

---

## Item Status Values

| Status | Visual | Meaning |
|--------|--------|---------|
| `later` | Slate | Backlog — not yet scheduled |
| `next` | Indigo | Planned — ready for next sprint |
| `now` | Blue | In progress — active development |
| `qa` | Amber | Being tested / verified |
| `review` | Purple | Awaiting sign-off / UAT |
| `blocked` | Red | Blocked — needs attention |
| `onhold` | Teal | Paused — intentionally deferred |
| `done` | Green | Shipped to production |

---

## Data Model

### Item Fields
```json
{
  "id": "unique-id",
  "text": "Task title",
  "status": "now",
  "priority": "high",
  "storyPoints": 5,
  "planningHorizon": "1M",
  "sprintId": "sprint-4",
  "epicId": "platform-modernization",
  "releasedIn": "v2.1-platform-foundation",
  "contributors": ["Subhrajit", "Vivek"],
  "tags": ["feature", "frontend"],
  "dependencies": ["other-task-id"],
  "blocker": false,
  "blockerNote": "",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
  "impactLevel": "high",
  "effortLevel": "medium",
  "successMetric": "Latency < 200ms",
  "strategicWeight": 75,
  "riskType": "technical",
  "usecase": "User/business impact statement",
  "note": "Technical implementation notes",
  "persona": "Senior user",
  "mediaUrl": "",
  "startDate": "2026-02-01",
  "due": "2026-02-15",
  "publishedDate": "2026-03-20",
  "comments": [{ "id": "c1", "text": "...", "author": "PM", "timestamp": "..." }],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

**Constraints:**
- `storyPoints`: Fibonacci — `1 | 2 | 3 | 5 | 8 | 13 | 21`
- `planningHorizon`: `1M` · `3M` · `6M` · `1Y`
- `impactLevel` / `effortLevel`: `low | medium | high`
- `status`: `now | next | later | qa | review | blocked | onhold | done`

### Metadata Structure (condensed)
See [DEVELOPER.md](DEVELOPER.md) for the full annotated schemas for `okrs[]`, `epics[]`, `sprints[]`, `releases[]`, `roadmap[]`, `velocityHistory[]`, `activity[]`, `ceremonyAudits[]`, `customStatuses[]`, and `tracks[]`.

---

## CMS Edit Modal — 4-Pillar System

The edit modal adapts to both the current **persona** and the **active view**.

### 4 Pillars

| Pillar | Label | Core Fields |
|--------|-------|-------------|
| `what` | 🎯 Goal & Intent | text, usecase, epicId, persona, tags |
| `when` | 📅 Timeline & Cycle | planningHorizon, sprintId, startDate, due, releasedIn, publishedDate |
| `where` | ⚡ Action & Routing | status, contributors, blockerNote, dependencies, note, mediaUrl |
| `how` | 🛠️ Sync & Effort | storyPoints, priority, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType |

### Pillar Visibility by Persona
- **PM**: `[what → when → where → how]` — all 4
- **Developer**: `[where → how → what → when]` — all 4, execution-first; strategic fields readonly
- **Executive**: `[what → when → where]` — 3 only, no HOW

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Epics view |
| `2` | Roadmap view |
| `3` | Backlog view |
| `4` | Sprint view |
| `5` | Track view |
| `6` | Releases view |
| `7` | By Status view |
| `8` | By Priority view |
| `9` | By Contributor view |
| `0` | Dependencies view |
| `/` | Focus search bar |
| `Alt+1` | Switch to PM mode |
| `Alt+2` | Switch to Developer mode |
| `Alt+3` | Switch to Executive mode |

---

## Lifecycle Ceremonies

All ceremonies are accessible from the relevant view in **PM mode with CMS active (`?cms=true`)**. Each ceremony records a `ceremonyAudit` entry in `metadata.ceremonyAudits[]`.

| Ceremony | Trigger | What It Does |
|----------|---------|--------------|
| Sprint Kickoff | Sprint card → "▶ Kick Off" | Marks sprint active, sets `kickedOffAt`, records audit |
| Sprint Close | Sprint card → "🏁 Close Sprint" | Reviews done/not-done items, rolls over, syncs velocity to `velocityHistory[]` |
| OKR Launch | OKR card → "🚀 Launch Quarter" | Marks OKR active, sets `launchedAt`, records audit |
| OKR Close | OKR card → "🏁 Close OKR" | Sets outcome (achieved/missed/cancelled), records final result |
| Epic Kickoff | Epic card → "▶ Kick Off" | Marks epic active, sets `kickedOffAt`, records audit |
| Epic Close | Epic card → "🏁 Close Epic" | Marks epic completed, rolls incomplete items to backlog |
| Release Lock | Release card → "🔒 Lock Release" | Freezes release scope, sets `lockedAt` |
| Ship Release | Release card → "🚢 Ship" | Marks released, moves missed items to next release |
| Advance Horizons | Roadmap ribbon → "⏩ Advance" | Bulk shifts planning horizons (3M→1M, 6M→3M) |

---

## Product Hierarchy

```
Vision (metadata.vision)                       — Multi-year north star
  └─ OKRs (metadata.okrs[])                   — Quarterly measurable outcomes
       └─ Epics (metadata.epics[])             — Strategic initiatives (linked to OKR via linkedOKR)
            └─ Roadmap Horizons (metadata.roadmap[]) — 1M/3M/6M planning buckets
                 └─ Items (tracks[].subtracks[].items[]) — Granular tasks (linked via epicId)
                      └─ Sprints (metadata.sprints[])   — 2-week execution (linked via sprintId)
                           └─ Releases (metadata.releases[]) — Ship milestones (linked via releasedIn)
```

---

## Development Rules

- Vanilla JS ES6+, no semicolons, no transpilation, no framework
- No DOM manipulation in loops — build HTML strings, assign `innerHTML` once
- Don't mutate `UPDATE_DATA` directly — only CMS functions may write to it
- New fields → add default in `normalizeData()` in `app.js`
- New views → container in `index.html` + case in `switchView()` + `STAGE_TO_VIEWS` + `VIEW_METADATA`

Full patterns in [DEVELOPER.md](DEVELOPER.md).

---

## Troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| Nothing renders | `window.isActionLockActive` stuck `true` — open console, run `window.isActionLockActive = false; renderDashboard()` |
| Stale data shown | `localStorage['khyaal_data']` cached — clear localStorage or use `?archive` param |
| Dependency graph blank | Mermaid.js CDN slow — check browser console |
| OKR progress wrong | Verify `item.epicId` → `epic.id` → `okr.linkedEpic` chain is intact |
| Kanban drag not working | Requires `?cms=true` active |
| View not showing in nav | Check `STAGE_TO_VIEWS` in modes.js — view must be listed for current mode |

---

## Credits

Built for Khyaal Engineering Team  
Zero-deployment · GitHub-backed · Client-side rendering  
Auth: AWS Lambda · Visualization: Mermaid.js + Google Charts · Styling: Tailwind CSS CDN

© 2026 Khyaal Inc.
