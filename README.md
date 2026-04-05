# Khyaal Engineering Pulse

> Zero-deployment, GitHub-backed engineering dashboard for Khyaal team. Frontend-only SPA — no build step, no server.

---

## Architecture

```
index.html          → Shell, auth gatekeeper, view containers, script tags (?v=04031)
app.js              → UPDATE_DATA global, renderDashboard(), switchView(), normalizeData()
core.js             → statusConfig, contributorColors, search/filter helpers, blocker strip
views.js            → All primary view renderers (Track, Backlog, Sprint, Status, etc.)
cms.js              → CRUD modal, 4-pillar form, GitHub sync, metadata editors
modes.js            → Persona system (PM/Dev/Exec), mode filtering, navigation
okr-module.js       → OKR view and progress calculation
kanban-view.js      → Drag-and-drop Kanban board
dependency-view.js  → Mermaid.js dependency graph
analytics.js        → Velocity/burndown charts (Google Charts)
capacity-planning.js→ Team workload and sprint capacity
dev-focus.js        → Developer "My Tasks" view
executive-dashboard.js → Executive KPI summary
styles.css          → Custom CSS (cms-*, view-section, kanban-*, badge-*, track-header)
auth_gatekeeper.js  → AWS Lambda: validates password hash, proxies GitHub data fetch
data.json           → Single source of truth (hosted on GitHub)
```

**Data flow:**
```
GitHub (data.json) → Lambda fetch → UPDATE_DATA (memory + localStorage)
                                         ↓ CMS edits
                                    saveToLocalStorage()
                                         ↓ "Save to GitHub"
                                    saveToGithub() → GitHub PUT
```

---

## Authentication & Setup

### Site Auth
Password → SHA-256 → Lambda validates against `EXPECTED_PASSWORD_HASH` → `showProtectedContent()`  
Session cached in `localStorage['khyaal_site_auth']` — auto-login on return.

### CMS Auth (edit mode)
1. Navigate to `?cms=true`
2. Enter GitHub Personal Access Token (PAT) → stored in `localStorage['gh_pat']`
3. Action buttons appear: Save to GitHub, Archive, Settings, Logout

One-time Lambda setup: `sh deploy_auth.sh` → set `GITHUB_TOKEN` env var → update `LAMBDA_URL` in index.html.

---

## Three Persona Modes

Switch with `Alt+1` / `Alt+2` / `Alt+3`. Mode persists in localStorage.

| Mode | Key | Default View | Theme | Filter |
|------|-----|-------------|-------|--------|
| 👨‍💼 Product Manager | `pm` | OKRs | Blue | All items |
| 👩‍💻 Developer | `dev` | My Tasks | Green | Current user's items only |
| 👔 Executive | `exec` | Dashboard | Purple | High-priority/blocked/now |

**Developer mode specifics:**
- Prompts user name selection on first switch (stored in `localStorage['khyaal_current_user']`)
- Strategic fields are readonly (🔒) in the edit modal
- CMS pillars: WHERE → HOW → WHAT → WHEN (execution-first order)

**Executive mode specifics:**
- Only 3 CMS pillars shown (no Sync & Effort / HOW panel)
- Views limited to: Dashboard, Epics, OKRs, Analytics, Roadmap, Releases, Ideation, Spikes

---

## Views

### PM Mode Views
| View ID | Shortcut | Description |
|---------|----------|-------------|
| `okr` | 1 | OKRs with auto-calculated progress from linked items |
| `roadmap` | 2 | Planning horizons (1M/3M/6M/1Y) |
| `backlog` | 3 | Grooming hub — story points, epic links, priorities |
| `sprint` | 4 | 2-week cycles with velocity tracking |
| `track` | 5 | Work grouped by product area / subtrack |
| `releases` | 6 | Version milestones with completion tracking |
| `status` | 7 | Items grouped by delivery status |
| `priority` | 8 | High/Medium/Low sorting |
| `contributor` | 9 | Per-person task breakdown |
| `dependency` | 0 | Mermaid.js dependency graph |
| `kanban` | — | Drag-and-drop board (8 status columns) |
| `epics` | — | Strategic goals with health tracking |
| `analytics` | — | Velocity charts, burndown, KPIs |
| `capacity` | — | Team workload vs. sprint capacity |
| `gantt` | — | Timeline visualization |
| `workflow` | — | PM/Dev playbook |
| `ideation` | — | Idea capture (#idea, #spike tags) |

### Developer Mode Views
`my-tasks`, `kanban`, `track`, `dependency`, `sprint`, `workflow`, `ideation`, `spikes`

### Executive Mode Views
`dashboard`, `epics`, `okr`, `analytics`, `roadmap`, `releases`, `ideation`, `spikes`

---

## Item Status Values

| Status | Meaning | Kanban Column |
|--------|---------|---------------|
| `later` | Backlog / ideas | Backlog |
| `next` | Planned, ready | Planned (Next) |
| `now` | Active work | Developing (Now) |
| `qa` | Being verified | Testing (QA) |
| `review` | Awaiting sign-off | In Review (UAT) |
| `blocked` | Stuck on dependency | Blocked (Urgent) |
| `onhold` | Paused | On Hold (Parked) |
| `done` | Shipped | Production (Done) |

---

## Data Model

### Item Schema
```json
{
  "id": "unique-id",
  "text": "Task title",
  "status": "now",
  "priority": "high",
  "storyPoints": 5,
  "planningHorizon": "1M",
  "sprintId": "sprint-1",
  "epicId": "epic-platform",
  "releasedIn": "v2.1",
  "contributors": ["Subhrajit", "Vivek"],
  "tags": ["feature", "frontend"],
  "dependencies": ["other-task-id"],
  "blockerNote": "",
  "blocker": false,
  "acceptanceCriteria": "Criterion 1\nCriterion 2",
  "impactLevel": "high",
  "effortLevel": "medium",
  "successMetric": "Latency < 200ms",
  "strategicWeight": 75,
  "riskType": "technical",
  "mediaUrl": "https://...",
  "usecase": "User/business impact",
  "note": "Technical implementation notes",
  "startDate": "2026-02-01",
  "due": "2026-02-15",
  "publishedDate": "2026-03-20",
  "comments": [{ "id": "c1", "text": "PR #123", "author": "PM", "timestamp": "..." }],
  "createdAt": "2026-01-01",
  "updatedAt": "2026-04-05"
}
```

**Story points**: Fibonacci only — `1, 2, 3, 5, 8, 13, 21`  
**Planning horizon**: `1M` (Now) · `3M` (Next) · `6M` (Later) · `1Y` (TBD)

### Metadata Schema (key fields)
```json
{
  "metadata": {
    "title": "Khyaal Engineering Pulse",
    "okrs": [{ "id", "quarter", "objective", "owner", "keyResults[]", "overallProgress" }],
    "epics": [{ "id", "name", "usecase", "status", "health", "linkedOKR" }],
    "sprints": [{ "id", "name", "status", "startDate", "endDate", "plannedPoints" }],
    "releases": [{ "id", "name", "releaseDate", "status", "linkedEpic" }],
    "roadmap": [{ "name", "theme", "horizon", "status" }],
    "capacity": { "totalCapacity": 86, "teamMembers": [{ "name", "capacity", "role" }] },
    "velocityHistory": [{ "sprint", "planned", "completed" }],
    "activity": [{ "id", "timestamp", "action", "target" }]
  }
}
```

---

## CMS Edit Modal — 4-Pillar System

The edit modal (`cms.js`) adapts to both the current **persona** and the **active view**.

### 4 Pillars

| Pillar | Label | Fields |
|--------|-------|--------|
| `what` | 🎯 Goal & Intent | text, usecase, epicId, persona, tags, note |
| `when` | 📅 Timeline & Cycle | planningHorizon, sprintId, startDate, due, releasedIn, publishedDate |
| `where` | ⚡ Action & Routing | status, contributors, blockerNote, dependencies, mediaUrl |
| `how` | 🛠️ Sync & Effort | storyPoints, priority, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType |

### Pillar Visibility by Persona
- **PM**: `[what → when → where → how]` — all 4
- **Developer**: `[where → how → what → when]` — all 4, execution-first; strategic fields readonly
- **Executive**: `[what → when → where]` — 3 only, no Sync & Effort

### Field Visibility by View (LIFECYCLE_FIELD_MAP)
Default = only native fields shown. Toggle "Show All" to expand.

| View | Native fields shown |
|------|-------------------|
| `backlog` | text, usecase, persona, sprintId, planningHorizon, status, epicId, priority, storyPoints, tags, impactLevel, effortLevel |
| `sprint` | text, usecase, persona, acceptanceCriteria, sprintId, startDate, due, status, contributors, storyPoints, priority, blockerNote, note |
| `track` | text, usecase, persona, acceptanceCriteria, due, sprintId, status, contributors, storyPoints, priority, dependencies, blockerNote, note |
| `kanban` | text, sprintId, status, contributors, priority, storyPoints, blockerNote |
| `releases` | text, releasedIn, publishedDate, status, mediaUrl, tags, note |
| `roadmap` | text, planningHorizon, startDate, usecase, epicId, status, tags, impactLevel, effortLevel, riskType |
| `epics` | text, usecase, persona, planningHorizon, impactLevel, status, epicId, successMetric, strategicWeight, riskType, mediaUrl |

### Developer Field Protection (Strategic Shield)
Fields readonly in dev mode:
`epicId, impactLevel, successMetric, acceptanceCriteria, planningHorizon, releasedIn, strategicWeight, riskType, effortLevel, publishedDate, priority, usecase, persona, sprintId`

---

## Keyboard Shortcuts

| Key | View/Action |
|-----|-------------|
| `1` | Epics |
| `2` | Roadmap |
| `3` | Backlog |
| `4` | Sprint |
| `5` | Track |
| `6` | Releases |
| `7` | By Status |
| `8` | By Priority |
| `9` | By Contributor |
| `0` | Dependencies |
| `/` | Focus search |
| `Alt+1` | PM mode |
| `Alt+2` | Developer mode |
| `Alt+3` | Executive mode |

---

## Product Hierarchy (OKR → Delivery)

```
Vision (metadata.vision)              — Multi-year north star
  └─ OKRs (metadata.okrs[])          — Quarterly measurable outcomes
       └─ Epics (metadata.epics[])   — Large strategic initiatives (linkedOKR)
            └─ Releases (metadata.releases[])  — Shippable increments (linkedEpic)
                 └─ Backlog items    — Granular tasks (epicId, releasedIn, sprintId)
                      └─ Sprints (metadata.sprints[])  — 2-week execution cycles
```

---

## Development Guide

### Adding a Field
1. Default in `app.js normalizeData()`
2. `case 'fieldName':` in `cms.js renderField()` returning HTML
3. Add to pillar in `FIELD_GROUPS` (cms.js:114)
4. Add to relevant `LIFECYCLE_FIELD_MAP` views (cms.js:148)
5. Read back in `saveCmsChanges()` via `getElementById('edit-fieldName')`

### Adding a View
1. Container in index.html: `<div id="viewname-view" class="view-section"></div>`
2. Case in `switchView()` in app.js
3. Add to `availableViews` + `VIEW_METADATA` in modes.js
4. Render function in new `.js` file + `<script>` tag in index.html

### Code Style
- Vanilla JS ES6+, no transpilation, no semicolons
- No DOM manipulation in loops — build HTML strings, set `innerHTML` once
- Don't mutate `UPDATE_DATA` directly — use CMS functions
- New dependencies: CDN only

### Troubleshooting
- **Nothing renders**: check `window.isActionLockActive` — may be stuck `true`
- **Data stale**: `localStorage['khyaal_data']` may be cached; clear or use `?archive` param
- **Graph not rendering**: Mermaid.js CDN may be slow; check console
- **OKR progress wrong**: verify `item.epicId` matches `epic.id` which matches `okr.linkedEpic`
- **Kanban drag not working**: requires `?cms=true` mode active

---

## Credits

Built for Khyaal Engineering Team · Zero-deployment · GitHub-backed · Client-side rendering  
Security: AWS Lambda auth gatekeeper · Visualization: Mermaid.js + Google Charts · Styling: Tailwind CSS CDN

© 2026 Khyaal Inc.
