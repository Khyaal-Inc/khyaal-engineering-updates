---
name: code-explain
description: Concise explanations of specific files or functions under 150 words
triggers:
  - explain
  - how does
  - what does
auto_invoke: false
---

# Code Explanation Skill

Provide brief, focused explanations of specific code files or functions.

## Workflow

1. **Identify target** - Get specific file/function name
2. **Read target only** - Don't read dependencies unless critical
3. **Explain concisely**:
   - What it does (1-2 sentences)
   - Key dependencies (if any)
   - Important logic flows

## Output Format

Keep under 150 words using:
- **Purpose**: One-line description
- **How it works**: 2-3 bullet points
- **Key details**: Important gotchas or dependencies

## Token Efficiency
- Read only the requested file/function
- Use grep to find function definitions before reading
- Skip reading imported dependencies unless user asks
