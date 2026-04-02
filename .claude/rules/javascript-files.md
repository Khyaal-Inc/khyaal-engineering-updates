---
applies_to: "**/*.js"
description: Rules for JavaScript files in the project
---

# JavaScript File Rules

When working with JavaScript files in this project:

## Code Style
- Use ES6+ syntax (const/let, arrow functions, template literals)
- No semicolons (project convention)
- Use async/await over .then() for promises
- Prefer functional patterns (map, filter, reduce)

## Performance
- Avoid DOM manipulation in loops
- Use event delegation for dynamic elements
- Cache DOM queries in variables
- Minimize global scope pollution

## Common Patterns
- State management via global `UPDATE_DATA` object
- View switching via `switchView(viewName)` in core.js
- Data persistence via `saveToGitHub()` function
- Module pattern: Self-contained files with explicit exports

## Before Editing
- Check if similar functionality exists elsewhere
- Maintain consistency with existing code style
- Don't refactor unrelated code in the same file
