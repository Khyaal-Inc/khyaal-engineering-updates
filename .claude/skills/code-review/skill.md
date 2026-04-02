---
name: code-review
description: Quick code review of recent git changes with focus on quality, bugs, and performance
triggers:
  - review code
  - code review
  - check recent changes
auto_invoke: false
---

# Code Review Skill

Review the most recent changes in this project efficiently.

## Workflow

1. **Check git status** - See what files changed
2. **Review modifications** - Read only changed files (not entire codebase)
3. **Analyze for**:
   - Code quality and best practices
   - Potential bugs or logic issues
   - Performance concerns
   - Security issues

## Output Format

Provide concise feedback (3-5 bullet points max):
- ✅ **Good**: What's well done
- ⚠️  **Issues**: Problems found with file:line references
- 💡 **Suggestions**: Optional improvements

## Token Efficiency
- Only read files shown in `git diff --name-only`
- Skip archive/, node_modules/, and other excluded paths
- Use targeted line reads for large files
