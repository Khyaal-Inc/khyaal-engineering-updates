---
name: verify
description: Verify the health of the SPA before pushing. Checks data.json schema validity, normalizeData coverage, view-to-stage mapping completeness, and common gotchas.
---

When the user runs /verify, perform these checks in order and report pass/fail for each:

1. **data.json validity** — Read `data.json`. Confirm it is valid JSON. Confirm top-level keys are `metadata` and `tracks`. Confirm `tracks` is an array with at least one entry.

2. **normalizeData coverage** — Read `app.js`. Find the `normalizeData()` function. List every field it sets defaults for. Then scan `data.json` for any fields on items that are NOT in that list — flag them as potentially un-normalized (they may be stripped on load).

3. **View-to-stage mapping** — Read `workflow-nav.js`. Find `WORKFLOW_STAGES` (or equivalent). Confirm every view ID referenced in `views.js` (look for `switchView(` calls or view ID strings) is mapped to a stage. Report any unmapped view IDs.

4. **Action lock check** — Read `cms.js` and `app.js`. Confirm `isActionLockActive` is always reset (set to false) after modal close and after save. Flag any code path where it might be left true.

5. **Ceremony audit cap** — Read `cms.js`. Confirm ceremonyAudits are pruned to a maximum of 3 per entity. Flag if no pruning logic is found.

6. **Sprint history preservation** — Read `cms.js`. Confirm there is no code that deletes sprints outright (sprints should only be marked `status: 'closed'`). Flag any delete-sprint paths.

After all checks, give a summary: how many passed, how many flagged, and the highest-priority item to fix.
