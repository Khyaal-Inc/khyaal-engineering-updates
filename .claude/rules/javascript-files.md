---
applies_to: "**/*.js"
description: Rules for JavaScript files in this project
---

# JavaScript File Rules

## Code Style
- ES6+ · no semicolons · async/await · map/filter/reduce over loops
- No DOM manipulation in loops — build HTML strings, assign `innerHTML` once
- Event delegation for dynamic elements

## Patterns — Use These, Don't Reinvent
- Global state: `UPDATE_DATA` (tracks[].subtracks[].items[])
- View switching: `switchView(viewId)` in app.js
- Save to memory: `saveToLocalStorage()` in cms.js
- Save to GitHub: `saveToGithub()` in cms.js (needs GET sha first, then PUT)
- Find item by ID: `findItemById(itemId)` in cms.js
- Find item by index: `UPDATE_DATA.tracks[ti].subtracks[si].items[ii]`
- Validate item context: `getValidatedItemContext(arg)` in cms.js
- Search check: `isItemInSearch(item)` in core.js
- Date filter check: `isItemInDateRange(item)` in core.js
- Current mode: `getCurrentMode()` in modes.js → returns `'pm'|'dev'|'exec'`
- Current user (dev mode): `getCurrentUser()` in modes.js
- Mode filter: `getModeFilter()` in modes.js — apply to filter items per persona
- Log activity: `logChange(action, target)` in cms.js
- Re-render: `renderDashboard()` in app.js (full) or view-specific render fn

## Before Editing Any JS File
1. Check CLAUDE.md "File Map" to confirm you're editing the right file
2. Grep for the function before writing a new one — it likely already exists
3. Don't mutate UPDATE_DATA outside of cms.js CMS functions
4. Set `window.isActionLockActive = true` before modal ops, reset after
5. New field → must also add to `normalizeData()` in app.js with safe default

## cms.js Specifics
- Edit modal entry: `openItemEdit(ti, si, ii, itemId)` / `addItem(ti, si, defaults)`
- Field rendering: add `case 'fieldName':` in `renderField()` (~line 452)
- Field groups: `FIELD_GROUPS` (line 114) — add field to correct pillar
- Field visibility: `LIFECYCLE_FIELD_MAP` (line 148) — add to relevant views
- Field save: read via `getElementById('edit-fieldName')` in `saveCmsChanges()`
- Tag widget fields (contributors/tags/deps) use `window[selection_${id}]` callbacks

## views.js / module files
- Clear container before rendering: `container.innerHTML = ''`
- Always guard: `const container = document.getElementById('view-id'); if (!container) return`
- Render function is the only export needed — no class, no module syntax
