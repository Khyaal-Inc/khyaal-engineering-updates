---
description: View renderer contracts, HTML template patterns, modal injection, CSS class binding, and accessibility baseline for the Khyaal SPA
---

# UI Rules

## View Renderer Contract

Every view renderer follows this exact pattern:

```javascript
function renderXxxView() {
    const container = document.getElementById('xxx-view')
    const mode = getCurrentMode()           // 'pm' | 'dev' | 'exec'
    const activeTeam = getActiveTeam()      // team filter

    let html = `<div class="ribbon-header">...</div>`  // optional header

    UPDATE_DATA.tracks.forEach((track, ti) => {
        if (activeTeam && activeTeam !== track.name) return
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (!isItemMatchingTagFilter(item)) return
                html += `<div>...</div>`
            })
        })
    })

    container.innerHTML = html
}
```

Rules:
- Function name: `render` + PascalCase view name + `View` (e.g., `renderKanbanView`)
- Always reads from `UPDATE_DATA` — never from DOM
- Always ends with a single `container.innerHTML = html` assignment — no partial DOM updates
- No side effects inside the renderer (no `localStorage` writes, no Lambda calls)
- Persona gates: wrap sections in `if (mode === 'pm')` or `if (mode !== 'exec')` — never show all fields to all personas

## HTML Builder Contract

Builder functions construct partial HTML and return it — they never assign to DOM directly:

```javascript
function buildXxx(item, context) {
    // context = { mode, view, workflowStage }
    return `<div class="...">...</div>`
}
```

Rules:
- Function name: `build` + PascalCase descriptor (e.g., `buildContextBanner`, `buildPillar`)
- Must be a pure function — same inputs produce same output
- Never call `document.getElementById()` or `container.innerHTML =` inside a builder

## Inline Event Handler Pattern

Always use inline `onclick` in the HTML string. Never attach `addEventListener` inside view renderers or builders.

```javascript
// Correct
html += `<button onclick="openItemEdit(${ti}, ${si}, ${ii}, '${item.id}')">Edit</button>`

// Wrong — never do this inside a renderer
container.querySelector('button').addEventListener('click', () => openItemEdit(...))
```

Pass only primitive params (index numbers, string IDs) to inline handlers — never pass object references.

## Modal Injection

The CMS modal has exactly 4 injectable sections. Always target these IDs — never create new modal elements:

| ID | Content |
|----|---------|
| `modal-title` | Title text + stage pill badge |
| `modal-banner` | Context banner (epic, sprint, OKR links) |
| `modal-form` | Field pillar grid (built by `buildContextAwareForm()`) |
| `modal-footer` | Save / cancel / delete action buttons |

Show the modal by adding class `active` to `#cms-modal`. Always set `document.body.style.overflow = 'hidden'` when opening.

## Tag Widgets

Tag input widgets must be initialised after `innerHTML` assignment, not before:

```javascript
document.getElementById('modal-form').innerHTML = buildContextAwareForm(item, false, {})

// Always inside setTimeout — the DOM nodes must exist first
setTimeout(() => {
    renderTagWidget('contrib-tag-input-edit', item.contributors, 'contributor-list')
    renderTagWidget('tags-tag-input-edit', item.tags, 'tag-list')
    attachModalFormListeners()
}, 50)
```

## CSS Class Binding

Use config objects for semantic colour binding — never hardcode Tailwind colour strings for status/priority/stage:

```javascript
// Correct — reads from config
const statusClass = statusConfig[item.status]?.class || 'bg-slate-100 text-slate-600'
html += `<span class="${statusClass}">${item.status}</span>`

// Wrong — fragile and inconsistent
html += `<span class="bg-green-100 text-green-700">done</span>`
```

Use CSS custom properties for lifecycle stage colours — they are defined in `:root` in `styles.css`:

```javascript
// Correct
html += `<div style="border-color: var(--stage-${stage})">...</div>`

// Wrong — do not duplicate the hex value inline
html += `<div style="border-color: #7c3aed">...</div>`
```

Dynamic multi-class binding: always interpolate into `class=""` — never use `classList.add()` on strings built by template:

```javascript
const colorClass = contributorColors[name] || 'bg-slate-600'
const textClass  = contributorColors[name] ? '' : 'text-white'
html += `<div class="${colorClass} ${textClass} px-4 py-2.5">...</div>`
```

## Accessibility Baseline

Current state: minimal — 2 `aria-*` instances exist in the codebase. This is a documented gap.

Rules going forward:
- **Do not add new inaccessible patterns.** Every interactive element that uses only an icon (no visible text) must have `aria-label`.
- Form inputs in CMS modals must have associated `<label>` elements where possible (new fields only — don't rewrite existing ones).
- Tooltips must use `role="tooltip"` on the tooltip container.
- Do not use `<div onclick>` for primary navigation — use `<button>` elements.

```javascript
// Correct — icon-only button
`<button class="info-btn" aria-label="View item details" onclick="showDetail('${id}')">i</button>`

// Wrong — no accessible label
`<div class="info-btn" onclick="showDetail('${id}')">i</div>`
```

## Keyboard Shortcuts (core.js)

Shortcuts are registered once in `setupKeyboardShortcuts()` in `core.js`. Rules:
- Never register `document.addEventListener('keydown')` outside `core.js`
- Always guard: skip when a modal is active (`#cms-modal.active`, `#admin-panel-modal.active`, `#cmd-palette.open`) or when focus is in `INPUT`/`TEXTAREA` — except `Cmd+K` which fires from any context
- Number keys `1–9`, `0` are reserved for view navigation — do not override them for other actions
- `/` is reserved for global search focus
- `Cmd+K` / `Ctrl+K` is reserved for the Command Palette — toggles open/close from any context (including inputs)
