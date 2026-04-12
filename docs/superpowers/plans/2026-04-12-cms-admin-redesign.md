# CMS Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented, prompt()-based, modal-based admin panel with a full-screen admin view (`switchView('admin')`) that has complete CRUD at every level of the Workspace → Project → Track → Subtrack hierarchy, with inline forms and consistent naming throughout.

**Architecture:** A new `#admin-view` div (view-section pattern) is added to `index.html`. `renderAdminView()` is added to `cms.js` and wired into `switchView()` in `core.js`. The current `#admin-panel-modal` remains for the short term but the side panel Admin tab is replaced with a single "Open Admin ↗" button. All `spAdmin*` prompt()-based functions are deleted; the new `adminUsers*` and `adminStructure*` functions replace them with inline HTML forms.

**Tech Stack:** Vanilla JS ES6+, template literals, inline onclick handlers, existing `saveToGithub()` for data.json writes, Lambda `action=write` with `filePath:'users.json'` for users.json writes.

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add `#admin-view` div; wire side-panel Admin tab to `switchView('admin')` |
| `core.js` | Add `renderAdminView` call inside `switchView()` |
| `cms.js` | Add `renderAdminView`, `renderAdminUsersTab`, `renderAdminStructureTab`, all `admin*` CRUD functions; delete `spAdminAddTeam`, `spAdminEditTeam`, `spAdminAddProject`, `spAdminEditProject` and their `prompt()` calls |

---

## Task 1: Add `#admin-view` to index.html and wire `switchView('admin')`

**Files:**
- Modify: `index.html` (lines ~311–317, view-section block)
- Modify: `core.js` (lines ~381–400, switchView render block)

- [ ] **Step 1: Add the admin view container to index.html**

Open `index.html`. Find the block of view-section divs (around line 311–317). Add one more after the last one (`#activity-view`):

```html
<div id="admin-view" class="view-section" style="display:none"></div>
```

The full block should now end with:
```html
        <div id="activity-view" class="view-section" style="display:none"></div>
        <div id="admin-view" class="view-section" style="display:none"></div>
```

- [ ] **Step 2: Wire renderAdminView into switchView() in core.js**

Open `core.js`. Find the render dispatch block inside `switchView()` (around line 400). After the last `if (viewId === 'activity' ...)` line, add:

```javascript
if (viewId === 'admin' && typeof renderAdminView === 'function') renderAdminView()
```

- [ ] **Step 3: Replace the side panel Admin tab content**

In `cms.js`, find `buildAdminTeamsPanel` (line ~5821) — this function populates the Admin tab in the side panel. Replace its entire body with a simple redirect button. Find the function and replace it:

```javascript
function buildAdminTeamsPanel() {
  return `
    <div style="padding:24px;text-align:center">
      <div style="font-size:13px;color:#64748b;margin-bottom:16px">
        Manage workspaces, users, projects, tracks, and subtracks in the full Admin view.
      </div>
      <button onclick="switchView('admin')" class="btn-primary" style="padding:10px 20px;font-size:13px;font-weight:800">
        🛡️ Open Admin ↗
      </button>
    </div>
  `
}
```

- [ ] **Step 4: Syntax check**

```bash
node --check core.js && node --check cms.js
```

Expected: no output (clean exit).

- [ ] **Step 5: Commit**

```bash
git add index.html core.js cms.js
git commit -m "feat: add #admin-view container and wire switchView('admin')"
```

---

## Task 2: Scaffold `renderAdminView()` — shell with two tabs

**Files:**
- Modify: `cms.js` (add after `buildAdminTeamsPanel`, around line 5870)

- [ ] **Step 1: Add the top-level state variable and renderAdminView shell**

In `cms.js`, find the section after `buildAdminTeamsPanel`. Add the following new functions. The `_adminActiveTab` variable tracks which tab is shown:

```javascript
// ── Admin View State ──────────────────────────────────────────────────────────
let _adminActiveTab = 'users' // 'users' | 'structure'

function renderAdminView() {
  const container = document.getElementById('admin-view')
  if (!container) return
  const mode = getCurrentMode()
  if (mode !== 'pm') {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8">Admin access requires PM mode.</div>`
    return
  }

  const usersActive = _adminActiveTab === 'users'
  const structActive = _adminActiveTab === 'structure'

  container.innerHTML = `
    <div style="max-width:960px;margin:0 auto;padding:24px 20px">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:20px;font-weight:900;color:#1e293b;margin:0">🛡️ Admin</h2>
          <p style="font-size:12px;color:#94a3b8;margin:2px 0 0">Manage workspaces, users, and project structure</p>
        </div>
        <button onclick="switchView('okr')" style="padding:8px 16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:700;color:#374151;cursor:pointer">← Back to Dashboard</button>
      </div>

      <!-- Sub-tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:0">
        <button onclick="adminSwitchTab('users')" style="padding:8px 18px;font-size:12px;font-weight:800;border:none;cursor:pointer;border-bottom:2px solid ${usersActive ? '#6366f1' : 'transparent'};margin-bottom:-2px;color:${usersActive ? '#6366f1' : '#64748b'};background:transparent">
          👤 Users & Grants
        </button>
        <button onclick="adminSwitchTab('structure')" style="padding:8px 18px;font-size:12px;font-weight:800;border:none;cursor:pointer;border-bottom:2px solid ${structActive ? '#6366f1' : 'transparent'};margin-bottom:-2px;color:${structActive ? '#6366f1' : '#64748b'};background:transparent">
          🏗️ Structure
        </button>
      </div>

      <!-- Tab content -->
      <div id="admin-tab-content">
        ${usersActive ? renderAdminUsersTab() : renderAdminStructureTab()}
      </div>

    </div>
  `
}

function adminSwitchTab(tab) {
  _adminActiveTab = tab
  renderAdminView()
}
```

- [ ] **Step 2: Add stub tab renderers (so the page doesn't crash)**

Directly after the functions above, add two stub functions that return placeholder HTML. These will be replaced in Tasks 3 and 4:

```javascript
function renderAdminUsersTab() {
  return `<div style="color:#94a3b8;padding:20px">Users & Grants tab — coming soon</div>`
}

function renderAdminStructureTab() {
  return `<div style="color:#94a3b8;padding:20px">Structure tab — coming soon</div>`
}
```

- [ ] **Step 3: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 4: Smoke test — verify admin view loads**

Open the app at `https://khyaal-inc.github.io/khyaal-engineering-updates/?cms=true&mode=pm` (or local file).

- Open the side panel → Admin tab → click "Open Admin ↗"
- Confirm: the main content area switches to the admin view
- Confirm: header shows "🛡️ Admin" and "← Back to Dashboard" button
- Confirm: two sub-tabs render (Users & Grants, Structure)
- Confirm: no JS errors in console

- [ ] **Step 5: Commit**

```bash
git add cms.js
git commit -m "feat: scaffold renderAdminView with tab shell and stub renderers"
```

---

## Task 3: Build `renderAdminUsersTab()` — Users list + Workspace management

**Files:**
- Modify: `cms.js` — replace stub `renderAdminUsersTab()` with full implementation

**Context:** `window.PROJECT_REGISTRY` contains `{ users: [...], projects: [...] }`. Each user has `{ id, name, email, passwordHash, grants: [{ projectId, mode }] }`. Each item in `projects` has `{ id, name, dataFile }`. The active workspace is `window.ACTIVE_PROJECT_ID`.

- [ ] **Step 1: Replace the stub with the full renderAdminUsersTab**

Find the stub `function renderAdminUsersTab()` in cms.js and replace it entirely:

```javascript
function renderAdminUsersTab() {
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  const users = registry.users || []
  const workspaces = registry.projects || []
  const activeWsId = window.ACTIVE_PROJECT_ID || ''

  // Build user rows
  const userRows = users.map((u, ui) => {
    const initials = (u.name || u.id || '?')[0].toUpperCase()
    const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']
    const avatarColor = colors[ui % colors.length]
    const grants = u.grants || []

    const grantRows = grants.map((g, gi) => {
      const ws = workspaces.find(p => p.id === g.projectId) || { name: g.projectId }
      const roleColors = { pm: '#dcfce7;color:#166534', dev: '#fef3c7;color:#92400e', exec: '#dbeafe;color:#1d4ed8' }
      const roleStyle = roleColors[g.mode] || '#f1f5f9;color:#374151'
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0">
          <div>
            <span style="font-size:11px;font-weight:700;color:#1e293b">${ws.name}</span>
            <span style="font-size:9px;color:#94a3b8;margin-left:4px">/ All Projects</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="padding:2px 7px;background:${roleStyle};border-radius:4px;font-size:10px;font-weight:800">${g.mode}</span>
            <button onclick="adminRevokeGrant('${u.id}', ${gi})" style="padding:2px 6px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:3px;font-size:10px;cursor:pointer">✕</button>
          </div>
        </div>`
    }).join('')

    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;background:white;overflow:hidden">
        <div style="padding:10px 14px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};color:white;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center">${initials}</div>
            <div>
              <div style="font-weight:800;color:#1e293b;font-size:12px">${u.name || u.id}</div>
              <div style="color:#64748b;font-size:10px">${u.email || u.id}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="adminEditUserInline('${u.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminRemoveUser('${u.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Remove</button>
          </div>
        </div>
        <div style="padding:8px 14px 10px" id="admin-user-detail-${u.id}">
          <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Workspace Access</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${grantRows || '<div style="font-size:10px;color:#94a3b8">No grants yet</div>'}
            <button onclick="adminShowGrantForm('${u.id}')" style="padding:4px;border:1.5px dashed #c7d2fe;border-radius:5px;color:#6366f1;font-size:10px;font-weight:700;background:transparent;cursor:pointer;margin-top:4px">+ Grant Access to Workspace</button>
            <div id="admin-grant-form-${u.id}" style="display:none"></div>
          </div>
        </div>
      </div>`
  }).join('')

  // Build workspace rows
  const wsRows = workspaces.map(ws => {
    const isActive = ws.id === activeWsId
    return `
      <div style="border:${isActive ? '1.5px solid #c7d2fe' : '1px solid #e2e8f0'};border-radius:8px;margin-bottom:8px;background:${isActive ? '#eef2ff' : 'white'};overflow:hidden">
        <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isActive ? '#6366f1' : '#cbd5e1'}"></span>
            <span style="font-weight:800;color:${isActive ? '#312e81' : '#475569'};font-size:12px">${ws.name}</span>
            ${isActive ? '<span style="background:#6366f1;color:white;border-radius:8px;padding:1px 7px;font-size:9px;font-weight:900">ACTIVE</span>' : ''}
            <span style="font-size:10px;color:#94a3b8">${ws.dataFile || ws.id + '.json'}</span>
          </div>
          <div style="display:flex;gap:6px">
            ${!isActive ? `<button onclick="adminSwitchWorkspace('${ws.id}')" style="padding:3px 10px;background:#f1f5f9;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Switch</button>` : ''}
            <button onclick="adminEditWorkspaceInline('${ws.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminDeleteWorkspace('${ws.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Delete</button>
          </div>
        </div>
        <div id="admin-ws-form-${ws.id}" style="display:none;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc"></div>
      </div>`
  }).join('')

  return `
    <!-- Users section -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">👤 Users <span style="background:#e2e8f0;color:#64748b;border-radius:8px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:4px">${users.length}</span></div>
      <button onclick="adminShowAddUserForm()" style="padding:5px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add User</button>
    </div>
    <div id="admin-add-user-form" style="display:none;margin-bottom:12px"></div>
    ${userRows || '<div style="color:#94a3b8;font-size:12px;margin-bottom:12px">No users found.</div>'}

    <!-- Workspaces section -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">🏢 Workspaces <span style="background:#e2e8f0;color:#64748b;border-radius:8px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:4px">${workspaces.length}</span></div>
        <button onclick="adminShowAddWorkspaceForm()" style="padding:5px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add Workspace</button>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:10px">Each workspace is a top-level data file on GitHub. Workspace changes save to users.json.</div>
      <div id="admin-add-ws-form" style="display:none;margin-bottom:12px"></div>
      ${wsRows || '<div style="color:#94a3b8;font-size:12px">No workspaces found.</div>'}
    </div>

    <!-- Save CTA -->
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:16px">
      <button onclick="adminSaveUsersJson()" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer">💾 Save Users & Workspaces to GitHub</button>
      <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px">Saves to users.json · Requires PM role</p>
    </div>
  `
}
```

- [ ] **Step 2: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 3: Commit**

```bash
git add cms.js
git commit -m "feat: implement renderAdminUsersTab with user list and workspace management"
```

---

## Task 4: Add Users & Grants CRUD action functions

**Files:**
- Modify: `cms.js` — add after `renderAdminUsersTab()`

These functions handle all interactive actions in the Users & Grants tab: inline forms, grant management, workspace management, and the save-to-GitHub write.

- [ ] **Step 1: Add user action functions**

```javascript
function adminShowAddUserForm() {
  const el = document.getElementById('admin-add-user-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#4338ca;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">+ Add User</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">User ID (login name)</label>
          <input id="admin-new-user-id" type="text" placeholder="gautam" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Display Name</label>
          <input id="admin-new-user-name" type="text" placeholder="Gautam Lodhiya" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Email</label>
          <input id="admin-new-user-email" type="email" placeholder="user@khyaal.com" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Initial Password</label>
          <input id="admin-new-user-password" type="password" placeholder="••••••••" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewUser()" style="flex:1;padding:7px;background:#6366f1;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Add User</button>
        <button onclick="document.getElementById('admin-add-user-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

async function adminSaveNewUser() {
  const id = (document.getElementById('admin-new-user-id')?.value || '').trim()
  const name = (document.getElementById('admin-new-user-name')?.value || '').trim()
  const email = (document.getElementById('admin-new-user-email')?.value || '').trim()
  const password = (document.getElementById('admin-new-user-password')?.value || '').trim()
  if (!id || !name || !password) { showToast('User ID, name, and password are required', 'error'); return }
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  if ((registry.users || []).find(u => u.id === id)) { showToast('User ID already exists', 'error'); return }
  const passwordHash = await sha256(password)
  const newUser = { id, name, email, passwordHash, grants: [] }
  if (!registry.users) registry.users = []
  registry.users.push(newUser)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User added — click Save to persist', 'info')
}

function adminEditUserInline(userId) {
  // For now: name and email edit only (password reset is separate)
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  const detailEl = document.getElementById(`admin-user-detail-${userId}`)
  if (!detailEl) return
  detailEl.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #c7d2fe;border-radius:6px;padding:10px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Display Name</label>
          <input id="admin-edit-user-name-${userId}" type="text" value="${user.name || ''}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Email</label>
          <input id="admin-edit-user-email-${userId}" type="email" value="${user.email || ''}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="adminSaveUserEdit('${userId}')" style="flex:1;padding:6px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="renderAdminView()" style="padding:6px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveUserEdit(userId) {
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  user.name = (document.getElementById(`admin-edit-user-name-${userId}`)?.value || '').trim() || user.name
  user.email = (document.getElementById(`admin-edit-user-email-${userId}`)?.value || '').trim() || user.email
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User updated — click Save to persist', 'info')
}

function adminRemoveUser(userId) {
  if (!confirm(`Remove user "${userId}"? This also removes all their grants.`)) return
  const registry = window.PROJECT_REGISTRY || { users: [] }
  registry.users = (registry.users || []).filter(u => u.id !== userId)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User removed — click Save to persist', 'info')
}
```

- [ ] **Step 2: Add grant management functions**

```javascript
function adminShowGrantForm(userId) {
  const el = document.getElementById(`admin-grant-form-${userId}`)
  if (!el) return
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  const workspaces = registry.projects || []
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #c7d2fe;border-radius:5px;padding:8px;margin-top:6px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:flex-end">
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Workspace</label>
          <select id="admin-grant-ws-${userId}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px">
            ${workspaces.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Role</label>
          <select id="admin-grant-role-${userId}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px">
            <option value="pm">pm</option>
            <option value="dev">dev</option>
            <option value="exec">exec</option>
          </select>
        </div>
        <button onclick="adminSaveGrant('${userId}')" style="padding:5px 10px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Add</button>
      </div>
      <button onclick="document.getElementById('admin-grant-form-${userId}').style.display='none'" style="margin-top:5px;padding:3px;width:100%;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveGrant(userId) {
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  const projectId = document.getElementById(`admin-grant-ws-${userId}`)?.value
  const mode = document.getElementById(`admin-grant-role-${userId}`)?.value
  if (!projectId || !mode) return
  if (!user.grants) user.grants = []
  if (user.grants.find(g => g.projectId === projectId)) { showToast('Grant already exists for this workspace', 'error'); return }
  user.grants.push({ projectId, mode })
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Grant added — click Save to persist', 'info')
}

function adminRevokeGrant(userId, grantIdx) {
  if (!confirm('Remove this grant?')) return
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user || !user.grants) return
  user.grants.splice(grantIdx, 1)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Grant revoked — click Save to persist', 'info')
}
```

- [ ] **Step 3: Add workspace management functions**

```javascript
function adminShowAddWorkspaceForm() {
  const el = document.getElementById('admin-add-ws-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#4338ca;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">+ Add Workspace</div>
      <div style="margin-bottom:8px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Workspace Name</label>
        <input id="admin-new-ws-name" type="text" placeholder="AI Agent Team" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box" oninput="adminPreviewWsId(this.value)">
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Data File (auto-generated)</label>
        <input id="admin-new-ws-file" type="text" placeholder="data-ai-agent-team.json" readonly style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;background:#f1f5f9;color:#94a3b8;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewWorkspace()" style="flex:1;padding:7px;background:#6366f1;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Create Workspace</button>
        <button onclick="document.getElementById('admin-add-ws-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminPreviewWsId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const fileEl = document.getElementById('admin-new-ws-file')
  if (fileEl) fileEl.value = slug ? `data-${slug}.json` : ''
}

function adminSaveNewWorkspace() {
  const name = (document.getElementById('admin-new-ws-name')?.value || '').trim()
  if (!name) { showToast('Workspace name is required', 'error'); return }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const id = slug
  const dataFile = `data-${slug}.json`
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  if ((registry.projects || []).find(p => p.id === id)) { showToast('Workspace ID already exists', 'error'); return }
  if (!registry.projects) registry.projects = []
  registry.projects.push({ id, name, dataFile })
  window.PROJECT_REGISTRY = registry
  // Scaffold the data file on GitHub
  scaffoldProjectDataFile(id, name)
  renderAdminView()
  showToast('Workspace created — click Save to persist registry', 'info')
}

function adminEditWorkspaceInline(wsId) {
  const el = document.getElementById(`admin-ws-form-${wsId}`)
  if (!el) return
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Workspace Name</label>
        <input id="admin-edit-ws-name-${wsId}" type="text" value="${ws.name}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
      </div>
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Data File</label>
        <input type="text" value="${ws.dataFile || wsId + '.json'}" readonly style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;background:#f1f5f9;color:#94a3b8;box-sizing:border-box">
      </div>
    </div>
    <div style="display:flex;gap:6px">
      <button onclick="adminSaveWorkspaceEdit('${wsId}')" style="flex:1;padding:6px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
      <button onclick="document.getElementById('admin-ws-form-${wsId}').style.display='none'" style="padding:6px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveWorkspaceEdit(wsId) {
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  ws.name = (document.getElementById(`admin-edit-ws-name-${wsId}`)?.value || '').trim() || ws.name
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Workspace updated — click Save to persist', 'info')
}

function adminDeleteWorkspace(wsId) {
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  if (wsId === window.ACTIVE_PROJECT_ID) { showToast('Cannot delete the active workspace. Switch first.', 'error'); return }
  if (!confirm(`Delete workspace "${ws.name}"? This will tombstone its data file on GitHub. This cannot be undone.`)) return
  registry.projects = (registry.projects || []).filter(p => p.id !== wsId)
  window.PROJECT_REGISTRY = registry
  deleteProjectDataFile(wsId)
  renderAdminView()
  showToast('Workspace deleted — click Save to persist registry', 'info')
}

function adminSwitchWorkspace(wsId) {
  if (!confirm(`Switch to workspace "${wsId}"? The page will reload.`)) return
  window.ACTIVE_PROJECT_ID = wsId
  localStorage.setItem('khyaal_active_project', wsId)
  location.reload()
}
```

- [ ] **Step 4: Add adminSaveUsersJson — writes users.json via Lambda**

```javascript
async function adminSaveUsersJson() {
  const registry = window.PROJECT_REGISTRY
  if (!registry) { showToast('No registry data to save', 'error'); return }
  if (window.isActionLockActive) { showToast('Save already in progress', 'error'); return }
  window.isActionLockActive = true
  try {
    const jwt = localStorage.getItem('khyaal_site_auth')
    const content = btoa(JSON.stringify(registry, null, 2))
    const response = await fetch(`${LAMBDA_URL}?action=write`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sha: window._lastUsersSha || undefined, message: 'chore: update users.json via admin panel', filePath: 'users.json' })
    })
    if (!response.ok) throw new Error(`Write failed: ${response.status}`)
    const { sha } = await response.json()
    if (sha) window._lastUsersSha = sha
    showToast('Users & Workspaces saved to GitHub', 'success')
  } catch (err) {
    console.error('❌ adminSaveUsersJson:', err)
    showToast('Save failed — check connection and try again', 'error')
  } finally {
    window.isActionLockActive = false
  }
}
```

- [ ] **Step 5: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 6: Commit**

```bash
git add cms.js
git commit -m "feat: add Users & Grants CRUD functions (add user, edit, remove, grants, workspace management)"
```

---

## Task 5: Build `renderAdminStructureTab()` — Project/Track/Subtrack accordion

**Files:**
- Modify: `cms.js` — replace stub `renderAdminStructureTab()` with full implementation

**Context:** `window.UPDATE_DATA.projects[]` is the source for this tab. Each project has `{ id, name, tracks: [{ id, name, color, subtracks: [{ name, items: [] }] }] }`. The active workspace name comes from `window.PROJECT_REGISTRY?.projects?.find(p => p.id === window.ACTIVE_PROJECT_ID)?.name`.

- [ ] **Step 1: Replace the stub with full renderAdminStructureTab**

Find `function renderAdminStructureTab()` in cms.js and replace it:

```javascript
function renderAdminStructureTab() {
  const projects = (window.UPDATE_DATA?.projects) || []
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const activeWsId = window.ACTIVE_PROJECT_ID || 'default'
  const activeWsName = (registry.projects || []).find(p => p.id === activeWsId)?.name || activeWsId

  const projectRows = projects.map((proj, pi) => {
    const trackCount = (proj.tracks || []).length
    const itemCount = (proj.tracks || []).reduce((sum, t) => sum + (t.subtracks || []).reduce((s2, st) => s2 + (st.items || []).length, 0), 0)

    const trackRows = (proj.tracks || []).map((track, ti) => {
      const trackItemCount = (track.subtracks || []).reduce((s, st) => s + (st.items || []).length, 0)
      const colorDot = track.color ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${track.color};margin-right:5px"></span>` : ''

      const subtracks = (track.subtracks || []).map((st, sti) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#f8fafc;border-radius:4px;border:1px solid #f1f5f9">
          <span style="font-size:10px;color:#475569">↳ ${st.name} <span style="color:#94a3b8">(${(st.items || []).length})</span></span>
          <div style="display:flex;gap:4px">
            <button onclick="adminRenameSubtrack('${proj.id}','${track.id || ti}',${sti})" style="padding:2px 6px;background:white;border:1px solid #e2e8f0;color:#475569;border-radius:3px;font-size:9px;cursor:pointer">Rename</button>
            <button onclick="adminDeleteSubtrack('${proj.id}','${track.id || ti}',${sti})" style="padding:2px 6px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:3px;font-size:9px;cursor:pointer">Delete</button>
          </div>
        </div>`).join('')

      return `
        <div style="border:1px solid #e2e8f0;border-radius:6px;margin-bottom:5px;overflow:hidden">
          <div style="padding:7px 10px;display:flex;justify-content:space-between;align-items:center;background:#fafafa">
            <div style="display:flex;align-items:center">${colorDot}<span style="font-weight:700;font-size:11px;color:#1e293b">${track.name}</span><span style="color:#94a3b8;font-size:10px;margin-left:6px">${trackItemCount} items</span></div>
            <div style="display:flex;gap:4px">
              <button onclick="adminEditTrackInline('${proj.id}','${track.id || ti}')" style="padding:2px 8px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer">Edit</button>
              <button onclick="adminDeleteTrack('${proj.id}','${track.id || ti}')" style="padding:2px 8px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer">Delete</button>
            </div>
          </div>
          <div id="admin-track-form-${proj.id}-${track.id || ti}" style="display:none;padding:8px 10px;border-top:1px solid #f1f5f9;background:#f8fafc"></div>
          <div style="padding:5px 10px 7px 20px;border-top:1px solid #f8fafc">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:9px;font-weight:900;color:#cbd5e1;text-transform:uppercase;letter-spacing:.06em">Subtracks</div>
              <button onclick="adminAddSubtrack('${proj.id}','${track.id || ti}')" style="padding:1px 7px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">+ Subtrack</button>
            </div>
            <div id="admin-subtracks-${proj.id}-${track.id || ti}" style="display:flex;flex-direction:column;gap:3px">
              ${subtracks || '<div style="font-size:9px;color:#94a3b8">No subtracks</div>'}
            </div>
            <div id="admin-subtrack-form-${proj.id}-${track.id || ti}" style="display:none;margin-top:5px"></div>
          </div>
        </div>`
    }).join('')

    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;background:white">
        <div style="padding:10px 14px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:14px;color:#94a3b8">▾</span>
            <span style="font-weight:900;color:#1e293b;font-size:13px">📁 ${proj.name}</span>
            <span style="color:#94a3b8;font-size:10px">${trackCount} tracks · ${itemCount} items</span>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="adminEditProjectInline('${proj.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminDeleteProject('${proj.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Delete</button>
          </div>
        </div>
        <div id="admin-project-form-${proj.id}" style="display:none;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc"></div>
        <div style="padding:8px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
            <div style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">🏗️ Tracks</div>
            <button onclick="adminAddTrack('${proj.id}')" style="padding:2px 9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:4px;font-size:9px;font-weight:800;cursor:pointer">+ Add Track</button>
          </div>
          <div id="admin-tracks-${proj.id}">
            ${trackRows || '<div style="font-size:10px;color:#94a3b8">No tracks yet</div>'}
          </div>
          <div id="admin-track-add-form-${proj.id}" style="display:none;margin-top:6px"></div>
        </div>
      </div>`
  }).join('')

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">📁 Projects</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">in workspace: <strong style="color:#4338ca">${activeWsName}</strong></div>
      </div>
      <button onclick="adminAddProject()" style="padding:5px 12px;background:#10b981;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add Project</button>
    </div>
    <div id="admin-add-project-form" style="display:none;margin-bottom:12px"></div>
    ${projectRows || '<div style="color:#94a3b8;font-size:12px">No projects in this workspace.</div>'}
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:8px">
      <button onclick="adminSaveStructure()" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer">💾 Save Structure to GitHub</button>
      <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px">Saves to data.json</p>
    </div>
  `
}
```

- [ ] **Step 2: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 3: Commit**

```bash
git add cms.js
git commit -m "feat: implement renderAdminStructureTab with full Project/Track/Subtrack accordion"
```

---

## Task 6: Add Structure tab CRUD action functions

**Files:**
- Modify: `cms.js` — add after `renderAdminStructureTab()`

- [ ] **Step 1: Add project CRUD functions**

```javascript
function adminAddProject() {
  const el = document.getElementById('admin-add-project-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #a7f3d0;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#065f46;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">+ Add Project</div>
      <div style="margin-bottom:8px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Project Name</label>
        <input id="admin-new-proj-name" type="text" placeholder="Khyaal Platform" style="width:100%;padding:6px 8px;border:1px solid #a7f3d0;border-radius:5px;font-size:11px;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewProject()" style="flex:1;padding:7px;background:#10b981;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Create Project</button>
        <button onclick="document.getElementById('admin-add-project-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveNewProject() {
  const name = (document.getElementById('admin-new-proj-name')?.value || '').trim()
  if (!name) { showToast('Project name is required', 'error'); return }
  const id = 'proj-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
  const newProject = { id, name, tracks: [] }
  if (!window.UPDATE_DATA.projects) window.UPDATE_DATA.projects = []
  window.UPDATE_DATA.projects.push(newProject)
  renderAdminView()
  showToast('Project added — click Save to persist', 'info')
}

function adminEditProjectInline(projectId) {
  const el = document.getElementById(`admin-project-form-${projectId}`)
  if (!el) return
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:flex-end">
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Project Name</label>
        <input id="admin-edit-proj-name-${projectId}" type="text" value="${proj.name}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="adminSaveProjectEdit('${projectId}')" style="padding:6px 12px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="document.getElementById('admin-project-form-${projectId}').style.display='none'" style="padding:6px 10px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveProjectEdit(projectId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  proj.name = (document.getElementById(`admin-edit-proj-name-${projectId}`)?.value || '').trim() || proj.name
  renderAdminView()
  showToast('Project updated — click Save to persist', 'info')
}

function adminDeleteProject(projectId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const itemCount = (proj.tracks || []).reduce((sum, t) => sum + (t.subtracks || []).reduce((s2, st) => s2 + (st.items || []).length, 0), 0)
  if (!confirm(`Delete project "${proj.name}"? This will permanently remove ${itemCount} items, all tracks, and all subtracks within it.`)) return
  window.UPDATE_DATA.projects = (window.UPDATE_DATA.projects || []).filter(p => p.id !== projectId)
  renderAdminView()
  showToast('Project deleted — click Save to persist', 'info')
}
```

- [ ] **Step 2: Add track CRUD functions**

```javascript
function adminAddTrack(projectId) {
  const el = document.getElementById(`admin-track-add-form-${projectId}`)
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px">
      <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:flex-end">
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Track Name</label>
          <input id="admin-new-track-name-${projectId}" type="text" placeholder="Website" style="width:100%;padding:5px 7px;border:1px solid #bfdbfe;border-radius:4px;font-size:10px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Colour</label>
          <input id="admin-new-track-color-${projectId}" type="color" value="#3b82f6" style="height:28px;width:40px;border:1px solid #bfdbfe;border-radius:4px;padding:1px;cursor:pointer">
        </div>
        <button onclick="adminSaveNewTrack('${projectId}')" style="padding:5px 10px;background:#1d4ed8;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Add</button>
      </div>
      <button onclick="document.getElementById('admin-track-add-form-${projectId}').style.display='none'" style="margin-top:5px;padding:3px;width:100%;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveNewTrack(projectId) {
  const name = (document.getElementById(`admin-new-track-name-${projectId}`)?.value || '').trim()
  if (!name) { showToast('Track name is required', 'error'); return }
  const color = document.getElementById(`admin-new-track-color-${projectId}`)?.value || '#3b82f6'
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const id = 't-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
  if (!proj.tracks) proj.tracks = []
  proj.tracks.push({ id, name, color, subtracks: [] })
  renderAdminView()
  showToast('Track added — click Save to persist', 'info')
}

function adminEditTrackInline(projectId, trackId) {
  const el = document.getElementById(`admin-track-form-${projectId}-${trackId}`)
  if (!el) return
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:flex-end">
      <div>
        <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Track Name</label>
        <input id="admin-edit-track-name-${projectId}-${trackId}" type="text" value="${track.name}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px;box-sizing:border-box">
      </div>
      <div>
        <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Colour</label>
        <input id="admin-edit-track-color-${projectId}-${trackId}" type="color" value="${track.color || '#3b82f6'}" style="height:26px;width:36px;border:1px solid #e2e8f0;border-radius:3px;padding:1px;cursor:pointer">
      </div>
      <div style="display:flex;gap:4px">
        <button onclick="adminSaveTrackEdit('${projectId}','${trackId}')" style="padding:4px 9px;background:#6366f1;color:white;border:none;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="document.getElementById('admin-track-form-${projectId}-${trackId}').style.display='none'" style="padding:4px 7px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:3px;font-size:9px;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveTrackEdit(projectId, trackId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  track.name = (document.getElementById(`admin-edit-track-name-${projectId}-${trackId}`)?.value || '').trim() || track.name
  track.color = document.getElementById(`admin-edit-track-color-${projectId}-${trackId}`)?.value || track.color
  renderAdminView()
  showToast('Track updated — click Save to persist', 'info')
}

function adminDeleteTrack(projectId, trackId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const track = (proj.tracks || []).find(t => (t.id || '') === trackId)
  if (!track) return
  const itemCount = (track.subtracks || []).reduce((s, st) => s + (st.items || []).length, 0)
  if (!confirm(`Delete track "${track.name}"? This removes ${itemCount} items and all its subtracks.`)) return
  proj.tracks = (proj.tracks || []).filter(t => (t.id || '') !== trackId)
  renderAdminView()
  showToast('Track deleted — click Save to persist', 'info')
}
```

- [ ] **Step 3: Add subtrack CRUD functions**

```javascript
function adminAddSubtrack(projectId, trackId) {
  const el = document.getElementById(`admin-subtrack-form-${projectId}-${trackId}`)
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:flex;gap:5px;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:6px 8px">
      <input id="admin-new-subtrack-name-${projectId}-${trackId}" type="text" placeholder="e.g. Backlog" style="flex:1;padding:4px 6px;border:1px solid #bbf7d0;border-radius:3px;font-size:10px">
      <button onclick="adminSaveNewSubtrack('${projectId}','${trackId}')" style="padding:4px 8px;background:#166534;color:white;border:none;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">Add</button>
      <button onclick="document.getElementById('admin-subtrack-form-${projectId}-${trackId}').style.display='none'" style="padding:4px 6px;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">✕</button>
    </div>`
}

function adminSaveNewSubtrack(projectId, trackId) {
  const name = (document.getElementById(`admin-new-subtrack-name-${projectId}-${trackId}`)?.value || '').trim()
  if (!name) { showToast('Subtrack name is required', 'error'); return }
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  if (!track.subtracks) track.subtracks = []
  track.subtracks.push({ name, items: [] })
  renderAdminView()
  showToast('Subtrack added — click Save to persist', 'info')
}

function adminRenameSubtrack(projectId, trackId, subtractIdx) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  const st = (track.subtracks || [])[subtractIdx]
  if (!st) return
  const newName = prompt(`Rename subtrack "${st.name}":`, st.name)
  if (!newName || !newName.trim()) return
  st.name = newName.trim()
  renderAdminView()
  showToast('Subtrack renamed — click Save to persist', 'info')
}

function adminDeleteSubtrack(projectId, trackId, subtractIdx) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  const st = (track.subtracks || [])[subtractIdx]
  if (!st) return
  if (!confirm(`Delete subtrack "${st.name}"? This removes ${(st.items || []).length} items permanently.`)) return
  track.subtracks.splice(subtractIdx, 1)
  renderAdminView()
  showToast('Subtrack deleted — click Save to persist', 'info')
}

async function adminSaveStructure() {
  try {
    await saveToGithub(window.UPDATE_DATA)
    showToast('Structure saved to GitHub', 'success')
    renderDashboard()
  } catch (err) {
    console.error('❌ adminSaveStructure:', err)
  }
}
```

- [ ] **Step 4: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 5: Commit**

```bash
git add cms.js
git commit -m "feat: add Structure tab CRUD functions for Project, Track, and Subtrack"
```

---

## Task 7: Remove old spAdmin* prompt()-based functions

**Files:**
- Modify: `cms.js` — delete `spAdminAddTeam`, `spAdminEditTeam`, `spAdminAddProject`, `spAdminEditProject`

**Context:** These functions live around lines 584–665 and use `prompt()`. They are now replaced by the new `adminAddWorkspace`, `adminSaveNewWorkspace`, `adminAddProject`, `adminSaveNewProject` functions.

- [ ] **Step 1: Find and delete the old spAdmin* functions**

In `cms.js`, find and delete the four old functions. They look like:

```javascript
function spAdminAddTeam() {
  ...prompt('Team name ...
```

```javascript
function spAdminEditTeam() {
  ...prompt('Team name:', p.name)...
```

```javascript
function spAdminAddProject() {
  ...prompt('Team name ...
```

```javascript
function spAdminEditProject() {
  ...prompt('Team name:', proj.name)...
```

Delete each function body entirely (from `function spAdmin...` to the closing `}`).

- [ ] **Step 2: Search for any remaining onclick references to the old functions**

```bash
grep -n "spAdminAddTeam\|spAdminEditTeam\|spAdminAddProject\|spAdminEditProject" cms.js
```

If any remain (e.g. in button onclick strings inside other functions), update them to call the new equivalents:
- `spAdminAddTeam()` → `adminShowAddWorkspaceForm()`
- `spAdminEditTeam(id)` → `adminEditWorkspaceInline(id)`
- `spAdminAddProject()` → `adminAddProject()`
- `spAdminEditProject(id)` → `adminEditProjectInline(id)`

- [ ] **Step 3: Syntax check**

```bash
node --check cms.js
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add cms.js
git commit -m "refactor: remove spAdmin* prompt() functions, replaced by inline admin view CRUD"
```

---

## Task 8: Load users.json on init + smoke test

**Files:**
- Modify: `cms.js` — add users.json fetch to `initCms()` so `window.PROJECT_REGISTRY` is always fresh when Admin view opens

- [ ] **Step 1: Add users.json fetch helper in cms.js**

Find `function initCms()` (line ~1653). Before the final `return`, ensure the registry is refreshed. Add a new function:

```javascript
async function adminLoadUsersRegistry() {
  try {
    const jwt = localStorage.getItem('khyaal_site_auth')
    const response = await fetch(`${LAMBDA_URL}?action=read&filePath=users.json`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
    if (!response.ok) return // non-PM users won't have access — silently skip
    const { content, sha } = await response.json()
    window.PROJECT_REGISTRY = JSON.parse(atob(content))
    if (sha) window._lastUsersSha = sha
  } catch (err) {
    console.warn('⚠️ adminLoadUsersRegistry: could not load users.json', err)
  }
}
```

Then inside `initCms()`, after `const mode = getCurrentMode()`, add:

```javascript
if (mode === 'pm') adminLoadUsersRegistry()
```

- [ ] **Step 2: Verify Lambda supports `filePath` param on read action**

Check `auth_gatekeeper.js` for the read action to confirm `filePath` query param is handled. If it isn't, the read defaults to `data.json`. Look for:

```bash
grep -n "filePath\|read" auth_gatekeeper.js | head -30
```

If `filePath` is not supported on read, add it. Find the read action block and update:

```javascript
// Inside the read action block — ensure filePath override is supported
const filePath = (queryParams.filePath || bodyObj?.filePath || dataFile)
const { content, sha } = await fetchFileWithSha(token, filePath)
```

- [ ] **Step 3: Syntax check both files**

```bash
node --check cms.js && node --check auth_gatekeeper.js
```

Expected: clean exit on both.

- [ ] **Step 4: Full smoke test**

Open `https://khyaal-inc.github.io/khyaal-engineering-updates/?cms=true&mode=pm`:

- [ ] Side panel Admin tab shows "Open Admin ↗" button (no longer shows accordion directly in panel)
- [ ] Click "Open Admin ↗" → main content switches to full-screen admin view
- [ ] Users & Grants tab: shows user list with avatar, name, email, Edit/Remove buttons
- [ ] Users & Grants tab: each user expands to show grants with role badges and ✕ buttons
- [ ] Users & Grants tab: Workspaces section shows all workspaces with active/inactive state
- [ ] "+ Add User" opens inline form; fill and submit → user appears in list
- [ ] "+ Grant Access" opens inline select form; add a grant → grant row appears
- [ ] "✕" on a grant removes it from the list
- [ ] "+ Add Workspace" opens inline form with auto-derived data file name
- [ ] "💾 Save Users & Workspaces" triggers Lambda write → toast confirms success
- [ ] Structure tab: shows Projects accordion for active workspace
- [ ] Expand a project → tracks appear with Edit/Delete buttons
- [ ] Expand a track → subtracks appear with Rename/Delete buttons
- [ ] "+ Add Project" → inline form → project appears
- [ ] "+ Add Track" → inline form with colour picker → track appears
- [ ] "+ Subtrack" → inline input → subtrack appears
- [ ] "💾 Save Structure" triggers saveToGithub() → toast confirms
- [ ] "← Back to Dashboard" returns to okr view
- [ ] No JS console errors throughout

- [ ] **Step 5: Commit**

```bash
git add cms.js auth_gatekeeper.js
git commit -m "feat: load users.json on admin init; full smoke test passed"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|-----------------|-----------------|
| switchView('admin') entry point | Task 1 |
| #admin-view div | Task 1 |
| Two sub-tabs (Users & Grants, Structure) | Task 2 |
| Header + Back to Dashboard | Task 2 |
| PM-only guard | Task 2 |
| User list with avatar, name, email | Task 3 |
| Edit / Remove per user | Task 4 |
| Grant rows per user with role badge | Task 3 |
| ✕ to revoke grant | Task 4 |
| + Grant Access inline form | Task 4 |
| Workspace list with active/inactive | Task 3 |
| Edit / Delete / Switch workspace | Task 4 |
| + Add Workspace with auto-derived data file | Task 4 |
| Save users.json via Lambda filePath param | Task 4 + Task 8 |
| Project accordion with expand/collapse | Task 5 |
| + Add Project inline form | Task 6 |
| Edit / Delete project | Task 6 |
| + Add Track with colour picker | Task 6 |
| Edit / Delete track | Task 6 |
| + Add Subtrack | Task 6 |
| Rename / Delete subtrack | Task 6 |
| Save structure via saveToGithub() | Task 6 |
| Delete old spAdmin* prompt() functions | Task 7 |
| Load users.json on PM init | Task 8 |
| Users.json SHA lock | Task 4 (_lastUsersSha) |
| isActionLockActive on all writes | Task 4 (adminSaveUsersJson) |
| confirm() for destructive operations | Tasks 4, 6 |
| Naming: Workspace / Project / Track / Subtrack | All tasks |

**Placeholder scan:** None found.

**Type consistency:** All function names used in onclick strings match the function definitions in the same tasks. `trackId` used as `track.id || ti` index fallback is consistent across track edit/delete/subtrack functions.
