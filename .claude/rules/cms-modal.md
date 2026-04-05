---
applies_to: "**/cms.js"
description: Rules for the CMS modal and item management system
---

# CMS Modal Rules

## 3-Layer Field Visibility System
Always think in this order when adding/changing form fields:

1. **Persona layer** — `getVisibleFieldGroups(context)` (line 164)
   - pm: `[what, when, where, how]`
   - dev: `[where, how, what, when]` — strategic fields readonly
   - exec: `[what, when, where]` — no HOW pillar

2. **View layer** — `LIFECYCLE_FIELD_MAP` (line 148)
   - Only fields in this map for the current view are shown unless "Show All" is toggled

3. **Show All toggle** — `window.uiState.showAllTechnical`
   - When true: show all fields in visible pillars regardless of layer 2

## Adding a New Field to the Edit Modal
```
1. Add case in renderField() (~line 452):
   case 'myField':
     return `<div class="field-wrapper">
       <label class="cms-label">Label</label>
       <input type="text" id="edit-myField" value="${val}" class="cms-input" ${attr}>
     </div>`

2. Add to FIELD_GROUPS pillar (line 114) — choose the right pillar:
   what: goal/intent fields  when: time/cycle fields
   where: routing/people     how: effort/quality fields

3. Add to LIFECYCLE_FIELD_MAP views (line 148) where it makes sense

4. Read back in saveCmsChanges():
   item.myField = document.getElementById('edit-myField')?.value || ''

5. Add default in app.js normalizeData(): item.myField = item.myField || ''
```

## Protected Fields (dev mode)
Controlled by `isFieldProtected()` (line 793). To add a new protected field, add its name to the `protectedStrategicFields` array inside that function.

## Tag Widget Fields
Contributors, tags, and dependencies use a custom widget — not a plain input:
```js
renderTagWidget('contributors', item.contributors || [], 'contributors-list', 'contributor')
```
Read back via `window[`selection_contributors`]` array, not `getElementById`.

## Metadata Modals
Separate from item edit modal. Each has its own open/save function:
- `openEpicEdit(epicIndex)` / save inline
- `openSprintEdit(sprintId)` / save inline
- `openReleaseEdit(releaseId)` / save inline
- `openRoadmapEdit(id)` / save inline
- `openMetadataEdit()` / save inline

## Save Chain (don't skip steps)
```
saveCms()
  → validateCmsForm()   [abort if invalid]
  → saveCmsChanges()    [write to UPDATE_DATA]
  → saveToLocalStorage() [persist locally]
  → renderDashboard()   [refresh UI]
  [user clicks "Save to GitHub"]
  → saveToGithub()      [GET sha → PUT to GitHub API]
```

## Common Gotchas
- `window.isActionLockActive = true` during modal — reset it or renders stop working
- Move fields (Target Track/Subtrack) only shown for PM + existing items
- `editContext` global holds `{type, trackIndex, subtrackIndex, itemIndex}` for current edit
- After delete/move, use `setTimeout(() => renderDashboard(), 0)` to decouple from event
