# Claude Code Efficiency Cheat Sheet

## Token-Saving Command Patterns

### ✅ EFFICIENT (Low Token)
```
/review
/fix auth bug in auth_gatekeeper.js
/explain okr-module.js
Read core.js lines 100-150
Check the kanban-view.js file
```

### ❌ INEFFICIENT (High Token)
```
Search the entire codebase for...
Read all files and find...
Explore everything related to...
Show me all code that does...
```

## Custom Slash Commands
- `/review` - Quick code review of recent changes
- `/explain {{file}}` - Explain specific file/function
- `/fix {{issue}}` - Surgical fix for specific issue
- `/add-feature {{description}}` - Add minimal viable feature
- `/optimize {{file}}` - Performance optimization

## File Reference Format
Always use: `file:line` format for precision
Example: "Check core.js:245 for the switchView function"

## Smart Search Strategies
1. **Specific file first**: "Check app.js for normalizeData"
2. **Pattern matching**: "Find *.js files with 'OKR' in name"
3. **Targeted grep**: "Search for 'switchView' in core.js"

## Context Windows (Configured)
- Max tokens per request: 50,000
- File read limit: 20 files
- Auto-includes: *.js, *.html, *.css, *.md

## Files Auto-Excluded (.claudeignore)
- `archive/` folder
- `node_modules/`
- `*.zip`, `*.log`, `*.min.js`
- Lock files, media, large data

## Quick Wins
1. Start new chat for new topics (don't thread indefinitely)
2. Reference specific files by path
3. Use slash commands for common tasks
4. Ask incremental questions (not one huge request)
5. Let Claude use Task tool for broad searches

## Project-Specific Tips
- **data.json** is live dataset (moderate size, ok to read)
- **archive/** is large (excluded unless explicit)
- **Core files**: app.js, core.js, views.js, cms.js
- **Modules**: modes.js, okr-module.js, kanban-view.js, etc.

## Memory File
Key context is stored in `.claude/memory.md` - Claude reads this automatically to understand your project structure without needing to re-explain.
