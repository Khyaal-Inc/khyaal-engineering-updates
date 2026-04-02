---
name: quick-fix
description: Surgical bug fixes with minimal context loading and targeted changes
triggers:
  - fix bug
  - fix issue
  - fix error
auto_invoke: false
---

# Quick Fix Skill

Apply minimal, surgical fixes to specific issues without reading the entire codebase.

## Workflow

1. **Clarify the issue** - Understand exact problem and symptoms
2. **Locate the cause** - Use grep/search for error messages or relevant code
3. **Read minimal context** - Only the affected file(s) and immediate dependencies
4. **Apply fix** - Make minimal changes (don't refactor unnecessarily)
5. **Verify** - Check if fix resolves the issue

## Input Required

When user invokes this skill, ask for:
- **Issue description**: What's broken?
- **Error messages**: Exact error text (if any)
- **File hint**: Which file is likely affected? (if known)

## Output

- Brief explanation of root cause
- File changes with line references
- Verification step (how to test the fix)

## Token Efficiency
- Use grep to find relevant code before reading files
- Read only necessary functions/sections, not entire files
- Avoid exploratory reads of unrelated modules
