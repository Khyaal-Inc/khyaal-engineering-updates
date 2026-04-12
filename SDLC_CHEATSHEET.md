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
