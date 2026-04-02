# Project Memory: Khyaal Engineering Pulse

## Project Overview
A zero-deployment, GitHub-backed engineering dashboard for project management, OKR tracking, and team analytics.

## Architecture
- **Frontend-only**: HTML/CSS/JS (no backend server)
- **Data Source**: GitHub-hosted data.json
- **Auth**: AWS Lambda gatekeeper (auth_gatekeeper.js)
- **Deployment**: Static hosting (any CDN/GitHub Pages)

## Key Files
- `app.js` - Data normalization, GitHub integration
- `core.js` - State management, keyboard shortcuts, view routing
- `views.js` - Core view renderers (Track, Status, Priority, etc.)
- `cms.js` - Full Management UI (Add/Edit/Delete operations)
- `index.html` - Main structure and navigation
- `data.json` - Single source of truth (GitHub-backed)

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

## Common Status Values
- `done` - Shipped & live
- `now` - Actively in development
- `ongoing` - Continuous/operational work
- `next` - Ready for pickup
- `later` - Future backlog

## Tech Stack
- **No build tools** - Vanilla JS, no bundler
- **Styling** - Tailwind CSS (CDN), custom CSS
- **Charts** - Google Charts (analytics.js)
- **Graphs** - Mermaid.js (dependency-view.js)
- **Data Format** - JSON (single data.json file)

## Authentication Flow
1. User visits with `?cms=true`
2. Prompted for GitHub PAT
3. Lambda validates and fetches data.json
4. Session cached locally (one-time auth)

## Key Operations
- **Save to GitHub** - Commits data.json back to repo
- **Archive** - Moves old data to archive/ folder
- **Grooming Mode** - Inline backlog refinement UI
- **Dependency Linking** - Tasks reference other task IDs

## Performance Considerations
- Archive folder can be large (excluded by .claudeignore)
- data.json is the live dataset (moderate size)
- All views render client-side (no server processing)

## Team Structure
- **Contributors** - Array field on each task
- **Capacity** - Story points per person per sprint
- **Tracks** - Teams own specific tracks

## Keyboard Shortcuts
- Number keys 1-9,0 navigate views
- Alt+1/2/3 switch modes
- / focuses search

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
