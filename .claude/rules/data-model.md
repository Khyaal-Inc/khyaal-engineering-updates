---
applies_to: "**/data.json"
description: Rules for data.json structure and modifications
---

# Data Model Rules

## Schema Constraints (enforce these)
- `id` fields: unique across ALL items in the file
- `status`: `now | next | later | qa | review | blocked | onhold | done`
- `priority`: `high | medium | low`
- `storyPoints`: Fibonacci only — `1 | 2 | 3 | 5 | 8 | 13 | 21`
- `planningHorizon`: `1M | 3M | 6M | 1Y`
- `impactLevel` / `effortLevel`: `low | medium | high`
- Dates: ISO format `YYYY-MM-DD`
- `contributors`: array of strings matching names in `metadata.capacity.teamMembers[]`
- `dependencies`: array of item `id` strings (must exist in data)

## Adding a New Field
1. Add to item schema in data.json with a safe default (empty string `""`, `false`, `[]`, or `0`)
2. Add normalization with same default in `app.js normalizeData()` — this handles historical items missing the field
3. Add CMS form support: `case 'fieldName':` in `cms.js renderField()`, add to `FIELD_GROUPS` pillar, add to `LIFECYCLE_FIELD_MAP` views, read back in `saveCmsChanges()`
4. Never put large embedded content — use URL references

## Metadata Sections
- `metadata.epics[]` — edited via `openEpicEdit()` in cms.js
- `metadata.sprints[]` — edited via `openSprintEdit()` in cms.js
- `metadata.releases[]` — edited via `openReleaseEdit()` in cms.js
- `metadata.okrs[]` — edited via OKR management in cms.js
- `metadata.roadmap[]` — edited via `openRoadmapEdit()` in cms.js
- `metadata.capacity.teamMembers[]` — edited via metadata modal
- `metadata.velocityHistory[]` — append only, drives analytics charts

## Never Do
- Don't break existing field names (archived items use old names)
- Don't add required fields without defaults in normalizeData()
- Don't directly edit data.json for production — use CMS + "Save to GitHub"
