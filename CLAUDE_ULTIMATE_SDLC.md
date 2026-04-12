# 🚀 Claude Code Ultimate SDLC Cheatsheet
*One workflow to configure, discover, design, architect, code, test, and document.*

## Prerequisites
- Claude Code installed and authenticated
- Marketplace added: `/plugin marketplace add alirezarezvani/claude-skills`
- All skills installed

Claude Code (Recommended)
```bash
/plugin install superpowers
/plugin install frontend-design@claude-plugins-official


# Add the marketplace
/plugin marketplace add alirezarezvani/claude-skills

# Install by domain
/plugin install engineering-skills@claude-code-skills          # 24 core engineering
/plugin install engineering-advanced-skills@claude-code-skills  # 25 POWERFUL-tier
/plugin install product-skills@claude-code-skills               # 12 product skills
/plugin install marketing-skills@claude-code-skills             # 43 marketing skills
/plugin install ra-qm-skills@claude-code-skills                 # 12 regulatory/quality
/plugin install pm-skills@claude-code-skills                    # 6 project management
/plugin install c-level-skills@claude-code-skills               # 28 C-level advisory (full C-suite)
/plugin install business-growth-skills@claude-code-skills       # 4 business & growth
/plugin install finance-skills@claude-code-skills               # 2 finance (analyst + SaaS metrics)

# Or install individual skills
/plugin install skill-security-auditor@claude-code-skills       # Security scanner
/plugin install playwright-pro@claude-code-skills                  # Playwright testing toolkit
/plugin install self-improving-agent@claude-code-skills         # Auto-memory curation
/plugin install content-creator@claude-code-skills              # Single skill
```

---

## Global user memory (~/.claude/CLAUDE.md) – optional but helpful for your own preferences, e.g.:

```bash
# Claude Code Global Preferences – Gautam (Engineering Lead)

## Communication Style
- Keep explanations brief and to the point.
- Put the primary answer or code block at the very beginning of responses.
- Skip pleasantries, greetings, and filler text – go straight to value.
- Use tables and bullet points for easy scanning.
- When explaining complex decisions, provide 2–3 categorized options with a clear recommendation.

## Proactive Advisory
- Act as a proactive expert advisor, not a passive assistant.
- If you see a better approach (architecture, code pattern, UX, or tool), propose best‑in‑class alternatives with a brief justification and trade‑offs.
- Briefly explain the “why” behind your logic using first principles (1‑3 sentences).

## Clarification & Learning
- Before giving a detailed answer on ambiguous topics, ask clarifying questions.
- When introducing new concepts, use analogies from software or systems engineering.

## Code & Technical Output
- Assume I am an engineering lead working on production systems – prioritise correctness, testability, and maintainability.
- Provide runnable code snippets or concrete commands whenever possible.
- Prefer modern, best‑practice patterns for the detected stack (e.g., async/await over callbacks, type safety).

## What NOT to include here
- Any project‑specific names, paths, or tech stack details – those go in `./CLAUDE.md` (project memory) or `.claude/rules/`.
```

You can edit this with /memory → option 1.
/memory
  Memory
    Auto-memory: on
  ❯ 1. User memory              Saved in ~/.claude/CLAUDE.md
    2. Project memory           Checked in at ./CLAUDE.md
    3. Open auto-memory folder

---

## ⚡ Phase 0: Clean Slate & Auto‑Memory
**Goal:** Ensure Claude remembers everything across sessions.

Cleanup Steps (Before Phase 0 - If required to start fresh)

```bash
# 1. Backup (optional but safe)
mkdir -p ~/claude_backup
cp CLAUDE.md ~/claude_backup/ 2>/dev/null
cp -r .claude ~/claude_backup/ 2>/dev/null

# 2. Remove old configs from your project root
rm -f CLAUDE.md
rm -rf .claude

# 3. Clear Claude Code’s memory for this project
# (Run inside Claude Code)
/memory
# → Type "clear all" or manually delete project‑specific memory entries
```


```bash
# 1. Verify active skills
/plugin list

# 2. Enable auto‑memory (critical for continuity)
/memory
# → Toggle "Auto-memory" ON

# 3. Deep init (interactive interview)
export CLAUDE_CODE_NEW_INIT=1 && claude /init
# Answer questions about your project domain, tech stack, and goals
```

---

## 🔍 Phase 1: Product Discovery & Clarification
**Goal:** Understand the product vision, features, user flows, and ask smart questions before building.

### 1.1 Product Vision & Feature Extraction
```text
Using product-skills, pm-skills, and c-level-skills, act as a Product Discovery Team.

1. Scan my codebase (or if empty, ask me 10 targeted questions) to understand:
   - The core problem we are solving
   - Target users and their main jobs‑to‑be‑done
   - Key features (MVP vs. vNext)
   - Success metrics (KPIs)

2. Generate a "Product Requirements Draft" in ./docs/PRD.md containing:
   - Problem statement
   - User personas (2-3)
   - Functional & non‑functional requirements
   - User journey map (as a flowchart)

3. If any information is missing, ASK ME clarifying questions before proceeding.
```

### 1.2 Best‑in‑Class Modern UX Recommendation
```text
Using product-skills and marketing-skills, recommend a modern, minimalist, reactive, mobile‑first UX.

Create ./docs/UX_RECOMMENDATION.md with:
- Suggested design system (e.g., shadcn/ui, Material 3, or Tailwind + Radix)
- Key UI patterns (dashboard, forms, navigation)
- Accessibility (WCAG 2.1 AA) checklist
- Mobile‑first breakpoints and interaction models

If my product is B2B SaaS, also include enterprise UX patterns (density, keyboard shortcuts).
```

### 1.3 Product Flow Validation
```text
Using product-skills and c-level-skills, map the end‑to‑end product flow in Mermaid.js.

Create ./docs/PRODUCT_FLOW.md containing:
- User onboarding → core action → retention loop
- Friction points and proposed mitigations
- A/B test ideas for conversion optimisation

Ask me to confirm the flow before we move to architecture.
```

---

## 🏛️ Phase 2: Architectural Blueprint & Tech Stack
**Goal:** Compare options, decide on architecture, and document ADRs.

```text
Using engineering-advanced-skills, c-level-skills, and finance-skills, propose the best architecture.

1. Compare (in a table):
   - Modular Monolith
   - Microservices
   - Serverless / Edge

2. For my specific scale (current users and projected growth), recommend ONE path.
   Include trade‑offs for cost (finance-skills), developer velocity, and operational complexity.

3. Generate two official documents:
   - ./docs/ARCHITECTURE_DECISION_RECORD.md (ADR) – chosen stack, patterns, folder structure
   - ./docs/TECH_STACK.md – languages, frameworks, databases, caching, queues, observability

4. Also create a "Risks & Mitigations" section for the chosen architecture.
```

---

## ⚙️ Phase 3: Claude’s DNA – Rules & Memory
**Goal:** Hard‑code the strategy so Claude never forgets.

```text
Using engineering-skills and pm-skills, rewrite my CLAUDE.md and create .claude/rules/.

1. In CLAUDE.md:
   - Define build, test, and lint commands
   - Enforce the chosen architecture (e.g., "never mix business logic in controllers")
   - Set code style (ESLint, Prettier, naming conventions)

2. In .claude/rules/:
   - ui-rules.md – component structure, styling, accessibility
   - api-rules.md – endpoint naming, error handling, OpenAPI spec
   - test-rules.md – coverage thresholds, test patterns (unit/integration/e2e)

3. Update /memory to prioritise these rules in every session.
```

### 🧹 Context Cleanup (after Phase 3)
```bash
/compact
# Clears brainstorming chatter – saves tokens for coding
```

---

## 💻 Phase 4: Code Generation & Refactoring
**Goal:** Produce high‑quality, tested code that follows all the rules.

### 4.1 Pick the next module (Claude suggests, you confirm)
```text
Following CLAUDE.md and PRODUCT_STRATEGY.md, identify the most critical module (e.g., /src/auth, /src/api/users, /src/components/dashboard).

Create a migration plan for that module:
- Current files (if any) → new structure
- Dependencies to update
- Tests to write

Ask me for confirmation before you start writing code.
```

### 4.2 – Implement that module (skip tests if you prefer)
```text
Following CLAUDE.md and PRODUCT_STRATEGY.md, refactor/implement the next module: [module name].

For this module only:
- Do NOT write tests (skip ra-qm-skills for now).
- Focus on clean, working code that matches the architecture rules in CLAUDE.md.
- Update any relevant documentation in ./docs/ (e.g., API changes, new functions).

After implementation, summarise what changed and suggest which module should be next.
```

```text
Proceed with the module you just suggested as next. Follow the same rules as before:

- Do NOT write tests (skip ra-qm-skills for now)
- Focus on clean, working code that matches CLAUDE.md architecture rules
- Update relevant documentation in ./docs/
- After implementation, summarise what changed and suggest the next module
- Also use superpower skills wherever required
```

### 4.3 Implement with Quality & Tests
```text
Using engineering-skills and ra-qm-skills (regulatory/quality management), rewrite the selected module:

1. Implement all features defined in PRD.md for this module.
2. Write unit tests (≥90% coverage), integration tests, and a smoke E2E test.
3. Run linting and formatting as defined in CLAUDE.md.
4. Generate ./docs/API_REFERENCE.md (if backend) or ./docs/COMPONENT_STORYBOOK.md (if frontend).

After finishing, run /stats to check token usage and report a summary of changes.
```

### 4.4 Iterative Expansion
For each subsequent module, repeat Phase 4.2. Use:
```text
Focus only on the ./src/next-module directory. Follow the same quality rules. Update any cross‑cutting concerns (e.g., shared types, config).
```

---

## 🧪 Phase 5: Testing & QA Automation
**Goal:** Full test suite + quality gate.

```text
Using ra-qm-skills and pm-skills, implement a complete quality pipeline:

1. Create ./scripts/test-all.sh (unit + integration + e2e)
2. Add a pre‑commit hook (using husky) to run lint & unit tests
3. Generate a "Test Coverage Report" in ./docs/TEST_COVERAGE.md (with per‑module breakdown)
4. Write a simple QA checklist (smoke, regression, edge cases) in ./docs/QA_CHECKLIST.md

If coverage is below 85%, write additional tests to reach it.
```

---

## 📚 Phase 6: Documentation & Handoff
**Goal:** Make the project self‑explanatory.

```text
Using pm-skills and business-growth-skills, generate final documentation:

1. ./README.md – project overview, setup, run, test, deploy
2. ./docs/DEPLOYMENT.md – environment variables, CI/CD pipeline, rollback strategy
3. ./docs/ONBOARDING.md – how to contribute, architecture tour, local debugging
4. CHANGELOG.md – based on git history (first release)

Also produce a "Project Health Dashboard" in ./docs/HEALTH.md:
- Tech debt log (TODO comments, known issues)
- Performance baseline (API response times, bundle size)
- Security checklist (OWASP top 10)
```

---

## 🔁 Phase 7: Maintenance & Continuous Improvement
**Goal:** Keep Claude aligned as the project grows.

| Action | Command / Prompt |
|--------|------------------|
| Check token usage | `/stats` |
| Refresh Claude’s memory of files | `/search "src/"` |
| Introduce a new feature | *Restart from Phase 1 (Product Discovery) but reuse existing rules* |
| Debug a production issue | `Using engineering-skills, analyse logs in ./logs/ and suggest a fix.` |
| Run a CTO/UX debate on a change | `Simulate a debate between CTO and UX Lead about [feature name] – produce an ADR.` |

---

## 💡 Pro Tips from the Two Guides Merged

| Strategy | How to apply |
|----------|---------------|
| **Avoid hallucinations** | Run `/compact` after every brainstorming phase (e.g., after Phase 2). |
| **Multi‑persona debate** | Use `"Simulate a debate between CTO, Product Lead, and UX Designer"` before any major decision. |
| **Path scoping** | Append `Only focus on ./src/auth` to keep context limits safe. |
| **Session continuity** | `claude --continue` resumes exactly where you stopped. |
| **Memory updates** | After any rule change, run `/memory` and type `Update: [rule change]` to persist it. |

---

## ✅ Your Execution Checklist

- [ ] Phase 0: `/plugin list`, `/memory` ON, `/init` done
- [ ] Phase 1.1: PRD.md created (ask questions if needed)
- [ ] Phase 1.2: UX_RECOMMENDATION.md
- [ ] Phase 1.3: PRODUCT_FLOW.md (confirmed)
- [ ] Phase 2: ADR.md + TECH_STACK.md
- [ ] Phase 3: CLAUDE.md + .claude/rules/ + `/compact`
- [ ] Phase 4: First module rewritten + tests + docs
- [ ] Phase 5: Test scripts + coverage report
- [ ] Phase 6: All final docs generated
- [ ] Phase 7: `/memory` updated with final decisions

**Now paste Phase 1.1 prompt into Claude Code and start building!** 🎯
```

---

### How to use this cheatsheet

1. Save the content above as `CLAUDE_ULTIMATE_SDLC.md` in your project root.
2. Open Claude Code and run **Phase 0** commands manually.
3. Then **copy/paste each prompt** from Phase 1 onward – Claude will follow the steps, ask clarifying questions, and generate the required documents and code.
4. After each major phase, run `/compact` to keep context clean.
5. If you ever need to re‑run a phase, just paste that prompt again – the rules and memory will keep everything consistent.

This cheatsheet leverages **all your installed skills** (engineering, advanced, product, marketing, ra-qm, pm, c-level, business-growth, finance) in the right order – from product discovery all the way to maintenance.