# Lifecycle Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the two diverged lifecycle systems, fix 4 bugs, and expand coaching from time signals to structural gate health checks.

**Architecture:** All changes in 3 files (`lifecycle-guide.js`, `workflow-nav.js`, `app.js`). No new files, no CSS changes, no new UI surfaces. Gate health signals reuse the existing `#cadence-nudge-bar` coach bar from ADR-001.

**Tech Stack:** Vanilla JS ES6+, no build step. Validation: `node --check <file>` before each commit.

---

### Task 1: Fix `WORKFLOW_STAGES.build.views[]` — add `'my-tasks'`

**Files:**
- Modify: `workflow-nav.js` (around line 47 — the `build` stage entry)

**Context:** `STAGE_TO_VIEWS.dev.build` in `modes.js` already includes `'my-tasks'`, but `WORKFLOW_STAGES.build.views[]` does not. This means Dev persona Row 2 chips in the Build stage omit My Tasks. The fix is a one-word addition.

- [ ] **Step 1: Read the current build entry**

Open `workflow-nav.js` and find the `build:` object. It currently reads:
```javascript
build: { views: ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor'], pinnedViews: { pm: ['kanban', 'track'], dev: ['kanban', 'track', 'dependency'], exec: [] }, color: '#10b981', order: 4 },
```

- [ ] **Step 2: Add `'my-tasks'` to `build.views[]`**

Change `views:` to:
```javascript
views: ['my-tasks', 'kanban', 'track', 'dependency', 'status', 'priority', 'contributor'],
```

Place `'my-tasks'` first so it appears before `kanban` in unpinned fallback order.

- [ ] **Step 3: Syntax check**

```bash
node --check workflow-nav.js
```
Expected: exits 0, no output.

- [ ] **Step 4: Commit**

```bash
git add workflow-nav.js
git commit -m "fix: add my-tasks to WORKFLOW_STAGES.build.views for dev Row 2 chips"
```

---

### Task 2: Fix stage ID mismatch in `lifecycle-guide.js` — STAGES array

**Files:**
- Modify: `lifecycle-guide.js` (lines ~1–30 — the `STAGES` constant)

**Context:** `STAGES[2].id` is `'definition'` and `STAGES[3].id` is `'delivery'`. The canonical IDs in `workflow-nav.js` are `'plan'` and `'build'`. `checkStageCompletion()` compares against `currentWorkflowStage` (which uses `workflow-nav.js` IDs), so it always mismatches for Plan and Build stages. Fix: rename only the two diverged IDs in the `STAGES` array.

- [ ] **Step 1: Read STAGES in lifecycle-guide.js**

Confirm the current array. It should look like:
```javascript
const STAGES = [
    { id: 'discovery', icon: '💡', label: 'Discover',  primaryView: 'ideation', color: '#7c3aed', stageNum: 1 },
    { id: 'vision',    icon: '🎯', label: 'Goals',     primaryView: 'okr',      color: '#4f46e5', stageNum: 2 },
    { id: 'definition',icon: '📐', label: 'Plan',      primaryView: 'backlog',  color: '#2563eb', stageNum: 3 },
    { id: 'delivery',  icon: '🚀', label: 'Build',     primaryView: 'kanban',   color: '#059669', stageNum: 4 },
    { id: 'review',    icon: '🏁', label: 'Ship',      primaryView: 'releases', color: '#d97706', stageNum: 5 },
]
```

- [ ] **Step 2: Replace `'definition'` → `'plan'` in STAGES**

Change:
```javascript
{ id: 'definition',icon: '📐', label: 'Plan',      primaryView: 'backlog',  color: '#2563eb', stageNum: 3 },
```
To:
```javascript
{ id: 'plan',      icon: '📐', label: 'Plan',      primaryView: 'backlog',  color: '#2563eb', stageNum: 3 },
```

- [ ] **Step 3: Replace `'delivery'` → `'build'` in STAGES**

Change:
```javascript
{ id: 'delivery',  icon: '🚀', label: 'Build',     primaryView: 'kanban',   color: '#059669', stageNum: 4 },
```
To:
```javascript
{ id: 'build',     icon: '🚀', label: 'Build',     primaryView: 'kanban',   color: '#059669', stageNum: 4 },
```

- [ ] **Step 4: Syntax check**

```bash
node --check lifecycle-guide.js
```
Expected: exits 0, no output.

- [ ] **Step 5: Commit**

```bash
git add lifecycle-guide.js
git commit -m "fix: align STAGES IDs in lifecycle-guide.js to canonical plan/build keys"
```

---

### Task 3: Fix `VIEW_LIFECYCLE_MAP` — wrong stageIds + missing entries

**Files:**
- Modify: `lifecycle-guide.js` (the `VIEW_LIFECYCLE_MAP` constant, ~lines 32–60)

**Context:** `VIEW_LIFECYCLE_MAP` has two problems: (a) all entries that used `'definition'`/`'delivery'` as stageId are wrong after Task 2 — they must be updated to `'plan'`/`'build'`; (b) `'workflow'` and `'activity'` views are missing entirely, causing the breadcrumb to get stuck on those views. Fix both in one pass.

- [ ] **Step 1: Read VIEW_LIFECYCLE_MAP in lifecycle-guide.js**

Find the full `VIEW_LIFECYCLE_MAP` object. Note every entry that uses `'definition'` or `'delivery'` as stageId.

- [ ] **Step 2: Replace all `stageId: 'definition'` with `stageId: 'plan'`**

Entries affected (roadmap, backlog, sprint, gantt, capacity — all Plan-stage views). Change each:
```javascript
// Before
roadmap:  { stageId: 'definition', stageNum: 3 },
backlog:  { stageId: 'definition', stageNum: 3 },
sprint:   { stageId: 'definition', stageNum: 3 },
gantt:    { stageId: 'definition', stageNum: 3 },
capacity: { stageId: 'definition', stageNum: 3 },

// After
roadmap:  { stageId: 'plan', stageNum: 3 },
backlog:  { stageId: 'plan', stageNum: 3 },
sprint:   { stageId: 'plan', stageNum: 3 },
gantt:    { stageId: 'plan', stageNum: 3 },
capacity: { stageId: 'plan', stageNum: 3 },
```

- [ ] **Step 3: Replace all `stageId: 'delivery'` with `stageId: 'build'`**

Entries affected (kanban, track, dependency, status, priority, contributor, my-tasks). Change each:
```javascript
// Before
kanban:      { stageId: 'delivery', stageNum: 4 },
track:       { stageId: 'delivery', stageNum: 4 },
dependency:  { stageId: 'delivery', stageNum: 4 },
status:      { stageId: 'delivery', stageNum: 4 },
priority:    { stageId: 'delivery', stageNum: 4 },
contributor: { stageId: 'delivery', stageNum: 4 },
'my-tasks':  { stageId: 'delivery', stageNum: 4 },

// After
kanban:      { stageId: 'build', stageNum: 4 },
track:       { stageId: 'build', stageNum: 4 },
dependency:  { stageId: 'build', stageNum: 4 },
status:      { stageId: 'build', stageNum: 4 },
priority:    { stageId: 'build', stageNum: 4 },
contributor: { stageId: 'build', stageNum: 4 },
'my-tasks':  { stageId: 'build', stageNum: 4 },
```

- [ ] **Step 4: Add missing `workflow` and `activity` entries**

Add these two entries to `VIEW_LIFECYCLE_MAP` (anywhere in the map — group with their stage peers for readability):
```javascript
workflow: { stageId: 'discovery', stageNum: 1 },
activity: { stageId: 'review',    stageNum: 5 },
```

- [ ] **Step 5: Fix `checkStageCompletion()` branches**

Search `lifecycle-guide.js` for any `case 'definition':` or `case 'delivery':` (or `=== 'definition'`, `=== 'delivery'`) in `checkStageCompletion()` or anywhere else. Replace with `'plan'` and `'build'` respectively.

- [ ] **Step 6: Syntax check**

```bash
node --check lifecycle-guide.js
```
Expected: exits 0, no output.

- [ ] **Step 7: Commit**

```bash
git add lifecycle-guide.js
git commit -m "fix: migrate VIEW_LIFECYCLE_MAP stageIds to plan/build; add workflow and activity entries"
```

---

### Task 4: Fix missing `renderActivityView` in `renderDashboard()`

**Files:**
- Modify: `app.js` (the `renderDashboard()` function, ~lines 141–182)

**Context:** `renderActivityView` is defined in `views.js` (around line 3408) and exported as `window.renderActivityView`. It is called by keyboard shortcut and view switching, but NOT called by `renderDashboard()`. This means when the full dashboard re-renders (e.g., after a save), the activity view goes stale. Fix: add one `runSafe()` call alongside the other renderers.

- [ ] **Step 1: Read renderDashboard() in app.js**

Find the block of `runSafe(render*, '...')` calls. It will look like:
```javascript
runSafe(renderKanbanView, 'Kanban')
runSafe(renderBacklogView, 'Backlog')
// ... ~19 calls total
```
Note which call is closest to where `renderActivityView` should logically appear (Review-stage views: releases, analytics, dashboard).

- [ ] **Step 2: Add renderActivityView call**

Add after the last Review-stage renderer call (near `renderAnalyticsView` or `renderReleasesView`):
```javascript
runSafe(renderActivityView, 'Activity')
```

- [ ] **Step 3: Syntax check**

```bash
node --check app.js
```
Expected: exits 0, no output.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "fix: add renderActivityView to renderDashboard so activity stays fresh on full re-render"
```

---

### Task 5: Add `getGateHealthSignal()` and wire into coach bar

**Files:**
- Modify: `lifecycle-guide.js` — add function + update `renderCadenceNudgeBanner()` priority chain

**Context:** The existing coach bar (`#cadence-nudge-bar`) already renders one signal at a time, driven by `getSprintCoachSignal()` for time-based signals. We add structural gate health checks as a second priority tier. Gate signals are dismissible via `sessionStorage` to avoid noise. One signal at a time, no new UI surface.

- [ ] **Step 1: Read `renderCadenceNudgeBanner()` and `getSprintCoachSignal()` in lifecycle-guide.js**

Understand the current priority chain and the shape of the return value (should be `{ message, type }` or similar). Note the dismiss button handler and how sessionStorage is currently used.

- [ ] **Step 2: Add `getGateHealthSignal(stageId, data)` function**

Add this function in `lifecycle-guide.js` before `renderCadenceNudgeBanner()`:

```javascript
function getGateHealthSignal(stageId, data) {
    if (!data || !data.tracks) return null
    const allItems = data.tracks.flatMap(t => t.subtracks?.flatMap(s => s.items || []) || [])
    const allEpics = data.epics || []
    const allOkrs  = data.okrs  || []
    const activeSprint = (data.sprints || []).find(s => s.status === 'active')
    const closedSprints = (data.sprints || []).filter(s => s.status === 'closed')

    // Floating items — any stage
    const floatingItems = allItems.filter(i => !i.epicId && i.status !== 'done' && i.status !== 'archived')
    if (floatingItems.length > 0) {
        const key = 'gate_floating_dismissed'
        if (!sessionStorage.getItem(key)) {
            return { message: `${floatingItems.length} item${floatingItems.length > 1 ? 's' : ''} floating without an epic — link them to epics`, dismissKey: key, priority: 3 }
        }
    }

    // Vision gate — epics without OKR alignment
    if (stageId === 'vision' || stageId === 'plan') {
        const unalignedEpics = allEpics.filter(e => !e.linkedOKR && e.status !== 'done' && e.status !== 'archived')
        if (unalignedEpics.length > 0) {
            const key = 'gate_epic_okr_dismissed'
            if (!sessionStorage.getItem(key)) {
                return { message: `${unalignedEpics.length} epic${unalignedEpics.length > 1 ? 's' : ''} not linked to any OKR — align before planning`, dismissKey: key, priority: 3 }
            }
        }
    }

    // Plan gate — sprint over capacity
    if (stageId === 'plan' && activeSprint) {
        const capacity = activeSprint.totalCapacity || 0
        const planned  = activeSprint.plannedPoints  || 0
        if (capacity > 0 && planned > capacity) {
            const key = 'gate_capacity_dismissed'
            if (!sessionStorage.getItem(key)) {
                return { message: `Sprint is over capacity (${planned} pts planned, ${capacity} pts available) — defer or remove items`, dismissKey: key, priority: 3 }
            }
        }
    }

    // Build gate — KRs with zero progress after sprint close
    if (stageId === 'build' || stageId === 'review') {
        const closedSprintIds = new Set(closedSprints.map(s => s.id))
        const staleKRs = allOkrs.flatMap(o => (o.keyResults || []).filter(kr => {
            const isZero = !kr.current || Number(kr.current) === 0
            const linkedToClosedSprint = kr.sprintId && closedSprintIds.has(kr.sprintId)
            return isZero && linkedToClosedSprint
        }))
        if (staleKRs.length > 0) {
            const key = 'gate_kr_progress_dismissed'
            if (!sessionStorage.getItem(key)) {
                return { message: `${staleKRs.length} key result${staleKRs.length > 1 ? 's' : ''} show no progress — update after sprint close`, dismissKey: key, priority: 3 }
            }
        }
    }

    // Review gate — sprint overdue (ceremony prompt)
    if (stageId === 'review' && activeSprint) {
        const endDate = activeSprint.endDate ? new Date(activeSprint.endDate) : null
        if (endDate && endDate < new Date()) {
            const key = 'gate_retro_dismissed'
            if (!sessionStorage.getItem(key)) {
                return { message: `Sprint "${activeSprint.name}" is overdue — run retrospective and close the sprint`, dismissKey: key, priority: 3 }
            }
        }
    }

    return null
}
```

- [ ] **Step 3: Update `renderCadenceNudgeBanner()` priority chain**

Find `renderCadenceNudgeBanner()`. The existing structure checks `getSprintCoachSignal()` first, then day-of-week nudge. Insert `getGateHealthSignal()` between sprint urgency and the nudge:

```javascript
function renderCadenceNudgeBanner() {
    const bar = document.getElementById('cadence-nudge-bar')
    if (!bar) return

    // Priority 1: sprint urgency (≤2 days)
    const sprintSignal = getSprintCoachSignal()
    if (sprintSignal) {
        bar.innerHTML = buildNudgeBannerHTML(sprintSignal.message, null)
        bar.style.display = 'flex'
        return
    }

    // Priority 2: stage gate health
    const stageId = window.currentWorkflowStage || 'discovery'
    const gateSignal = getGateHealthSignal(stageId, window.UPDATE_DATA)
    if (gateSignal) {
        bar.innerHTML = buildNudgeBannerHTML(gateSignal.message, gateSignal.dismissKey)
        bar.style.display = 'flex'
        return
    }

    // Priority 3: day-of-week nudge (existing logic)
    // ... existing cadence nudge code stays here unchanged ...
}
```

Note: `buildNudgeBannerHTML(message, dismissKey)` is a helper you must either find (if it already exists) or define inline. It renders the bar HTML with an optional dismiss button:

```javascript
function buildNudgeBannerHTML(message, dismissKey) {
    const dismissBtn = dismissKey
        ? `<button onclick="sessionStorage.setItem('${dismissKey}', '1'); renderCadenceNudgeBanner()" class="ml-2 text-xs opacity-60 hover:opacity-100" aria-label="Dismiss">×</button>`
        : ''
    return `<span class="text-sm">${message}</span>${dismissBtn}`
}
```

If `renderCadenceNudgeBanner()` already builds the HTML inline rather than through a helper, adapt the pattern to match — don't refactor the existing sprint signal rendering, just insert the gate signal tier between sprint and nudge.

- [ ] **Step 4: Syntax check**

```bash
node --check lifecycle-guide.js
```
Expected: exits 0, no output.

- [ ] **Step 5: Commit**

```bash
git add lifecycle-guide.js
git commit -m "feat: add gate health coaching signals (floating items, epic alignment, capacity, KR progress, ceremony)"
```

---

## Smoke Test Checklist

After all 5 tasks:

- [ ] `node --check` passes on `workflow-nav.js`, `lifecycle-guide.js`, `app.js`
- [ ] App loads without JS console errors
- [ ] Switch to Build stage as Dev persona — My Tasks chip appears in Row 2
- [ ] Switch to Workflow view — breadcrumb shows Discover stage (not stuck)
- [ ] Switch to Activity view — breadcrumb shows Ship stage (not stuck)
- [ ] Full re-render (`renderDashboard()` in console) — Activity view populates
- [ ] `checkStageCompletion('plan')` returns a result (no longer undefined/mismatched)
- [ ] `checkStageCompletion('build')` returns a result
- [ ] Coach bar shows gate health signal when floating items exist
- [ ] Gate signal has × dismiss button; clicking it hides for session
- [ ] Sprint urgency signal still takes priority over gate signal
