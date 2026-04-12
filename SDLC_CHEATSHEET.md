Here's your **complete, shareable Ultimate SDLC Cheatsheet** that works for **any project** – web frontend/backend, data engineering, analytics, Android (Kotlin), DevOps (AWS/GCP), and more. It integrates both the AlirezaRezvani domain skills and the Superpowers methodology. Save this as `SDLC_CHEATSHEET.md` and share with your team.

```markdown
# 🚀 Ultimate SDLC Cheatsheet (Superpowers + Domain Skills Edition)
*One methodology to rule all projects – from idea to production.*

## What This Cheatsheet Does
- **Forces** a disciplined, test‑first, review‑driven workflow (Superpowers)
- **Provides** expert domain knowledge (Product, Engineering, Finance, etc.)
- **Works for:** Web (frontend/backend), Data Engineering, Analytics, Android (Kotlin), DevOps (AWS/GCP), and more
- **No matter the stack** – prompts are stack‑agnostic

---

## 📦 Prerequisites: Install Both Plugin Suites

```bash
# 1. Add the AlirezaRezvani marketplace (domain skills)
/plugin marketplace add alirezarezvani/claude-skills

# 2. Install domain skills (choose what you need)
/plugin install engineering-skills@claude-code-skills          # 24 core engineering
/plugin install engineering-advanced-skills@claude-code-skills  # 25 advanced
/plugin install product-skills@claude-code-skills               # 12 product
/plugin install marketing-skills@claude-code-skills             # 43 marketing
/plugin install ra-qm-skills@claude-code-skills                 # 12 quality/regulatory
/plugin install pm-skills@claude-code-skills                    # 6 project management
/plugin install c-level-skills@claude-code-skills               # 28 C‑suite advisory
/plugin install business-growth-skills@claude-code-skills       # 4 business
/plugin install finance-skills@claude-code-skills               # 2 finance

# 3. Install Superpowers (process methodology)
/plugin install superpowers@claude-plugins-official

# 4. Verify both are active
/plugin list
# Should show: superpowers, product-skills, engineering-skills, etc.
```

---

## 🧠 Global User Memory (~/.claude/CLAUDE.md)
*Set once, applies to every project.*

```markdown
# Claude Code Global Preferences – Engineering Lead

## Communication Style
- Keep explanations brief, put the answer/code first.
- Skip pleasantries – go straight to value.
- Use tables and bullet points for scanning.
- For complex decisions, provide 2–3 options with a clear recommendation.

## Proactive Advisory
- Act as a proactive expert advisor – propose better alternatives with trade‑offs.
- Explain “why” using first principles (1‑3 sentences).

## Clarification & Learning
- Ask clarifying questions before detailed answers.
- Use analogies from software/systems engineering.

## Code & Technical Output
- Prioritise correctness, testability, maintainability.
- Provide runnable code or concrete commands.
- Prefer modern, best‑practice patterns for the detected stack.

## Superpowers Methodology – Mandatory for ALL projects
- Before ANY code, invoke `brainstorming` skill.
- Use `writing-plans` to break work into 2‑5 minute tasks with exact steps.
- Enforce test‑driven‑development: RED → GREEN → REFACTOR (tests first).
- Use `subagent-driven-development` for implementation (fresh subagent per task).
- Run `requesting-code-review` between every module.
- Use `using-git-worktrees` for each feature branch.
- Finish with `finishing-a-development-branch`.

## What NOT to include here
- Project‑specific names, paths, or tech stack details – those go in `./CLAUDE.md`.
```

**To edit:** `/memory` → option 1 → paste the above.

---

## ⚡ Phase 0: Project Setup (One‑Time per Project)

```bash
# 1. Remove old configs (if starting fresh)
rm -f CLAUDE.md && rm -rf .claude

# 2. Enable auto‑memory
/memory
# → Toggle "Auto-memory" ON

# 3. Deep init – answers create initial CLAUDE.md
export CLAUDE_CODE_NEW_INIT=1 && claude /init
# Answer questions about your tech stack, build commands, etc.

# 4. Verify Superpowers is active
# Ask Claude: "List the Superpowers skills available"
```

---

## 🔍 Phase 1: Product Discovery (For ANY project type)

### 1.0 Brainstorming – Before ANY Requirements
```text
Invoke the `brainstorming` skill.

I need to understand the core problem, users, and success metrics for this project.
Use Socratic questioning to explore:
- What problem are we solving? Who has it?
- What does success look like? (KPIs)
- What are the key user journeys?
- What constraints exist (budget, time, compliance, team skills)?

After brainstorming, save the design document to ./docs/BRAINSTORM_DESIGN.md
```

### 1.1 Product Requirements (Stack‑Agnostic)
```text
Using product-skills, pm-skills, and c-level-skills, based on ./docs/BRAINSTORM_DESIGN.md:

1. Scan the codebase (or ask me questions) to validate:
   - Core problem & target users
   - MVP features vs. vNext
   - Success KPIs

2. Generate ./docs/PRD.md containing:
   - Problem statement
   - User personas (2‑3)
   - Functional & non‑functional requirements
   - User journey map (Mermaid flowchart)

3. Ask me for missing info before proceeding.
```

### 1.2 UX Recommendation (For any interface – web, mobile, dashboard)
```text
Using product-skills and marketing-skills, recommend a modern, minimalist, reactive UX.

Create ./docs/UX_RECOMMENDATION.md with:
- Design system suggestion (e.g., Material 3, shadcn/ui, or native Android Material)
- Key UI patterns (navigation, forms, data tables)
- Accessibility (WCAG 2.1 AA) checklist
- Mobile‑first or responsive breakpoints

If this is a backend/API project, skip to API design patterns instead.
```

### 1.3 Product Flow Validation
```text
Using product-skills and c-level-skills, map end‑to‑end flow in Mermaid.

Create ./docs/PRODUCT_FLOW.md:
- Onboarding → core action → retention loop
- Friction points & mitigations
- A/B test ideas (if applicable)

Ask me to confirm the flow before architecture.
```

---

## 🏛️ Phase 2: Architecture & Tech Stack (For ANY domain)

```text
Invoke `brainstorming` skill again, focused on architecture.

Brainstorm trade-offs for my specific scale and domain:
- For web: Monolith vs. Microservices vs. Serverless
- For data: Batch vs. Stream, Lambda architecture, Data Lake vs. Warehouse
- For mobile: MVC vs. MVVM vs. MVI (Android), offline-first?
- For DevOps: IaC (Terraform/CDK), GitOps (ArgoCD), CI/CD patterns, observability

After brainstorming, using engineering-advanced-skills, c-level-skills, and finance-skills:

1. Compare 2‑3 architectural options in a table (cost, velocity, complexity).
2. Recommend ONE path with justification.
3. Generate:
   - ./docs/ARCHITECTURE_DECISION_RECORD.md (ADR) – chosen patterns, folder structure
   - ./docs/TECH_STACK.md – languages, frameworks, databases, caching, queues
4. Add a "Risks & Mitigations" section.
```

---

## ⚙️ Phase 3: Claude's DNA – Project Rules

```text
Using engineering-skills, pm-skills, and the `writing-skills` capability:

1. Rewrite CLAUDE.md to include:
   - Build, test, lint commands (detected from your stack)
   - Enforced architecture (e.g., "no business logic in views")
   - Code style (Kotlin conventions, Python PEP8, etc.)
   - **Superpowers mandates** (brainstorm → plan → worktree → TDD → review)

2. Create .claude/rules/ with:
   - stack-rules.md – framework‑specific patterns
   - test-rules.md – coverage thresholds, TDD steps
   - review-rules.md – code review checklist

3. Update /memory to prioritise these rules.
```

### 🧹 Context Cleanup
```bash
/compact
```

---

## 💻 Phase 4: Implementation (Superpowers‑Driven)

### 4.0 Write the Implementation Plan
```text
Invoke the `writing-plans` skill.

For the first module (or feature), create an implementation plan where:
- Each task takes 2‑5 minutes
- Every task includes: exact file paths, complete code or pseudocode, verification steps
- Tasks are ordered for minimal dependencies
- Include a test‑driven‑development task before each code task (write test first)

Save to ./docs/IMPLEMENTATION_PLAN.md and SHOW ME for approval.
```

### 4.1 Execute with Subagent‑Driven Development
```text
Invoke `subagent-driven-development` with the approved plan.

For each task in ./docs/IMPLEMENTATION_PLAN.md:
- Spawn a fresh subagent
- First review: Does it follow the plan exactly?
- Second review: Code quality and spec compliance
- TDD enforced: test fails → minimal code → test passes → refactor

After each task, invoke `requesting-code-review` before the next.
```

### 4.2 (If you must skip tests – use batch execution)
```text
⚠️ Only for prototypes. Violates TDD.

Invoke `executing-plans` instead (batch execution with human checkpoints).
Execute 2‑3 tasks, pause for my review, continue.
Skip test‑first tasks.
```

### 4.3 Branch Completion
```text
When all tasks are complete, invoke `finishing-a-development-branch`.

Verify all tests pass (if any were written), then present options:
merge / create PR / keep branch / discard changes.
```

---

## 🧪 Phase 5: Testing & QA (Reinforced by TDD)

```text
Using ra-qm-skills, pm-skills, and the `test-driven-development` patterns:

1. Verify test coverage (TDD ensures high coverage).
2. Create ./scripts/test-all.sh (unit + integration + e2e for your stack).
3. Add pre‑commit hook (lint + unit tests).
4. Generate ./docs/TEST_COVERAGE.md (per‑module breakdown).
5. Write ./docs/QA_CHECKLIST.md (smoke, regression, edge cases).

If coverage below 85%, invoke `systematic-debugging` to find why TDD was skipped.
```

---

## 📚 Phase 6: Documentation & Handoff

```text
Using pm-skills and business-growth-skills, generate:

1. README.md – project overview, setup, run, test, deploy
2. ./docs/DEPLOYMENT.md – env vars, CI/CD, rollback (AWS/GCP/on‑prem)
3. ./docs/ONBOARDING.md – how to contribute, architecture tour, local debugging
4. CHANGELOG.md – based on git history

Also produce ./docs/HEALTH.md:
- Tech debt log (TODO comments, known issues)
- Performance baseline (API response times, bundle size, query latencies)
- Security checklist (OWASP top 10, dependency scanning)
```

---

## 🔁 Phase 7: Maintenance & Debugging

| Action | Command / Prompt |
|--------|------------------|
| Debug production issue | `Invoke `systematic-debugging` skill, then `verification-before-completion`` |
| Add a new feature | Restart from Phase 1.0 (brainstorming) – Superpowers forces full workflow |
| Performance bottleneck | `Invoke `systematic-debugging` with root‑cause tracing` |
| Security audit | `Invoke `skill-security-auditor` (from AlirezaRezvani) + Superpowers review` |
| Refactor a module | Run Phase 4.0 (plan) → 4.1 (subagent) – do not skip TDD |

---

## 💡 Pro Tips for Any Stack

| Scenario | How to adapt |
|----------|--------------|
| **Data Engineering** (Spark, Airflow, dbt) | In Phase 2, compare batch vs. streaming, data quality tests. TDD = test pipelines with sample data. |
| **Android (Kotlin)** | Phase 1.2: Material 3, Jetpack Compose. Phase 4: Use `using-git-worktrees` for feature branches, TDD with JUnit + Espresso. |
| **DevOps (Terraform, CDK, K8s)** | Phase 2: Choose IaC tool, GitOps pattern. TDD = terratest or cdk-nag. Phase 4: Subagents can test infra changes in isolated accounts. |
| **Analytics (Looker, Tableau, Superset)** | Phase 1: Define metrics and dashboards as “features”. Phase 2: Semantic layer, data modelling approach. |
| **Backend API** | Phase 4: TDD with contract tests (Pact) + integration tests. Superpowers review enforces OpenAPI spec. |

---

## ✅ Execution Checklist (Copy for Each Project)

- [ ] **Phase 0**: Installed both plugin suites, `/init` done
- [ ] **Phase 1.0**: Brainstorming → `BRAINSTORM_DESIGN.md`
- [ ] **Phase 1.1**: `PRD.md` created
- [ ] **Phase 1.2**: `UX_RECOMMENDATION.md` (or API design doc)
- [ ] **Phase 1.3**: `PRODUCT_FLOW.md` confirmed
- [ ] **Phase 2**: Architecture brainstorming → `ADR.md` + `TECH_STACK.md`
- [ ] **Phase 3**: `CLAUDE.md` + `.claude/rules/` (includes Superpowers mandates)
- [ ] **Phase 4.0**: `IMPLEMENTATION_PLAN.md` approved
- [ ] **Phase 4.1**: Subagent‑driven development with TDD (first module)
- [ ] **Phase 4.3**: Branch finished and merged
- [ ] **Phase 5**: Test coverage report + QA checklist
- [ ] **Phase 6**: All docs generated
- [ ] **Phase 7**: Memory updated with project decisions

**Now paste Phase 1.0 prompt into Claude Code and let Superpowers guide your build!** 🚀
```

---

## 📥 How to Share

1. Save the content above as `SDLC_CHEATSHEET.md`
2. Share the file with any developer – they just need Claude Code installed.
3. They follow the checklist from Phase 0 – the cheatsheet works for **any** project type because the prompts are stack‑agnostic and rely on Superpowers + domain skills.

This is your **single source of truth** for disciplined, high‑quality SDLC across the entire engineering organisation.

---
```

## 📎 Appendix: AIM Framework Edition (Optional)

The main cheatsheet uses **implicit AIM** – the actor (Claude + installed skills), input (codebase context), and mission (the instruction) are understood. If you prefer **explicit AIM** formatting for educational purposes or for non-Claude LLMs, use the prompts below.

### What is AIM?

| Element | Purpose | Example |
|---------|---------|---------|
| **A**ctor | Defines the role or persona Claude should adopt | `You are a Senior Product Manager` |
| **I**nput | Specifies the exact context or data to use | `Input: The codebase in ./src` |
| **M**ission | States the goal and output format | `Mission: Generate PRD.md` |

AIM improves clarity for complex, multi‑step tasks – especially when switching between different personas in the same conversation.

### AIM‑Converted Key Prompts

#### Phase 1.1 – Product Vision (AIM version)
```text
**Actor:** You are a Product Discovery Team, equipped with product-skills, pm-skills, and c-level-skills.

**Input:** 
- My codebase (scan all files)
- If the codebase is empty, answer these 10 targeted questions:
  1. What problem is being solved?
  2. Who are the target users?
  3. What are their main jobs‑to‑be‑done?
  4. What are the MVP features?
  5. What features can wait (vNext)?
  6. How will we measure success (KPIs)?
  7. What are the main user journeys?
  8. What constraints exist (budget, time, compliance)?
  9. Who are the competitors or alternatives?
  10. What is the monetisation model (if any)?

**Mission:** 
Generate `./docs/PRD.md` containing:
- Problem statement
- 2‑3 user personas
- Functional & non‑functional requirements
- User journey map (as a Mermaid flowchart)

If any information is missing, ask me clarifying questions before writing the file.
```

#### Phase 2 – Architecture (AIM version)
```text
**Actor:** You are a Solution Architect (engineering-advanced-skills, c-level-skills, finance-skills).

**Input:** 
- The PRD.md from Phase 1.1
- The tech stack detected from CLAUDE.md or codebase
- My estimated current users and 12‑month growth projection (ask me if unknown)

**Mission:** 
Compare 2‑3 architectural options in a table (e.g., Modular Monolith vs. Microservices vs. Serverless). Include trade‑offs for cost, developer velocity, and operational complexity. Recommend ONE path with justification. Then generate:
- `./docs/ARCHITECTURE_DECISION_RECORD.md` (chosen patterns, folder structure)
- `./docs/TECH_STACK.md` (languages, frameworks, databases, caching, queues)
- A “Risks & Mitigations” section for the chosen architecture.
```

#### Phase 4.0 – Implementation Plan (AIM version)
```text
**Actor:** You are a Technical Project Manager using the `writing-plans` skill from Superpowers.

**Input:** 
- The approved ADR.md and TECH_STACK.md
- The module selected for implementation (e.g., `./src/auth`)

**Mission:** 
Create an implementation plan where:
- Each task takes 2‑5 minutes
- Every task includes: exact file paths, complete code or pseudocode, verification steps
- Tasks are ordered for minimal dependencies
- Include a `test-driven-development` task before each code task (write test first)

Save the plan to `./docs/IMPLEMENTATION_PLAN.md` and ask me for approval before any code is written.
```

#### Phase 4.1 – Subagent Execution (AIM version)
```text
**Actor:** You are an Orchestrator Agent using `subagent-driven-development` skill.

**Input:** 
- The approved `./docs/IMPLEMENTATION_PLAN.md`

**Mission:** 
For each task in the plan:
- Spawn a fresh subagent
- First review: Does the subagent follow the plan exactly?
- Second review: Code quality and spec compliance
- Enforce TDD: test fails → minimal code → test passes → refactor
- After each task, invoke `requesting-code-review` before proceeding to the next

Report progress after every task and stop if any review fails.
```

### When to Use AIM vs. The Main Cheatsheet

| Scenario | Use |
|----------|-----|
| **Daily SDLC with Claude Code** | Main cheatsheet (implicit AIM) – faster, less verbose |
| **Teaching prompt engineering** | AIM version – shows explicit structure |
| **Porting prompts to GPT, Gemini, or Copilot** | AIM version – those models lack Claude Code's implicit context |
| **Complex tasks with multiple persona switches** | AIM version – reduces role confusion |
| **Team documentation or training** | Include both – explain the difference |

To use these AIM prompts, simply copy and paste them into Claude Code (or any LLM) – they will work as direct replacements for the corresponding phases in the main cheatsheet.

---

<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
================================================================================================================================
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>


Here is the **completely generic SDLC cheatsheet** that works for **any role** – data engineer, core platform, backend API, web frontend, DevOps, Android, etc. It uses **placeholders** for role‑specific details and includes a **role selection guide** at the top. Each engineer customises it once per project, then follows the same copy‑paste workflow.

```markdown
# 🚀 Universal SDLC Cheatsheet – For Any Engineering Role
*One methodology to rule all projects: Data, Backend, Web, Android, DevOps, Core Platform*

## How to Use This Cheatsheet

1. **Find your role** in the table below.
2. **Fill in the placeholders** once per project (e.g., `[test-command]`, `[lint-command]`, `[architecture-pattern]`).
3. **Follow the same prompts** – they work for every role because they use generic terms.
4. **Let Superpowers + domain skills handle the rest.**

---

## 🧭 Role Selection & Placeholder Values

| Role | Typical Tech Stack | Test command | Lint command | Build command | Architecture pattern |
|------|--------------------|--------------|--------------|---------------|----------------------|
| **Android** | Kotlin, Jetpack Compose, Gradle | `./gradlew testDebugUnitTest` | `./gradlew lint` | `./gradlew assembleDebug` | MVVM + Clean |
| **Backend API** | Python (FastAPI), Go, Node.js | `pytest` or `go test` | `ruff` or `golangci-lint` | `python -m build` | Modular monolith / services |
| **Web Frontend** | React, Vue, Svelte, Next.js | `npm test` | `npm run lint` | `npm run build` | Component‑based + state store |
| **Data Engineering** | Python, SQL, dbt, Spark, Airflow | `pytest data_tests/` | `sqlfluff` | `dbt build` | Medallion (bronze/silver/gold) |
| **DevOps** | Terraform, AWS CDK, Kubernetes, GitHub Actions | `terratest` or `cdk-nag` | `tflint` | `terraform plan` | GitOps, IaC, control plane |
| **Core Platform** | Go, Rust, gRPC, service mesh | `go test -race` | `clippy` | `make build` | Clean Architecture, hexagonal |

### Custom Placeholders (Fill once in your `CLAUDE.md`)

```yaml
role: [android|backend|web|data|devops|core]
test_command: [e.g., ./gradlew testDebugUnitTest]
lint_command: [e.g., ./gradlew lint]
build_command: [e.g., ./gradlew assembleDebug]
architecture_pattern: [e.g., MVVM + Clean]
```

---

## 📦 One‑Time Setup (For Any Role)

```bash
# Install plugins (same for everyone)
/plugin install superpowers@claude-plugins-official
/plugin marketplace add alirezarezvani/claude-skills
/plugin install engineering-skills product-skills pm-skills ra-qm-skills c-level-skills

# Enable auto‑memory
/memory
# → Toggle "Auto-memory" ON

# Deep init – creates CLAUDE.md
export CLAUDE_CODE_NEW_INIT=1 && claude /init
# Answer: your language, build tool, test command, etc.

# Set role‑specific rules (copy‑paste this block, replace placeholders)
```

```text
Using engineering-skills and writing-skills, create project rules:

1. CLAUDE.md:
   - Build: `[build_command]`
   - Test: `[test_command]`
   - Lint: `[lint_command]`
   - Architecture: `[architecture_pattern]`
   - TDD mandatory: write test first, then code
   - Superpowers: brainstorm → plan → subagent → review → finish

2. .claude/rules/stack-rules.md:
   - Follow language idioms (Kotlin, Python, Go, etc.)
   - Use [your framework] best practices
   - Error handling, logging, observability
   - Testing: unit + integration + (if relevant) e2e

3. .claude/rules/refactor-rules.md:
   - No behaviour change – tests must stay green
   - Each refactor step ≤ 5 files
   - Run full test suite after each step

Ask me for any missing details (e.g., exact test framework).
```

After the above, run `/compact`. You are ready for any task.

---

## 🚀 Feature Workflow (PRD + Design, possibly incomplete)

*Use when you have a product requirement (PRD) and a design (Figma, wireframe, or API spec).*

### Step A – Fill missing user stories & AC

*Replace `[feature-name]` and describe design.*

```text
**Actor:** Product Analyst (product-skills, pm-skills)

**Input:** 
- PRD: `./docs/PRD.md` (or paste content)
- Design: [Figma link / OpenAPI spec / wireframe description]

**Mission:** Ask me up to 5 questions:
1. Primary user? Main goal? Happy path?
2. Error conditions / edge cases?
3. Non‑functional requirements (latency, scalability, offline, security)?
4. Any analytics or logging needed?
5. Dependencies on other features?

After answers, generate:
- `./docs/features/[feature-name]/USER_STORIES.md`
- `./docs/features/[feature-name]/ACCEPTANCE_CRITERIA.md`

Do NOT write code.
```

### Step B – Create implementation plan

```text
Invoke `writing-plans` skill.

**Input:**
- `./docs/features/[feature-name]/USER_STORIES.md`
- `./docs/features/[feature-name]/ACCEPTANCE_CRITERIA.md`
- Design (from Step A)
- Stack rules (CLAUDE.md, stack-rules.md)

**Mission:** Create a plan with tasks of 2‑5 minutes each. Each task includes:
- Exact file path (role‑appropriate)
- Code or pseudocode
- Verification steps (unit test, integration test)
- TDD: each code task preceded by a test task

Save to `./docs/features/[feature-name]/IMPLEMENTATION_PLAN.md` and ask for approval.
```

### Step C – Execute with subagent TDD

```text
Invoke `subagent-driven-development` with `./docs/features/[feature-name]/IMPLEMENTATION_PLAN.md`.

For each task:
- Spawn fresh subagent (same language/stack as project)
- Review 1: follows plan exactly
- Review 2: code quality, test coverage
- Enforce TDD: write failing test → fail → implement → pass → refactor

After each task, run `requesting-code-review`. After all tasks, run `[test_command]`.
```

### Step D – Finish & document

```text
Generate for this feature:
- `./docs/features/[feature-name]/README.md` – how to enable/test
- `./docs/features/[feature-name]/TEST_COVERAGE.md` (module coverage)

Append to `CHANGELOG.md` with `[Feature] [feature-name]`.

Then invoke `finishing-a-development-branch` to merge or PR.
```

---

## 🐞 Bug Workflow (RCA + Fix)

*For any bug – crash, wrong output, performance, data quality.*

### Step 0 – Gather context

```text
**Actor:** QA Engineer using `systematic-debugging`.

**Input:** Bug description: [paste issue]

**Mission:** Ask me up to 5 questions:
- Steps to reproduce (exact)
- Expected vs actual behaviour
- Environment (OS, version, data volume)
- Logs / stack trace / error messages
- Frequency (always / sometimes)

Save structured bug report to `./docs/bugs/BUG-[ID]_SUMMARY.md`.
```

### Step 1 – Root cause analysis

```text
**Actor:** Senior Engineer using `systematic-debugging`.

**Input:** `./docs/bugs/BUG-[ID]_SUMMARY.md`

**Mission:** 4‑phase RCA:
1. Trace root cause – which layer (UI, API, data, infrastructure)?
2. Defense‑in‑depth – add logging, error handling, assertions.
3. Condition‑based waiting – if race, propose synchronisation patterns.
4. Verify before fixing – propose a test that reproduces the bug.

Save RCA to `./docs/bugs/BUG-[ID]_RCA.md`. Do NOT write fix yet.
```

### Step 2 – Fix plan (TDD)

```text
Invoke `writing-plans`.

**Input:** RCA, stack rules.

**Mission:** Create fix plan. Each task 2‑5 min, includes:
- File path + code diff
- Verification steps
- TDD: write failing test BEFORE fix

Save to `./docs/bugs/BUG-[ID]_FIX_PLAN.md` and ask approval.
```

### Step 3 – Execute fix

```text
Invoke `subagent-driven-development` with `./docs/bugs/BUG-[ID]_FIX_PLAN.md`.

Same as Feature Step C – subagent, TDD, review.
After all tasks, run `[test_command]`.
```

### Step 4 – Verify & finish

```text
Invoke `verification-before-completion`.

- Manually reproduce bug – must be gone.
- Run automated test that previously failed – now passes.
- Check regressions (full test suite).

Then `finishing-a-development-branch` → merge or PR.

Update `./docs/HEALTH.md` with bug ID, RCA, fix date.
Append `CHANGELOG.md` under “Fixed”.
```

---

## 🔧 Refactor Workflow (No behaviour change)

### Step A – Plan refactor

```text
**Actor:** Senior Engineer using `writing-plans`.

**Input:** 
- Module to refactor: `[path/to/module]`
- Goal: improve structure / readability / performance

**Mission:** Create a refactor plan where:
- Each task changes ≤ 5 files
- Each task includes exact file paths and before/after code
- After each task, run existing tests (must stay green)
- Do NOT write new tests (behaviour unchanged)

Save plan to `./docs/refactors/[refactor-name]_PLAN.md` and ask approval.
```

### Step B – Execute refactor (batch, safe)

```text
Invoke `executing-plans` with `./docs/refactors/[refactor-name]_PLAN.md`.

Execute tasks in batches of 2. After each batch:
- Run `[test_command]`
- If all green, continue. If any red, revert batch and stop.
```

### Step C – Commit & document

```text
After all batches pass:
- Commit with message `refactor: [refactor-name]`
- Update `./docs/HEALTH.md` – note tech debt reduced
- Append `CHANGELOG.md` under “Refactored”
- Invoke `finishing-a-development-branch` → merge or PR.
```

---

## ✨ Refinement Workflow (Enhance existing feature)

*Small improvements to existing code – new filter, extra field, better logging.*

### Step A – Clarify refinement

```text
**Actor:** Product Analyst (product-skills)

**Input:** Existing feature: [file paths / module name]
Refinement request: [describe change]

**Mission:** Ask me up to 3 questions:
1. User benefit?
2. Does it affect existing behaviour? (if yes, use Feature Workflow)
3. Any design reference?

Generate `./docs/refinements/[refinement-name]/REQUIREMENTS.md` (one paragraph, AC).
```

### Step B – Mini plan

```text
Invoke `writing-plans`.

**Input:** 
- `./docs/refinements/[refinement-name]/REQUIREMENTS.md`
- Existing code of the feature

**Mission:** Small plan (3‑6 tasks, each 2‑5 min). Include:
- File paths to modify
- Code changes (additions only)
- TDD: write test for new behaviour first

Save to `./docs/refinements/[refinement-name]/PLAN.md` and ask approval.
```

### Step C – Execute with subagent TDD

```text
Invoke `subagent-driven-development` with `./docs/refinements/[refinement-name]/PLAN.md`.

Same as Feature Step C. After all tasks, run full test suite.
```

### Step D – Finish & document

```text
Generate `./docs/refinements/[refinement-name]/README.md` – what changed.
Append `CHANGELOG.md` under “Changed”.
Invoke `finishing-a-development-branch`.
```

---

## 🔁 Decision Tree (For Any Role)

| I want to... | Use workflow |
|--------------|--------------|
| Build something new from a spec | Feature Workflow |
| Fix a bug | Bug Workflow |
| Improve code without changing behaviour | Refactor Workflow |
| Add a small tweak to existing feature | Refinement Workflow |
| Not sure? Start with Feature Workflow. | |

---

## 💡 Pro Tips (Universal)

- **Before any workflow**, run `/compact` if you have been chatting for a while.
- **Use `claude --continue`** to resume after a break.
- **Always commit after each successful workflow** – Superpowers assumes clean git state.
- **If tests fail during subagent execution**, let the subagent fix them (TDD cycle).
- **For large refactors**, break into multiple Refactor Workflow runs (one per module).

---

## ✅ One‑Page Checklist (For Any Task)

- [ ] Chose correct workflow (feature / bug / refactor / refinement)
- [ ] Filled placeholders in `CLAUDE.md` (once per project)
- [ ] Ran Step A (clarify / RCA / plan)
- [ ] Got approval on plan
- [ ] Executed with subagent (or batch for refactor)
- [ ] Ran `[test_command]` – all green
- [ ] Finished branch (merge or PR)
- [ ] Updated docs (CHANGELOG, HEALTH, feature README)
- [ ] Ran `/compact` after completion

**Now pick your role, fill the placeholders, paste the first prompt – and let Superpowers handle the rest.** 🚀
```

---

Save this as `UNIVERSAL_SDLC.md` and share it with **any engineer** – data, backend, web, Android, DevOps, core platform. They just need to fill the placeholders once per project and then follow the same copy‑paste prompts. No role‑specific forks needed.
khyaal@999