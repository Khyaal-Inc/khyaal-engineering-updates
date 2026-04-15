# UX Recommendation — Khyaal Internal PM Tool

**Audience:** PM / Dev / Exec team (internal product management SPA)
**Constraint:** No-build, no npm — Vanilla JS + Tailwind CDN + `styles.css`
**Date:** 2026-04-09

---

## TL;DR

The current UI is functional and has a solid foundation — stage-colored navigation, persona-filtered views, glass morphism cards, and a 13-shortcut keyboard system. The gaps are: (1) accessibility debt that blocks WCAG AA compliance, (2) no pinned Tailwind version creating upgrade risk, (3) keyboard access stops at the view level (Strategic Ribbon requires mouse), and (4) no information density toggle for power users who prefer compact tables over card grids. The recommendations below are ordered by impact and all work within the no-build constraint.

---

## 1. Design System

### Recommended Approach: Tailwind CDN + Structured CSS Custom Properties

**Do not migrate to shadcn/ui, Radix, or Material 3.** All three require a build step (npm + bundler) which is prohibited by the architecture. The existing combination of Tailwind utilities + CSS custom properties in `styles.css` is the right pattern — it just needs to be made more systematic.

### 1.1 Pin the Tailwind CDN Version

Current `index.html`:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

Risk: Unpinned CDN means any Tailwind major/minor release can silently break layout.

**Fix — pin to a specific version:**
```html
<script src="https://cdn.tailwindcss.com/3.4.1"></script>
```

Check [https://cdn.tailwindcss.com](https://cdn.tailwindcss.com) releases and pin to the latest stable `3.x` before any `4.x` migration.

### 1.2 Design Token Hierarchy

The existing token system in `styles.css` is good but incomplete. Recommended full token set:

```css
:root {
  /* === WORKFLOW STAGES === */
  --stage-discover: #7c3aed;
  --stage-vision:   #4f46e5;
  --stage-plan:     #2563eb;
  --stage-build:    #059669;
  --stage-ship:     #d97706;

  /* === STATUS STATES (8) === */
  /* Done, Now, Next, Blocked, Later, QA, Review, On Hold */
  /* (existing tokens — keep as-is, contrast is AA compliant) */

  /* === SURFACES === */
  --surface-base:         #f8fafc;
  --surface-card:         rgba(255,255,255,0.88);
  --surface-card-hover:   rgba(255,255,255,0.98);
  --surface-overlay:      rgba(255,255,255,0.92);

  /* === TYPOGRAPHY === */
  --text-xs:   0.75rem;   /* 12px — metadata, timestamps */
  --text-sm:   0.875rem;  /* 14px — secondary labels */
  --text-base: 1rem;      /* 16px — body, inputs */
  --text-lg:   1.125rem;  /* 18px — card titles */
  --text-xl:   1.25rem;   /* 20px — section headers */
  --text-2xl:  1.5rem;    /* 24px — page titles */

  /* === SPACING === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* === DENSITY (see §6) === */
  --card-padding:   var(--space-4);
  --card-gap:       var(--space-4);
  --row-height:     44px;

  /* === MOTION === */
  --transition-fast: 120ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 350ms ease;
}

/* Compact density mode (toggle via JS class on <body>) */
body.density-compact {
  --card-padding: var(--space-2);
  --card-gap:     var(--space-2);
  --row-height:   32px;
  --text-sm:      0.75rem;
  --text-base:    0.875rem;
}
```

### 1.3 Typography

Use system font stack — no CDN font needed, loads faster:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;
  font-size: var(--text-base);
  line-height: 1.5;
  color: #1e293b; /* slate-800 — WCAG AA on white */
}
```

### 1.4 Glass Morphism — Use Sparingly

Current usage is appropriate (floating HUD, modal backdrops). Risks:
- Reduces legibility on non-white backgrounds
- `backdrop-filter` has no effect in some older browsers

**Rule:** Only use glass morphism on elements that float above the page (modals, ribbons, HUD). Never on inline cards — use solid `--surface-card` instead.

---

## 2. Key UI Patterns

### 2.1 Dashboard (Card Grid)

**Current pattern:** `auto-fit minmax(280px, 1fr)` — good, keep it.

**Improvements:**

| Pattern | Current | Recommended |
|---|---|---|
| Card min-width | 280px hardcoded | Vary per view: 280px (track), 340px (roadmap), 420px (epic) |
| Card hover state | Shadow lift | Shadow lift + left-border accent in stage color |
| Empty state | None (blank) | Add a centered empty state with a CTA per view |
| Skeleton loader | None | Add CSS-only shimmer while data loads |

**Left-border accent pattern (add to card CSS):**
```css
.track-card {
  border-left: 3px solid transparent;
  transition: border-color var(--transition-fast);
}
.track-card:hover {
  border-left-color: var(--stage-build); /* or status accent color */
}
```

**KPI Strip (top of dashboard):**
The floating legend HUD is underused — it only shows status legend. Consider promoting KPIs (open blockers count, sprint velocity, OKR completion %) into a fixed strip below the command bar. Clicking any KPI deep-links to the relevant view.

### 2.2 Navigation — Strategic Ribbon

**Current 3-tier system:** Mini Pipeline → Breadcrumb → View Sub-tabs. This is the right architecture.

**Improvements needed:**

| Issue | Fix |
|---|---|
| Breadcrumb click opens ribbon — no keyboard access | Add `Enter`/`Space` handler on breadcrumb element (see §4) |
| Stage clicks in ribbon require scroll | Auto-scroll is already implemented (`scrollToActiveStage`) — keep it |
| No visible active state on sub-tabs on mobile | Ensure active tab has a colored underline, not just background — survives color-blind modes |
| Ribbon z-index `z-[100]` — may conflict with modals | Confirm modal is `z-[200]` to always win |

**Recommended keyboard nav for Strategic Ribbon:**
```
Breadcrumb focused → Enter → opens ribbon
Ribbon open → Tab → moves between stage cards
Stage card focused → Enter → selects stage, focuses first sub-tab
Sub-tabs → Left/Right arrow → cycles tabs (roving tabindex)
Ribbon open → Escape → closes ribbon, returns focus to breadcrumb
```

### 2.3 Forms — CMS Modal

**Current pattern:** Context-aware pillar grid (4-col PM, 3-col Exec, 1-col mobile). This is solid.

**Improvements:**

| Issue | Recommendation |
|---|---|
| Inputs lack `<label>` elements | Add explicit `<label for="input-id">` — don't rely on placeholders |
| No focus-visible ring | Add `:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }` globally |
| Modal doesn't trap focus | Implement focus trap: on open, save previous focus; Tab cycles within modal; Escape returns focus |
| Validation is visual only (red border) | Add `aria-describedby` pointing to error message element |
| No field-level help text | Add `<span class="field-hint">` with `font-size: var(--text-xs)` below inputs |

**Focus trap implementation pattern (vanilla JS, ~20 lines):**
```javascript
function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  })
}
```

---

## 3. WCAG 2.1 AA Checklist

Status: ✅ Pass | ⚠️ Partial | ❌ Fail

### Perceivable

| Criterion | Status | Notes |
|---|---|---|
| 1.1.1 Non-text content (alt text) | ⚠️ | Emojis in nav need `aria-label` on parent; decorative emojis need `aria-hidden="true"` |
| 1.3.1 Info and relationships | ⚠️ | Status badges use color alone in some cards — add text label alongside color dot |
| 1.3.2 Meaningful sequence | ✅ | DOM order matches visual order |
| 1.3.3 Sensory characteristics | ⚠️ | "Click the red badge" instructions — add text labels |
| 1.4.1 Use of color | ⚠️ | Blocker strip, status pills rely on color only — add icons or text labels |
| 1.4.3 Contrast (minimum) | ✅ | Theme colors use "stronger" variants — confirmed AA intent in `core.js` |
| 1.4.4 Resize text | ✅ | Uses `rem` units; browser zoom works |
| 1.4.10 Reflow | ⚠️ | Test at 400% zoom / 320px viewport — some grid cards may overflow |
| 1.4.11 Non-text contrast | ⚠️ | Input borders `#e2e8f0` against white may fail 3:1 — darken to `#94a3b8` |
| 1.4.12 Text spacing | ✅ | No CSS that blocks text spacing overrides |
| 1.4.13 Content on hover | ✅ | Tooltips (`title` attr) — acceptable; no custom tooltip that disappears on hover |

### Operable

| Criterion | Status | Notes |
|---|---|---|
| 2.1.1 Keyboard | ⚠️ | Strategic Ribbon not keyboard accessible; tag filter sidebar not keyboard accessible |
| 2.1.2 No keyboard trap | ❌ | CMS modal does not trap focus — Tab escapes to page behind |
| 2.4.1 Bypass blocks | ⚠️ | Add a `Skip to main content` link as first focusable element |
| 2.4.3 Focus order | ⚠️ | Fix after adding focus trap — currently unpredictable in modal |
| 2.4.4 Link purpose | ✅ | Buttons have visible labels |
| 2.4.7 Focus visible | ❌ | No `focus-visible` CSS — browser defaults only (often invisible in Chrome) |
| 2.4.11 Focus appearance (AA 2.2) | ❌ | No custom focus ring with 2px offset |
| 2.5.3 Label in name | ⚠️ | Some icon-only buttons (✕ close) need `aria-label` |
| 2.5.5 Target size | ⚠️ | Close button (✕) may be < 44px; audit all interactive elements |

### Understandable

| Criterion | Status | Notes |
|---|---|---|
| 3.1.1 Language of page | ❌ | `<html>` tag missing `lang="en"` attribute |
| 3.2.1 On focus | ✅ | No unexpected context changes on focus |
| 3.2.2 On input | ✅ | No unexpected submits |
| 3.3.1 Error identification | ⚠️ | Errors shown visually (red border) but not announced to screen readers |
| 3.3.2 Labels or instructions | ⚠️ | Placeholders used as labels — add `<label>` elements |

### Robust

| Criterion | Status | Notes |
|---|---|---|
| 4.1.1 Parsing | ✅ | Valid HTML (no build artifacts that corrupt markup) |
| 4.1.2 Name, role, value | ⚠️ | Mode switcher has `role="group"` + `aria-pressed` (good); modal missing `aria-modal="true"` |
| 4.1.3 Status messages | ❌ | Toast notifications and mode switch banners not announced — need `role="status"` or `aria-live="polite"` |

### Priority Fixes (Top 5 for AA compliance)

1. `<html lang="en">` — 1-line fix, highest bang for effort
2. `:focus-visible` global CSS — 5-line fix, massive usability improvement for keyboard users
3. `aria-live="polite"` on toast/banner container — 2-line fix, makes dynamic updates screen-reader accessible
4. Focus trap in CMS modal — ~20-line vanilla JS fix (pattern provided above)
5. `aria-modal="true"` + `aria-labelledby` on modal dialog — 2-attribute fix

---

## 4. Mobile-First Breakpoints

### Recommended Breakpoint Table

| Breakpoint | Width | Intent |
|---|---|---|
| `xs` | 0–479px | Single-column, icon-only nav, stacked form fields |
| `sm` | 480–679px | 2-column grids allowed, stage labels hidden (current behavior ✅) |
| `md` | 680–767px | Mode labels shown, wider cards |
| `lg` | 768–1023px | 3-column grids, full command strip |
| `xl` | 1024–1439px | 4-column grids, side panels possible |
| `2xl` | 1440px+ | Full layout, max-width 1720px cap (current ✅) |

### Interaction Model by Breakpoint

| Feature | xs/sm (mobile) | md/lg (tablet) | xl/2xl (desktop) |
|---|---|---|---|
| Strategic Ribbon | Full-height modal sheet | Popover (current ✅) | Popover (current ✅) |
| Command Strip | Icons only, 2 rows | Icons + labels | Full labels + persona switcher |
| Card grid | 1 column | 2 columns | 3–4 columns auto-fit |
| CMS modal | Full screen | 80vw centered | 60vw centered, max 900px |
| Keyboard shortcuts | Disabled | Optional | Enabled (current ✅) |
| Tag filter sidebar | Bottom sheet | Side panel | Inline (current ✅) |

### Touch Targets

All interactive elements must meet the **44×44px minimum tap target** (WCAG 2.5.5, Apple HIG, Material guidance):

```css
/* Add to styles.css */
button, [role="button"], a, input, select {
  min-height: 44px;
  min-width: 44px;
}

/* Exception for inline text links — they get padding instead */
a:not(.btn) {
  padding-block: 4px;
}
```

---

## 5. Enterprise UX Patterns (Internal Tool)

These patterns are specifically valuable for the PM/Dev/Exec team that uses this tool daily.

### 5.0 Workspace Switcher + Role-Aware UX ✅ Shipped

The Workspace Switcher is the top-level context control. Every other UX decision (persona mode, visible views, CMS access) flows from the active workspace + the user's grant for it.

#### Workspace Switcher placement

```
[KP logo]  [▼ Khyaal Mobile ▾]  [pm | dev | exec]  ...  [Engineering Playbook]  [✕]
```

- Lives as `#team-switcher` (`<select>`) between the KP logo and persona control in the Strategic Ribbon header
- Only shows workspaces the current user has a grant for (derived from JWT `grants[]`)
- **Hidden entirely when the user has exactly one accessible workspace** — zero noise for single-workspace users
- On change: calls `onTeamSwitcherChange(id)` → `switchProject(id)` which async-fetches the new workspace data from Lambda, resets both `#global-team-filter` and `#project-filter`, then re-renders all views

#### Role enforcement UX

When a user switches to a workspace where their grant mode is `dev` or `exec`:
- The persona segmented control greys out options above the grant level
- The active persona auto-switches to the grant mode if current mode exceeds the grant
- Toast: `"Switching to Khyaal Mobile…"`

#### Admin panel UX ✅ Shipped

Full-screen admin view accessible via Settings → "Open Admin ↗" or `switchView('admin')`. PM-only. Two tabs:

**Users & Grants tab:**
- Lists all users from `users.json` with avatar, name, email, Edit/Remove buttons
- Each user expands to show workspace grants (workspace name, role badge, revoke button)
- "+ Grant Access to Workspace" inline form: workspace select, role select, Add button
- "+ Add User" inline form: User ID, Display Name, Email, Initial Password
- "WORKSPACES" section below users: lists all workspaces with active/inactive state, Switch/Edit/Delete buttons, inline edit form
- Single "Save Users and Workspaces to GitHub" CTA commits `users.json` via Lambda

**Structure tab:**
- Context: "Projects in: [Active Workspace Name]"
- Accordion: Projects → Tracks → Subtracks with inline Add/Edit/Delete at every level
- "Save Structure to GitHub" CTA commits workspace data file via Lambda

### 5.1 Information Density Toggle

Power users want compact tables; new users prefer spacious cards. Implement a density switch.

**Where:** App bar, next to persona switcher.
**How:** Toggle `body.density-compact` class → CSS custom properties collapse spacing (tokens defined in §1.2).

```javascript
// core.js — add to keyboard shortcuts
'D' → toggle density (if not in modal, not in input)
// Also add toggle button to app bar
```

```html
<!-- index.html — add to app-bar controls -->
<button onclick="toggleDensity()" title="Toggle density (D)" class="app-bar-btn">
  <span aria-hidden="true">⊞</span>
  <span class="sr-only">Toggle information density</span>
</button>
```

### 5.2 Keyboard Shortcut Expansion

Current: 13 shortcuts. Gaps that matter for power users:

| Proposed Shortcut | Action | Priority |
|---|---|---|
| `D` | Toggle density mode | High |
| `B` | Toggle blocker strip | High |
| `N` | New item (open CMS add modal) | High |
| `G` then `1-5` | Jump to workflow stage (Discover/Vision/Plan/Build/Ship) | Medium |
| `F` | Open tag filter sidebar | Medium |
| `?` | Show keyboard shortcut cheat sheet | Medium |
| `Ctrl+S` / `Cmd+S` | Save in CMS modal | Low (already `Ctrl+Enter`) |
| `[` / `]` | Cycle through views within current stage | Low |

**Cheat sheet modal pattern:**
```javascript
// Trigger on '?' key (when not in input/modal)
// Show a simple fixed overlay with all shortcuts in a 2-column grid
// Close on '?' again or Escape
```

### 5.3 Command Palette (Future, High Value)

A `Cmd+K` / `Ctrl+K` command palette is the single highest-leverage enterprise UX feature missing from this tool. It lets users:
- Switch to any view by typing its name
- Search across all items without switching views
- Trigger actions (New item, Switch persona, Open sprint)

**Implementation approach (vanilla JS, no library):**
1. Intercept `Cmd+K` / `Ctrl+K` globally
2. Render a floating modal with a search input
3. Fuzzy-match against: view names, item titles (from `UPDATE_DATA`), actions
4. Keyboard navigation: Arrow keys to move, Enter to select, Escape to close
5. ~150 lines of vanilla JS — no dependencies needed

This is the biggest single UX ROI item for power users.

### 5.4 Contextual Right-Click / Long-Press Menu

Currently, all item interactions require opening the full CMS modal. For quick actions (change status, mark as blocked, move to next sprint), a contextual menu reduces friction significantly.

**Implementation:** `contextmenu` event on cards → render small absolute-positioned menu with 4–6 quick actions → each action calls the appropriate CMS function directly without opening the full modal.

### 5.5 Column-Sortable Table View

The backlog and track views are card grids. For 100+ items, power users want a dense sortable table with columns (Title, Status, Priority, Assignee, Sprint, Due).

**Density toggle** (from §5.1) can switch between card view (default) and table view (compact). The table uses `<table>` markup with `role="columnheader"` and `aria-sort` for sortable columns.

### 5.6 Persistent View Preferences

Store per-view preferences in `localStorage`:
- Last-used sort order
- Density mode
- Tag filter state
- Search query (optional — may be confusing if persisted)

Key: `khyaal_view_prefs` → JSON object keyed by view name.

---

## 6. Implementation Roadmap

All items work within the no-build constraint. Ordered by impact/effort ratio.

### Immediate (Quick Wins — < 1 hour each)

| Item | File | Effort |
|---|---|---|
| Add `lang="en"` to `<html>` | `index.html` | 1 min |
| Pin Tailwind CDN to specific version | `index.html` | 1 min |
| Add `aria-live="polite"` to toast container | `index.html` | 5 min |
| Add `aria-modal="true"` + `aria-labelledby` to CMS modal | `index.html` | 5 min |
| Add `:focus-visible` global CSS rule | `styles.css` | 5 min |
| Darken input borders from `#e2e8f0` to `#94a3b8` | `styles.css` | 5 min |
| Add `aria-hidden="true"` to decorative emojis in nav | `workflow-nav.js` | 15 min |
| Add `aria-label` to icon-only buttons (✕ close, blocker badge) | `index.html`, `core.js` | 15 min |

### Short-term (1–4 hours each)

| Item | File(s) | Effort |
|---|---|---|
| Focus trap in CMS modal | `cms.js` | 2 hrs |
| Density toggle + `body.density-compact` CSS | `styles.css`, `core.js`, `index.html` | 2 hrs |
| Add `<label>` elements to CMS form inputs | `cms.js` | 3 hrs |
| Keyboard access for Strategic Ribbon (Tab/Arrow/Enter/Escape) | `workflow-nav.js` | 3 hrs |
| `Skip to main content` link | `index.html`, `styles.css` | 30 min |
| Keyboard shortcut additions (B, N, D, ?) | `core.js` | 2 hrs |
| Cheat sheet modal (`?` key) | `core.js` | 2 hrs |

### Medium-term (1–3 days each)

| Item | File(s) | Effort |
|---|---|---|
| Command palette (`Cmd+K`) | `core.js` + new `command-palette.js` | 1–2 days |
| Sortable table view for backlog/track | `views.js` | 2–3 days |
| Contextual right-click menu on cards | `views.js`, `cms.js` | 1 day |
| Column resize / column chooser for table view | `views.js` | 2 days |
| Persistent view preferences (`localStorage`) | `core.js` | 1 day |

---

## Appendix: What NOT to Adopt

| Tool / Pattern | Why Not |
|---|---|
| shadcn/ui | Requires React + npm build |
| Radix UI | Requires React + npm build |
| Material 3 | Complete design migration, different visual language |
| Alpine.js | Adds a reactive runtime — unnecessary for this architecture |
| Floating UI / Popper.js | CDN-available but adds complexity; custom positioning is simpler for this use case |
| CSS Grid subgrid | Not supported in Safari < 16; wait for wider adoption |
| Container queries | Limited support; media queries are sufficient for this layout |
