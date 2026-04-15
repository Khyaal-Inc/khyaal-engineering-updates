# Khyaal Engineering Pulse — Complete User Guide

> Everything you need to use this dashboard, even if you've never written a line of code.

---

## What Is This?

**Khyaal Engineering Pulse** is your team's engineering command center. It's a single web page that gives everyone — engineers, product managers, and company leadership — a real-time view of what the team is building, why they're building it, and how it's progressing.

Think of it as the difference between receiving weekly status emails and walking into a room with live progress boards on every wall. Everything is connected: your quarterly goals link to initiatives, which link to sprints, which link to individual tasks, which link to releases. Nothing gets lost in Slack threads.

**No installation required.** It runs entirely in your browser. Your data lives in a single file on GitHub, automatically saved whenever you click "Save to GitHub."

---

## Who Is This For?

| Person | What they use it for |
|--------|---------------------|
| **Product Manager** | Plan sprints, manage the backlog, run ceremonies, track OKR progress |
| **Developer** | See their tasks, update status, flag blockers, check sprint board |
| **Executive / Founder** | See OKR health, epic progress, release timelines, team blockers |

---

## Getting Started: The 3 Modes (Personas)

When you open the dashboard, you see it from one of three **perspectives**. Switch between them using the **PM / Dev / Exec** buttons in the top-right corner.

### 👨‍💼 PM Mode (Product Manager)
- Sees everything: all 19 views, full data, edit controls
- Default view: OKRs
- Use this to plan, groom, run ceremonies, and track everything

### 👩‍💻 Dev Mode (Developer)
- Focused on execution: My Tasks, Kanban, Sprint, Tracks, Dependencies
- When you switch to Dev mode, you'll be asked "Who are you?" — click your name to filter the board to just your tasks
- Can still see and edit everything, but the default view is your personal task list

### 👔 Exec Mode (Executive)
- Strategic overview: Dashboard, OKRs, Epics, Roadmap, Releases, Analytics
- Automatically filters to high-priority and active items only
- Toggle "Show all" in any view to see the full picture

---

## Navigation: How to Move Around

The top bar has two rows:

**Row 1 — App Bar:**
```
[KP logo]  [📁 Project ▾]  [🔍Discover · 🌟Vision · 📐Plan · ⚡Build · 🏁Ship]  [PM|Dev|Exec]  [⚙️]
```

- **📁 Project selector**: Filter everything to one project (track). "All Projects" shows the full picture.
- **Stage tabs**: Click any stage to jump to its primary view. The active stage glows in its color.
- **Mode buttons** (PM / Dev / Exec): Switch your perspective instantly.

Once you're in a stage, these tabs (the Unified Strategic Ribbon) let you switch between all the views within that stage — one click, no popover.

---

## The 5 Lifecycle Stages

Every piece of work follows this journey. The stage tabs in the top bar map to this flow:

```
🔍 Discover → 🌟 Vision → 📐 Plan → ⚡ Build → 🏁 Ship
```

### 🔍 Stage 1: Discover
**What happens here**: Raw ideas and technical experiments before any commitment.

| View | Purpose |
|------|---------|
| **Workflow** | Low-fidelity mapping of your product lifecycle and ceremonies |
| **Ideation** | Capture any idea — even rough ones. Tag with #idea. |
| **Spikes** | Technical investigations. "Can we do X?" experiments. Tag with #spike. |

**When to use**: Whenever a new idea comes up that's not ready for planning. Ideas here are safe to discard.

**Who runs it**: Anyone. PM curates; engineers validate technical feasibility in Spikes.

---

### 🌟 Stage 2: Vision
**What happens here**: Set your quarterly strategic direction. Everything you build should trace back to this.

| View | Purpose |
|------|---------|
| **OKRs** | Quarterly Objectives and Key Results — the "why" behind all work |
| **Epics** | Major initiatives that deliver a measurable business outcome |

**When to use**: Start of the quarter for setup; monthly for health reviews.

**Who runs it**: Founders/Exec set objectives; PM translates them into Epics.

**Key rule**: Every Epic should be linked to an OKR. Every task should belong to an Epic. This is how you know your daily work is moving the needle.

---

### 📐 Stage 3: Plan
**What happens here**: Turn strategy into executable work. Decide what's happening and when.

| View | Purpose |
|------|---------|
| **Roadmap** | Strategic initiatives mapped to time horizons: Now (1M) / Next (3M) / Later (6M+) |
| **Gantt** | Timeline view of all Epics and roadmap horizons on a calendar |
| **Capacity** | Check team bandwidth before committing to a sprint |
| **Backlog** | Every task waiting for execution. Groom these before sprint planning. |
| **Sprint** | Current commitment cycle. Focus on the next 2 weeks. |

**When to use**: Weekly sprint planning; monthly roadmap review.

**Who runs it**: PM leads; Tech Lead reviews estimates; developers clarify task details.

---

### ⚡ Stage 4: Build
**What happens here**: The team executes. Monitor health and unblock the engine.

| View | Purpose |
|------|---------|
| **Kanban** | Daily status board. Cards move left to right as work progresses. |
| **My Tasks** | (Dev mode) Your personal cockpit — Today / This Week / Blocked |
| **Tracks** | All tasks grouped by project. The bird's-eye view for standup. |
| **Links** | Tactical dependencies. See exactly what is stalling your task. |
| **State** | Unified view of all tasks grouped by status. |
| **Risk** | High-priority and overdue items that need intervention. |
| **Team** | Per-person task breakdown and loading. |

**When to use**: Daily. The Kanban board should be updated every morning in standup.

**Who runs it**: Developers update their own cards; PM monitors health and resolves blockers.

**The 5-step delivery flow** (for sprint items):
```
Now → [Move to QA] → QA → [Send to Review] → Review → [Mark Done] → Done → [Ship to Release]
```

---

### 🏁 Stage 5: Ship
**What happens here**: Review what you built and close the loop on your OKRs.

| View | Purpose |
|------|---------|
| **Releases** | Versioned batches of shipped work. |
| **Analytics** | Velocity trends, sprint burndown, and performance reports. |
| **Pulse** | (Exec mode) High-level health cockpit for leadership. |

**When to use**: Sprint end for release day; monthly for analytics; weekly for exec review.

**Who runs it**: PM publishes releases; Exec reviews Pulse dashboard.

---

## Workspaces, Projects & Tracks

The dashboard uses a 5-level hierarchy:

```
Workspace → Project → Track → Subtrack → Item
```

| Level | What it is | How to switch |
|-------|-----------|---------------|
| **Workspace** | Top-level data boundary — each maps to a separate data file on GitHub (e.g. `data.json`, `data-mobile.json`) | Team-switcher dropdown (top-left, next to the KP logo) |
| **Project** | Logical grouping of tracks within a workspace's data file | Project-filter dropdown (next to team-switcher) |
| **Track** | Functional product area within a project | Track filter dropdown |
| **Subtrack** | Sub-area within a track | Inline within each track card |
| **Item** | Individual task / card | Cards in every view |

**Switching Workspaces** fetches a completely different data file from GitHub. All views, filters, sprints, OKRs, and epics switch to the new workspace's data. Example: switching from "Core Platform Engineering" to "Khyaal Mobile" loads `data-mobile.json` — a fully independent dataset.

**Switching Projects** filters the already-loaded workspace data — no network call. Example: switching from "All Projects" to "Khyaal Platform" filters every view to only show Khyaal Platform tracks and items.

**Tracks** are the functional product areas within a project (e.g. `platform` → Website, API, Backlog). Use the **track filter** to focus any view on a single team's work.

**Admin (PM only):** Click ⚙️ → "Open Admin ↗" to manage workspaces, users, grants, projects, tracks, and subtracks in the full-screen Admin view. No raw JSON editing needed.

---

## Task Statuses

Every task has one of these statuses. They follow a natural flow:

| Status | Color | Meaning |
|--------|-------|---------|
| **Later** | Gray | Not started, not urgent. Lives in backlog. |
| **Next** | Orange | Queued up — starting soon this sprint. |
| **Now** | Blue | Actively being worked on today. |
| **QA** | Purple | Code complete, being tested. |
| **Review** | Amber | In code/design review, awaiting sign-off. |
| **Done** | Green | Finished! Ready to ship to a release. |
| **Blocked** | Red | Cannot progress. Something is preventing this. |
| **On Hold** | Teal | Paused — deliberate pause, not blocked. |

---

## The Ceremony System

Ceremonies are special moments in your workflow that mark significant transitions. Running a ceremony records the event, updates status, and creates a permanent audit trail.

You'll find ceremony buttons in ribbons and on relevant cards when the timing is right.

---

### 🏃 Sprint Kickoff
**When**: At the start of each 2-week sprint, after all tasks have been pulled in from the backlog.

**What it does**:
1. Opens a confirmation view showing sprint capacity, task count, and linked OKR
2. Sets the sprint status to "Active"
3. Records the kickoff date and creates an audit entry
4. Sends a toast notification confirming the sprint has started

**Who runs it**: PM, at the start of sprint planning after the backlog has been groomed.

**Button location**: Sprint view → Sprint card → "🚀 Kickoff Sprint"

---

### 🏁 Sprint Close (Sprint Retrospective)
**When**: At the end of a 2-week sprint, before starting the next one.

**What it does**:
1. Shows completion metrics: how many tasks done, story points delivered vs. planned
2. Shows velocity trend: better/worse than last sprint?
3. Any incomplete tasks? Choose to move them to backlog or push to next sprint
4. Records a ceremony audit with velocity, contributors, and sprint stats
5. Sets sprint status to "Completed"

**Who runs it**: PM, with the whole team present.

**Button location**: Sprint view → Active Sprint card → "🏁 Close Sprint"

---

### 🌟 OKR Launch
**When**: At the start of the quarter, after you've defined your Objectives and Key Results.

**What it does**:
1. Confirms all Key Results have targets set
2. Sets OKR status to "Active"
3. Records the launch date
4. Creates a ceremony audit

**Who runs it**: PM or Exec at quarter start.

**Button location**: OKR view → OKR card → "🌟 Launch OKR"

---

### 🏁 OKR Close
**When**: End of quarter.

**What it does**:
1. Shows KR achievement rates (% complete for each Key Result)
2. Asks you to record the outcome: ✅ Achieved / 🟡 On Track / 🔴 Missed / ⚫ Cancelled
3. Sets OKR status to "Closed" with your outcome rating
4. Creates an audit with full KR breakdown

**Who runs it**: Exec/PM at quarter-end review.

**Button location**: OKR view → OKR card → "🏁 Close OKR"

---

### 🚀 Epic Kickoff
**When**: When a new major initiative (Epic) is officially starting — team aligned, scope clear.

**What it does**:
1. Shows tasks linked to this Epic
2. Sets Epic stage to "Build" (from Vision/Plan)
3. Records kickoff date
4. Creates a ceremony audit

**Who runs it**: PM at the start of an initiative.

**Button location**: Epics view → Epic card → "🚀 Kickoff Epic"

---

### 🏁 Epic Close
**When**: When an Epic is complete (or cancelled).

**What it does**:
1. Shows completion stats: done vs. pending tasks
2. Warns if there are still open tasks (you can move them to backlog or archive)
3. Records strategic health at closure: Healthy / At Risk / Critical
4. Updates linked OKR progress
5. Creates a ceremony audit with points delivered, top contributors, and Epic health

**Who runs it**: PM at the end of a major initiative.

**Button location**: Epics view → Epic card → "🏁 Close Epic"

---

### 🔒 Release Lock (Scope Freeze)
**When**: Before you start actually shipping a release — this freezes the scope so no more items can slip in.

**What it does**:
1. Shows what's currently in the release
2. Sets release status from "planned" to "in_progress" (scope locked)
3. Records the lock date
4. Creates a ceremony audit

**Who runs it**: PM before sprint-end release activities.

**Button location**: Releases view → Release card → "🔒 Lock Scope"

---

### 🚢 Ship Release
**When**: When everything in a release is done and ready to go to users.

**What it does**:
1. Shows all items in the release (done vs. still in QA/review)
2. Sets release status to "published" (or "completed")
3. Records the ship date
4. Creates a ceremony audit with items shipped, epics covered, and OKR linkage

**Who runs it**: PM at sprint end after all items are verified done.

**Button location**: Releases view → Release card → "🚢 Ship Release"

---

### ⏩ Advance Roadmap Horizons
**When**: Monthly, when you review the roadmap and update which items have shifted in priority.

**What it does**:
1. Opens a list of all items with a planning horizon (Now/Next/Later)
2. Check which items should advance (e.g., Next → Now)
3. Click "Advance Selected" to shift them in bulk
4. Creates a ceremony audit of all changes

**Who runs it**: PM at the monthly roadmap review.

**Button location**: Roadmap view → ribbon → "⏩ Advance Horizons"

---

## Quick Actions

When you're looking at a task (in CMS mode), you'll see small colored buttons appear below the task. These are **Quick Actions** — shortcuts for the most common next steps.

### Color Guide

| Color | Action Type | Examples |
|-------|-------------|---------|
| 🔵 Blue | Status transitions | Start Working, Move to QA |
| 🟣 Purple | QA/Testing | Move to QA |
| 🟡 Amber | Review | Send to Review |
| 🟢 Green | Completion | Mark Done, Resolve Blocker |
| 🟠 Orange | Assignment | Ship to Release, Add to Sprint |
| 🔴 Red | Flagging | Flag Blocker |

### Common Actions

| Action | When it appears | What it does |
|--------|----------------|--------------|
| **Start Working** | Item is Next/Later | Sets status to Now, records start date |
| **Move to QA** | Item is Now (in sprint) | Sets status to QA |
| **Send to Review** | Item is QA | Sets status to Review |
| **Mark Done** | Item is in QA or Review | Sets status to Done |
| **Ship to Release** | Item is Done | Opens release dropdown to assign item |
| **Flag Blocker** | Item is Now | Prompts for blocker note, sets blocked status |
| **Resolve Blocker** | Item is Blocked | Clears blocker, sets back to Now |
| **Set Due Date** | PM mode, item missing due date | Opens date picker |
| **Update OKR Progress** | Item linked to Epic with OKR | Navigates to OKR view with guidance |
| **↗ [Epic Name]** | Item linked to an Epic with OKR | Jump to OKR view for that epic |

---

## Grooming Mode

**Grooming** is the process of making your backlog items "sprint-ready" — making sure each task is properly estimated, assigned to an epic, scoped for a sprint, and has clear acceptance criteria.

### How to Enter Grooming Mode
Backlog view → "🔧 Enter Grooming Mode" button (top-right of ribbon)

### What You See in Grooming Mode
- **Session header**: Shows how many items need grooming and how many are sprint-ready
- **Readiness badge** on each item: 
  - ✓ **Ready** (green) — all 4 fields set: Epic, Sprint, Story Points, Acceptance Criteria
  - **2/4** (amber) — partially ready
  - **0/4** (red) — needs work
- **6-field panel** expands below each item: Priority / Epic / Sprint / Release / Horizon / Story Points

### Fields to Fill in Grooming
| Field | What it means |
|-------|--------------|
| **Priority** | High / Medium / Low — what gets done first if capacity runs out |
| **Epic** | Which strategic initiative does this belong to? |
| **Sprint** | Which sprint will this be in? |
| **Release** | Which product release will this ship in? |
| **Horizon** | 1M (Now) / 3M (Next) / 6M (Later) / 1Y (Future) |
| **Story Points** | Size estimate: 1=tiny, 2=small, 3=medium, 5=large, 8=very large, 13=week, 21=huge |

### Exit Grooming Mode
Click "✕ Exit" in the session header, or click the "✅ Grooming Active" button again.

---

## CMS Mode (Edit Mode)

To **edit or add items**, you need to be in CMS mode:

1. Click the **⚙️** gear icon in the top bar
2. Enter your **GitHub Personal Access Token** (PAT)
3. Click **Authenticate**
4. Once authenticated, "Edit" and "Add Item" buttons appear throughout the dashboard

### The 4-Pillar Edit Form

When you click "Edit" on any task, a modal opens with 4 sections (pillars):

| Pillar | Fields | What it's for |
|--------|--------|--------------|
| 🎯 **Goal & Intent** | Title, Use Case, Epic link, Persona, Tags | What are we building and why? |
| 📅 **Timeline & Cycle** | Horizon, Sprint, Start Date, Due Date, Release | When does this happen? |
| ⚡ **Action & Routing** | Status, Contributors, Blocker Note, Dependencies, Notes | Where is this right now? |
| 🛠️ **Sync & Effort** | Story Points, Priority, Acceptance Criteria, Impact, Effort, Success Metric | How do we measure success? |

> **Dev mode note**: Strategic fields (Epic, Impact, Acceptance Criteria, Priority) are read-only for developers. Developers fill in status, notes, and contributor fields.

> **Exec mode note**: The "Sync & Effort" pillar is hidden for Executives. They see Goal, Timeline, and Action only.

### Saving Your Changes

- **Save** button in the modal → saves to your **browser's local memory** only
- **"Save to GitHub"** button (top CMS bar) → permanently saves to your team's GitHub file

> ⚠️ If you close the browser without clicking "Save to GitHub," your changes will be lost.

---

## The Information Button (ℹ)

Every view has a small **ℹ** button in its ribbon header. Click it to see:
- What this view is for
- Who should use it and when
- Step-by-step agenda for the ceremony or meeting associated with this view
- Current health check: any items missing required fields?
- Navigation links to the previous and next logical steps in the workflow

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Alt + 1** | Switch to PM mode |
| **Alt + 2** | Switch to Developer mode |
| **Alt + 3** | Switch to Executive mode |
| **Cmd/Ctrl + S** | Save (in CMS mode) |
| **Cmd/Ctrl + K** | Global search |

---

## Saving Your Work to GitHub

Your changes are saved in two steps:

1. Every time you click **Save** in the edit modal, changes are stored in your browser's local memory. This is instant and automatic.

2. To make changes permanent (visible to your whole team), click **"Save to GitHub"** in the CMS bar at the top. This sends your data file to GitHub.

> Think of local save as saving to a draft, and Save to GitHub as hitting "publish."

---

## FAQ

**Q: I don't see any "Edit" buttons. How do I add tasks?**
A: You need to authenticate with a GitHub PAT. Click ⚙️ → enter your token → Authenticate.

**Q: I made changes but they disappeared after refreshing.**
A: You saved locally but didn't click "Save to GitHub." Your changes were in the browser cache only.

**Q: A task shows a "🔴 Blocked" badge in the ribbon. What do I do?**
A: Go to that item (find it in Kanban/Track/Dependency view) → click "✅ Resolve" quick action → describe the resolution.

**Q: How do I change what sprint a task is in?**
A: In Backlog view (with CMS mode on), there's a sprint dropdown below each task. Or open the task editor → Timeline & Cycle pillar → Sprint field.

**Q: What's the difference between "On Hold" and "Later"?**
A: **Later** = not started, in the backlog queue. **On Hold** = was being worked on but deliberately paused (e.g., waiting for a decision, dependency, or resource).

**Q: How do I connect a task to a quarterly goal (OKR)?**
A: Task → Edit → Goal & Intent pillar → Epic field. Link the task to an Epic. The Epic should already be linked to an OKR. This creates the chain: Task → Epic → OKR.

**Q: Why are some items grayed out in Exec mode?**
A: Exec mode filters to high-priority and active items only. Click "Show all" in the filter banner to see everything.

**Q: Can two people edit at the same time?**
A: Not recommended. The last person to click "Save to GitHub" wins. Treat it like a shared Google Doc — communicate before editing.

---

*For technical documentation, see [DEVELOPER.md](DEVELOPER.md).*
