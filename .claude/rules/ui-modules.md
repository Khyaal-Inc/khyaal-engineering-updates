---
applies_to: "**/{kanban-view,okr-module,analytics,capacity-planning,dev-focus,executive-dashboard,dependency-view,views}.js"
description: Rules for UI module and view renderer files
---

# UI Module Rules

## Module Contract
Each module owns exactly one render function called from `switchView()` in app.js:

| File | Container ID | Render fn |
|------|-------------|-----------|
| views.js | `#track-view` etc | `renderTrackView()` etc |
| okr-module.js | `#okr-view` | `renderOkrView()` |
| kanban-view.js | `#kanban-view` | `renderKanbanView()` |
| dependency-view.js | `#dependency-view` | `renderDependencyView()` |
| analytics.js | `#analytics-view` | `renderAnalyticsView()` |
| capacity-planning.js | `#capacity-view` | `renderCapacityView()` |
| dev-focus.js | `#my-tasks-view` | `renderMyTasksView()` |
| executive-dashboard.js | `#dashboard-view` | `renderExecutiveDashboard()` |

## Render Pattern (always follow this)
```js
function renderXxxView() {
  const container = document.getElementById('xxx-view')
  if (!container) return
  // Apply mode filter
  const modeFilter = getModeFilter()
  // Build items list
  const items = getAllItems().filter(modeFilter || (() => true))
  // Build HTML string — never manipulate DOM in a loop
  container.innerHTML = `...html string...`
  // Attach event listeners after setting innerHTML
}
```

## Data Access
- Read from `UPDATE_DATA` — never mutate it directly
- For metadata: `UPDATE_DATA.metadata.epics[]`, `.sprints[]`, `.okrs[]`, `.capacity`
- For items: iterate `UPDATE_DATA.tracks[].subtracks[].items[]`
- Apply persona filter via `getModeFilter()` from modes.js

## Styling
- Tailwind utility classes only (no inline styles except dynamic values like `width: ${pct}%`)
- Custom CSS classes defined in styles.css: `.view-section`, `.item-row`, `.badge-*`, `.cms-*`
- Status colors: use `statusConfig[status].class` from core.js
- Contributor colors: use `contributorColors[name]` from core.js

## Adding a New Module/View
1. Create `my-view.js` with `renderMyView()` function
2. Add `<div id="my-view-view" class="view-section"></div>` in index.html
3. Add `<script src="my-view.js?v=04031"></script>` in index.html
4. Add `case 'my-view': renderMyView(); break` in `switchView()` in app.js
5. Add `'my-view'` to `availableViews[]` in relevant MODE_CONFIG entries in modes.js
6. Add entry to `VIEW_METADATA` in modes.js for nav label/icon
7. Update CLAUDE.md view table
