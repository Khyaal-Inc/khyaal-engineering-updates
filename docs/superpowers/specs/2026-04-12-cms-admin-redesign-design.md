# CMS Admin Redesign — Design Spec
**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** cms.js (primary), index.html (admin view container)

---

## Problem

The current CMS admin surface has three interconnected problems:

1. **Fragmented surfaces** — workspace/project management lives in `spAdmin*` functions (settings panel, uses `prompt()` dialogs) while the Admin tab has a separate `admin*` set of functions. They overlap and contradict each other.
2. **Naming inconsistency** — the UI calls top-level containers "Teams", sub-groups "Projects", and functional areas "Tracks" — inconsistently with the actual data hierarchy (`Workspace → Project → Track → Subtrack → Item`).
3. **Wrong viewport** — a 400px side panel is too narrow for a management surface with 4 levels of hierarchy and full CRUD. It needs full-screen.

---

## Solution Overview

Replace the fragmented admin panel with a single full-screen admin view that:
- Triggers via `switchView('admin')` — same pattern as all other views
- Has two tabs: **Users & Grants** and **Structure**
- Uses inline forms everywhere — no `prompt()` dialogs
- Has complete CRUD (Add / Edit / Delete) at every level
- Uses consistent naming throughout: Workspace / Project / Track / Subtrack

The side panel's Admin tab becomes a single "Open Admin" button that calls `switchView('admin')`.

---

## Architecture

### Entry Point

```
Side panel → Admin tab → "Open Admin ↗" button → switchView('admin')
```

`switchView('admin')` already exists in `core.js`. We add an `#admin-view` container to `index.html` and a `renderAdminView()` function in `cms.js`.

### View Structure

```
#admin-view (full-screen, replaces main content area)
  ├── Header row: "Admin" title + "← Back to Dashboard" button
  ├── Sub-tab bar: [👤 Users & Grants] [🏗️ Structure]
  └── Tab content area
        ├── Users & Grants panel
        └── Structure panel
```

### Data Persistence

| Level | Reads from | Saves to | Via |
|-------|-----------|----------|-----|
| User, Grant, Workspace | `window.PROJECT_REGISTRY` / `users.json` | `users.json` | Lambda `action=write` with `filePath: 'users.json'` in body (already supported; requires PM grant) |
| Project, Track, Subtrack | `window.UPDATE_DATA` | `data.json` | Existing `saveToGithub()` |

---

## Tab 1: Users & Grants

### User list
- Shows all users from `users.json` (loaded into `window.PROJECT_REGISTRY.users[]` or equivalent)
- Each user row: avatar initial, name, email, **Edit** button, **Remove** button
- Expand to show per-user grant rows

### Grant rows (per user)
- Each grant: workspace name, project scope (All / specific project), role badge (pm / dev / exec)
- **✕** button to revoke a grant
- **+ Grant Access to Workspace** button — opens inline form: workspace select, project scope select, role select → Save

### Workspace management (below user list)
- Section header: "🏢 Workspaces" with count badge + **+ Add Workspace** button
- Each workspace row:
  - Active workspace: indigo highlight, ACTIVE badge, **Edit** + **Delete** buttons
  - Inactive workspace: grey, **Switch** + **Edit** + **Delete** buttons
- Edit: inline form (name field; data file shown read-only)
- Add: inline form (name field; data file auto-derived as `data-{slug}.json`)
- Delete: confirm dialog, then tombstone the data file via `deleteProjectDataFile()`

### Save CTA
Single **"💾 Save Users & Workspaces to GitHub"** button at the bottom — commits `users.json` via Lambda.

---

## Tab 2: Structure

### Context line
Shows: "Projects in: **[Active Workspace Name]**"

### Project list (accordion)
- Section header with **+ Add Project** button
- Each project row: expand/collapse chevron, name, item count, **Edit** + **Delete** buttons
- Expand to show tracks

### Track list (inside project)
- Sub-header with **+ Add Track** button
- Each track row: colour dot, name, item count, expand/collapse, **Edit** + **Delete**
- Expand to show subtracks

### Subtrack list (inside track)
- Sub-header with **+ Subtrack** button
- Each subtrack: name, item count, **Rename** + **Delete** buttons

### Inline forms (all levels)
- Forms expand in-place below the triggering row
- Fields: name (text input); colour theme for tracks (colour picker / preset swatches)
- Save / Cancel buttons inside the form
- On Save: mutate `UPDATE_DATA` then call `saveToGithub()`

### Save CTA
**"💾 Save Structure to GitHub"** button at the bottom.

---

## Functions to Add / Replace

### New functions (cms.js)
| Function | Purpose |
|----------|---------|
| `renderAdminView()` | Top-level renderer — reads active sub-tab, delegates |
| `renderAdminUsersTab()` | Builds Users & Grants tab HTML |
| `renderAdminStructureTab()` | Builds Structure tab HTML |
| `adminSwitchTab(tab)` | Toggles active sub-tab, re-renders |
| `adminInlineForm(level, parentId, existingItem)` | Shows inline add/edit form for given level |
| `adminSaveUser(userId)` | Saves user edits to in-memory state |
| `adminRemoveUser(userId)` | Removes user; confirm first |
| `adminGrantAccess(userId)` | Adds a grant row for a user |
| `adminRevokeGrant(userId, grantIdx)` | Removes a grant |
| `adminSaveUsersJson()` | Commits users.json via Lambda |
| `adminAddWorkspace()` | Shows inline workspace form |
| `adminSaveWorkspace(id)` | Saves workspace edit |
| `adminDeleteWorkspace(id)` | Confirms + tombstones data file |
| `adminSwitchWorkspace(id)` | Sets active workspace + reloads data |
| `adminAddProject()` | Inline project form inside Structure tab |
| `adminSaveProject(projectId)` | Mutates UPDATE_DATA.projects, saves |
| `adminDeleteProject(projectId)` | Removes project with confirm |
| `adminAddTrack(projectId)` | Inline track form |
| `adminSaveTrack(projectId, trackId)` | Mutates track, saves |
| `adminDeleteTrack(projectId, trackId)` | Removes track with confirm |
| `adminAddSubtrack(projectId, trackId)` | Inline subtrack form |
| `adminRenameSubtrack(projectId, trackId, subtractId)` | Rename inline |
| `adminDeleteSubtrack(projectId, trackId, subtractId)` | Removes with confirm |

### Functions to remove / replace
| Old function | Replacement |
|-------------|-------------|
| `spAdminAddTeam()` | `adminAddWorkspace()` |
| `spAdminEditTeam()` | `adminSaveWorkspace()` |
| `spAdminAddProject()` | `adminAddProject()` |
| `spAdminEditProject()` | `adminSaveProject()` |
| All `prompt()` calls in admin | Inline forms |
| `buildAdminTeamsPanel()` | `renderAdminUsersTab()` + `renderAdminStructureTab()` |

---

## index.html Changes

1. Add `<div id="admin-view" class="view-container" style="display:none"></div>` alongside other view containers
2. Add `admin` to the view list in `switchView()` in `core.js` (add `renderAdminView` call)
3. Side panel Admin tab: replace current content with a single **"Open Admin ↗"** button that calls `switchView('admin')`

---

## Naming Consistency Rules

Enforced throughout — old name → new name in all UI strings:

| Old | New |
|-----|-----|
| Team | Workspace |
| Sub-project / Project (in settings) | Project |
| Track (already correct) | Track |
| Subtrack (already correct) | Subtrack |

---

## Error Handling

- All Lambda writes wrapped in `try/catch` with `showToast('...', 'error')` on failure
- `window.isActionLockActive = true` before write, released in `finally`
- Delete operations require `confirm()` — not a custom inline confirm (keeps scope tight)
- If `saveToGithub()` throws, the in-memory mutation is rolled back (swap the mutate-then-save order)

---

## Out of Scope

- Drag-and-drop reordering of tracks/subtracks
- Bulk operations (multi-select delete)
- User invitation via email (invite = add user record manually for now)
- Subtrack item migration when a subtrack is deleted (items are deleted with it — documented in confirm dialog)
