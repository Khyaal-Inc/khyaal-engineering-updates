# Khyaal Pulse — Claude Quick Reference

## Where to Look for What

| Task | File | Key function/line |
|------|------|------------------|
| View routing | app.js | `switchView()` |
| Data normalization | app.js | `normalizeData()` |
| Search/filter | core.js | `isItemInSearch()`, `isItemInDateRange()` |
| Status/priority configs | core.js | `statusConfig`, `priorityConfig` |
| Persona switching | modes.js | `switchMode()`, `getCurrentMode()` |
| Mode filters | modes.js | `getModeFilter()` |
| Edit modal form | cms.js | `buildContextAwareForm()` (line ~278) |
| Pillar visibility | cms.js | `getVisibleFieldGroups()` (line 164) |
| Field visibility per view | cms.js | `LIFECYCLE_FIELD_MAP` (line 148) |
| Field inputs rendered | cms.js | `renderField()` (line ~452) |
| Dev field protection | cms.js | `isFieldProtected()` (line 793) |
| GitHub save | cms.js | `saveToGithub()` |
| Blocker strip | core.js | `renderBlockerStrip()` |
| Track/subtrack CRUD | cms.js | `openTrackEdit()`, `openSubtrackEdit()` |
| Sprint/Release/Epic CRUD | cms.js | `openSprintEdit()`, `openReleaseEdit()`, `openEpicEdit()` |

## Common Edit Patterns

**Add a new item field:**
1. Add field to `UPDATE_DATA` item shape with default in `app.js normalizeData()`
2. Add `case 'fieldName':` in `cms.js renderField()` returning HTML
3. Add field to appropriate FIELD_GROUPS pillar (`what/when/where/how`) in cms.js:114
4. Add field to relevant LIFECYCLE_FIELD_MAP views in cms.js:148
5. Read the value back in `saveCmsChanges()` via `document.getElementById('edit-fieldName')`

**Add a new view:**
1. Add `<div id="viewname-view" class="view-section"></div>` in index.html
2. Add `case 'viewname': renderViewnameView(); break;` in `switchView()` in app.js
3. Add view to `availableViews` in relevant MODE_CONFIG entries in modes.js
4. Add to VIEW_METADATA in modes.js for nav label/icon
5. Create render function in a new `.js` file, load via `<script>` tag in index.html

**Fix a rendering bug:**
- Check browser console first (all render functions have try/catch error shielding in Phase 34)
- State lives in `UPDATE_DATA` — check it via `console.log(UPDATE_DATA)` in DevTools
- `window.isActionLockActive` being stuck `true` will prevent all re-renders
- `currentActiveView` must match a registered view ID or switchView silently no-ops

## Data Flow
```
GitHub (data.json)
  ↓ Lambda fetch (auth_gatekeeper.js)
UPDATE_DATA (in-memory + localStorage)
  ↓ CMS edits → saveCms() → saveToLocalStorage()
  ↓ "Save to GitHub" → saveToGithub() → PUT to GitHub API
GitHub (data.json updated)
```

## Auth Flow
- **Site auth**: password → SHA-256 → Lambda validates → `showProtectedContent()`
- **CMS auth**: `?cms=true` + GitHub PAT stored in `localStorage['gh_pat']`
- Both independent: site auth shows dashboard, CMS auth enables edits + GitHub push

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1` | Epics view |
| `2` | Roadmap |
| `3` | Backlog |
| `4` | Sprint |
| `5` | Track |
| `6` | Releases |
| `7` | By Status |
| `8` | By Priority |
| `9` | By Contributor |
| `0` | Dependencies |
| `/` | Focus search |
| `Alt+1/2/3` | Switch PM/Dev/Exec mode |

## CMS Modal 3-Layer Visibility
1. **Persona** → which pillars visible (`getVisibleFieldGroups`)
2. **Active view** → which fields in each pillar (`LIFECYCLE_FIELD_MAP`)
3. **"Show All" toggle** → override layer 2, show all pillar fields

## Global State Shape (quick ref)
```js
UPDATE_DATA.tracks[ti].subtracks[si].items[ii]  // item access by index
UPDATE_DATA.metadata.epics[]                      // strategic epics
UPDATE_DATA.metadata.sprints[]                    // sprint definitions
UPDATE_DATA.metadata.okrs[]                       // OKR definitions
UPDATE_DATA.metadata.capacity.teamMembers[]       // team capacity
UPDATE_DATA.metadata.velocityHistory[]            // sprint velocity data
window.uiState.showAllTechnical                   // CMS "show all" toggle
window.uiState.openEpics                          // Set of expanded epic IDs
window.isActionLockActive                         // prevents re-renders during modal
```

## Skills Available
- `code-review` — review recent git changes
- `quick-fix` — surgical bug fix
- `code-explain` — explain a function (under 150 words)
- `feature-add` — add feature, minimal implementation
- `performance-optimize` — find and fix bottlenecks
