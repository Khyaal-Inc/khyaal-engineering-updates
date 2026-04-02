---
name: feature-add
description: Add new features with minimal viable implementation, preferring edits over new files
triggers:
  - add feature
  - implement
  - create new
auto_invoke: false
---

# Feature Addition Skill

Add new features efficiently by editing existing files when possible and implementing minimal viable versions.

## Workflow

1. **Understand feature** - Clarify requirements and scope
2. **Identify location** - Which existing file(s) should be modified?
3. **Check patterns** - Read similar features to follow project conventions
4. **Implement minimally** - Don't over-engineer; build simplest version that works
5. **Test approach** - Suggest how to verify the feature works

## Principles

- **Prefer editing** existing files over creating new ones
- **Follow conventions** - Match existing code style and patterns
- **Start simple** - Add complexity only when needed
- **Avoid refactoring** - Don't change unrelated code

## Input Required

- Feature description (what should it do?)
- User stories or acceptance criteria (if available)

## Token Efficiency
- Read only 1-2 similar features for pattern reference
- Don't read entire codebase to "understand everything"
- Focus on the specific module where feature belongs
