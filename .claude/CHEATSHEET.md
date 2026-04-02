# Claude Code Efficiency Cheat Sheet

## Token-Saving Command Patterns

### ✅ EFFICIENT (Low Token)
```
Use code-review skill
Use quick-fix skill with "auth timeout issue"
Use code-explain skill for okr-module.js
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

## Skills (Auto-Loaded, Progressive Disclosure)
Skills load in 3 stages to save tokens:
1. **Metadata** (~100 tokens) - Name and description loaded at startup
2. **Instructions** (<5k tokens) - Loaded when skill is invoked
3. **Resources** (unlimited) - External files executed via bash

### Available Skills
- `code-review` - Review recent git changes (quality, bugs, performance)
- `quick-fix` - Surgical bug fixes with minimal context
- `code-explain` - Concise explanations under 150 words
- `feature-add` - Add features with minimal viable implementation
- `performance-optimize` - Identify and fix bottlenecks

**How to use**: Simply mention the skill trigger words in your prompt
- "review my code" → triggers code-review
- "fix this bug" → triggers quick-fix
- "explain this function" → triggers code-explain

## File Reference Format
Always use: `file:line` format for precision
Example: "Check core.js:245 for the switchView function"

## Smart Search Strategies
1. **Specific file first**: "Check app.js for normalizeData"
2. **Pattern matching**: "Find *.js files with 'OKR' in name"
3. **Targeted grep**: "Search for 'switchView' in core.js"

## Advanced Features

### Hooks (Automated)
Hooks run automatically on events:
- **userPromptSubmit**: Warns about archive requests, broad searches
- **preToolUse**: Blocks reading excluded files, auto-approves safe reads
- **postToolUse**: Warns when large files are read
- **sessionStart**: Shows optimization tips

### Modular Rules (.claude/rules/)
Path-specific instructions that load only when relevant:
- `javascript-files.md` - Code style for *.js files
- `data-model.md` - Rules for data.json modifications
- `ui-modules.md` - Guidelines for UI module files

### Memory Systems
**CLAUDE.md** (project-level) - Essential context, loads at startup
**MEMORY.md** (auto memory) - First 200 lines at startup, topics on-demand

## Context Windows (Configured)
- Max tokens per request: 50,000
- File read limit: 20 files
- Auto memory load limit: 200 lines

## Files Auto-Excluded (.claudeignore + hooks)
- `archive/` folder - Blocked by preToolUse hook
- `node_modules/` - Standard exclusion
- `*.zip`, `*.log`, `*.min.js` - Build artifacts
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
