---
description: Manual testing checklist, critical verification paths, and data safety rules for the Khyaal no-test-framework SPA
---

# Test Rules

## No Test Framework — Testing Is Browser + Console

There are no automated tests, no Jest, no Playwright, no CI test runner. All verification is manual. This is a known constraint — do not introduce a test framework without explicit instruction.

The equivalent of "running tests" is:
1. `node --check <file.js>` — syntax validation before committing
2. Browser smoke test — load the app and verify the critical paths below

## Pre-Commit Checklist

Run before every commit that touches a `.js` file:

```bash
node --check core.js
node --check app.js
node --check views.js
node --check cms.js
node --check lifecycle-guide.js
node --check workflow-nav.js
node --check modes.js
```

`node --check` catches syntax errors only — it does not execute the file. If it exits non-zero, fix the syntax error before committing.

## Smoke Test — All Changes

Open the app at `https://khyaal-inc.github.io/khyaal-engineering-updates/` (or local file path) and verify:

- [ ] App loads without JS errors in console
- [ ] Auth screen appears; login succeeds
- [ ] Dashboard renders with Sprint HUD visible
- [ ] Persona switch works: `Alt+1` (PM), `Alt+2` (Dev), `Alt+3` (Exec)
- [ ] Number key view navigation: `1`–`9`, `0` each switch to correct view without errors
- [ ] `/` focuses the global search input

## Smoke Test — CMS Changes

If you modified `cms.js` or any CMS-related function:

- [ ] CMS mode loads: `?cms=true&mode=pm` in URL
- [ ] Open any item edit modal — form renders without errors
- [ ] Edit a field and save — no console errors; toast confirms success
- [ ] Reload page — confirm the saved change persisted (data round-tripped through Lambda to GitHub)
- [ ] Open a sprint edit modal — verify ceremony fields render for PM persona, fewer fields for Dev
- [ ] Check `window.isActionLockActive` is `false` after save (not stuck)

## Smoke Test — View Renderer Changes

If you modified `views.js`:

- [ ] Switch through all 19 views — no blank containers, no JS errors
- [ ] Check each persona: PM sees all views, Dev sees 8, Exec sees 8
- [ ] Tag filters apply correctly (if tag filter UI is visible)
- [ ] `renderItem()` card renders correctly: title, status badge, priority, due date, tags visible

## Smoke Test — Lifecycle / Navigation Changes

If you modified `workflow-nav.js`, `lifecycle-guide.js`, or `modes.js`:

- [ ] Unified Strategic Ribbon renders: `Discover → Vision → Plan → Build → Ship`
- [ ] Active stage highlights correctly per current view
- [ ] Sprint HUD shows on Dashboard for PM and Exec personas
- [ ] Cadence nudge toast fires when sprint is at-risk (if a sprint is overdue in test data)
- [ ] Quick actions in lifecycle guide match the active stage

## Data Safety

**Never test writes against production `data.json`.** Before testing CMS write functionality:

1. Take a snapshot: copy `data.json` content to a local backup file
2. Or use a separate test GitHub repo with its own Lambda (preferred for destructive tests)

Restore production data from backup if a test write corrupts it:
```bash
# Manual restore — edit data.json locally and push
git checkout HEAD -- data.json
git push origin main
```

## Ceremony & Sprint Safety

- **Never delete `ceremonyAudit` records** — they are permanent historical records
- Ceremonies are auto-pruned to 3 per entity by the app — do not add manual pruning
- Closing a sprint: verify `status === 'closed'` after the ceremony, not deleted from `sprints[]`
- Velocity history lives in closed sprint records — if a sprint is deleted instead of closed, velocity charts break

## Console Debugging Reference

| Symptom | Console command |
|---------|----------------|
| Blank screen / frozen UI | `window.isActionLockActive = false; renderDashboard()` |
| Stale data not refreshing | `localStorage['khyaal_data'] = null; location.reload()` |
| CMS not opening | Check `?cms=true` in URL and `localStorage['gh_pat']` is set |
| Mermaid diagram blank | Switch away from the view and back; or hard-refresh |
| Auth loop | Clear `localStorage['khyaal_site_auth']` and reload |
