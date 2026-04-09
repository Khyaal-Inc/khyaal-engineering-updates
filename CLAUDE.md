# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Zero-deployment, no-build, frontend-only SPA. No Node.js, no bundler, no server.

- **Data source**: `data.json` on GitHub — fetched and committed via AWS Lambda proxy
- **Hosting**: GitHub Pages (static)
- **Auth**: AWS Lambda `auth_gatekeeper.js` — validates SHA-256 password hash, proxies GitHub API
- **Stack**: Vanilla JS ES6+, Tailwind CSS (CDN), Mermaid.js (CDN), Google Charts (CDN)

**Hard rule: Never introduce React, Vue, Angular, npm packages, or a build step.**

## File Responsibilities

| File | Owns |
|------|------|
| `core.js` | Constants, helpers, `switchView()`, keyboard shortcuts |
| `app.js` | `UPDATE_DATA` global, `renderDashboard()`, `normalizeData()` |
| `workflow-nav.js` | **Unified Strategic Ribbon**, `WORKFLOW_STAGES`, lifecycle taxonomy |
| `modes.js` | PM/Dev/Exec persona filtering, `Alt+1/2/3` switching |
| `views.js` | All 19 primary view renderers, `renderItem()`, grooming mode |
| `cms.js` | Edit modal, GitHub sync, ceremony engine, audit records, CRUD |
| `lifecycle-guide.js` | Quick actions, gateway checks, toasts, sprint HUD, cadence nudge |

## Data Flow

```
data.json (GitHub) ← Lambda → UPDATE_DATA (memory) → Views → CMS Modal → Lambda → data.json
```

**Never mutate `UPDATE_DATA` directly** — all writes go through CMS functions in `cms.js`.

**Adding a new field**: it MUST be added to `normalizeData()` in `app.js` first, or it will be stripped on load.

## Code Style

- No semicolons
- Template literals for all HTML strings (no JSX, no `createElement`)
- Functional style — pure view renderers that read from `UPDATE_DATA`
- Every new feature must be lifecycle-aware (which stage?) and persona-sensitive (PM/Dev/Exec visibility)

## Lifecycle Stages (Unified Strategic Ribbon)

`Discover → Vision → Plan → Build → Ship`

Each view belongs to exactly one stage. The mapping is owned by `workflow-nav.js`.

## Persona Modes

| Mode | Key | Strategic fields |
|------|-----|-----------------|
| PM | `pm` | Full access |
| Dev | `dev` | Epic, Impact, AC are **readonly** |
| Exec | `exec` | KPI/OKR summary only |

## Ceremony Rules

Ceremonies generate permanent `ceremonyAudit` records — **never delete them**, only add. Audits are auto-pruned to 3 records per entity. Sprints must be closed (`status: 'closed'`), not deleted, to preserve velocity history.

## Troubleshooting

- **Blank screen / frozen UI**: `window.isActionLockActive = false; renderDashboard()` in console
- **Stale data**: `localStorage['khyaal_data'] = null; location.reload()`
- **Mermaid blank**: CDN unreachable, or graph rendered while tab was hidden — refresh
- **CMS not showing**: Ensure URL has `?cms=true` and GitHub PAT is stored in `localStorage['gh_pat']`

## Lambda & Env

- `deploy_auth.sh` — one-shot Lambda deploy to AWS `ap-south-1`
- After deploy: set `GITHUB_TOKEN` and `EXPECTED_PASSWORD_HASH` in Lambda env vars
- Update `LAMBDA_URL` constant in `index.html`

## Data Conflicts

CMS saves commit directly to `data.json` on GitHub. **Last write wins** — only one person should use CMS at a time. No merge strategy exists; conflicts require manual resolution via git.
