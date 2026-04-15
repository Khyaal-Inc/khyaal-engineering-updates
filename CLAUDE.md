# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Zero-deployment, no-build, frontend-only SPA. No Node.js, no bundler, no server.

- **Data source**: `data.json` on GitHub — fetched and committed via AWS Lambda proxy
- **Hosting**: GitHub Pages (static)
- **Auth**: AWS Lambda `auth_gatekeeper.js` — validates SHA-256 password hash, proxies GitHub API
- **Stack**: Vanilla JS ES6+, Tailwind CSS (CDN), Mermaid.js (CDN), Google Charts (CDN)

**Hard rule: Never introduce React, Vue, Angular, npm packages, or a build step.**

## Data Hierarchy

```
Workspace  (users.json → projects[] → each owns a data file)
  └─ Project  (data.json → projects[] → groups tracks)
      └─ Track  (project.tracks[])
          └─ Subtrack  (track.subtracks[])
              └─ Item  (subtrack.items[])
```

| Tier | JSON location | UI control | Example |
|------|--------------|------------|---------|
| Workspace | `users.json → projects[]` (each has `id`, `name`, `filePath`) | Team-switcher dropdown (top-left) | `"Core Platform Engineering"` → `data.json` |
| Project | `[workspace].json → projects[]` (groups tracks within data file) | Project-filter dropdown | `"Khyaal Platform"`, `"Pulse Analytics & CXP"` |
| Track | `project.tracks[].name` | Track filter (`global-team-filter`) | `"platform"`, `"pulse"`, `"devops"` |
| Subtrack | `track.subtracks[].name` | Inline within track | `"Website"`, `"API"`, `"Backlog"` |
| Item | `subtrack.items[]` | Cards in all views | individual tasks / cards |

**Key distinction:** Workspace = top-level data-file boundary (one `data-{id}.json` per workspace on GitHub). Project = logical grouping inside that data file. Switching workspaces fetches a new data file from Lambda; switching projects filters within the already-loaded data.

## File Responsibilities

| File | Owns |
|------|------|
| `core.js` | Constants, helpers, `switchView()`, keyboard shortcuts |
| `app.js` | `UPDATE_DATA` global, `renderDashboard()`, `normalizeData()` |
| `workflow-nav.js` | **Unified Strategic Ribbon**, `WORKFLOW_STAGES`, lifecycle taxonomy |
| `modes.js` | PM/Dev/Exec persona filtering, `Alt+1/2/3` switching |
| `views.js` | All 19 primary view renderers, `renderItem()`, grooming mode |
| `cms.js` | Edit modal, GitHub sync, ceremony engine, audit records, CRUD, full-screen Admin view (`renderAdminView`) |
| `lifecycle-guide.js` | Quick actions, gateway checks, toasts, sprint HUD, cadence nudge |

## Build / Lint / Deploy Commands

There is no build pipeline. These are the only commands that apply:

| Action | Command | Notes |
|--------|---------|-------|
| **Syntax check** | `node --check <file.js>` | Validates ES6+ syntax; run on any modified JS file before committing |
| **Deploy** | `git push origin main` | GitHub Pages auto-deploys from `main`; no CI step |
| **Lambda deploy** | `sh deploy_auth.sh` | One-shot Lambda deploy; update `LAMBDA_URL` in `index.html` after |
| **Smoke test** | Open app in browser | See Test section below |

No `npm`, no Makefile, no lint config files. `node --check` is the only automated check available.

## Code Style

- **No semicolons** — enforced throughout; never add them
- **Template literals for all HTML** — backtick strings only; never use `document.createElement()` for structural HTML
- **`+=` concatenation** — accumulate HTML strings; assign once with `container.innerHTML = html`
- **No `addEventListener` in view functions** — use inline `onclick="fn(${param})"` in the HTML string
- **Functional renderers** — view functions read `UPDATE_DATA`, build a string, assign `innerHTML`; no side effects
- **camelCase** for all functions and variables
- **SCREAMING_SNAKE_CASE** for module-level constants (`UPDATE_DATA`, `CMS_CONFIG`, `MODE_CONFIG`)
- **Prefix conventions**: `render*()` for view renderers · `build*()` for HTML string builders · `is*()` for boolean predicates · `get*()` for getters

## State Management Rules

- `window.UPDATE_DATA` — read anywhere; **write only through `cms.js` functions**. Never mutate it directly in a view renderer
- `window.uiState` — transient session state (`openEpics`, `openComments`, `isDirty`, `modalPersona`)
- `window.isActionLockActive` — mutex; set `true` before any Lambda write, `false` in the `finally` block
- `localStorage['khyaal_data']` — cached data; `localStorage['khyaal_site_auth']` — JWT; `localStorage['gh_pat']` — GitHub PAT
- `sessionStorage` — collapse/expand states only

**Never mutate `UPDATE_DATA` before a successful Lambda write.** Mutate only after `await saveToGithub()` resolves.

## Data Flow

```
data.json (GitHub) ← Lambda → UPDATE_DATA (memory) → Views → CMS Modal → Lambda → data.json
```

**Adding a new field**: it MUST be added to `normalizeData()` in `app.js` first, or it will be stripped on load.

## Lifecycle Stages (Unified Strategic Ribbon)

`Discover → Vision → Plan → Build → Ship`

Each view belongs to exactly one stage. The mapping is owned by `workflow-nav.js`. Every new view must:
1. Be added to `WORKFLOW_STAGES` in `workflow-nav.js`
2. Call `getCurrentMode()` and respect PM/Dev/Exec visibility rules

## Persona Modes

| Mode | Key | Strategic fields |
|------|-----|-----------------|
| PM | `pm` | Full access |
| Dev | `dev` | Epic, Impact, AC are **readonly** |
| Exec | `exec` | KPI/OKR summary only |

Every new feature must be persona-sensitive. Use `getCurrentMode()` to gate field visibility.

## Error Handling

- Wrap all async operations in `try/catch`
- Log errors as: `console.error('❌ [context]:', error)`
- Show user-facing toasts for save failures; never silently swallow errors on Lambda writes
- No validation schemas — validate at the CMS modal layer only

## Ceremony Rules

Ceremonies generate permanent `ceremonyAudit` records — **never delete them**, only add. Audits are auto-pruned to 3 records per entity. Sprints must be closed (`status: 'closed'`), not deleted, to preserve velocity history.

## Troubleshooting

- **Blank screen / frozen UI**: `window.isActionLockActive = false; renderDashboard()` in console
- **Stale data**: `localStorage['khyaal_data'] = null; location.reload()`
- **Mermaid blank**: CDN unreachable, or graph rendered while tab was hidden — refresh
- **CMS not showing**: Ensure URL has `?cms=true` and GitHub PAT is stored in `localStorage['gh_pat']`

## Lambda & Env

- `deploy_auth.sh` — one-shot Lambda deploy to AWS `ap-south-1`; auto-sets `GITHUB_TOKEN` + `JWT_SECRET` and patches `LAMBDA_URL` in `index.html`
- Lambda env vars: `GITHUB_TOKEN` (GitHub PAT with `repo` scope) + `JWT_SECRET` (auto-generated on first deploy, preserved on re-deploys)
- User registry: `users.json` in repo root — `id`, `passwordHash` (SHA-256), `grants[]` (`{ projectId, mode }`)
- CMS mode no longer requires a GitHub PAT in the browser — writes go through Lambda using its own `GITHUB_TOKEN`

## Data Conflicts

CMS saves commit directly to `data.json` on GitHub. **Last write wins** — only one person should use CMS at a time. No merge strategy exists; conflicts require manual resolution via git.

## Rules Files

Detailed rules are in `.claude/rules/` (auto-loaded alongside this file):

- `.claude/rules/ui-rules.md` — view renderer contracts, modal injection, CSS class patterns, accessibility baseline
- `.claude/rules/api-rules.md` — Lambda call patterns, auth flow, write safety, multi-project extension
- `.claude/rules/test-rules.md` — manual smoke test checklist, critical verification paths, data safety
