---
applies_to: "**/data.json"
description: Rules for data.json structure and modifications
---

# Data Model Rules

When modifying data.json:

## Structure Integrity
- Never break existing schema structure
- Add new fields as optional (with defaults in app.js normalization)
- Maintain backward compatibility with archived data
- Test changes with existing data before saving

## Key Constraints
- `id` fields must be unique across all items
- Status values must be: done, now, ongoing, next, later
- Story points must use Fibonacci scale: 1,2,3,5,8,13,21
- Dates in ISO format: YYYY-MM-DD

## Normalization
- New fields get normalized in app.js `normalizeData()` function
- Add default values there, not in data.json directly
- Check that CMS forms support new fields

## Performance
- This file is moderate size (~acceptable to read when needed)
- Archive old data to archive/ folder periodically
- Don't add large embedded content (use references)
