# Product Requirements Document
## Khyaal Engineering Pulse — Strategic Command Center

**Version:** 1.0  
**Date:** 2026-04-09  
**Author:** Gautam (Engineering Lead, Technical Architect)  
**Status:** Draft — Pending Stakeholder Review  
**Scope:** Internal governance tool (with future productization path)

---

## 1. Problem Statement

### The Core Problem

High-growth engineering teams working on human-impact products (like Khyaal's active-aging platform for seniors 50+ in India) suffer from **strategic fragmentation**: developers write code disconnected from business outcomes, executives see weekly status emails instead of live progress, and product managers maintain three separate tools to track a single sprint.

The result is a **governance gap** — work gets done, but its connection to quarterly OKRs, strategic epics, and versioned releases lives only in people's heads. When someone leaves, context vanishes. When executives ask "what did we ship this quarter?", the answer requires a 2-hour retrospective.

### Why This Matters for Khyaal Specifically

Khyaal serves seniors 50+ across India — a demographic with high trust requirements, low margin for product failures, and complex multi-stakeholder care journeys (seniors + families + care providers). The engineering team must simultaneously:

- Modernize the platform (subscription, security, speed)
- Build AI capabilities (recommendation engine, sales agent)
- Maintain 99.9%+ uptime for a population that depends on the service daily

This level of strategic complexity — 3 tracks, 8 engineers, 3 OKRs, 19+ active work items per sprint — **cannot be governed with spreadsheets or Jira alone**.

### What Doesn't Exist Today (Market Gap)

Existing tools solve parts of the problem:

| Tool | What it solves | What it misses |
|------|---------------|----------------|
| Jira / Linear | Task tracking | No OKR traceability; no persona-switching; no ceremony enforcement |
| Notion / Confluence | Documentation | Not live; not actionable; no sprint/release linkage |
| Monday / Asana | Project management | No dev-vs-exec persona split; no lifecycle stages |
| GitHub Projects | Code-adjacent tracking | No OKR layer; no executive view; no ceremonies |

**The gap:** No tool enforces **vertical traceability** (Vision → OKRs → Epics → Sprints → Releases) while simultaneously adapting its interface for three distinct personas (PM, Developer, Executive) and **coaching the team through governance ceremonies** as part of the UX itself.

---

## 2. Product Vision

> **Khyaal Engineering Pulse is a zero-overhead, governance-first engineering command center that transforms fragmented engineering activity into a cohesive 5-stage lifecycle — coaching teams toward outcome-driven delivery through ceremonies, traceability, and persona-aware intelligence.**

**North Star Metric:** % of shipped items traceable to a closed OKR Key Result

**Secondary Metrics:**
- Sprint velocity trend (target: ≥90% sprint completion)
- Ceremony completion rate (target: 100% of sprints have Kickoff + Close ceremonies)
- Time from idea (Discover) to shipped release (Ship)

---

## 3. User Personas

### Persona 1 — "The Orchestrator" (Product Manager / Engineering Lead)

> *"I need to see everything — not to micromanage, but to remove blockers before they derail the sprint."*

**Profile:**
- Role: PM, Engineering Lead, or Technical Architect
- Usage: Daily, full access, all 19 views
- Context: Runs ceremonies, grooms backlog, manages releases
- Tech proficiency: High

**Jobs To Be Done:**
1. Translate quarterly OKRs into executable epics and sprint tasks
2. Run governance ceremonies (Sprint Kickoff/Close, OKR Launch/Close, Epic Kickoff, Release Ship) with a permanent audit trail
3. Monitor sprint health in real-time — blockers, capacity, at-risk items
4. Communicate progress to executives without preparing a separate report

**Pain Points (Current State):**
- Maintains 3+ tools simultaneously (Jira + Notion + spreadsheet)
- Sprint retrospectives require 2+ hours of data collection
- OKR progress is subjective; no direct link to task completion
- Developer capacity is guessed, not calculated

**Success Criteria:**
- Can run a Sprint Close ceremony in under 10 minutes
- OKR progress auto-calculated from linked task completion
- One tab replaces Jira + Notion + Google Sheets for governance

---

### Persona 2 — "The Builder" (Developer / Engineer)

> *"I don't need to see the whole picture. I need to know what I'm working on today, what's blocking me, and whether my work matters."*

**Profile:**
- Role: Full Stack, Frontend, Backend, ML, DevOps Engineer
- Usage: Daily during sprints, focused on Build stage
- Context: Updates task status, flags blockers, reviews acceptance criteria
- Tech proficiency: Very high (code) / Low interest in governance overhead

**Jobs To Be Done:**
1. Know exactly what to work on today (My Tasks, filtered to assigned items)
2. Update task status without navigating complex UI (Kanban drag-drop)
3. Understand the "why" behind a task (linked Epic → OKR → business impact)
4. Flag blockers immediately so PM can act

**Pain Points (Current State):**
- Too many tools to context-switch between (Slack + Jira + Notion)
- Strategic context (why am I building this?) is buried in PRDs or never communicated
- Marking tasks "done" in one system doesn't update sprint progress anywhere

**Success Criteria:**
- My Tasks view shows today's work in under 5 seconds from login
- Can move a task from Now → QA → Done in 3 clicks
- Blocker flagged and visible to PM within same session

---

### Persona 3 — "The Strategist" (Executive / CXO)

> *"I don't have time for task lists. I need to know: are we on track for the quarter? What's at risk? What shipped?"*

**Profile:**
- Role: CEO, CTO, CPO, or senior leadership
- Usage: Weekly or on-demand, focused on Ship stage KPIs
- Context: Reviews OKR health, approves direction, monitors release outcomes
- Tech proficiency: Medium — comfortable with dashboards, not with backlogs

**Jobs To Be Done:**
1. See quarterly OKR health at a glance (% progress, at-risk signals, velocity trend)
2. Understand what shipped in the last sprint and its business impact
3. Make go/no-go decisions on epics based on current progress
4. Trust that the numbers are live, not manually compiled

**Pain Points (Current State):**
- Weekly status reports are stale by the time they're read
- Can't distinguish "in progress" from "blocked" in a Jira board
- No direct link between engineering work and business outcome metrics

**Success Criteria:**
- Dashboard loads OKR health + sprint status in under 3 seconds
- Can identify the top blocker and its owner without PM explanation
- Release history is self-explanatory — no verbal walk-through needed

---

## 4. Functional Requirements

### 4.1 MVP (Shipped — Q1 2026)

#### F1 — Five-Stage Lifecycle Navigation (Unified Strategic Ribbon)
- App bar hosts 5 tabs: 🔍 Discover → 🌟 Vision → 📐 Plan → ⚡ Build → 🏁 Ship
- Active stage highlights; sub-views appear per stage
- Keyboard shortcuts: `Alt+1/2/3` for persona switch; `1-0` for view switch

#### F2 — 19 Integrated Views
- **Discover:** Workflow (playbook), Ideation (`#idea`), Spikes (`#spike`)
- **Vision:** OKRs (with auto-calculated KR progress), Epics
- **Plan:** Roadmap (1M/3M/6M/1Y horizons), Backlog, Sprint, Gantt, Capacity
- **Build:** Kanban (8-column drag-drop), My Tasks, Track, Links (dependency graph), Status, Priority, Contributor
- **Ship:** Releases, Analytics (velocity/burndown), Pulse Dashboard

#### F3 — Persona-Driven Interface
- PM mode: Full access, blue theme, default view = OKRs
- Dev mode: Execution-first, green theme, default view = My Tasks; strategic fields read-only (🔒)
- Exec mode: Summary-only, purple theme, default view = Dashboard; filtered to high-priority items
- Mode switch persists in `localStorage`; Dev mode prompts user selection on first switch

#### F4 — Ceremony Engine with Audit Trail
- 8 ceremonies: Sprint Kickoff/Close, OKR Launch/Close, Epic Kickoff/Close, Release Lock/Ship
- Each ceremony generates a permanent `ceremonyAudit` record (max 3 per entity, auto-pruned)
- Ceremonies surface contextual checklists and gateway checks in UI
- Sprint Close: auto-processes rollover items, updates velocity history
- Sprint history is never deleted — only closed (`status: 'closed'`)

#### F5 — CMS Edit Modal (4-Pillar System)
- **What:** Goal & Intent — text, usecase, epicId, persona, tags
- **When:** Timeline & Cycle — planningHorizon, sprintId, startDate, due, releasedIn
- **Where:** Action & Routing — status, contributors, blockerNote, dependencies, note
- **How:** Sync & Effort — storyPoints, priority, acceptanceCriteria, impactLevel, effortLevel, successMetric, strategicWeight, riskType
- Dev mode reorders pillars: WHERE → HOW → WHAT → WHEN (execution-first)
- CMS saves commit directly to `data.json` on GitHub via Lambda proxy

#### F6 — Zero-Deployment Architecture
- Pure client-side SPA: Vanilla JS ES6+, no framework, no build step
- Data persistence: `data.json` on GitHub, fetched + committed via AWS Lambda gatekeeper
- Auth: Password → SHA-256 → Lambda validates; session cached in `localStorage`
- Hosting: GitHub Pages (static)

#### F7 — Data Model with Full Traceability
- Items carry 25+ fields including `epicId`, `sprintId`, `releasedIn`, `linkedOKR`
- OKR → Epic → Sprint → Item → Release chain is fully navigable
- Velocity tracked per sprint in `sprintHistory[]`

---

### 4.2 vNext (Q2–Q3 2026)

#### F8 — Advanced Analytics (Pulse Team)
- AI Sales Agent KR tracking with real `current` values (currently 0%)
- Recommendation engine accuracy dashboard (target: 85%)
- Gold Tier analytics dashboards for subscribers

#### F9 — Command Palette ✅ Shipped
- `Cmd/Ctrl+K` global search and action palette
- Fuzzy search across all views, items, epics, OKRs, sprints, releases
- Keyboard navigation (↑↓ + Enter), grouped results by entity type
- Live-scores results by position + word-boundary bonus; no external library
- Opens from any context; Escape / backdrop click closes; `Cmd+K` toggles

#### F10 — Dependency Graph Enhancement ✅ Shipped
- Mermaid.js graph with interactive click-through: click any node → opens item edit modal directly
- Blocker path highlighting: all edges adjacent to a blocked node render red/dashed (not just the blocked item's own edges)
- Live re-render: resolving a blocker from the dependency view's panel instantly re-renders the graph without a page reload
- SVG hover affordance: cursor + brightness filter on node hover signals interactivity
- Reverse node map (`_depNodeMap`) bridges Mermaid's sanitised SVG IDs back to original item IDs

#### F11 — Multi-Project + Role-Based Access *(Confirmed design — internal vNext)*

**Hierarchy:** Team (Org) → Projects → Tracks (view filters)

- Each Project has a dedicated `data-{projectId}.json` file on GitHub (full data isolation)
- Tracks remain view-level filters within a Project — no sub-file isolation
- `users.json` on GitHub stores the user registry: `{ id, name, passwordHash, grants[] }`
- Each grant: `{ projectId, mode }` — controls which projects a user can see and at what max persona level
- Lambda issues a user-scoped JWT containing `grants[]`; validates grants on every read/write request
- Project Switcher in the Strategic Ribbon shows only the user's accessible projects
- Persona switcher disables modes above the user's grant level for the active project

**Admin surface:** A PM-only admin CMS panel to manage users and grants without raw JSON edits.

#### F11b — Multi-Tenant SaaS *(Productization — future)*
- Each customer org gets a dedicated GitHub repo + Lambda deployment
- The internal data model (Team → Projects → Tracks, `users.json` grants) is identical — no schema change
- `deploy_auth.sh` becomes a customer provisioning script
- User/grant store moves from `users.json` to a managed DB (DynamoDB or Supabase) when the flat-file model hits its limits (~100 users per org)

#### F12 — Post-Release Learning Loop
- Release outcomes feed back into next OKR planning (Discover stage)
- Automated "what changed since last sprint" diff in Ship stage
- Sprint retrospective template auto-populated from velocity + ceremony data

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads in <3s on 4G mobile; Kanban renders <500ms per drag |
| **Uptime** | GitHub Pages + Lambda: target 99.9%+ (matches KR in data.json) |
| **Security** | Per-user role-based auth: SHA-256 password → Lambda validates against `users.json` → JWT with `grants[]`; JWT validated on every Lambda request; GitHub PAT stored in localStorage (not transmitted); Lambda env vars for secrets; no grant = no project visibility |
| **Offline** | Core views render from `localStorage` cache if GitHub fetch fails |
| **Accessibility** | Keyboard navigation for all primary views; ARIA labels on interactive elements |
| **Browser support** | Modern Chromium, Firefox, Safari (no IE, no polyfills) |
| **Data integrity** | `normalizeData()` in `app.js` must cover all fields; new fields require migration |
| **Scalability (current)** | Single `data.json` — practical limit ~500 items before fetch/parse lag |
| **Scalability (vNext)** | Multi-tenant: one Lambda + data.json per org; no shared state |

---

## 6. User Journey Map

The primary journey follows the PM persona through one full 2-week sprint cycle.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     FULL SPRINT LIFECYCLE — PM PERSONA                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│ STAGE    │ Discover │  Vision  │   Plan   │  Build   │   Ship   │  Next Cycle  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│ ACTIONS  │ Log idea │ Set OKRs │ Groom    │ Run      │ Release  │ Retrospect   │
│          │ Tag #idea│ Launch   │ backlog  │ Sprint   │ Lock →   │ → new ideas  │
│          │ Run spike│ Epic →   │ Assign   │ Kickoff  │ Ship     │ feed Discover│
│          │          │ Kickoff  │ Sprint   │ Monitor  │ Ceremony │              │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│ TOUCH-   │ Ideation │ OKR view │ Roadmap  │ Kanban   │ Releases │ Analytics    │
│ POINTS   │ Spikes   │ Epics    │ Backlog  │ My Tasks │ Dashboard│ Workflow     │
│          │ Workflow │          │ Gantt    │ Status   │          │              │
│          │          │          │ Capacity │ Dep Graph│          │              │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│ EMOTIONS │ 😊 3/5   │ 😐 3/5   │ 😤 2/5   │ 😤 2/5   │ 😊 4/5   │ 😊 4/5       │
│          │ Excited  │ Focused  │ Tedious  │ Anxious  │ Relief   │ Motivated    │
│          │ (capture)│ (align)  │ (groom)  │ (unblock)│ (shipped)│ (momentum)   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│ PAIN     │ Ideas get│ OKR←Epic │ Capacity │ Blockers │ Manual   │ No retro     │
│ POINTS   │ lost in  │ link is  │ is guess-│ invisible│ release  │ data → next  │
│          │ Slack    │ manual   │ work     │ to PM    │ notes    │ OKR is blind │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│ OPPORT-  │ Ideation │ Auto-KR  │ Capacity │ Blocker  │ Auto-    │ Sprint retro │
│ UNITIES  │ capture  │ progress │ calc from│ strip +  │ release  │ template     │
│          │ #tagging │ roll-up  │ team data│ PM alert │ notes    │ from velocity│
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘

OPPORTUNITY PRIORITY (Frequency × Severity × Solvability):
  🔴 HIGH:  Blocker visibility for PM during Build  (5 × 5 × 5 = 125)
  🔴 HIGH:  OKR progress auto-calculation from task completion (5 × 4 × 5 = 100)
  🟠 MED:   Capacity calculation from team data  (4 × 4 × 4 = 64)
  🟡 LOW:   Sprint retro template from velocity  (3 × 3 × 4 = 36)
```

---

## 7. Out of Scope (v1)

- Mobile-native app (iOS/Android) — web-only for now; mobile browser supported
- Real-time multi-user sync (WebSockets, CRDTs) — last-write-wins via CMS
- SSO / OAuth login — SHA-256 password auth only
- External integrations (Slack, Jira, Linear webhooks) — GitHub API only
- Custom ceremony definitions — 8 ceremonies are fixed
- Automated PR/commit linking — items link to releases, not individual commits
- White-labeling for productization — deferred to vNext (F11)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `data.json` grows beyond 500 items → performance lag | Medium | High | Add pagination or archiving script; `archive/` directory already exists |
| Concurrent CMS edits overwrite each other | Medium | High | Enforce team convention (one editor at a time); long-term: optimistic locking |
| Lambda URL hardcoded in `index.html` — breaks after redeploy | High | High | Document in `deploy-lambda` skill; add env-var abstraction in vNext |
| AI KRs (Sales Agent, Rec Engine) tracking is subjective | High | Medium | Define binary milestones: "agent responds to lead" = 1, "conversion > 15%" = 2 |
| GitHub API rate limiting blocks CMS saves | Low | High | Lambda proxy buffers requests; add exponential backoff |
| Productization requires multi-tenancy refactor | Low (now) | High (vNext) | Build `config.js` abstraction layer before Q3 2026 |

---

## 9. Q2 2026 Priorities (RICE-Informed)

Based on stated Q2 focus: Grow paid subscribers + AI features + stability + market expansion.

| Feature / Initiative | Reach | Impact | Confidence | Effort | RICE Score |
|---------------------|-------|--------|------------|--------|------------|
| Grow $99 subscription (Gold Tier analytics) | High | Massive | High | M | **🔴 P0** |
| AI Sales Agent (0→15% conversion tracking) | Med | Massive | Med | XL | **🔴 P0** |
| Recommendation engine (0→85% accuracy) | Med | High | Med | XL | **🟠 P1** |
| Command Palette (`Cmd+K`) | High | Med | High | S | ✅ Shipped |
| Post-release learning loop | Med | High | High | M | **🟠 P1** |
| Multi-tenant config abstraction | Low | High | High | L | **🟡 P2** |
| Sprint retro template auto-generation | Med | Med | High | S | **🟡 P2** |

---

## 10. Success Metrics & KPIs

### Engineering Pulse (The Tool)

| Metric | Baseline (Q1 End) | Q2 Target |
|--------|-------------------|-----------|
| Sprint velocity | 84→92% trend | ≥93% avg |
| Ceremony completion rate | ~80% (estimated) | 100% |
| Items traceable to closed OKR | Unknown | >90% |
| Time to log a blocker | ~3 min (Slack → Jira → update) | <30 sec (1 status change in Kanban) |

### Khyaal Product (What the Dashboard Tracks)

| Metric | Q1 Actuals | Q2 Target |
|--------|-----------|-----------|
| Platform OKR progress | 99% (2/3 KRs achieved) | Close OKR, open Q2 OKR |
| Analytics OKR progress | 72% | ≥90% |
| Infrastructure OKR progress | 91% (2/3 KRs achieved) | Close OKR |
| Sprint velocity (story pts) | 84→90→92% (S1→S3) | ≥93% |
| Paid subscriber tier launched | ✅ (v2.1 shipped) | Revenue growth TBD |
| AI Sales Agent conversion | 0% (not live) | 15%+ |

---

## 11. Open Questions

1. **Productization timeline:** When does the Pulse move from internal tool to SaaS offering? What's the trigger metric (team size threshold, customer interest signals)?
2. **AI KR tracking methodology:** How is AI Sales Agent "15% conversion" measured? Needs binary milestone definition before Q2 OKR Launch ceremony.
3. **Q2 OKR owners:** Who owns the Q2 OKRs? Same team structure (Platform/Pulse/DevOps) or reorganized?
4. **Senior user feedback loop:** Is there a mechanism to bring end-user (seniors 50+) feedback signals into the Discover stage? Currently the Pulse tracks engineering work, not user experience signals.
5. **Stakeholder map for Exec view:** Who exactly sees the Executive dashboard? (CEO, CTO, investors?) This affects what KPIs to surface and how to frame "at-risk" signals.
6. **Data backup strategy:** `data.json` is the single source of truth on GitHub. Is the GitHub repo private? Is there a disaster recovery plan if the repo is deleted?

---

*This PRD was generated by the Product Discovery Team (PM Toolkit + UX Researcher + Product Strategist roles) based on a full codebase scan of the Khyaal Engineering Pulse repository as of 2026-04-09. It reflects observed state plus stated strategic intent. All sections marked "Open Questions" require stakeholder input before finalizing.*
