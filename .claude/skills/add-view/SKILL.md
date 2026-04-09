---
name: add-view
description: Guide for adding a new view to the SPA. Covers all the files that must be touched and the order to do it. Run with /add-view <view-id> <stage>.
disable-model-invocation: true
---

The user wants to add a new view. The arguments are: $ARGUMENTS (format: `<view-id> <stage>`)

Walk through each step, explaining what each file does and why the change is needed there. Discuss the impact on navigation and persona visibility before writing any code.

**Step 1 — Confirm the design**
Ask: What does this view render? Which stage does it belong to (Discover/Vision/Plan/Build/Ship)? Should it be visible in all 3 persona modes (PM/Dev/Exec), or filtered?

**Step 2 — workflow-nav.js** (owns the ribbon)
Add the view ID to the correct stage entry in `WORKFLOW_STAGES`. Explain that this controls which tab the view appears under in the Strategic Ribbon.

**Step 3 — views.js** (owns renderers)
Add a `render<ViewName>()` function that reads from `UPDATE_DATA` and returns an HTML string. Remind: use template literals, no semicolons, no frameworks.

**Step 4 — core.js** (owns routing)
Add the view ID to the `switchView()` routing logic so the ribbon tab can activate it.

**Step 5 — modes.js** (owns persona filtering)
If the view should be hidden or read-only for Dev or Exec mode, add the appropriate filter. Explain the impact if skipped (all modes see it).

**Step 6 — index.html** (owns containers)
Add a `<div id="view-<view-id>">` container if the renderer uses a dedicated mount point.

**Step 7 — Verify**
Run /verify after adding the view to confirm the stage mapping is complete.
