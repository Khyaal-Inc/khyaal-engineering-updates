# Khyaal Engineering Pulse — Claude Context

> Loaded at every session. Keep this concise. Full details in README.md.

## Project
Zero-deployment GitHub-backed engineering dashboard. Frontend-only SPA — no build step, no server.
- **Stack**: Vanilla JS ES6+, Tailwind CSS (CDN), Mermaid.js, Google Charts
- **Data**: `data.json` on GitHub, fetched via AWS Lambda gatekeeper
- **Auth**: `?cms=true` + GitHub PAT → unlocks CMS. Site password via Lambda hash check.
- **Cache-busting**: All `<script>` tags use `?v=04031`; data fetched with `?v=${Date.now()}`

## File Map (what each file owns)

| File | Owns |
|------|------|
| `index.html` | HTML shell, auth gatekeeper, script tags, view containers |
| `app.js` | `UPDATE_DATA` global, `renderDashboard()`, `switchView()`, `normalizeData()`, search, keyboard shortcuts |
| `core.js` | Constants (`statusConfig`, `contributorColors`), `highlightSearch()`, `renderBlockerStrip()`, `isItemInSearch()`, `isItemInDateRange()` |
| `views.js` | `renderTrackView()`, `renderStatusView()`, `renderPriorityView()`, `renderContributorView()`, `renderBacklogView()`, `renderSprintView()`, `renderReleasesView()`, `renderGanttView()`, `renderWorkflowView()`, `renderDiscoveryView()`, `renderRoadmapView()`, `renderEpicsView()` |
| `cms.js` | CRUD modal (`openItemEdit`, `addItem`, `saveCms`, `deleteItem`), GitHub sync (`saveToGithub`), 4-pillar form, metadata editors |
| `modes.js` | `switchMode()`, `getCurrentMode()`, `getCurrentUser()`, `getModeFilter()`, mode navigation, Alt+1/2/3 |
| `okr-module.js` | `renderOkrView()`, OKR progress calculation |
| `kanban-view.js` | `renderKanbanView()`, drag-drop handlers |
| `dependency-view.js` | `renderDependencyView()`, Mermaid digraph |
| `analytics.js` | `renderAnalyticsView()`, velocity/burndown charts |
| `capacity-planning.js` | `renderCapacityView()`, workload calc |
| `dev-focus.js` | `renderMyTasksView()`, personal task categories |
| `executive-dashboard.js` | `renderExecutiveDashboard()`, KPI summary |
| `styles.css` | Custom CSS: `.cms-*`, `.view-section`, `.item-row`, `.kanban-*`, `.badge-*`, `.track-header` |
| `auth_gatekeeper.js` | AWS Lambda: validates password hash, fetches data.json from GitHub |

## Global State: `UPDATE_DATA`
```
UPDATE_DATA {
  metadata: { title, dateRange, okrs[], epics[], sprints[], releases[], roadmap[],
              capacity{teamMembers[]}, velocityHistory[], activity[], modes{default} }
  tracks[]: { id, name, theme, subtracks[]: { name, items[]: { ...item fields } } }
}
```
**Item key fields**: `id, text, status, priority, storyPoints, epicId, sprintId, planningHorizon, contributors[], tags[], dependencies[], blockerNote, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType, mediaUrl, startDate, due, releasedIn, note, usecase, comments[]`

**Status values**: `now | next | later | qa | review | blocked | onhold | done`  
**Story points**: Fibonacci only — `1, 2, 3, 5, 8, 13, 21` (enforced as select in CMS)  
**Planning horizon**: `1M | 3M | 6M | 1Y`

## Three Persona Modes (`modes.js`)
| Mode | Key | Default View | Alt Shortcut | Theme |
|------|-----|-------------|--------------|-------|
| PM | `pm` | `okr` | Alt+1 | Blue |
| Developer | `dev` | `my-tasks` | Alt+2 | Green |
| Executive | `exec` | `dashboard` | Alt+3 | Purple |

- **Dev mode**: filters items to `currentUser`'s tasks; strategic fields readonly in edit modal
- **Exec mode**: filters to high-priority/blocked/now items; shows only 3 CMS pillars (no HOW)
- Mode persists in `localStorage['khyaal_current_mode']`; user persists in `localStorage['khyaal_current_user']`

## All Views & Render Functions
| View ID | Renderer | Personas |
|---------|----------|---------|
| `okr` | `renderOkrView()` | PM, Exec |
| `epics` | `renderEpicsView()` | PM, Exec |
| `roadmap` | `renderRoadmapView()` | PM, Exec |
| `backlog` | `renderBacklogView()` | PM |
| `sprint` | `renderSprintView()` | PM, Dev |
| `track` | `renderTrackView()` | PM, Dev |
| `kanban` | `renderKanbanView()` | PM, Dev |
| `dependency` | `renderDependencyView()` | PM, Dev |
| `analytics` | `renderAnalyticsView()` | PM, Exec |
| `capacity` | `renderCapacityView()` | PM |
| `releases` | `renderReleasesView()` | PM, Exec |
| `status` | `renderStatusView()` | PM |
| `priority` | `renderPriorityView()` | PM |
| `contributor` | `renderContributorView()` | PM |
| `gantt` | `renderGanttView()` | PM |
| `my-tasks` | `renderMyTasksView()` | Dev |
| `dashboard` | `renderExecutiveDashboard()` | Exec |
| `workflow` | `renderWorkflowView()` | PM, Dev |
| `ideation`/`spikes` | `renderDiscoveryView()` | PM, Exec |

## CMS Edit Modal — 4-Pillar System (`cms.js`)
**Entry points**: `openItemEdit(ti,si,ii,itemId)` · `addItem(trackIndex,subtrackIndex,defaults)`

**4 Pillars** (FIELD_GROUPS at cms.js:114):
| Key | Label | Fields |
|-----|-------|--------|
| `what` | 🎯 Goal & Intent | text, usecase, epicId, persona, tags, note |
| `when` | 📅 Timeline & Cycle | planningHorizon, sprintId, startDate, due, releasedIn, publishedDate |
| `where` | ⚡ Action & Routing | status, contributors, blockerNote, dependencies, mediaUrl |
| `how` | 🛠️ Sync & Effort | storyPoints, priority, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType |

**Pillar visibility by persona** (`getVisibleFieldGroups()` cms.js:164):
- PM → `[what, when, where, how]`
- Dev → `[where, how, what, when]` (execution-first; strategic fields readonly)
- Exec → `[what, when, where]` (no Sync & Effort panel)

**Field visibility by view** (`LIFECYCLE_FIELD_MAP` cms.js:148) — only native fields shown unless "Show All" toggled:
| View | Native fields |
|------|--------------|
| backlog | text, usecase, persona, sprintId, planningHorizon, status, epicId, priority, storyPoints, tags, impactLevel, effortLevel |
| sprint | text, usecase, persona, acceptanceCriteria, sprintId, startDate, due, status, contributors, storyPoints, priority, blockerNote, note |
| track | text, usecase, persona, acceptanceCriteria, due, sprintId, status, contributors, storyPoints, priority, dependencies, blockerNote, note |
| kanban | text, sprintId, status, contributors, priority, storyPoints, blockerNote |
| releases | text, releasedIn, publishedDate, status, mediaUrl, tags, note |
| roadmap | text, planningHorizon, startDate, usecase, epicId, status, tags, impactLevel, effortLevel, riskType |
| epics | text, usecase, persona, planningHorizon, impactLevel, status, epicId, successMetric, strategicWeight, riskType, mediaUrl |

**Dev-protected fields** (readonly in dev mode, `isFieldProtected()` cms.js:793):
`epicId, impactLevel, successMetric, acceptanceCriteria, planningHorizon, releasedIn, strategicWeight, riskType, effortLevel, publishedDate, priority, usecase, persona, sprintId`

**Move fields** (PM only, existing items): Target Track + Target Subtrack dropdowns via `buildMoveFields()`

## Key Patterns & Gotchas
- `window.isActionLockActive = true` prevents background renders during modal operations
- `saveCms()` → writes to `UPDATE_DATA` → `saveToLocalStorage()` → `renderDashboard()` (NOT GitHub — user must click "Save to GitHub")
- `saveToGithub()` requires GET for SHA first, then PUT (GitHub API constraint)
- Tag widget fields (contributors, tags, dependencies) use `window[selection_${id}]` dynamic callbacks
- Dev mode prompts user selection first time via `promptUserSelection()`
- Search (`globalSearchQuery`) triggers full re-render of active view
- `?archive` param bypasses localStorage to show historical data

## Development Rules
- No semicolons · ES6+ · async/await · functional patterns (map/filter/reduce)
- No DOM manipulation in loops · cache DOM queries · event delegation
- Don't mutate `UPDATE_DATA` directly outside of CMS functions
- New fields → add to `normalizeData()` in app.js with safe default
- New views → add container in index.html + case in `switchView()` + update `modes.js` MODE_CONFIG

## Excluded from Claude reads
- `archive/` — historical data, large, excluded by .claudeignore
- `lambda.zip` — deployment artifact
- `data.json` — read only when explicitly needed for data debugging
