# Lifecycle Redesign — Design Spec

**Date:** 2026-04-11  
**Status:** Approved  
**Author:** Gautam (Engineering Lead)

---

## Problem

Two lifecycle systems have diverged:

| System | File | Stage IDs |
|--------|------|-----------|
| Strategic Ribbon | `workflow-nav.js` | `discovery`, `vision`, `plan`, `build`, `review` |
| Lifecycle Guide | `lifecycle-guide.js` | `discovery`, `vision`, `definition`, `delivery`, `review` |

This mismatch means `checkStageCompletion()` never matches `currentWorkflowStage`, the breadcrumb breaks on views mapped to wrong IDs, and gate checks operate on a stale mental model of the stage sequence.

Four concrete bugs stem from this divergence:

1. **`'my-tasks'` missing from `WORKFLOW_STAGES.build.views[]`** — Dev Row 2 chips in Build stage are incomplete
2. **`'workflow'` and `'activity'` missing from `VIEW_LIFECYCLE_MAP`** — breadcrumb gets stuck on those views
3. **`renderActivityView` missing from `renderDashboard()`** — activity data goes stale on full refresh
4. **`STAGES` IDs and `VIEW_LIFECYCLE_MAP` stageIds wrong** — `'definition'`→`'plan'`, `'delivery'`→`'build'` throughout `lifecycle-guide.js`

Separately, the coaching system only covers time-based sprint signals ("sprint ending soon"). It misses structural health signals: floating items, unaligned epics, capacity overruns, zero-progress KRs, and ceremony moments.

---

## Decision

### 1. Unification strategy

`lifecycle-guide.js` conforms to `workflow-nav.js`. The canonical stage IDs are `plan` and `build`. No changes to `workflow-nav.js` stage keys.

Rename in `lifecycle-guide.js`:
- `STAGES[2].id`: `'definition'` → `'plan'`
- `STAGES[3].id`: `'delivery'` → `'build'`
- All `VIEW_LIFECYCLE_MAP` stageId values: `'definition'` → `'plan'`, `'delivery'` → `'build'`

### 2. Bug fixes (bundled into redesign)

**Bug 1 — `my-tasks` in nav config:**  
Add `'my-tasks'` to `WORKFLOW_STAGES.build.views[]` in `workflow-nav.js`. Already in `STAGE_TO_VIEWS.dev.build` in `modes.js` — just missing from the canonical nav config.

**Bug 2 — Missing VIEW_LIFECYCLE_MAP entries:**  
Add:
```javascript
workflow: { stageId: 'discovery', stageNum: 1 },
activity: { stageId: 'review',    stageNum: 5 },
```

**Bug 3 — Missing renderActivityView call:**  
Add `runSafe(renderActivityView, 'Activity')` to `renderDashboard()` in `app.js` alongside the other 19 renderer calls.

**Bug 4 — Stage ID migration:**  
Full search-and-replace in `lifecycle-guide.js` for the stageId strings. `checkStageCompletion()` branches also updated to match new IDs.

### 3. Coaching expansion — gate health signals

New function `getGateHealthSignal(stageId, data)` in `lifecycle-guide.js`. Returns `{ message, priority }` or `null`.

Gate checks per stage:

| Stage | Check | Signal |
|-------|-------|--------|
| Any | Items with no `epicId` | "X items floating without an epic — link them to epics" |
| `vision` | Epics with no `linkedOKR` | "X epics not linked to any OKR — align before planning" |
| `plan` | `sprint.plannedPoints > team capacity` | "Sprint is over capacity — remove or defer items" |
| `build` | KRs where `current === 0` and linked sprint is closed | "X key results have no progress — update after sprint close" |
| `review` | Sprint status is `active` and `endDate` is past | "Sprint overdue — run retrospective and close it" |

Priority chain in `renderCadenceNudgeBanner()`:
1. Sprint urgency (≤2 days to end) — existing `getSprintCoachSignal()`
2. Gate health — new `getGateHealthSignal()`
3. Day-of-week nudge — existing cadence logic

Only one signal renders at a time. Gate health signals are dismissible (click × to hide for the session via `sessionStorage`).

### 4. Ceremony prompts

Ceremony moments surface as gate health signals in the `review` stage when a sprint is overdue. No new UI surface — reuses the coach bar.

---

## Architecture

No new files. Changes span 3 files:

| File | Change |
|------|--------|
| `lifecycle-guide.js` | Fix STAGES IDs, fix VIEW_LIFECYCLE_MAP, add `getGateHealthSignal()`, update priority chain in `renderCadenceNudgeBanner()` |
| `workflow-nav.js` | Add `'my-tasks'` to `build.views[]` |
| `app.js` | Add `renderActivityView` call in `renderDashboard()` |

No CSS changes required. The `#cadence-nudge-bar` already renders the dismiss button from ADR-001.

---

## Out of Scope

- Sidebar navigation (deferred to ADR-002)
- Multi-user CMS concurrency (documented constraint)
- esbuild / code splitting (deferred)
- Persistent gate health history (sessionStorage dismissal is sufficient)
