# Product Flow — Khyaal Internal PM Tool

> **Audience**: Internal product teams (PM / Dev / Exec personas)
> **Tool**: Khyaal Engineering Updates — no-build SPA on GitHub Pages
> **Date**: 2026-04-09

---

## 1. End-to-End Flow Overview

Three interlocking loops drive the product experience: **Onboarding**, **Core Action (weekly PM cadence)**, and **Retention**.

```mermaid
flowchart TD
    subgraph OB["Loop 1 · Onboarding"]
        A([User visits app]) --> B[Lambda SHA-256 Auth]
        B -->|Success| C[Persona select\nPM / Dev / Exec]
        B -->|Fail| B
        C --> D[Lifecycle breadcrumb renders\nDiscover → Vision → Plan → Build → Ship]
        D --> E[Empty-state guidance\nper active stage]
        E --> F[Create first Ideation item]
        F --> G[Create first OKR]
        G --> H{{Setup complete}}
    end

    subgraph CA["Loop 2 · Core Action — Weekly PM Cadence"]
        H --> I
        I[Discover\nIdeation + Spikes] --> J[Vision\nOKR → Epic]
        J --> K[Plan\nBacklog groom → Sprint plan]
        K --> L[Build\nKanban execution]
        L --> M[Ship\nRelease publish → Analytics review]
        M -->|Next cycle| I
    end

    subgraph RT["Loop 3 · Retention"]
        M --> N[Sprint HUD on Dashboard]
        N --> O{Overdue / at-risk?}
        O -->|Yes| P[Cadence nudge toast]
        O -->|No| Q[My Tasks view\nDev persona]
        P --> R[Ceremony engine trigger\nSprint close / Retro]
        Q --> R
        R --> S[OKR % auto-update]
        S -->|Next cycle| I
    end
```

---

## 2. Loop 1 — Onboarding

```mermaid
sequenceDiagram
    actor U as User
    participant L as Lambda (SHA-256)
    participant A as App (SPA)
    participant D as data.json (GitHub)

    U->>L: POST /auth { password }
    L-->>U: JWT token (or 401)
    U->>A: Load app with token
    A->>D: GET data.json
    D-->>A: UPDATE_DATA loaded
    A->>U: Render persona picker (PM / Dev / Exec)
    U->>A: Select persona
    A->>U: Render lifecycle breadcrumb\n+ empty-state guidance for active stage
    U->>A: Create first Ideation item (Discover stage)
    U->>A: Create first OKR (Vision stage)
    A->>L: PATCH data.json via Lambda
    L->>D: Commit updated data.json
    A->>U: Setup complete — Sprint HUD visible
```

**Entry point**: Single password → Lambda → GitHub Pages SPA. No self-serve signup; access is provisioned manually.

---

## 3. Loop 2 — Core Action (Weekly PM Cadence)

Each stage maps to a workflow-nav.js `WORKFLOW_STAGES` key and owns specific views.

```mermaid
flowchart LR
    subgraph DISC["Discover (Ongoing)"]
        D1[Ideation view\nCapture ideas] --> D2[Spikes view\nResearch & validate]
    end
    subgraph VIS["Vision (Quarterly)"]
        V1[OKR view\nSet objectives] --> V2[Epics view\nGroup initiatives]
    end
    subgraph PLAN["Plan (Weekly)"]
        P1[Roadmap view] --> P2[Backlog grooming]
        P2 --> P3[Sprint plan\n+ Capacity check]
    end
    subgraph BUILD["Build (Daily)"]
        B1[Kanban board] --> B2[Track / Status / Priority]
        B2 --> B3[Dependency map]
    end
    subgraph SHIP["Ship (Per Sprint)"]
        S1[Release publish] --> S2[Analytics review]
        S2 --> S3[Dashboard KPIs]
    end

    DISC --> VIS --> PLAN --> BUILD --> SHIP --> DISC
```

**Persona visibility per stage:**

| Stage    | PM (19 views) | Dev (8 views)          | Exec (8 views)        |
|----------|--------------|------------------------|-----------------------|
| Discover | Full access  | Spikes only            | Hidden                |
| Vision   | Full access  | Epics readonly         | OKR summary only      |
| Plan     | Full access  | Sprint + Backlog       | Roadmap readonly      |
| Build    | Full access  | Kanban + My Tasks      | Status summary        |
| Ship     | Full access  | Releases               | Dashboard + Analytics |

---

## 4. Loop 3 — Retention

```mermaid
flowchart TD
    A[User opens app] --> B[Dashboard loads\nSprint HUD visible]
    B --> C{Sprint status?}
    C -->|On track| D[My Tasks view\nDev persona default]
    C -->|At risk / overdue| E[Cadence nudge toast\ne.g. Sprint closes in 2 days]
    D --> F[Update task status\nin Kanban]
    E --> G[Ceremony engine\nSprint close prompt]
    G --> H[Sprint retro captured\nas ceremonyAudit record]
    F --> I[OKR % recalculated]
    H --> I
    I --> J[Analytics view\nvelocity + OKR progress]
    J -->|Weekly| A
```

**Retention levers today (pull-only — no push notifications):**
- Sprint HUD on dashboard
- Cadence nudge toasts (lifecycle-guide.js)
- `Alt+1/2/3` persona switching shortcut
- Number key shortcuts `0–9` for rapid view navigation
- `/` global search

---

## 5. Multi-Workspace Architecture (Shipped)

> **Hierarchy:** Workspace → Project → Track → Subtrack → Item
> **Auth boundary:** Role-based per user — each user has a configured set of `{ projectId, mode }` grants scoped to a Workspace
> **Data isolation:** One `data-{id}.json` per Workspace on GitHub
> **Projects:** Logical groupings inside a workspace's data file — no sub-file isolation per Project
> **Tracks:** Data tiers within a Project — contain Subtracks which contain Items

### 5.1 Organisational Hierarchy

| Tier | Location | UI control | Example |
|------|----------|------------|---------|
| **Workspace** | `users.json → projects[]` entry | Team-switcher (top-left dropdown) | `"Core Platform Engineering"` → `data.json` |
| **Project** | `data.json → projects[]` entry | Project-filter dropdown | `"Khyaal Platform"`, `"Pulse Analytics & CXP"` |
| **Track** | `project.tracks[]` | Track filter | `"Khyaal Platform"`, `"DevOps & Infrastructure"` |
| **Subtrack** | `track.subtracks[]` | Inline within track | `"Website"`, `"API"`, `"Backlog"` |
| **Item** | `subtrack.items[]` | Cards in all views | individual tasks |

```mermaid
flowchart TD
    WS[Workspace\ne.g. Core Platform Engineering\nusers.json → projects\ndata.json]
    WS --> P1[Project: Khyaal Platform\ndata.json → projects]
    WS --> P2[Project: Pulse Analytics and CXP\ndata.json → projects]
    WS --> P3[Project: DevOps and Infrastructure\ndata.json → projects]
    P1 --> T1A[Track: Khyaal Platform]
    P1 --> T1B[Track subtracks...]
    P2 --> T2A[Track: Pulse Analytics]
    P2 --> T2B[Track subtracks...]
    T1A --> S1A[Subtrack: Website\nSubtrack: API\nSubtrack: Backlog]
    T2A --> S2A[Subtrack: Analytics\nSubtrack: CDP]
    S1A & S2A --> I[Items\nsubtrack.items]

    WS2[Workspace\nKhyaal Mobile\ndata-mobile.json]
    WS2 --> MP1[Project: Main Project\ndata-mobile.json → projects]
    MP1 --> MT1[Tracks and Subtracks...]
```

**Key implementation detail:** Switching Workspace triggers an async Lambda fetch (`?action=read&projectId={id}`) and fully replaces `UPDATE_DATA`. Switching Project only changes the active project filter within already-loaded data — no network call.

### 5.2 Role-Based Access Model

Each user has a list of Workspace grants. Each grant specifies the Workspace (`projectId`) and the permitted mode:

```
User {
  id, name, role, email (optional)
  grants: [
    { projectId: 'default', name: 'Core Platform Engineering', mode: 'pm'   },
    { projectId: 'mobile',  name: 'Khyaal Mobile',             mode: 'dev'  }
  ]
}
```

**Rules:**
- A user with no grant for a Workspace cannot see it in the team-switcher
- The mode in the grant is the *maximum* mode — a `dev` grant cannot be elevated to PM
- An admin user (any user with `pm` grant on any workspace) can manage grants via the full-screen Admin view (`switchView('admin')`) without raw JSON edits
- If a user has exactly one accessible Workspace, the team-switcher is hidden (zero noise)

### 5.3 Data Files per Workspace

```
GitHub repo
├── users.json             ← User registry + workspace definitions (admin-managed)
├── data.json              ← Default workspace (projectId: 'default') — Core Platform Engineering
└── data-mobile.json       ← Khyaal Mobile workspace (projectId: 'mobile')
```

Lambda resolves the correct file from `users.json → projects[id].filePath`:
```
GET  ?action=read&projectId=default   → reads data.json
GET  ?action=read&projectId=mobile    → reads data-mobile.json
POST ?action=write&projectId=mobile   → writes data-mobile.json
GET  ?action=read&filePath=users.json → reads users.json (admin panel only)
POST ?action=write&filePath=users.json → writes users.json (admin panel only)
```

### 5.4 Auth + Session Flow (Role-Based)

```mermaid
sequenceDiagram
    actor U as User
    participant L as Lambda
    participant GH as GitHub (users.json)

    U->>L: POST /auth { username, password }
    L->>GH: GET users.json
    GH-->>L: User record + grants[]
    L-->>U: JWT { userId, grants: [{projectId, mode}] }
    U->>U: Project Switcher shows only\ngranteed projects
    U->>L: GET ?action=read&projectId=X\nAuthorization: Bearer JWT
    L->>L: Verify JWT grant for projectId X
    L->>GH: GET data-X.json
    GH-->>L: file content + sha
    L-->>U: { content, sha }
```

**JWT payload:**
```json
{
  "userId": "gautam",
  "grants": [
    { "projectId": "platform", "mode": "pm" },
    { "projectId": "ai-agent", "mode": "exec" }
  ],
  "exp": 1234567890
}
```

Lambda validates the JWT on every request and asserts the grant before touching the file.

### 5.5 Workspace Switcher UX

- Lives in the Strategic Ribbon header (between the KP logo and persona control) as a `<select>` element (`#team-switcher`)
- Shows only workspaces the current user has a grant for
- On switch: calls `switchProject(id)` which (1) clears `UPDATE_DATA`, (2) resets both `#global-team-filter` and `#project-filter` `dataset.populated` flags, (3) fetches fresh data from Lambda for the new workspace, (4) sets `UPDATE_DATA + _lastDataSha`, (5) calls `normalizeData()` + `renderDashboard()` to repopulate all filters and re-render all views
- Hidden when user has exactly one workspace grant (zero cognitive overhead for single-workspace users)

**Admin panel (full-screen):** accessible via Settings → "Open Admin ↗" or `switchView('admin')`. PM-only. Two tabs:
- **Users & Grants** — list/add/edit/remove users; manage workspace grants per user; Save to GitHub commits `users.json`
- **Structure** — list/add/edit/delete Projects, Tracks, and Subtracks within the active workspace's data file; Save to GitHub commits the workspace's data file

### 5.6 SaaS Path (Future)

When productized, the Org boundary becomes a separate GitHub repo + Lambda deployment per customer:

```
Customer Org A  →  GitHub repo A  +  Lambda A  →  data-{projectId}.json files
Customer Org B  →  GitHub repo B  +  Lambda B  →  data-{projectId}.json files
```

The internal data model (Team → Projects → Tracks, users.json grants) is identical. SaaS provisioning is an operational layer, not a schema change. The `deploy_auth.sh` script becomes a customer onboarding script.

---

## 6. Friction Points & Proposed Mitigations

| # | Stage | Friction | Proposed Mitigation | Effort |
|---|-------|----------|---------------------|--------|
| 1 | Auth | Shared password — no per-user identity | Role-based users.json: each user has `{ projectId, mode }` grants; Lambda issues user-scoped JWT | L |
| 2 | Onboarding | No empty-state guidance on first load | Guided empty state per lifecycle stage with CTA | S |
| 3 | Discover → Vision | No "promote idea to Epic" quick action | Quick-action button in Ideation CMS modal | S |
| 4 | Plan | Data conflict on concurrent CMS edits | Optimistic lock warning toast (check last-commit SHA before write) | M |
| 5 | Build | No blocker escalation path | Blocker strip with `B` shortcut | M |
| 6 | Ship | Analytics not linked to OKR progress | Auto-update OKR % when release is published | M |
| 7 | Retention | No notification / digest system (pure pull) | Weekly email digest via Lambda cron + SES | L |
| 8 | Navigation | No project context switcher — all data is global | Project Switcher in Strategic Ribbon; shows only user-granted projects | M |
| 9 | Auth | User granted `dev` mode can switch to PM in UI | Enforce max-mode from JWT grant — persona switcher disables modes above grant level | M |
| 10 | Data model | users.json needs admin UI — editing JSON is error-prone | Admin panel (PM-only CMS section) to manage user grants without raw JSON edits | L |

**Effort key**: S = hours, M = 1–2 days, L = 1 week, XL = multi-sprint

---

## 7. A/B Test Ideas for Conversion Optimisation

| # | Hypothesis | Control | Variant | Primary Metric |
|---|------------|---------|---------|----------------|
| 1 | Onboarding wizard reduces time-to-first-OKR | Blank canvas (current) | Step-by-step wizard (Discover → Vision guided) | First OKR created in session 1 |
| 2 | Overdue-only cadence nudges reduce toast fatigue | Toast on every login | Toast only when sprint is at-risk or overdue | Sprint closure rate within SLA |
| 3 | KPI strip default improves Exec engagement | Full dashboard (current) | KPI strip only (condensed) | Time-on-page + return visit rate |
| 4 | Persona auto-suggest reduces mode-switching | Manual persona picker | Suggest persona by GitHub team role | Mode-switch rate per session |
| 5 | Blocking sprint-close modal increases ceremony compliance | Dismissible toast | Blocking modal with required retro fields | Sprint close ceremony rate < 24h |
| 6 | Header project switcher reduces context errors | N/A (single project today) | Header dropdown vs. sidebar rail vs. breadcrumb layer | Wrong-project edit rate |

---

## 8. Architectural Note for ADR

The confirmed multi-project model (§5) drives changes across every layer:

| Layer | Change |
|-------|--------|
| **Lambda** | Accept `projectId` query param; resolve `data-{projectId}.json`; read `users.json`; validate JWT grant per request |
| **auth_gatekeeper.js** | Replace shared-password auth with user lookup in `users.json`; issue JWT with `{ userId, grants[] }` payload |
| **app.js `normalizeData()`** | Stamp `projectId` on all entities; enforce max-mode from JWT if grant is stricter than current persona |
| **cms.js** | All reads/writes include `?projectId=`; localStorage cache key scoped to `projectId` |
| **workflow-nav.js** | Project Switcher renders only user-granted projects; on switch — enforce grant mode, reload data |
| **modes.js** | Persona switcher disables modes above the user's grant level for the active project |
| **core.js** | `ACTIVE_PROJECT_ID`, `PROJECT_REGISTRY`, `CURRENT_USER` globals; `switchProject()` enforces grant |
| **users.json (new)** | User registry on GitHub; admin-managed; Lambda reads on every auth |

See `./docs/ARCHITECTURE_DECISION_RECORD.md` for the full ADR with risk mitigations.
