# Khyaal Engineering Pulse — Developer Reference

> Technical architecture, patterns, and how-to guides for contributors.

---

## Architecture Overview

**Zero-deployment, no-build, frontend-only SPA.** Everything runs in the browser. No Node.js, no bundler, no server. Data lives in `data.json` on GitHub, fetched via an AWS Lambda gatekeeper.

```
Browser
  └── index.html          (HTML shell + auth gatekeeper + script tags)
       ├── core.js         (constants, helpers, global config)
       ├── app.js          (UPDATE_DATA, renderDashboard, switchView, normalizeData)
       ├── modes.js        (PM/Dev/Exec personas, stage tabs, nav)
       ├── views.js        (all primary view renderers)
       ├── cms.js          (edit modal, GitHub sync, CRUD)
       ├── lifecycle-guide.js  (quick actions, ceremonies, toasts, gateway checks)
       ├── workflow-nav.js (Engineering Playbook popover)
       ├── okr-module.js   (OKR view)
       ├── kanban-view.js  (Kanban drag-drop board)
       ├── dependency-view.js (Mermaid dependency graph)
       ├── analytics.js    (Google Charts velocity/burndown)
       ├── capacity-planning.js (team workload)
       ├── dev-focus.js    (My Tasks personal view)
       ├── executive-dashboard.js (Exec KPI summary)
       └── styles.css      (full design system, all component CSS)
```

### Stack
- **Vanilla JS** ES6+ — no framework, no build step
- **Tailwind CSS** via CDN — utility classes only
- **Mermaid.js** — dependency/Gantt diagrams
- **Google Charts** — analytics charts
- **AWS Lambda** — password auth + GitHub API proxy (`auth_gatekeeper.js`)

---

## Global State: `UPDATE_DATA`

The single source of truth. All views read from this object. Never mutate it directly except in CMS functions.

```js
UPDATE_DATA = {
  metadata: {
    title: string,
    dateRange: string,
    description: string,
    nextReview: string,
    modes: { default: 'pm' | 'dev' | 'exec' },
    
    okrs: OKR[],         // Quarterly Objectives + Key Results
    epics: Epic[],       // Strategic initiatives
    sprints: Sprint[],   // 2-week iterations
    releases: Release[], // Versioned ship milestones
    roadmap: Horizon[],  // Planning horizon metadata
    
    capacity: {
      teamMembers: string[],  // All contributor names
      hoursPerDay: number,
      sprintDays: number
    },
    velocityHistory: VelocityEntry[],  // Append-only sprint velocity log
    activity: ActivityEntry[],         // Append-only change log
    ceremonyAudits: CeremonyAudit[],   // Append-only ceremony records
    customStatuses: CustomStatus[],    // Optional extra status values
  },
  
  tracks: Track[]  // The projects — primary anchor for all work
}
```

### Track (Project)
```js
Track = {
  id: string,        // e.g., 'mobile', 'backend'
  name: string,      // Display name e.g., 'Mobile'
  theme: string,     // Color key: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate'
  subtracks: Subtrack[]
}

Subtrack = {
  name: string,       // e.g., 'Now', 'Backlog', 'Sprint 12'
  items: Item[]
}
```

### Item (Task)
```js
Item = {
  id: string,                  // Unique — set by normalizeData() if missing
  text: string,                // Task title (required)
  status: Status,              // now | next | later | qa | review | blocked | onhold | done
  priority: 'high' | 'medium' | 'low',
  
  // Strategic alignment
  epicId: string,              // Links to metadata.epics[].id
  sprintId: string,            // Links to metadata.sprints[].id
  releasedIn: string,          // Links to metadata.releases[].id
  planningHorizon: '1M' | '3M' | '6M' | '1Y',
  
  // Sizing
  storyPoints: 1 | 2 | 3 | 5 | 8 | 13 | 21,   // Fibonacci only
  
  // Execution
  contributors: string[],      // Names matching capacity.teamMembers[]
  startDate: string,           // ISO date YYYY-MM-DD
  due: string,                 // ISO date YYYY-MM-DD
  
  // Blocking
  blocker: boolean,
  blockerNote: string,
  
  // Clarity
  usecase: string,             // Why — business value
  acceptanceCriteria: string,  // What "done" looks like
  note: string,                // Any additional context
  
  // Strategic metadata (PM/Exec only)
  impactLevel: 'low' | 'medium' | 'high',
  effortLevel: 'low' | 'medium' | 'high',
  successMetric: string,
  strategicWeight: number,     // 1–10 importance score
  riskType: string,
  persona: string,             // Target user persona
  
  // Relationships
  dependencies: string[],      // item.id strings
  tags: string[],
  
  // Media
  mediaUrl: string,
  publishedDate: string,
  
  // Audit
  updatedAt: string,           // ISO timestamp
  comments: Comment[]
}
```

---

## File Map & Ownership

| File | Owns |
|------|------|
| `index.html` | HTML shell, auth gatekeeper, script tags, view containers |
| `app.js` | `UPDATE_DATA`, `renderDashboard()`, `switchView()`, `normalizeData()`, search |
| `core.js` | `statusConfig`, `contributorColors`, `themeColors`, `getActiveTeam()`, `updateTabCounts()`, `renderBlockerStrip()` |
| `modes.js` | Personas, `STAGE_TO_VIEWS`, `renderStageTabs()`, `renderViewSubtabs()`, `renderModeSwitcher()`, mode filter logic |
| `views.js` | All primary view renderers, `renderItem()`, `renderPrimaryStageAction()`, grooming mode |
| `cms.js` | `openItemEdit()`, `addItem()`, `saveCms()`, `saveToGithub()`, `deleteItem()`, 4-pillar form, metadata editors, ceremony modals |
| `lifecycle-guide.js` | `QA_DEFS` quick actions, `getQuickActions()`, `renderQuickActionBar()`, `VIEW_INFO_CARDS`, `showHandoffToast()`, gateway checks, sprint HUD, cadence nudge |
| `workflow-nav.js` | Engineering Playbook popover, `WORKFLOW_STAGES` |

---

## Navigation System

The app bar has two rows rendered by `modes.js`:

### Stage Tabs (`renderStageTabs(activeView)`)
Renders 5 lifecycle stage buttons into `#stage-tabs`. Each tab:
- Shows stage icon + label
- Highlights in stage color when active
- Shows ✓ when `checkStageCompletion(stageId)` returns true
- Calls `switchStage(key)` on click → switches to stage's primary view

```js
// STAGE_TO_VIEWS defines which views appear in each stage per mode:
STAGE_TO_VIEWS.pm.build = ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor']
// Dev mode has fewer views per stage
// Exec mode skips Build entirely
```

### View Sub-tabs (`renderViewSubtabs(activeView)`)
Renders the views within the current stage into `#view-subtabs`. Hidden when a stage has only one view. IDs match `VIEW_METADATA` keys. Tab counts rendered by `updateTabCounts()` in core.js.

### Both update on every `switchView()` call:
The override in `lifecycle-guide.js` (~line 1171) calls these after every view switch:
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
  // build HTML string
  container.innerHTML = `...`
}
```

2. **Add view container** in `index.html`:
```html
<div id="my-view-view" class="view-section"></div>
```

3. **Add script tag** in `index.html`:
```html
<script src="my-view.js?v=04031"></script>
```

4. **Add case** in `switchView()` in `app.js`:
```js
case 'my-view': renderMyView(); break;
```

5. **Add to `VIEW_METADATA`** in `modes.js`:
```js
'my-view': { label: '🔧 My View', category: 'primary' }
```

6. **Add to `STAGE_TO_VIEWS`** in `modes.js` (under the right stage and mode):
```js
STAGE_TO_VIEWS.pm.build.push('my-view')
```

7. **Add to `MODE_CONFIG.availableViews`** for relevant modes.

8. **Register render function** in `renderDashboard()` in `app.js`:
```js
runSafe(renderMyView, 'MyView');
```

9. **Optionally add an info card** in `VIEW_INFO_CARDS` in `lifecycle-guide.js`.

10. **Update CLAUDE.md** view table.

---

## How to Add a New Quick Action

Quick actions are defined in `QA_DEFS` in `lifecycle-guide.js` (~line 488).

```js
// Action type — executes immediately
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

// Dropdown type — shows a select before executing
'my-dropdown': {
  label: '📦 My Dropdown',
  type: 'dropdown',
  opts: () => (window.UPDATE_DATA?.metadata?.sprints || []).filter(s => s.status !== 'completed'),
  optLabel: s => s.name,
  exec: (item, selectedId) => {
    item.sprintId = selectedId
    _qaSave()
    showHandoffToast('Assigned ✓')
  }
}

// Inline date picker type
'my-date': {
  label: '📅 Set Date',
  type: 'inline-date',
  exec: (item, val) => {
    if (!val) return
    item.due = val
    _qaSave()
    showHandoffToast(`Date set: ${val} ✓`)
  }
}
```

Then add the action ID to `getQuickActions()` for the right view/status combinations:
```js
// In getQuickActions(item, viewId):
if (viewId === 'sprint' && s === 'now') {
  acts.push('my-action')
}
```

Assign a pill color in `QA_PILL_CLASS`:
```js
'my-action': 'qa-pill-transit'  // blue, green, amber, red, orange — see styles.css
```

---

## How to Add a New Ceremony

Ceremonies are lifecycle milestone events. They open a modal, execute an action, and record an audit. Pattern:

### 1. Add the trigger button to the relevant view
In the view's ribbon or card controls (views.js or the module file):
```js
<button onclick="myNewCeremony('${entity.id}')" class="...">🎉 Kick Off</button>
```

### 2. Create the ceremony modal function in `cms.js`
```js
function myNewCeremony(entityId) {
  const entity = findEntityById(entityId)
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

### 3. Create the confirmation function
```js
function confirmMyNewCeremony(entityId) {
  const entity = findEntityById(entityId)
  entity.status = 'active'
  entity.startedAt = new Date().toISOString().split('T')[0]

  // Record ceremony audit
  const auditConfig = {
    type: 'my-ceremony',
    title: `My Ceremony — ${entity.name}`,
    timestamp: new Date().toISOString(),
    entityId,
    // ...any extra fields
  }
  const audit = synthesizeAudit(auditConfig)
  window.UPDATE_DATA.metadata.ceremonyAudits.push(audit)

  closeCeremonyModal()
  saveToLocalStorage()
  renderDashboard()
  showHandoffToast(`${entity.name} kicked off ✓`, null, null, 3000)
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

The item edit modal organizes fields into 4 semantic pillars. Defined in `FIELD_GROUPS` in `cms.js` (~line 114):

```js
const FIELD_GROUPS = {
  what:  ['text', 'usecase', 'epicId', 'persona', 'tags'],
  when:  ['planningHorizon', 'sprintId', 'startDate', 'due', 'releasedIn', 'publishedDate'],
  where: ['status', 'contributors', 'blockerNote', 'dependencies', 'note', 'mediaUrl'],
  how:   ['storyPoints', 'priority', 'acceptanceCriteria', 'impactLevel', 'effortLevel', 'successMetric', 'strategicWeight', 'riskType']
}
```

### Persona visibility
- **PM**: [what, when, where, how]
- **Dev**: [where, how, what, when] — strategic fields read-only
- **Exec**: [what, when, where] — no HOW pillar

### View layer: `LIFECYCLE_FIELD_MAP` (~line 148)
Controls which fields are shown by default in each view (before "Show All" toggle).

### Adding a new field to the form
```
1. Add case in renderField() (~line 452):
   case 'myField':
     return `<div class="field-wrapper">
       <label class="cms-label">My Field</label>
       <input type="text" id="edit-myField" value="${item.myField || ''}" class="cms-input" ${attr}>
     </div>`

2. Add to FIELD_GROUPS pillar (choose the right pillar)

3. Add to LIFECYCLE_FIELD_MAP views where it makes sense

4. Read back in saveCmsChanges():
   item.myField = document.getElementById('edit-myField')?.value || ''

5. Add default in app.js normalizeData():
   if (item.myField === undefined) item.myField = ''
```

---

## Lifecycle Ceremony Audit System

Every ceremony is recorded as an audit entry in `metadata.ceremonyAudits[]`.

### `synthesizeAudit(config)` in `cms.js`
Builds a rich audit object from a config. Handles these ceremony types:
- `sprint` / `sprint-kickoff`
- `okr` / `okr-launch`
- `epic` / `epic-kickoff`
- `release` / `release-lock`
- `roadmap`

### `renderCeremonySuccess(audit)` in `cms.js`
Renders the ceremony result view — shown immediately after a ceremony completes:
- Color accent bar (ceremony-type specific)
- Historical date badge
- Extras section (velocity trend, contributors, etc.)
- Enhanced item rows (status + destination + id)

### `viewCeremonyAudit(auditId)` in `cms.js`
Reopens a historical ceremony audit modal from the audit list.

---

## Persona Filter System

### `getModeFilter()` in `modes.js`
Returns a filter function based on current mode:
```js
// Dev mode: only items assigned to currentUser
(item) => item.contributors?.includes(currentUser)

// Exec mode: only high-priority, active, or blocked
(item) => item.priority === 'high' || item.status === 'now' || item.blocker === true

// PM mode: null (no filter — sees everything)
```

### `shouldShowManagement()` in `views.js`
Returns `true` if the user is in CMS mode (authenticated + `?cms=true` param). Controls whether edit/delete/add buttons appear.

### Applying filters in a view renderer
```js
function renderMyView() {
  const container = document.getElementById('my-view-view')
  if (!container) return

  const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null
  let items = getAllItems()  // your helper to get all items flat
  if (modeFilter) items = items.filter(modeFilter)

  // Exec filter banner (shows count + "show all" toggle)
  const allItems = getAllItems()
  const filteredHtml = renderExecFilterBanner(items.length, allItems.length, 'my-view')

  container.innerHTML = filteredHtml + `...your view HTML...`
}
```

---

## Gateway Check System

Before executing some quick actions, a gateway check validates preconditions.

### `runGatewayCheck(actionId, item)` in `lifecycle-guide.js`
Returns `{ blocked: bool, msg: string, warn: string }`:
- `blocked` → action prevented entirely, shows error toast
- `warn` → soft warning, shows toast with "Continue anyway →" CTA

### Adding a new gateway check
In the `GATEWAY_CHECKS` object in `lifecycle-guide.js`:
```js
'my-action': (item) => {
  if (!item.storyPoints) return { warn: 'Task has no size estimate — add story points first' }
  if (!item.epicId)      return { blocked: true, msg: 'No epic linked — connect this to a strategic goal first' }
  return {}
}
```

---

## Save Chain

Understanding the full save flow prevents data loss:

```
User edits in modal
  → saveCms()
    → validateCmsForm()    [abort if invalid]
    → saveCmsChanges()     [writes to UPDATE_DATA in memory]
    → saveToLocalStorage() [persists to browser localStorage as JSON]
    → renderDashboard()    [re-renders all views from UPDATE_DATA]
      [User clicks "Save to GitHub" in CMS bar]
        → saveToGithub()
          → GET sha from GitHub API  [required to update existing file]
          → PUT new content to GitHub API
```

### Key globals
- `window.isActionLockActive = true` — set during modal ops to prevent background renders
- `window.editContext` — holds `{type, trackIndex, subtrackIndex, itemIndex}` for current edit
- `localStorage['khyaal_mode']` — persists current mode across page loads
- `localStorage['khyaal_current_user']` — persists dev mode user selection
- `localStorage['khyaal_site_auth']` — persists site auth hash

---

## CSS Design System

### Variables (`:root` in `styles.css`)

**Status semantic tokens** (for all 8 statuses):
```css
--status-{name}-bg, --status-{name}-text, --status-{name}-border, --status-{name}-accent
/* names: done, now, next, later, blocked, onhold, qa, review */
```

**Lifecycle stage colors**:
```css
--stage-discover: #7c3aed  /* Purple */
--stage-goals:    #4f46e5  /* Indigo */
--stage-plan:     #2563eb  /* Blue */
--stage-build:    #059669  /* Green */
--stage-ship:     #d97706  /* Amber */
```

**Surface layers** (glassmorphism):
```css
--surface-base:    #f8fafc
--surface-card:    rgba(255,255,255,0.88)
--surface-overlay: rgba(255,255,255,0.92)
```

**Shadow scale**: `--shadow-xs` through `--shadow-xl`

**Border radius scale**: `--radius-sm` (8px) through `--radius-2xl` (24px), `--radius-pill` (9999px)

### Button scale (new unified system)
```css
.btn-xs  /* 0.65rem, 3px 8px padding */
.btn-sm  /* 0.75rem, 5px 12px */
.btn-md  /* 0.8rem,  7px 16px */
.btn-lg  /* 0.875rem, 9px 20px */
```

### Key component classes
```css
.item-row          /* Task card wrapper */
.status-pill       /* Status badge (done/now/next etc.) */
.badge-*           /* Status-colored badges */
.item-action-btn   /* Edit/Delete/Blocker buttons on cards */
.cms-btn, .cms-btn-primary, .cms-btn-secondary, .cms-btn-danger  /* Modal buttons */
.qa-pill           /* Quick action pill */
.qa-pill-transit/qa/review/done/assign/warn  /* Color families */
.lgt               /* Handoff toast container */
.lgi-card          /* Info card */
.stage-tab         /* App bar stage tab */
.view-subtab       /* Sub-tab row button */
.mode-seg-control, .mode-seg-btn, .mode-seg-active  /* Mode switcher */
.groom-badge, .groom-done, .groom-todo, .groom-none  /* Grooming readiness */
.grooming-session-bar  /* Grooming mode header */
```

---

## Common Patterns

### Find an item by ID
```js
// From cms.js:
const { item, trackIndex, subtrackIndex, itemIndex } = findItemById(itemId)
```

### Find item by track/subtrack/item index
```js
const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii]
```

### Log a change to activity feed
```js
logChange('Updated sprint assignment', item.text)  // from cms.js
```

### Get all items flat
```js
// From lifecycle-guide.js:
_getAllItemsFlat()

// Or build your own:
UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items))
```

### Re-render after mutating data
```js
saveToLocalStorage()
renderDashboard()
```

### Switch to a view programmatically
```js
switchView('kanban')  // triggers view render + stage tab + subtab update
```

---

## Common Gotchas

1. **`window.isActionLockActive = true`** — if you forget to reset this after a modal op, `renderDashboard()` will stop working. Always reset in `finally` or after close.

2. **Don't mutate `UPDATE_DATA` outside of cms.js** — views should only read from it. Write via CMS functions.

3. **New fields need `normalizeData()` defaults** — historical items won't have new fields. Always add: `if (item.myField === undefined) item.myField = ''` in `app.js normalizeData()`.

4. **Tag widget fields** (contributors, tags, dependencies) use `window['selection_${fieldId}']` as the return value, not `getElementById`. Don't try to read them with `getElementById`.

5. **`saveToGithub()` needs GET sha first** — GitHub API requires the file's current SHA to update it. The function handles this, but don't try to PUT directly.

6. **Tailwind dynamic classes** — don't build class strings dynamically like `grid-cols-${n}`. Tailwind purges unused classes. Use inline styles or explicit class names.

7. **`renderDynamicNavigation()`** — this function's container (`#dynamic-nav-container`) was removed from the HTML. The function now no-ops. Navigation uses `renderStageTabs()` + `renderViewSubtabs()` instead.

8. **Sprint HUD** — mounts into `#sprint-ribbon-hud` (in sprint view ribbon) with fallback to `#sprint-hud-mount` (legacy, removed from app bar). If sprint HUD doesn't show, check the view is rendering the mount point.

9. **Cache-busting** — all `<script>` tags use `?v=04031`. When adding new JS files, match this version string. Data is fetched with `?v=${Date.now()}` for always-fresh loads.

10. **The `?cms=true` query param** — must be present in the URL AND the user must be GitHub-authenticated for `shouldShowManagement()` to return `true`. URL alone is not enough.

---

## Deployment

The entire app is static files + 1 Lambda function.

### Files to host (GitHub Pages or any CDN)
All `.html`, `.js`, `.css` files. No build step.

### AWS Lambda (`auth_gatekeeper.js`)
Handles:
- Password hash validation (prevents public access)
- Fetching `data.json` from the private GitHub repo
- Forwarding GitHub PAT calls for CMS save

### Environment
- `LAMBDA_URL` — set in `index.html` inline script
- GitHub PAT — entered by user at runtime, stored in `localStorage['GITHUB_CMS_TOKEN']`
- Site auth hash — validated by Lambda, stored in `localStorage['khyaal_site_auth']`

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

4. Add CMS controls in appropriate view ribbon (views.js):
   <button onclick="openRiskEdit()">+ Add Risk</button>

5. Consider adding a quick action in lifecycle-guide.js:
   'link-risk': { label: '⚠️ Link Risk', type: 'dropdown', ... }
```

---

*For end-user documentation, see [GUIDE.md](GUIDE.md).*
