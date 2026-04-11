# ADR-001 Implementation Plan: Nav Consolidation, Pinned Views, Coach Bar, Watchdog

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all four decisions from ADR-001 — Workspace/Team rename, persona-pinned primary views, Stage Coach Bar upgrade, and action lock watchdog timer.

**Architecture:** Zero-build vanilla JS SPA. All changes are label/config/logic edits within existing files — no new files, no build step, no framework. Each task is independently committable and browser-testable via `node --check <file>` + smoke test.

**Tech Stack:** Vanilla ES6+, Tailwind CSS (CDN), inline `onclick` event handlers, `window.*` globals, `localStorage` for dismiss state.

---

## File Map

| File | What changes |
|------|-------------|
| `index.html` | Filter label text: "All Projects" → "All Teams", aria-label updates |
| `app.js` | `normalizeData()` option text: "All Projects" → "All Teams" |
| `cms.js` | Toast/error strings with "project" → "team"; watchdog timer on every `isActionLockActive = true` site |
| `workflow-nav.js` | Add `pinnedViews` per-persona to `WORKFLOW_STAGES`; update `renderWorkflowNav` ribbon to show coach hint slot |
| `modes.js` | `renderViewSubtabs()` — render pinned views first with a visual separator |
| `lifecycle-guide.js` | Add `getCoachSignal()` — sprint-state-driven signal; update `renderCadenceNudgeBanner()` to also show sprint signals |
| `styles.css` | Coach bar style upgrade: persistent, compact, stage-color-tinted |

---

## Task 1: Rename "Projects" → "Teams" in UI labels

**Files:**
- Modify: `index.html` (filter option text + aria-labels)
- Modify: `app.js` (normalizeData option text)
- Modify: `cms.js` (toast/prompt strings)

- [ ] **Step 1: Update index.html filter option text**

In `index.html`, find the `#project-filter` select:
```html
<select id="project-filter" ... >
    <option value="">All Projects</option>
</select>
```
Change the option text only (keep `id="project-filter"` and `onchange` untouched — JS reads the id):
```html
<select id="project-filter" class="nav-select" onchange="onProjectFilterChange()" title="Filter by team" aria-label="Filter by team">
    <option value="">All Teams</option>
</select>
```

- [ ] **Step 2: Update app.js normalizeData option text**

In `app.js` around line 37, find:
```javascript
projEl.innerHTML = '<option value="">All Projects</option>' +
```
Change to:
```javascript
projEl.innerHTML = '<option value="">All Teams</option>' +
```

- [ ] **Step 3: Update cms.js toast/prompt strings**

Search `cms.js` for user-visible strings containing "Project" (capital P, UI label context). Change these three:

Find (around `spAdminAddProject`, line ~684):
```javascript
showToast(`Project "${name}" added — save data to persist`, 'info')
```
Change to:
```javascript
showToast(`Team "${name}" added — save data to persist`, 'info')
```

Find (around `spAdminDeleteProject`, line ~713):
```javascript
showToast(`Project "${proj.name}" deleted — save data to persist`, 'info')
```
Change to:
```javascript
showToast(`Team "${proj.name}" deleted — save data to persist`, 'info')
```

Find (around `spAdminEditProject`, line ~701):
```javascript
const newName = prompt('Project name:', proj.name)?.trim()
```
Change to:
```javascript
const newName = prompt('Team name:', proj.name)?.trim()
```

- [ ] **Step 4: Syntax check**

```bash
node --check app.js && node --check cms.js && echo "✅ OK"
```
Expected: `✅ OK`

- [ ] **Step 5: Browser smoke test**

Open app. Verify:
- Nav bar filter shows "All Teams" (not "All Projects")
- Adding a team in admin panel shows "Team X added" toast (not "Project X added")

- [ ] **Step 6: Commit**

```bash
git add index.html app.js cms.js
git commit -m "chore: rename Projects→Teams in UI labels (ADR-001 naming schema)"
```

---

## Task 2: Add `pinnedViews` per-persona to `WORKFLOW_STAGES`

**Files:**
- Modify: `workflow-nav.js` — `WORKFLOW_STAGES` constant

- [ ] **Step 1: Add `pinnedViews` map to each stage object**

In `workflow-nav.js`, the `WORKFLOW_STAGES` constant starts at line 7. For each stage, add a `pinnedViews` object keyed by persona (`pm`, `dev`, `exec`). Views listed are pinned for that persona; others in `views[]` remain available but rendered secondary.

Replace the entire `WORKFLOW_STAGES` constant with:

```javascript
const WORKFLOW_STAGES = {
    discovery: {
        name: 'Discover',
        icon: '🔍',
        label: 'Validation',
        description: 'Spikes & Ideation: Capturing ideas and validating feasibility',
        cadence: 'Ongoing',
        views: ['workflow', 'ideation', 'spikes'],
        pinnedViews: { pm: ['ideation'], dev: ['spikes'], exec: [] },
        color: '#6366f1',
        order: 1
    },
    vision: {
        name: 'Vision',
        icon: '🌟',
        label: 'Strategic',
        description: 'Strategic Alignment: Setting OKRs and defining strategic Epics',
        cadence: 'Quarterly',
        views: ['okr', 'epics'],
        pinnedViews: { pm: ['okr', 'epics'], dev: [], exec: ['okr', 'epics'] },
        color: '#8b5cf6',
        order: 2
    },
    plan: {
        name: 'Plan',
        icon: '📐',
        label: 'Planning',
        description: 'Sprint Planning: Grooming backlog, planning sprints, mapping roadmap horizons',
        cadence: 'Weekly',
        views: ['roadmap', 'backlog', 'sprint', 'gantt', 'capacity'],
        pinnedViews: { pm: ['sprint', 'roadmap', 'backlog'], dev: ['sprint'], exec: ['roadmap'] },
        color: '#3b82f6',
        order: 3
    },
    build: {
        name: 'Build',
        icon: '⚡',
        label: 'Execution',
        description: 'High-Velocity Execution: Moving tasks to done and unblocking the team',
        cadence: 'Daily',
        views: ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor'],
        pinnedViews: { pm: ['kanban', 'track'], dev: ['kanban', 'track', 'dependency'], exec: [] },
        color: '#10b981',
        order: 4
    },
    review: {
        name: 'Ship',
        icon: '🏁',
        label: 'Ship & Review',
        description: 'Ship & Retro: Publish releases, review analytics, update OKR progress',
        cadence: 'Per Sprint',
        views: ['releases', 'analytics', 'dashboard', 'activity'],
        pinnedViews: { pm: ['releases', 'analytics'], dev: ['releases'], exec: ['dashboard', 'analytics'] },
        color: '#f59e0b',
        order: 5
    }
}
```

- [ ] **Step 2: Syntax check**

```bash
node --check workflow-nav.js && echo "✅ OK"
```
Expected: `✅ OK`

- [ ] **Step 3: Commit**

```bash
git add workflow-nav.js
git commit -m "feat: add pinnedViews per-persona to WORKFLOW_STAGES (ADR-001)"
```

---

## Task 3: Render pinned views first in Row 2 chips

**Files:**
- Modify: `modes.js` — `renderViewSubtabs()` function

- [ ] **Step 1: Update renderViewSubtabs to sort pinned views first**

In `modes.js`, locate `renderViewSubtabs()` (line ~158). Find the block that builds the `views` array from `stage.views`:

```javascript
    // Filter stage views by what's available for this persona
    let views = stage.views.filter(v => availableModeViews.includes(v));
```

Replace that one line with:

```javascript
    // Filter stage views by what's available for this persona
    const allStageViews = stage.views.filter(v => availableModeViews.includes(v))
    // Pinned views for this persona come first; rest follow in original order
    const pinned = (stage.pinnedViews?.[mode] || []).filter(v => allStageViews.includes(v))
    const secondary = allStageViews.filter(v => !pinned.includes(v))
    let views = [...pinned, ...secondary]
```

- [ ] **Step 2: Add visual separator between pinned and secondary chips**

In the same function, find where `container.innerHTML` is built. The `views.map(...)` block currently has no separator concept. Replace the map to inject a separator `<span>` between pinned and secondary groups:

Find:
```javascript
    container.innerHTML = views.map(viewId => {
```

Replace with:
```javascript
    const pinnedSet = new Set((stage.pinnedViews?.[mode] || []))
    container.innerHTML = views.map((viewId, idx) => {
        // Insert separator before first secondary view
        const prevId = views[idx - 1]
        const isBoundary = idx > 0 && pinnedSet.has(prevId) && !pinnedSet.has(viewId) && pinnedSet.size > 0
        const sep = isBoundary ? `<span class="view-subtab-sep" aria-hidden="true"></span>` : ''
```

And at the end of the map callback, prepend `sep` before the button:
```javascript
        return sep + `
            <button onclick="window.currentActiveView='${viewId}'; switchView('${viewId}'); if(typeof updateCommandStripNav==='function') updateCommandStripNav(); if(typeof renderViewSubtabs==='function') renderViewSubtabs('${viewId}');" id="btn-${viewId}"
                class="view-subtab ${isActive ? 'view-subtab-active' : ''}${pinnedSet.has(viewId) ? ' view-subtab-pinned' : ''}"
                style="--active-color: ${stage.color}"
                aria-label="${textOnly}" title="${textOnly}"
            >
                <span>${textOnly}</span>
            </button>`;
    }).join('');
```

- [ ] **Step 3: Add CSS for separator and pinned chip**

In `styles.css`, find the `.view-subtab` block (around line 5042). Add after it:

```css
/* Pinned view chip — slightly bolder weight */
.view-subtab-pinned {
    font-weight: 800;
}
/* Separator between pinned and secondary chips */
.view-subtab-sep {
    display: inline-block;
    width: 1px; height: 16px;
    background: rgba(148, 163, 184, 0.4);
    margin: 0 4px;
    vertical-align: middle;
    flex-shrink: 0;
}
```

- [ ] **Step 4: Syntax check**

```bash
node --check modes.js && echo "✅ OK"
```
Expected: `✅ OK`

- [ ] **Step 5: Browser smoke test**

Switch to PM mode (Alt+1). Go to Plan stage. Row 2 should show: **Sprint | Roadmap | Backlog** (pinned, bold) `|` Gantt | Capacity (secondary).

Switch to Dev mode (Alt+2). Go to Build stage. Row 2 should show: **Kanban | Tracks | Links** (pinned) `|` State | Risk | Team (secondary).

- [ ] **Step 6: Commit**

```bash
git add modes.js styles.css
git commit -m "feat: pinned views render first in Row 2 chips per persona (ADR-001)"
```

---

## Task 4: Upgrade Coach Bar with sprint-state signals

**Files:**
- Modify: `lifecycle-guide.js` — add `getSprintCoachSignal()`, update `renderCadenceNudgeBanner()`
- Modify: `styles.css` — update `#cadence-nudge-bar` to be stage-color-tinted and compact

The existing `renderCadenceNudgeBanner()` is day-of-week triggered and dismissible. We extend it to also fire sprint-state signals that are more persistent and actionable.

- [ ] **Step 1: Add getSprintCoachSignal() to lifecycle-guide.js**

In `lifecycle-guide.js`, find `renderCadenceNudgeBanner` (line ~832). Insert this new function directly above it:

```javascript
// Returns a coach signal derived from live sprint state (higher priority than cadence nudge)
function getSprintCoachSignal() {
    const data = window.UPDATE_DATA
    if (!data) return null
    const sprints = data.metadata?.sprints || []
    const activeSprint = sprints.find(s => s.status === 'active')
    const okrs = data.metadata?.okrs || []
    const releases = data.metadata?.releases || []

    // Signal 1: Active sprint ending within 2 days
    if (activeSprint?.endDate) {
        const daysLeft = Math.ceil((new Date(activeSprint.endDate) - new Date()) / 86400000)
        if (daysLeft >= 0 && daysLeft <= 2) {
            return { icon: '🏁', label: 'Sprint ending soon', msg: `"${activeSprint.name}" ends in ${daysLeft === 0 ? 'today' : daysLeft + 'd'} — run retrospective`, view: 'sprint', color: '#f59e0b', type: 'sprint-end' }
        }
    }

    // Signal 2: No active OKRs
    if (okrs.length === 0 || !okrs.some(o => o.status === 'active')) {
        return { icon: '🎯', label: 'No active OKRs', msg: 'Set your quarterly objectives to align the team', view: 'okr', color: '#8b5cf6', type: 'no-okrs' }
    }

    // Signal 3: Active sprint but no 'now' items
    if (activeSprint) {
        const allItems = []
        ;(data.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => allItems.push(i))))
        const hasNow = allItems.some(i => i.sprintId === activeSprint.id && i.status === 'now')
        if (!hasNow) {
            return { icon: '📋', label: 'Sprint has no active items', msg: 'Pull items from backlog into this sprint', view: 'backlog', color: '#3b82f6', type: 'empty-sprint' }
        }
    }

    // Signal 4: In Ship stage but no in-progress release
    const currentStage = typeof currentWorkflowStage !== 'undefined' ? currentWorkflowStage : null
    if (currentStage === 'review' && !releases.some(r => r.status === 'in-progress' || r.status === 'planned')) {
        return { icon: '📦', label: 'No release tracked', msg: 'Create a release to track what ships this sprint', view: 'releases', color: '#f59e0b', type: 'no-release' }
    }

    return null
}
window.getSprintCoachSignal = getSprintCoachSignal
```

- [ ] **Step 2: Update renderCadenceNudgeBanner() to check sprint signal first**

Replace the existing `renderCadenceNudgeBanner` function body (lines ~832–849) with:

```javascript
function renderCadenceNudgeBanner() {
    const bar = document.getElementById('cadence-nudge-bar')
    if (!bar) return

    // Sprint signals take priority over day-of-week cadence nudges
    const sprintSignal = getSprintCoachSignal()
    if (sprintSignal) {
        bar.style.display = 'flex'
        bar.style.setProperty('--cnb-color', sprintSignal.color)
        bar.innerHTML = `
            <span class="cnb-icon">${sprintSignal.icon}</span>
            <div class="cnb-body">
                <span class="cnb-label">${sprintSignal.label}</span>
                <span class="cnb-msg">${sprintSignal.msg}</span>
            </div>
            <button class="cnb-cta" onclick="switchView('${sprintSignal.view}');document.getElementById('cadence-nudge-bar').style.display='none'">${sprintSignal.label.split(' ')[0]} →</button>
        `
        return
    }

    // Fall back to day-of-week cadence nudge
    const nudge = getCadenceNudge()
    if (!nudge) { bar.style.display = 'none'; return }
    const dismissed = localStorage.getItem(`nudge_dismissed_${nudge.type}_${new Date().toDateString()}`)
    if (dismissed) { bar.style.display = 'none'; return }
    bar.style.display = 'flex'
    bar.style.setProperty('--cnb-color', '#6366f1')
    bar.innerHTML = `
        <span class="cnb-icon">${nudge.icon}</span>
        <div class="cnb-body">
            <span class="cnb-label">${nudge.label}</span>
            <span class="cnb-msg">${nudge.msg}</span>
        </div>
        <button class="cnb-cta" onclick="switchView('${nudge.view}');document.getElementById('cadence-nudge-bar').style.display='none'">${nudge.label.split(' ')[0]} View →</button>
        <button class="cnb-dismiss" onclick="localStorage.setItem('nudge_dismissed_${nudge.type}_'+new Date().toDateString(),'1');document.getElementById('cadence-nudge-bar').style.display='none'">✕</button>
    `
}
window.renderCadenceNudgeBanner = renderCadenceNudgeBanner
```

- [ ] **Step 3: Update coach bar CSS to use stage color variable**

In `styles.css`, find `#cadence-nudge-bar` (around line 5802). Replace the block with:

```css
#cadence-nudge-bar {
    --cnb-color: #6366f1;
    display: none;
    align-items: center;
    gap: 10px;
    padding: 6px 16px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--cnb-color) 8%, white);
    border-bottom: 1.5px solid color-mix(in srgb, var(--cnb-color) 20%, transparent);
    min-height: 32px;
    position: relative;
    z-index: 100;
}
```

Leave all the existing `.cnb-*` child class rules unchanged below.

- [ ] **Step 4: Syntax check**

```bash
node --check lifecycle-guide.js && echo "✅ OK"
```
Expected: `✅ OK`

- [ ] **Step 5: Browser smoke test**

Open app with an active sprint whose end date is within 2 days. Coach bar should show amber "Sprint ending soon — run retrospective". Clicking the CTA switches to Sprint view and hides bar.

If sprint is healthy (plenty of time, has active items), bar should be hidden or show the day-of-week nudge only.

- [ ] **Step 6: Commit**

```bash
git add lifecycle-guide.js styles.css
git commit -m "feat: stage coach bar with sprint-state signals (ADR-001)"
```

---

## Task 5: Action lock watchdog timer

**Files:**
- Modify: `cms.js` — add watchdog to every `isActionLockActive = true` call site and cancel in every `finally`

There are 7 call sites. Each gets a `_lockWatchdog` timeout set after the lock is acquired and cancelled in the `finally` block.

- [ ] **Step 1: Create the watchdog helper at the top of the lock section**

In `cms.js`, near line 7 where `window.isActionLockActive = false` is initialized, add directly below it:

```javascript
// Watchdog: auto-releases the action lock after 30s to prevent silent UI freeze
function _setLockWatchdog() {
    clearTimeout(window._lockWatchdogTimer)
    window._lockWatchdogTimer = setTimeout(() => {
        if (window.isActionLockActive) {
            window.isActionLockActive = false
            console.error('❌ Action lock watchdog fired — lock was held >30s. UI auto-recovered.')
            if (typeof showToast === 'function') showToast('Save may have stalled — UI recovered. Please retry.', 'error')
        }
    }, 30000)
}
function _clearLockWatchdog() {
    clearTimeout(window._lockWatchdogTimer)
}
```

- [ ] **Step 2: Add watchdog to site 1 — spAdminSaveUsers (line ~731)**

Find:
```javascript
    window.isActionLockActive = true
    try {
```
(in `spAdminSaveUsers`)

Change to:
```javascript
    window.isActionLockActive = true
    _setLockWatchdog()
    try {
```

In its `finally` block (line ~749):
```javascript
        window.isActionLockActive = false
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false
```

- [ ] **Step 3: Add watchdog to site 2 — saveToGithub (line ~4903)**

Find:
```javascript
    window.isActionLockActive = true;
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
        const content = btoa(
```
(in `saveToGithub`)

Change to:
```javascript
    window.isActionLockActive = true;
    _setLockWatchdog()
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
        const content = btoa(
```

In its `finally` (line ~4921):
```javascript
        window.isActionLockActive = false;
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false;
```

- [ ] **Step 4: Add watchdog to site 3 — deleteItem (line ~4989)**

Find (in deleteItem):
```javascript
    window.isActionLockActive = true;
    window.uiState.isDirty = false;
```

Change to:
```javascript
    window.isActionLockActive = true;
    _setLockWatchdog()
    window.uiState.isDirty = false;
```

In its `finally` (line ~5014):
```javascript
        window.isActionLockActive = false;
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false;
```

- [ ] **Step 5: Add watchdog to site 4 — sendToBacklog (line ~5022)**

Find:
```javascript
    window.isActionLockActive = true;
    setTimeout(() => {
        const track = UPDATE_DATA.tracks[data.ti];
```

Change to:
```javascript
    window.isActionLockActive = true;
    _setLockWatchdog()
    setTimeout(() => {
        const track = UPDATE_DATA.tracks[data.ti];
```

In its `finally` (line ~5043):
```javascript
        window.isActionLockActive = false;
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false;
```

- [ ] **Step 6: Add watchdog to site 5 — toggleBlocker (line ~5051)**

Find:
```javascript
    window.isActionLockActive = true;
    setTimeout(() => {
        if (data.item.blocker) {
```

Change to:
```javascript
    window.isActionLockActive = true;
    _setLockWatchdog()
    setTimeout(() => {
        if (data.item.blocker) {
```

Its lock is released at line ~5060 (early return path) and line ~5082 (finally path). Update both:

Line ~5060:
```javascript
                window.isActionLockActive = false;
```
Change to:
```javascript
                _clearLockWatchdog()
                window.isActionLockActive = false;
```

Line ~5082:
```javascript
        window.isActionLockActive = false;
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false;
```

- [ ] **Step 7: Add watchdog to site 6 — archiveAndClear (line ~5215)**

Find:
```javascript
    window.isActionLockActive = true;
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
```
(in `archiveAndClear`)

Change to:
```javascript
    window.isActionLockActive = true;
    _setLockWatchdog()
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
```

In its `finally` (line ~5268):
```javascript
        window.isActionLockActive = false;
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false;
```

- [ ] **Step 8: Add watchdog to site 7 — adminSaveUsers (line ~6055)**

Find:
```javascript
    window.isActionLockActive = true
    try {
        const content = btoa(
```
(in `adminSaveUsers` / admin panel save)

Change to:
```javascript
    window.isActionLockActive = true
    _setLockWatchdog()
    try {
        const content = btoa(
```

In its `finally` (line ~6079):
```javascript
        window.isActionLockActive = false
```
Change to:
```javascript
        _clearLockWatchdog()
        window.isActionLockActive = false
```

- [ ] **Step 9: Syntax check**

```bash
node --check cms.js && echo "✅ OK"
```
Expected: `✅ OK`

- [ ] **Step 10: Smoke test the watchdog**

In browser console after loading app in CMS mode:
```javascript
// _setLockWatchdog is a module-level function; call it directly in console
// (cms.js is loaded in global scope, so it's accessible)
window.isActionLockActive = true
_setLockWatchdog()
// After 31s, confirm auto-release:
setTimeout(() => console.log('Lock still on?', window.isActionLockActive), 31000)
```
Expected: After 31s, `Lock still on? false` and a red toast appears.

- [ ] **Step 11: Commit**

```bash
git add cms.js
git commit -m "feat: watchdog timer auto-releases stuck action lock after 30s (ADR-001)"
```

---

## Verification Checklist

### Task 1 — Rename
- [ ] Nav bar shows "All Teams" (not "All Projects") in the project filter dropdown
- [ ] Admin panel team add/edit/delete toasts say "Team X added/deleted" 

### Task 2 — Pinned views config
- [ ] `WORKFLOW_STAGES.plan.pinnedViews.pm` equals `['sprint', 'roadmap', 'backlog']`
- [ ] `WORKFLOW_STAGES.build.pinnedViews.dev` equals `['kanban', 'track', 'dependency']`

### Task 3 — Row 2 chip order
- [ ] PM / Plan stage → Sprint, Roadmap, Backlog appear first (bold), then Gantt, Capacity
- [ ] Dev / Build stage → Kanban, Tracks, Links appear first, then State, Risk, Team
- [ ] Exec / Ship stage → Pulse, Data appear first; clicking either works correctly

### Task 4 — Coach bar
- [ ] Sprint ending ≤2 days: amber bar with "Sprint ending soon" visible at top
- [ ] No active OKRs: purple bar "No active OKRs" visible
- [ ] Healthy state: bar hidden entirely
- [ ] Day-of-week nudge still fires on Mon/Wed/Fri when no sprint signal

### Task 5 — Watchdog
- [ ] Normal save: watchdog timer is cleared in `finally`, no spurious toast
- [ ] Simulated stuck lock (console test): auto-released after 30s with error toast
- [ ] `window.isActionLockActive` is `false` after every successful save operation

### Final
- [ ] `node --check` passes for all modified files: `app.js`, `cms.js`, `workflow-nav.js`, `modes.js`, `lifecycle-guide.js`
- [ ] All 19 views still render without JS errors
- [ ] Persona switch (Alt+1/2/3) still works
