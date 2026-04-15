# Auto Memory System

> This file uses progressive disclosure: first 200 lines load at session start, topics load on-demand.

## Quick Start (Always Loaded)

### Project Type
Zero-deployment frontend-only SPA — Vanilla JS, GitHub Pages, single AWS Lambda for auth + data proxy.

### Data Hierarchy (5 levels)
```
Workspace (users.json → projects[] → filePath)   ← team-switcher; each owns a data file
  └─ Project (data.json → projects[])             ← project-filter dropdown
      └─ Track (project.tracks[])                 ← track filter
          └─ Subtrack (track.subtracks[])
              └─ Item (subtrack.items[])
```
Switching **Workspace** = async Lambda fetch + full UPDATE_DATA replacement + filter reset.  
Switching **Project** = in-memory filter only, no network call.

### Current Workspaces
- `default` → `data.json` — Core Platform Engineering
- `mobile` → `data-mobile.json` — Khyaal Mobile

### Critical Files (Read First)
- `core.js` — State management, routing (`switchView`), workspace switching (`switchProject`)
- `app.js` — Data normalization (`normalizeData`), `renderDashboard`
- `cms.js` — Edit modal, admin view (`renderAdminView`), GitHub sync, ceremony engine
- `views.js` — All 19+ view renderers

### Admin Panel
Full-screen view: `switchView('admin')` — PM-only. Two tabs:
- **Users & Grants**: user CRUD + workspace grant management → saves `users.json`
- **Structure**: Project → Track → Subtrack CRUD within active workspace → saves workspace data file

### Exclusions (Token Savings)
- `archive/` - Historical data (large)
- `lambda.zip` - Deployment artifact
- `data.json` / `data-mobile.json` - Read only when explicitly needed

### Recent Changes (Auto-Updated)
Check `git log -5 --oneline` for latest commits

---

## Topics (Load On-Demand)

### #architecture
Frontend SPA with GitHub-backed data storage. AWS Lambda handles authentication. All rendering client-side using vanilla JavaScript. Modular design with separate files for each view type.

### #data-model
Central `UPDATE_DATA` global object contains:
- `projects[]` - Logical project groupings, each with `tracks[]`
- `tracks[]` - Synced to active project's tracks via `normalizeData()` (CMS code reads this)
- `metadata.epics[]` - Strategic goals
- `metadata.okrs[]` - Quarterly objectives
- `metadata.sprints[]` - 2-week cycles
- `metadata.capacity` - Team capacity planning

`window.PROJECT_REGISTRY` = array of workspace entries from `users.json.projects[]` (used by team-switcher).  
`_adminUsersData` = full `users.json` object `{ users[], projects[] }` loaded only for Admin view.

Items have: id, text, status, priority, storyPoints, contributors, dependencies, etc.

### #workflows
**PM Workflow**: Epics → Backlog Grooming → Capacity Planning → Sprint Assignment → Kanban Tracking → Analytics Review

**Developer Workflow**: My Tasks → Start Work (Kanban) → Flag Blockers → Mark Done → PR Link

**Executive Workflow**: Dashboard Overview → Epic Health → OKR Progress → Velocity Trends

### #common-issues
1. **Dependency graph not rendering** - Check Mermaid.js loaded, verify dependencies[] format
2. **OKR progress not updating** - Verify epicId linkage in tasks
3. **Kanban drag-drop failing** - Ensure CMS mode (?cms=true) enabled
4. **Capacity wrong** - Check all sprint tasks have storyPoints

### #testing
No automated tests. Manual testing workflow:
1. Open index.html locally
2. Test with ?cms=true for edit mode
3. Verify data.json structure before save
4. Check browser console for errors

### #deployment
1. Update data.json on GitHub
2. Lambda serves updated data
3. Static hosting (any CDN)
4. No build step required

### #performance-tips
- Cache DOM queries in variables
- Use event delegation for dynamic content
- Minimize global UPDATE_DATA mutations
- Batch DOM updates when possible
- Use CSS transforms for animations

### #debugging
1. Check browser console for errors
2. Verify UPDATE_DATA structure via console.log
3. Test data normalization in app.js
4. Check view rendering in specific module file
5. Validate JSON structure in data.json

### #team
- Project Owner: Khyaal Engineering
- Contributors listed in data.json capacity.teamMembers
- Tracks represent team ownership boundaries

### #git-workflow
- Main branch: `main`
- No PR required for direct commits
- Archive old data before major structure changes
- Commit data.json separately from code changes
