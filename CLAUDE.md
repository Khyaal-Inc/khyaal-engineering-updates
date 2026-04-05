# Khyaal Engineering Pulse

> This file provides persistent context to Claude Code. Only the essential information is loaded at startup to conserve tokens. Additional details are in README.md (loaded on-demand via imports).

## Project Overview
A zero-deployment, GitHub-backed engineering dashboard for project management, OKR tracking, and team analytics.

## Quick Reference
- **Type**: Frontend-only SPA (no backend server)
- **Data**: GitHub-hosted data.json (fetched via AWS Lambda)
- **Stack**: Vanilla JS, Tailwind CSS, Mermaid.js, Google Charts
- **Auth**: AWS Lambda gatekeeper (auth_gatekeeper.js)

## Documentation Imports
For detailed information, refer to:
- Architecture details: @README.md (lines 156-187)
- View reference: @README.md (lines 383-543)
- Data model: @README.md (lines 545-603)
- Keyboard shortcuts: @README.md (lines 605-621)

## Key Files
- `app.js` - Data normalization, GitHub integration
- `core.js` - State management, keyboard shortcuts, view routing
- `views.js` - Core view renderers (Track, Status, Priority, etc.)
- `cms.js` - Full Management UI (Add/Edit/Delete operations)
- `index.html` - Main structure and navigation
- `data.json` - Single source of truth (GitHub-backed)

## CMS Edit Modal — 4-Pillar System
The Edit Engineering Task modal (`cms.js`) uses a lifecycle-aware 4-pillar layout:

| Pillar | Key | Fields |
|--------|-----|--------|
| 🎯 Goal & Intent | `what` | text, usecase, epicId, persona, tags, note |
| 📅 Timeline & Cycle | `when` | planningHorizon, sprintId, startDate, due, releasedIn, publishedDate |
| ⚡ Action & Routing | `where` | status, contributors, blockerNote, dependencies, mediaUrl |
| 🛠️ Sync & Effort | `how` | storyPoints, priority, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType |

**Pillar visibility by persona** (`getVisibleFieldGroups()` in cms.js:164):
- **PM**: all 4 pillars (WHAT → WHEN → WHERE → HOW)
- **Developer**: all 4 pillars, execution-first (WHERE → HOW → WHAT → WHEN), strategic fields readonly (🔒)
- **Executive**: 3 pillars only (WHAT → WHEN → WHERE — no Sync & Effort)

**Field visibility per view** (`LIFECYCLE_FIELD_MAP` in cms.js:148): Fields shown depend on active view (backlog/sprint/track/kanban/releases/roadmap/epics). Toggle "Show All" to see all fields for a pillar.

**Story points**: Fibonacci select only (1,2,3,5,8,13,21) — free-number input removed.

## Module System
- `modes.js` - PM/Developer/Executive persona modes
- `okr-module.js` - OKR tracking with auto-progress
- `kanban-view.js` - Drag-and-drop Kanban board
- `dependency-view.js` - Mermaid.js dependency graphs
- `analytics.js` - Sprint velocity and metrics
- `capacity-planning.js` - Team workload management
- `dev-focus.js` - Developer "My Tasks" view
- `executive-dashboard.js` - Executive summary

## Three Persona Modes
1. **PM Mode** (Blue, Alt+1) - Full feature access, starts with Epics view
2. **Developer Mode** (Green, Alt+2) - Focused on "My Tasks" view
3. **Executive Mode** (Purple, Alt+3) - Dashboard with high-level metrics

## Data Model Key Concepts
- **Tracks** - Product areas (e.g., "Khyaal Platform")
- **Subtracks** - Feature groups within tracks
- **Items** - Individual tasks with status, priority, story points
- **Epics** - Strategic business outcomes
- **OKRs** - Quarterly objectives with key results
- **Sprints** - 2-week execution cycles
- **Story Points** - Fibonacci scale (1,2,3,5,8,13,21)

## Status Values (Quick Ref)
`done` | `now` | `next` | `later`

## Development Guidelines

### Code Style
- Vanilla JavaScript (ES6+), no transpilation
- Minimal dependencies (CDN-only: Tailwind, Mermaid, Google Charts)
- Client-side rendering only (no server logic)

### Common Tasks
- **Add feature**: Edit relevant module file (e.g., okr-module.js for OKR features)
- **Fix bug**: Use browser DevTools, check core.js for state issues
- **Update UI**: Modify views.js or specific module file
- **Data changes**: Edit data.json structure, update app.js normalization

### File Exclusions (Token Savings)
- `archive/` folder - Large, historical data (excluded by .claudeignore)
- `lambda.zip` - Deployment artifact (excluded)
- `data.json` - Read only when explicitly needed

### Performance Notes
- All rendering is client-side (check browser console for errors)
- data.json is the live dataset (~moderate size, ok to read if needed)
- Archive folder contains old sprints (avoid unless explicitly requested)

## Common Workflows
### PM: Plan Sprint
1. Groom Backlog (assign story points)
2. Check Capacity Planning
3. Move tasks to Sprint
4. Monitor via Kanban & Analytics

### Developer: Daily Work
1. Check My Tasks (Alt+2)
2. Drag to "Now" in Kanban
3. Flag blockers if stuck
4. Mark Done with PR link

### Executive: Health Check
1. View Dashboard (Alt+3)
2. Review Epic health
3. Check OKR progress
4. Monitor velocity trends
