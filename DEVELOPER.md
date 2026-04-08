# Khyaal Engineering Pulse — Developer Reference

> Technical architecture, patterns, and how-to guides for contributors.

---

## Architecture Overview

**Zero-deployment, no-build, frontend-only SPA.** Everything runs in the browser. No Node.js, no bundler, no server. Data lives in `data.json` on GitHub, fetched via an AWS Lambda gatekeeper.

```
Browser
  └── index.html              (HTML shell + auth gatekeeper + script tags)
       ├── core.js             (constants, helpers, switchView, keyboard shortcuts)
       ├── app.js              (UPDATE_DATA, renderDashboard, normalizeData)
       ├── workflow-nav.js     (**OWNER**: Unified Strategic Ribbon, lifecycle taxonomy, WORKFLOW_STAGES)
       ├── modes.js            (PM/Dev/Exec personas, mode-based filtering, Alt+1/2/3)
       ├── views.js            (all primary view renderers + renderItem + grooming mode)
       ├── cms.js              (edit modal, GitHub sync, ceremony engine, audit system, CRUD)
       ├── lifecycle-guide.js  (QA_DEFS quick actions, gateway checks, toasts, sprint HUD, cadence nudge)
       ├── okr-module.js       (OKR view + KR progress calculation)
       ├── kanban-view.js      (Kanban drag-drop board)
       ├── dependency-view.js  (Mermaid dependency graph)
       ├── analytics.js        (Google Charts velocity/burndown)
       ├── capacity-planning.js (team workload)
       ├── dev-focus.js        (My Tasks personal view)
       ├── executive-dashboard.js (Exec KPI summary)
       └── styles.css          (full design system)
```

### Stack
- **Vanilla JS** ES6+ — no framework, no build step, no semicolons
- **Tailwind CSS** via CDN — utility classes only
- **Mermaid.js** — dependency/Gantt diagrams
- **Google Charts** — analytics charts
- **AWS Lambda** — password auth + GitHub API proxy (`auth_gatekeeper.js`)

---

## Global State: `UPDATE_DATA`

The single source of truth. All views read from this object. **Never mutate it directly except in CMS functions.**

```js
UPDATE_DATA = {
  metadata: { ...see schemas below... },
  tracks: Track[]   // The projects — primary anchor for all work
}
```

---

## Metadata Schemas

### `metadata` (top-level fields)

```json
{
  "title": "Khyaal Engineering Pulse",
  "dateRange": "23rd March - 3rd April 2026",
  "description": "Executive Updates",
  "vision": "Multi-year north-star statement for the product/company",
  "nextReview": "2026-04-10",
  "modes": {
    "default": "pm",
    "devDefaultView": "my-tasks",
    "execDefaultView": "dashboard"
  }
}
```

---

### `metadata.okrs[]` — Quarterly Objectives & Key Results

Links upward to nothing. Epics link down to OKRs via `epic.linkedOKR`.

```json
{
  "id": "okr-q1-2026-platform",     // Unique ID referenced by epics, sprints
  "quarter": "Q1 2026",             // Display label
  "objective": "Modernize platform infrastructure and achieve security excellence",
  "owner": "Platform Team",         // Display label for responsible team/person
  "status": "active",               // "active" | "achieved" | "missed" | "cancelled" — set by OKR Close ceremony
  "launchedAt": "2026-01-15",       // ISO date — set by OKR Launch ceremony (null until launched)
  "overallProgress": 99,            // 0–100 — auto-calculated or manually set
  "result": "",                     // Free text outcome note — filled at OKR Close
  "keyResults": [
    {
      "id": "kr-platform-1",
      "description": "Migrate 100% of legacy pages to new platform",
      "target": 29,                 // Numeric target value
      "current": 29,                // Current tracked value
      "unit": "pages",              // Unit label shown in UI ("pages" / "%" / "hours" / "launch" etc.)
      "progress": 100,              // 0–100 — can be auto-derived from current/target or manually overridden
      "status": "achieved",         // "on-track" | "at-risk" | "achieved" | "missed"
      "linkedEpic": "platform-modernization"  // epic.id — drives OKR progress roll-up
    }
  ]
}
```

**How OKR progress is calculated** (`okr-module.js`):  
Average of all `keyResults[].progress`. If a KR has `current` and `target`, progress = `min(100, round(current/target * 100))`.

---

### `metadata.epics[]` — Strategic Initiatives

The bridge between OKRs and delivery items. Items link to epics via `item.epicId`.

```json
{
  "id": "platform-modernization",   // Unique ID — used as item.epicId reference
  "name": "Platform Modernization Epic",
  "track": "Khyaal Platform",       // Which project this epic belongs to
  "objective": "Modernize legacy systems and enhance platform capabilities",
  "scope": "Website migration, 50Above50 improvements, CRM integration",
  "keyDeliverables": "29 pages migrated, subscription launch, security hardening",
  "successCriteria": "All pages migrated with 30% performance improvement",
  "successMetrics": "Page speed improvement 40%, revenue growth, security compliance 95%+",
  "timeline": "Feb 1 - Apr 10, 2026",
  "health": "on-track",             // "on-track" | "at-risk" | "off-track" — manual
  "status": "active",               // "active" | "in_progress" | "completed" | "cancelled" — set by ceremonies
  "linkedOKR": "okr-q1-2026-platform",  // okr.id — shown in epic card, drives OKR roll-up
  "planningHorizon": "1M",          // "1M" | "3M" | "6M" | "1Y"
  "kickedOffAt": null,              // ISO date — set by Epic Kickoff ceremony (null until kicked off)
  "usecase": "",                    // Optional user/business impact statement
  "impactLevel": "high",            // "low" | "medium" | "high"
  "strategicWeight": 80,            // 1–100 importance score
  "riskType": "technical",          // "technical" | "market" | "resource" | "dependency"
  "mediaUrl": ""                    // Optional link to Figma/doc/external resource
}
```

---

### `metadata.sprints[]` — 2-Week Iterations

Items link to sprints via `item.sprintId`.

```json
{
  "id": "sprint-4",                 // Unique ID — used as item.sprintId reference
  "name": "Enhancement Sprint",     // Display name
  "startDate": "2026-03-15",        // ISO date
  "endDate": "2026-03-28",          // ISO date
  "goal": "Complete security compliance and launch analytics capabilities",
  "tracks": ["Khyaal Platform", "Pulse", "DevOps"],  // Which projects are included
  "plannedPoints": 55,              // Story points committed at kickoff
  "completedPoints": null,          // Story points actually completed (null = in progress)
  "status": "active",               // "planned" | "active" | "completed"
  "linkedOKR": "okr-q1-2026-analytics",  // Optional — okr.id for strategic alignment
  "kickedOffAt": null,              // ISO datetime — set by Sprint Kickoff ceremony
  "sprintHistory": [],              // Append-only array of historical sprint snapshots
  "goal": ""                        // Sprint goal statement
}
```

**`sprintHistory[]` entry** (written by Sprint Close ceremony):
```json
{
  "closedAt": "2026-03-28T17:00:00.000Z",
  "completedPoints": 48,
  "plannedPoints": 52,
  "velocity": 92,
  "doneCount": 12,
  "totalCount": 15
}
```

---

### `metadata.releases[]` — Versioned Ship Milestones

Items link to releases via `item.releasedIn`.

```json
{
  "id": "v2.1-platform-foundation",  // Unique ID — used as item.releasedIn reference
  "name": "v2.1 Platform Foundation",
  "targetDate": "2026-02-28",        // ISO date — planned ship date
  "tracks": ["Khyaal Platform"],     // Which projects are included
  "features": "29 legacy pages migrated, $99 subscription launch, basic security",
  "successCriteria": "All pages migrated with 30% performance improvement",
  "impact": "Improved user experience, new revenue stream, security baseline",
  "status": "completed",             // "planned" | "in_progress" | "completed" — set by Ship Release ceremony
  "linkedEpic": "platform-modernization",  // Optional — epic.id for alignment
  "linkedOKR": "",                   // Optional — okr.id
  "lockedAt": null,                  // ISO datetime — set by Release Lock ceremony
  "shippedAt": null                  // ISO datetime — set by Ship Release ceremony
}
```

---

### `metadata.roadmap[]` — Planning Horizon Buckets

These are **bucket definitions**, not items. Items use `item.planningHorizon` to assign themselves to a bucket. The roadmap view groups items by this field.

```json
{
  "id": "1M",                        // Horizon key — matches item.planningHorizon values
  "label": "Now (Immediate / 1 Month)",
  "color": "blue",                   // Theme color for this horizon's section
  "linkedObjective": "okr-q1-2026-platform"  // Optional — okr.id for strategic context
}
```

**Standard horizon IDs**: `"1M"` (Now) · `"3M"` (Next) · `"6M"` (Later) · `"1Y"` (Future/TBD)

**Advance Horizons ceremony** shifts all items: `3M → 1M`, `6M → 3M`, `1Y → 6M` — use when a quarter rolls over.

---

### `metadata.capacity` — Team Workload Config

Used by the Capacity Planning view (`capacity-planning.js`) to calculate workload vs. availability.

```json
{
  "totalCapacity": 86,               // Sum of all teamMembers[].capacity (story points per sprint)
  "teamMembers": [
    {
      "name": "Subhrajit",           // Must match contributor names used in item.contributors[]
      "capacity": 13,                // Story points this person can handle per sprint
      "track": "Khyaal Platform",    // Which project they primarily work on
      "role": "Full Stack Engineer"  // Display label
    }
  ]
}
```

**Important**: `teamMembers[].name` must exactly match strings used in `item.contributors[]` — this is how Dev mode filtering, capacity calculation, and contributor view all work.

---

### `metadata.velocityHistory[]` — Append-Only Sprint Velocity Log

Written by the Sprint Close ceremony. Drives the Analytics view charts.

```json
{
  "sprintId": "sprint-3",            // References sprints[].id
  "planned": 52,                     // Story points committed
  "completed": 48,                   // Story points actually done
  "velocity": 92,                    // Completion % = round(completed/planned * 100)
  "dates": "Mar 1-14, 2026",         // Human-readable date range for chart labels
  "forecast": null                   // Optional — forecasted points for future sprints (null = historical)
}
```

---

### `metadata.activity[]` — Append-Only Change Log

Written by `logChange(action, target)` in `cms.js` every time a CMS operation occurs. Capped at 50 entries (oldest dropped first).

```json
{
  "id": "act-1743811200000",         // "act-" + Date.now()
  "timestamp": "2026-04-05T10:00:00.000Z",
  "action": "Edit Item",             // Human-readable action label
  "target": "Captcha implementation",// What was affected
  "author": "PM / Strategist"        // Currently hardcoded — future: currentUser
}
```

**Common `action` values**: `"Edit Item"` · `"Add Item"` · `"Edit Sprint"` · `"Edit Release"` · `"Edit Metadata"` · `"Edit Epic"` · `"Edit OKR"` · `"sprint-assign"` · `"release-assign"` · `"status-change"` · `"priority-change"` · `"Blocker Resolved"`

---

### `metadata.ceremonyAudits[]` — Ceremony History Records

Written by `saveCeremonyAudit(type, targetId, config)` in `cms.js`. Max 3 records per entity (oldest dropped). Replayed by `viewCeremonyAudit(type, targetId)`.

```json
{
  "id": "audit-1743811200000",       // "audit-" + Date.now()
  "timestamp": "2026-04-05T10:00:00.000Z",
  "type": "sprint",                  // Ceremony type — see below
  "targetId": "sprint-4",            // ID of the entity this ceremony was performed on
  "config": {
    "title": "Sprint Enhancement Sprint Closed",
    "description": "48/55 pts · 87% commitment · 12/15 tasks done",
    "mission": { "objective": "...", "track": "...", "timeline": "..." },
    "details": [{ "label": "Velocity", "count": "48 / 55 pts", "icon": "⚡" }],
    "extras": [{ "label": "Top Contributors", "value": "Subhrajit (5), Vivek (3)" }],
    "items": [{ "id": "task-id", "name": "...", "status": "done", "destination": "Shipped" }],
    "actions": []
  }
}
```

**Ceremony `type` values**: `"sprint"` · `"sprint-kickoff"` · `"okr"` · `"okr-launch"` · `"epic"` · `"epic-kickoff"` · `"release"` · `"release-lock"`

`synthesizeAudit(type, targetId)` in `cms.js` creates an audit-compatible config object from current live data — used as fallback when no saved audit exists.

---

### `metadata.customStatuses[]` — Optional Extra Status Values

Injected into `statusConfig` (core.js) at runtime by `normalizeData()`. Use to extend the 8 built-in statuses without changing core.js.

```json
[
  {
    "id": "pending-approval",        // Status key — used as item.status value
    "label": "Pending Approval",     // Display label in badges and selects
    "class": "badge-pending",        // CSS class — must be defined in styles.css
    "bucket": "bucket-onhold"        // Which kanban column bucket it groups into
  }
]
```

---

### `tracks[]` — Projects (Primary Anchor)

Tracks are the top-level project containers. Every item lives inside a track → subtrack hierarchy. The `#global-team-filter` in the app bar filters all views by track name.

```json
{
  "id": "platform",                  // URL-safe identifier
  "name": "Khyaal Platform",         // Display name — used in filter dropdown
  "theme": "blue",                   // Color theme: "blue" | "emerald" | "violet" | "amber" | "rose" | "slate"
  "subtracks": [
    {
      "name": "Website",             // Subtrack name — shown as section header in track view
      "items": [ ...Item[] ]         // All tasks in this subtrack
    },
    {
      "name": "Backlog",             // Convention: a "Backlog" subtrack is used by backlog view
      "items": []
    }
  ]
}
```

**Track → Subtrack → Item is the canonical data path**:
```js
UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex]
```

`getActiveTeam()` in `core.js` reads `#global-team-filter` value and returns the selected track name. All views use this to filter.

---

### `Item` (Task) — Full Schema

```js
{
  // Identity
  id: string,                  // Unique across ALL items — set by normalizeData() if missing
  text: string,                // Task title (required)

  // Status & Priority
  status: 'now' | 'next' | 'later' | 'qa' | 'review' | 'blocked' | 'onhold' | 'done',
  priority: 'high' | 'medium' | 'low',

  // Strategic alignment (links to metadata entities)
  epicId: string,              // → metadata.epics[].id
  sprintId: string,            // → metadata.sprints[].id
  releasedIn: string,          // → metadata.releases[].id
  planningHorizon: '1M' | '3M' | '6M' | '1Y',

  // Sizing
  storyPoints: 1 | 2 | 3 | 5 | 8 | 13 | 21,   // Fibonacci only

  // Execution
  contributors: string[],      // Names — must match capacity.teamMembers[].name
  startDate: string,           // ISO date YYYY-MM-DD
  due: string,                 // ISO date YYYY-MM-DD

  // Blocking
  blocker: boolean,
  blockerNote: string,

  // Clarity
  usecase: string,             // Why — business/user value
  acceptanceCriteria: string | string[],  // "done" definition — may be string or array
  note: string,                // Technical notes, implementation details

  // Strategic metadata (PM/Exec only — readonly in Dev mode)
  impactLevel: 'low' | 'medium' | 'high',
  effortLevel: 'low' | 'medium' | 'high',
  successMetric: string,       // How success will be measured
  strategicWeight: number,     // 1–100 importance score
  riskType: string,            // "technical" | "market" | "resource" | "dependency"
  persona: string,             // Target user persona description

  // Relationships
  dependencies: string[],      // item.id strings (other items this depends on)
  tags: string[],              // Free-form labels — filterable via tag filter bar

  // Media
  mediaUrl: string,            // Link to Figma/doc/video/PR
  publishedDate: string,       // ISO date — when shipped/published

  // Audit
  comments: Comment[],
  createdAt: string,           // ISO timestamp
  updatedAt: string            // ISO timestamp — set on every CMS save
}

Comment = {
  id: string,                  // "c-" + Date.now()
  text: string,
  author: string,              // "PM" | contributor name
  timestamp: string            // ISO timestamp
}
```

---

## Navigation System

The platform uses a **Unified Strategic Ribbon** rendered by `workflow-nav.js`. This ribbon acts as the primary lifecycle anchor.

### Unified Strategic Ribbon (`renderWorkflowNav()`)
Owned by `workflow-nav.js`. It renders the 5-stage strategic lifecycle into the app bar.
- **Cycle**: `Discover → Vision → Plan → Build → Ship`
- **Source of Truth**: `WORKFLOW_STAGES` object in `workflow-nav.js`.
- **State**: `currentWorkflowStage` persists in `localStorage['khyaal_workflow_stage']`.
- **Sync**: Switching a stage calls `switchWorkflowStage(stageKey)` which updates the ribbon and renders the appropriate sub-navigation chips.

### Tactical Sub-navigation Chips (`renderViewSubtabs(activeView)`)
Owned by `modes.js`. Renders the "outside" view chips that dynamically sync with the active strategic stage.
- **Logic**: Filters views based on `WORKFLOW_STAGES[stageId].views` and the user's `MODE_CONFIG`.
- **Aesthetic**: Matches the rounded, high-density chip style of the popover.

### Stage-to-View Mapping (`WORKFLOW_STAGES`)
The canonical mapping in `workflow-nav.js`:
```js
window.WORKFLOW_STAGES = {
  discover: {
    name: 'Discover',
    views: ['workflow', 'ideation', 'spikes']
  },
  vision: {
    name: 'Vision',
    views: ['okr', 'epics']
  },
  plan: {
    name: 'Plan',
    views: ['roadmap', 'backlog', 'sprint', 'gantt', 'capacity']
  },
  build: {
    name: 'Build',
    views: ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor', 'my-tasks']
  },
  review: {
    name: 'Ship',
    views: ['releases', 'analytics', 'dashboard']
  }
}
```
*Note: Key `review` maps to public name `Ship`.*
Override in `lifecycle-guide.js` (~line 1171):
```js
if (typeof renderStageTabs === 'function') renderStageTabs(viewId);
if (typeof renderViewSubtabs === 'function') renderViewSubtabs(viewId);
```

---

## How to Add a New View

1. **Create the renderer** (new `.js` file or add to `views.js`):
```js
function renderMyView() {
  const container = document.getElementById('my-view-view')
  if (!container) return
  const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null
  container.innerHTML = `...`
}
```

2. **Add view container** in `index.html`:
```html
<div id="my-view-view" class="view-section"></div>
```

3. **Add script tag** in `index.html` (match `?v=` version string):
```html
<script src="my-view.js?v=04031"></script>
```

4. **Add case** in `switchView()` in `core.js`:
```js
if (view === 'my-view') renderMyView();
```

5. **Add to `VIEW_METADATA`** in `modes.js`:
```js
'my-view': { label: '🔧 My View', category: 'primary' }
```

6. **Add to `STAGE_TO_VIEWS`** in `modes.js` (pick the right stage and mode):
```js
STAGE_TO_VIEWS.pm.build.push('my-view')
```

7. **Register render function** in `renderDashboard()` in `app.js`:
```js
runSafe(renderMyView, 'MyView');
```

9. **Optionally add an info card** in `VIEW_INFO_CARDS` in `lifecycle-guide.js`.

10. **Update CLAUDE.md** view table.

---

## How to Add a New Quick Action

Quick actions are defined in `QA_DEFS` in `lifecycle-guide.js` (~line 488). Three types:

```js
// Type 1: action — executes immediately on click
'my-action': {
  label: '🔧 My Action',
  type: 'action',
  exec: (item) => {
    item.status = 'now'
    item.updatedAt = new Date().toISOString()
    _qaSave()
    showHandoffToast('Action done ✓', 'View Board →', () => switchView('kanban'), 3000)
  }
}

// Type 2: dropdown — shows a select, then executes with selected value
'my-dropdown': {
  label: '📦 Assign Sprint',
  type: 'dropdown',
  opts: () => (window.UPDATE_DATA?.metadata?.sprints || []).filter(s => s.status !== 'completed'),
  optLabel: s => s.name,
  optValue: s => s.id,          // optional, defaults to s.id
  exec: (item, selectedId) => {
    item.sprintId = selectedId
    _qaSave()
    showHandoffToast('Sprint assigned ✓')
  }
}

// Type 3: inline-date — shows a date picker, then executes with selected date string
'my-date': {
  label: '📅 Set Due Date',
  type: 'inline-date',
  exec: (item, val) => {
    if (!val) return
    item.due = val
    _qaSave()
    showHandoffToast(`Due: ${val} ✓`)
  }
}
```

Then add the action ID to `getQuickActions(item, viewId)` for the right view/status:
```js
if (viewId === 'sprint' && s === 'now') acts.push('my-action')
```

Assign a pill color in `QA_PILL_CLASS`:
```js
'my-action': 'qa-pill-transit'  // transit=blue, qa=amber, review=purple, done=green, assign=indigo, warn=red
```

---

## How to Add a New Ceremony

Ceremonies open a modal, execute an action, record an audit, then show a success screen.

### 1. Trigger button in view ribbon/card
```js
<button onclick="myNewCeremony('${entity.id}')" class="...">🎉 Kick Off</button>
```

### 2. Ceremony modal function in `cms.js`
```js
function myNewCeremony(entityId) {
  const entity = (UPDATE_DATA.metadata.myEntities || []).find(e => e.id === entityId)
  if (!entity) return
  window.isActionLockActive = true

  const modal = document.createElement('div')
  modal.id = 'ceremony-modal'
  modal.className = 'ceremony-modal-overlay'
  modal.innerHTML = `<div class="modal-inner">
    <div class="modal-header">
      <h2>🎉 Kick Off: ${entity.name}</h2>
      <button onclick="closeCeremonyModal()" class="modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <!-- summary stats, warnings, confirmations -->
    </div>
    <div class="modal-footer">
      <button onclick="closeCeremonyModal()" class="cms-btn cms-btn-secondary">Cancel</button>
      <button onclick="confirmMyNewCeremony('${entityId}')" class="cms-btn cms-btn-primary">
        🎉 Confirm Kickoff
      </button>
    </div>
  </div>`
  document.body.appendChild(modal)
}
```

### 3. Confirmation function
```js
function confirmMyNewCeremony(entityId) {
  const entity = (UPDATE_DATA.metadata.myEntities || []).find(e => e.id === entityId)
  entity.status = 'active'
  entity.startedAt = new Date().toISOString().split('T')[0]

  // Build audit config
  const auditConfig = synthesizeAudit('my-ceremony', entityId)  // or build manually

  // Save ceremony audit
  saveCeremonyAudit('my-ceremony', entityId, auditConfig)

  closeCeremonyModal()
  saveToLocalStorage()
  renderDashboard()
  renderCeremonySuccess('my-ceremony', auditConfig, false)
}
```

### 4. Add normalization in `app.js normalizeData()`
```js
if (UPDATE_DATA.metadata.myEntities) {
  UPDATE_DATA.metadata.myEntities.forEach(e => {
    if (!e.status) e.status = 'planned'
    if (e.startedAt === undefined) e.startedAt = null
  })
}
```

---

## The 4-Pillar CMS Field System

Defined in `FIELD_GROUPS` in `cms.js` (~line 114):

```js
const FIELD_GROUPS = {
  what:  ['text', 'usecase', 'epicId', 'persona', 'tags'],
  when:  ['planningHorizon', 'sprintId', 'startDate', 'due', 'releasedIn', 'publishedDate'],
  where: ['status', 'contributors', 'blockerNote', 'dependencies', 'note', 'mediaUrl'],
  how:   ['storyPoints', 'priority', 'acceptanceCriteria', 'impactLevel', 'effortLevel',
          'successMetric', 'strategicWeight', 'riskType']
}
```

### Persona visibility
- **PM**: [what, when, where, how] — all 4 in strategy-first order
- **Dev**: [where, how, what, when] — all 4, execution-first; strategic fields readonly
- **Exec**: [what, when, where] — no HOW pillar

### View layer: `LIFECYCLE_FIELD_MAP` (~line 148)
Controls which fields show by default per view (before "Show All" toggle). Views not in this map show all fields.

### Adding a new field
```
1. Add case in renderField() (~line 452):
   case 'myField':
     return `<div class="field-wrapper">
       <label class="cms-label">My Field</label>
       <input type="text" id="edit-myField" value="${item.myField || ''}" class="cms-input" ${attr}>
     </div>`

2. Add to correct FIELD_GROUPS pillar

3. Add to LIFECYCLE_FIELD_MAP views where it makes sense

4. Read back in saveCmsChanges():
   item.myField = document.getElementById('edit-myField')?.value || ''

5. Add default in app.js normalizeData():
   if (item.myField === undefined) item.myField = ''
```

### Developer-protected fields (readonly in dev mode)
Controlled by `isFieldProtected()` (cms.js ~line 793):
`epicId, impactLevel, successMetric, acceptanceCriteria, planningHorizon, releasedIn, strategicWeight, riskType, effortLevel, publishedDate, priority, usecase, persona, sprintId`

---

## Lifecycle Ceremony Audit System

Every ceremony is recorded in `metadata.ceremonyAudits[]`.

### `saveCeremonyAudit(type, targetId, config)` — cms.js:48
Appends audit record. Caps at 3 per entity (oldest dropped).

### `synthesizeAudit(type, targetId)` — cms.js:99
Builds a rich audit object from current live data. Handles these types:
- `sprint` / `sprint-kickoff` — velocity, commitment %, contributor breakdown
- `okr` / `okr-launch` — KR hit rate, linked epics, strategic breadth
- `epic` / `epic-kickoff` — task throughput, story points, top contributors
- `release` / `release-lock` — items shipped, epics covered, QA/review counts

### `renderCeremonySuccess(type, config, isHistorical)` — cms.js
Renders the ceremony result full-screen view with color accent bar, stats, item rows, and action buttons.

### `viewCeremonyAudit(type, targetId)` — cms.js:71
Reopens a historical ceremony audit from `ceremonyAudits[]`. Falls back to `synthesizeAudit()` if no saved record.

---

## Persona Filter System

### `getModeFilter()` — modes.js
Returns a filter function based on current mode:
```js
// Dev mode: only items assigned to currentUser
(item) => item.contributors?.includes(currentUser)

// Exec mode: only high-priority, active, or blocked
(item) => item.priority === 'high' || item.status === 'now' || item.blocker === true

// PM mode: null (no filter — sees everything)
```

### `shouldShowManagement()` — views.js
Returns `true` if the user is in CMS mode (authenticated + `?cms=true` param). Controls edit/delete/add buttons.

### Applying filters in a view renderer
```js
function renderMyView() {
  const container = document.getElementById('my-view-view')
  if (!container) return

  const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null
  let items = UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items))
  if (modeFilter) items = items.filter(modeFilter)

  container.innerHTML = `...`
}
```

---

## Gateway Check System

Validates preconditions before quick actions execute.

### `runGatewayCheck(actionId, item)` — lifecycle-guide.js
Returns `{ blocked: bool, msg: string, warn: string }`:
- `blocked: true` → action prevented, shows error toast
- `warn: string` → soft warning, shows "Continue anyway →" toast

### Adding a gateway check
In `GATEWAY_CHECKS` in `lifecycle-guide.js`:
```js
'my-action': (item) => {
  if (!item.storyPoints) return { warn: 'No size estimate — add story points first' }
  if (!item.epicId)      return { blocked: true, msg: 'No epic linked — connect to a strategic goal first' }
  return {}
}
```

---

## Save Chain

```
User edits in modal
  → saveCms()
    → validateCmsForm()     [abort if invalid]
    → saveCmsChanges()      [writes to UPDATE_DATA in memory]
    → saveToLocalStorage()  [persists to browser localStorage as JSON string]
    → renderDashboard()     [re-renders all views from UPDATE_DATA]

  [User clicks "Save to GitHub" in CMS bar]
    → saveToGithub()
      → GET sha from GitHub API   [required to update existing file]
      → PUT new content to GitHub API
```

### Key globals
- `window.isActionLockActive = true` — set during modal ops to prevent background renders; **always reset in finally or on close**
- `window.editContext` — holds `{type, trackIndex, subtrackIndex, itemIndex}` for current edit
- `window.currentActiveView` — current view ID string, updated by `switchView()`
- `localStorage['khyaal_mode']` — persists mode across page loads
- `localStorage['khyaal_current_user']` — persists dev mode user selection
- `localStorage['khyaal_site_auth']` — persists site auth hash
- `localStorage['khyaal_data']` — cached UPDATE_DATA as JSON

---

## CSS Design System

### Variables (`:root` in `styles.css`)

**Status semantic tokens** (for all 8 statuses):
```css
--status-{name}-bg, --status-{name}-text, --status-{name}-border, --status-{name}-accent
/* names: done, now, next, later, blocked, onhold, qa, review */

/* On-Hold uses teal to distinguish from Later (slate): */
--status-onhold-bg:    #f0fdfa;
--status-onhold-text:  #0f766e;
--status-onhold-border:#99f6e4;
```

**Lifecycle stage colors**:
```css
--stage-discover: #7c3aed  /* Purple  — 🔍 Discover */
--stage-goals:    #4f46e5  /* Indigo  — 🌟 Vision */
--stage-plan:     #2563eb  /* Blue    — 📐 Plan */
--stage-build:    #059669  /* Green   — ⚡ Build */
--stage-ship:     #d97706  /* Amber   — 🏁 Ship */
```

**Surface layers** (glassmorphism):
```css
--surface-base:    #f8fafc
--surface-card:    rgba(255,255,255,0.88)
--surface-overlay: rgba(255,255,255,0.92)
```

**Border radius scale**: `--radius-sm` (8px) · `--radius-md` (12px) · `--radius-lg` (16px) · `--radius-xl` (20px) · `--radius-2xl` (24px) · `--radius-pill` (9999px)

### Button scale
```css
.btn-xs  /* 0.65rem, 3px 8px padding, 7px radius */
.btn-sm  /* 0.75rem, 5px 12px, 9px radius */
.btn-md  /* 0.8rem,  7px 16px, 10px radius */
.btn-lg  /* 0.875rem, 9px 20px, 12px radius */
```

### Key component classes
```css
/* Navigation */
.app-bar, .app-bar-left, .app-bar-right, .app-bar-stages
.stage-tab, .stage-tab-active, .stage-tab-done, .stage-tab-check
.view-subtabs-bar, .view-subtab, .view-subtab-active
.mode-seg-control, .mode-seg-btn, .mode-seg-active
.kp-logo, .project-select, .app-bar-gear

/* Item cards */
.item-row           /* Task card wrapper */
.status-pill        /* Status badge */
.badge-*            /* Status-colored badges (badge-done, badge-now, etc.) */
.item-action-btn    /* Edit/Delete/Blocker buttons */

/* CMS */
.cms-btn, .cms-btn-primary, .cms-btn-secondary, .cms-btn-danger
.cms-input, .cms-label, .cms-modal-overlay

/* Quick actions */
.qa-pill            /* Base quick action pill */
.qa-pill-transit    /* Blue — status transitions */
.qa-pill-qa         /* Amber — QA actions */
.qa-pill-review     /* Purple — review actions */
.qa-pill-done       /* Green — completion */
.qa-pill-assign     /* Indigo — assignment */
.qa-pill-warn       /* Red — warnings/blockers */

/* Toasts */
.lgt               /* Handoff toast container */
.lgi-card          /* Info card */

/* Ceremonies */
.ceremony-modal-overlay
.ceremony-success-view

/* Grooming */
.grooming-session-bar
.groom-badge, .groom-done, .groom-todo, .groom-none

/* Dev user modal */
.dev-user-modal-overlay, .dev-user-modal-card, .dev-user-btn
```

---

## Common Patterns

### Find an item by ID
```js
const { item, trackIndex, subtrackIndex, itemIndex } = findItemById(itemId)  // cms.js
```

### Find item by index path
```js
const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii]
```

### Get all items flat
```js
// From lifecycle-guide.js:
_getAllItemsFlat()

// Or inline:
UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items))
```

### Find all items linked to a metadata entity
```js
// From cms.js — finds items where item[field] === id
findItemsByMetadataId('epicId', 'platform-modernization')
findItemsByMetadataId('sprintId', 'sprint-4')
findItemsByMetadataId('releasedIn', 'v2.1-platform-foundation')
```

### Log a change to activity feed
```js
logChange('Updated sprint assignment', item.text)  // cms.js
```

### Re-render after mutating data
```js
saveToLocalStorage()
renderDashboard()
```

### Switch to a view programmatically
```js
switchView('kanban')  // core.js — triggers render + stage tab + subtab update
```

### Show a handoff toast
```js
// (message, ctaLabel, ctaFn, durationMs)
showHandoffToast('Sprint closed ✓', 'View Analytics →', () => switchView('analytics'), 4000)
showHandoffToast('No sprint active', null, null, 3000)  // no CTA
```

---

## Common Gotchas

1. **`window.isActionLockActive = true` stuck** — if you forget to reset this after a modal op, `renderDashboard()` silently skips. Always reset in `finally` or on modal close. Debug: open console, run `window.isActionLockActive = false; renderDashboard()`.

2. **Don't mutate `UPDATE_DATA` outside cms.js** — views should only read. Write via CMS functions to keep the save chain intact.

3. **New fields need `normalizeData()` defaults** — historical items won't have new fields. Always add `if (item.myField === undefined) item.myField = ''` in `app.js normalizeData()`.

4. **Tag widget fields** (contributors, tags, dependencies) use `window['selection_${fieldId}']` as the return value, not `getElementById`. They render their own custom widget.

5. **`saveToGithub()` needs GET sha first** — GitHub API requires the file's current SHA to update it. The function handles this automatically — don't try to PUT directly.

6. **Tailwind dynamic class names** — don't build class strings dynamically like `` `grid-cols-${n}` ``. Tailwind purges unused classes. Use inline styles or explicit class names.

7. **View not appearing in sub-tabs** — check `STAGE_TO_VIEWS` in `modes.js`. A view must be listed for the current mode + stage to appear in sub-tabs. `VIEW_METADATA` must also have an entry for the view ID.

8. **Sprint HUD** — mounts into `#sprint-ribbon-hud` (inside sprint view ribbon). Falls back to `#sprint-hud-mount` (legacy). If HUD doesn't appear, check the sprint view is rendering the mount point.

9. **Cache-busting** — all `<script>` tags use `?v=04031`. When adding new JS files, match this version string exactly. Data fetched with `?v=${Date.now()}` for always-fresh loads.

10. **`?cms=true` alone is not enough** — user must also be GitHub-authenticated (PAT entered) for `shouldShowManagement()` to return `true`. The URL param just surfaces the login UI.

11. **`acceptanceCriteria` is string or array** — some items have it as a newline-separated string, others as an array. Always handle both: `Array.isArray(ac) ? ac.join('\n') : (ac || '')`.

12. **`getActiveTeam()`** — reads from `#global-team-filter` by element ID. This works because the same element ID is used in the app bar after the redesign. If you ever rename the element, update `getActiveTeam()` in `core.js`.

---

## Deployment

### Files to host (GitHub Pages or any CDN)
All `.html`, `.js`, `.css` files. No build step — serve them as-is.

### AWS Lambda (`auth_gatekeeper.js`)
Handles:
1. Password hash validation (prevents unauthenticated access)
2. Fetching `data.json` from the private GitHub repo
3. Forwarding GitHub PAT calls for CMS save operations

**Environment variables**:
- `EXPECTED_PASSWORD_HASH` — SHA-256 hex of the site password
- `GITHUB_TOKEN` — GitHub PAT with `repo` scope for data.json access

**`index.html` constants** (update these after Lambda deploy):
- `LAMBDA_URL` — the Lambda function URL
- GitHub repo owner/name for the `saveToGithub()` PUT path

### One-time setup
```sh
sh deploy_auth.sh    # deploys Lambda + sets env vars
# Then update LAMBDA_URL in index.html inline script
```

---

## Adding a New Metadata Entity Type

Example: adding a `risks[]` array to metadata.

```
1. Add to data.json metadata section:
   "risks": []

2. Add normalization in app.js normalizeData():
   if (!UPDATE_DATA.metadata.risks) UPDATE_DATA.metadata.risks = []
   UPDATE_DATA.metadata.risks.forEach(r => {
     if (!r.id) r.id = `risk-${Date.now()}`
     if (!r.status) r.status = 'open'
   })

3. Add modal editor in cms.js:
   function openRiskEdit(riskId) { ... }
   function saveRiskEdit() { ... }
   // Follow pattern of openEpicEdit() / openSprintEdit()

4. Add CMS controls in appropriate view ribbon (views.js):
   <button onclick="openRiskEdit()">+ Add Risk</button>

5. Optionally add a quick action in lifecycle-guide.js:
   'link-risk': { label: '⚠️ Link Risk', type: 'dropdown', ... }

6. Add normalizeData() defaults for any lifecycle fields:
   if (r.kickedOffAt === undefined) r.kickedOffAt = null
```

---

*For end-user documentation, see [GUIDE.md](GUIDE.md).*
