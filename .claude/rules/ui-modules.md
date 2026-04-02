---
applies_to: "**/{kanban-view,okr-module,analytics,capacity-planning,dev-focus,executive-dashboard,dependency-view}.js"
description: Rules for UI module files
---

# UI Module Rules

These files are self-contained UI modules. When modifying:

## Module Pattern
- Each module exports a `render*()` function
- Called from core.js view switcher
- Renders into specific DOM container
- Manages own state and event handlers

## Data Access
- Read from global `UPDATE_DATA` object
- Filter/transform data locally
- Don't mutate global state (use CMS functions for that)

## DOM Manipulation
- Target specific container (e.g., `#okr-view`)
- Clear container before rendering: `container.innerHTML = ''`
- Use Tailwind classes for styling
- Add event listeners after rendering

## Integration Points
- Register view in core.js `switchView()` function
- Add navigation button in index.html
- Update CLAUDE.md if module adds new concepts
