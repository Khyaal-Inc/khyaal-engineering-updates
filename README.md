# Khyaal Engineering Updates Dashboard

> A zero-deployment engineering status and PM planning dashboard for the Khyaal team — secure, real-time, and fully browser-operated.

---

## 📋 Table of Contents

1. [Feature Overview](#feature-overview)
2. [Architecture](#architecture)
3. [Authentication & Setup](#authentication--setup)
4. [PM How-To Guide](#pm-how-to-guide) ← Start here if you're a PM
5. [Developer How-To Guide](#developer-how-to-guide) ← Start here if you're an Engineer
6. [View Reference](#view-reference)
7. [Item Fields Reference](#item-fields-reference)
8. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Feature Overview

### 🗺️ Views Available

| View | Access | Description |
|---|---|---|
| **Tracks** | Main Nav | Items grouped by product track (Platform, Pulse, DevOps…) |
| **🏃 Sprints** | Main Nav | Active sprints with progress bars and assigned items |
| **📦 Releases** | Main Nav | Milestone releases with completion tracking |
| **📚 Backlog** | Main Nav | All parked items across every track, PM-managed |
| **🗺️ Roadmap** | Main Nav | 4-horizon strategic planning (1M / 3M / 6M / 1Y) for tasks |
| **🎯 Epics** | Main Nav | Strategic PM Epics with health and progress tracking |
| **By Status** | More Views | Items grouped by Done / Now / On-Going / Next / Later |
| **By Priority** | More Views | Items grouped by High / Medium / Low |
| **By Contributor** | More Views | Tasks per team member, grouped by status |
| **🕸️ Dependencies** | More Views | Visual dependency graph showing cross-task blockers |
| **Gantt Chart** | More Views | Timeline view of all dated items |

### 🎯 Item Statuses

| Status | Meaning |
|---|---|
| 🟢 **Done** | Shipped & live |
| 🔵 **Now** | Actively being worked on this sprint |
| 🟡 **On-Going** | Continuous / operational work |
| 🟠 **Next** | Committed for the near-term pipeline |
| ⚪ **Later** | Future consideration / backlog |

---

## Architecture

```
index.html   → Page structure, views, and CMS modal
core.js      → Data state, filtering, view switching, tab counts
views.js     → All view renderers (Track, Status, Roadmap, Gantt, etc.)
cms.js       → Add/Edit/Delete for items, epics, sprints, releases
app.js       → Initialization, GitHub sync, archive
data.json    → Single source of truth (stored on GitHub)
styles.css   → All styling (Tailwind utilities + custom classes)
```

**Data Flow:**
```
GitHub (data.json)
    ↓ fetched via AWS Lambda
Browser Memory (UPDATE_DATA)
    ↓ edited via CMS
    ↓ saved via "Save to GitHub"
GitHub (data.json updated)
```

---

## Authentication & Setup

### One-Time Setup
1. Deploy the Lambda proxy: `sh deploy_auth.sh`
2. Set your GitHub token on Lambda:
   ```sh
   aws lambda update-function-configuration \
     --function-name khyaal-auth-gatekeeper \
     --environment "Variables={GITHUB_TOKEN=your_token_here}" \
     --region ap-south-1
   ```
3. Set `LAMBDA_URL` in `index.html`.

### How to Access CMS
- Append `?cms=true` to the URL to see the CMS login bar
- Enter your GitHub PAT and click **Authenticate**
- Your session is cached in `localStorage` — no re-login on refresh

---

## PM How-To Guide

> This section explains **exactly** what a Product Manager should do, in sequence, when planning and managing the engineering roadmap.

---

### Step 1: Define Annual Vision (1 Year Horizon)

**When:** At the start of each year or major planning cycle.
**Where:** 🗺️ Roadmap view → **✨ Add Epic**

PMs define **Strategic Epics** — high-level capabilities the product wants to achieve. These are **not engineering tasks** — they are PM-owned features.

**Fill in:**
- **Title** — What the capability is (e.g., "AI-Powered Recommendations v2")
- **Description** — The *why* (user problem, business outcome)
- **Horizon** — Select `1 Year`
- **Priority** — High / Medium / Low
- **Owner** — The PM responsible
- **Tags** — Categorize (AI, Personalization, etc.)

> ✅ After this step: The epic appears in the **1 Year** column on the Roadmap.

---

### Step 2: Break Down Into 6-Month and 3-Month Milestones

**When:** Quarterly planning sessions.
**Where:** 🗺️ Roadmap view → **📦 Add Release** + **✨ Add Epic**

For each annual epic, create:
1. **Releases** (delivery milestones) — e.g., "v2.0 – Recommendations Beta"
2. **Quarterly Epics** — the 3-month scope of work

**Fill in a Release:**
- Name (e.g., `v2.0 Beta`)
- Target date
- Goal / success criteria
- **Horizon** → `3 Months` or `6 Months`

> ✅ After this step: Releases appear in their respective horizon columns with automated progress bars.

---

### Step 3: Backlog Grooming

**When:** Weekly or bi-weekly with Engineering leads.
**Where:** 📚 Backlog view

Review all items in the Backlog. For each item, assign:
- **Planning Horizon** (`1M` / `3M` / `6M` / `1Y`) via the Edit modal
- **Linked Epic** — connect the task to a strategic epic
- **Priority** — is this blocking a release?

> ✅ After this step: Tasks have a planning horizon tag. The linked Epic's progress bar becomes trackable.

---

### Step 4: Sprint Planning

**When:** Before each 2-week sprint starts.
**Where:** 🏃 Sprints view → **➕ Add Sprint**

1. Create a Sprint with:
   - Name (e.g., `Sprint 14`)
   - Start & End dates
   - Sprint Goal
2. Assign backlog items to this sprint via **Edit Modal → Sprint** dropdown
3. Verify the sprint's task list in the 🏃 Sprints view

> ✅ After this step: Sprint view shows all assigned tasks with progress tracking.

---

### Step 5: During Sprint — Monitor Progress

**When:** Daily
**Where:** 🏃 Sprints, By Contributor, By Status views

- Check **By Contributor** view for per-engineer progress grouped by status (Done → Now → Later)
- Check **By Status** for an overall team snapshot
- Watch the **🚨 Global Blocker Strip** at the top — if red, action is needed

**If you need to update an item:**
1. Click any task row → Edit modal opens
2. Update Status, Note, or Due Date
3. Click **Apply Changes** → auto-saves to memory
4. Click **Save to GitHub** to persist

---

### Step 6: Release & Post-Release

**When:** At release cutoff
**Where:** 📦 Releases view

1. Confirm all tasks in the release are marked `Done`
2. The release progress bar will show 100%
3. Use **Archive & Clear** in CMS to archive the sprint data and start fresh

---

### PM Quick Reference

| Action | Where |
|---|---|
| Add strategic epic | 🗺️ Roadmap → ✨ Add Epic |
| Add a release milestone | 🗺️ Roadmap → 📦 Add Release |
| View team progress by person | By Contributor view |
| View by status | By Status view |
| Groom backlog | 📚 Backlog view |
| Create a sprint | 🏃 Sprints → ➕ Add Sprint |
| Assign task to sprint | Edit any task → Sprint dropdown |
| Add PM comment to a task | Click 💬 on task row |
| Flag a blocker | Edit task → Blocker Reason field |
| Filter by tag | Click tag pills in tag filter bar |
| Search anything | Press `/` or use Search bar |

---

## Developer How-To Guide

> This section explains what engineers need to do when they pick up a task, update progress, and collaborate with PMs.

---

### Step 1: Check Your Assigned Tasks

**Where:** By Contributor view → Find your name

Your card shows all tasks grouped by status:
- **Done** — completed work
- **Now** — what you're doing today
- **Next** — what's coming up for you

Alternatively, use **Global Team Filter** (top of page) to filter the entire dashboard to your team's track.

---

### Step 2: Before Starting a Task

When you pick up a task:
1. Open the Edit modal (click the task row or right-click for context menu)
2. Set **Status** → `Now`
3. Set **Start Date** if not already set
4. Set your name in **Contributors** if missing
5. Set **Due Date** (expected completion)
6. Click **Apply Changes** → **Save to GitHub**

---

### Step 3: Adding a New Task

**When:** Discovering new work mid-sprint that should be tracked.
**Where:** Any Track → **➕ Add Item** button (in CMS mode)

Fill in:
- **Text** — clear, action-oriented title
- **Status** — `Now` if starting today, `Next` if queued up
- **Priority** — assess impact
- **Contributors** — assign yourself (and others if pair-working)
- **Note** — technical details, approach, links
- **Sprint** — link to the current active sprint
- **Planning Horizon** — if this has strategic relevance
- **Linked Epic** — if it belongs to a PM epic

> ✅ After this: The task will appear in your Contributor card, the Sprint view, and on the Roadmap progress bar.

---

### Step 4: Logging Daily Progress

Devs should update task status at **end of each day**:

| Situation | Action |
|---|---|
| Started work | Status → `Now` |
| Waiting for review/merge | Status → `Now`, add note |
| Blocked | Set Blocker Reason → flags red strip for PM |
| Done & shipped | Status → `Done` |
| Deprioritized | Status → `Later` or move to Backlog |

**How to update:**
1. Click the task
2. Change Status
3. Update Note if needed
4. Apply Changes → Save to GitHub

---

### Step 5: Flagging Blockers

If you're blocked:
1. Open the task Edit modal
2. Fill in **Blocker Reason** field
3. Save → a **🚨 Global Blocker Strip** appears at top of dashboard
4. The PM sees it and takes action (re-assigns, unblocks, escalates)

---

### Step 6: Adding Dependencies

If your task depends on another task:
1. Open Edit modal → **Dependencies (Blockers)** widget
2. Start typing the other task name
3. Select from suggestions — it becomes a chip
4. Save

**How to view:**
- 🕸️ Dependencies view shows a visual graph of all blocked/blocking relationships

---

### Step 7: Marking as Done

When your PR is merged / feature is live:
1. Set Status → `Done`
2. Add a note for context (e.g., "PR #123 merged, deployed to prod at 3pm")
3. Save to GitHub

> ✅ After this: The sprint's progress bar advances, the epic's progress bar advances, and the Releases view shows progress.

---

### Developer Quick Reference

| Action | How |
|---|---|
| Update my task status | Click task → Edit → Change Status |
| See all my tasks | By Contributor view |
| Add a new task | Track view → ➕ Add Item |
| Flag a blocker | Edit task → Blocker Reason field |
| Link a dependency | Edit task → Dependencies widget |
| Search for a task | Press `/` or use Search bar |
| View Gantt timeline | More Views → Gantt Chart |
| Move task to backlog | Right-click task → Send to Backlog |
| Move task to different track | Edit task → Move Item section |

---

## View Reference

### 🏃 Sprints View
- Shows all sprints defined in `metadata.sprints`
- Each sprint card has: goal, date range, progress bar, and all assigned tasks grouped by track
- Add sprints via **➕ Add Sprint** (CMS mode only)

### 📦 Releases View
- Shows all releases defined in `metadata.releases`
- Assign a task to a release via Edit Modal → Release dropdown
- Progress auto-calculates from linked tasks' statuses

### 🗺️ Roadmap View
- Four columns: **1 Month**, **3 Months**, **6 Months**, **1 Year**
- Each column shows **tasks** grouped by their assigned planning horizon.
- Tasks display their linked Epic and track to provide strategic context.
- Use this view to plan when specific work packages will be tackled over the coming year.

### 🎯 Epics View
- Shows all **Strategic Epics** defined by Product Managers.
- Each Epic card displays: Name, Description, Health status (On-Track / At-Rick / Delayed).
- Progress bars automatically calculate completion based on linked tasks (Done tasks / Total tasks).
- Click on linked tasks within an Epic card to edit them directly.
- Add Epics using the **➕ Add Strategic Epic** button.

### By Contributor View
- Compact 3-column grid showing each team member's tasks
- Tasks are grouped under status headers (Done / Now / On-Going / Next / Later)
- Click any task to open the Edit modal

### 🕸️ Dependencies View
- Visual node graph showing which tasks are blocked by others
- Red lines = blocking relationship

### 📚 Backlog View
- All items in `Backlog` subtracks across all team tracks
- PMs groom this list weekly
- Right-click any item → Promote to move it to active work

---

## Item Fields Reference

| Field | Type | Description |
|---|---|---|
| Text | String | Task title / description |
| Status | Enum | done, now, ongoing, next, later |
| Priority | Enum | high, medium, low |
| Note | Text | Technical details, approach |
| Impact / Usecase | Text | Business value or user impact |
| Media URL | URL | Link to spec, design, or PR |
| Start Date | Date | When work starts |
| Due Date | Date | Expected delivery |
| Contributors | Multi-select | Team members assigned |
| Tags | Multi-select | Categories (bug, feature, tech-debt…) |
| Sprint | Select | Active sprint this belongs to |
| Release | Select | Target release version |
| Planning Horizon | Select | 1M / 3M / 6M / 1Y planning bucket |
| Linked Epic | Select | PM epic this contributes to |
| Blocker Reason | Text | If set, flags item as a blocker |
| Dependencies | Multi-select | Other tasks this is blocked by |
| Comments | Thread | PM/team timestamped comments |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Switch to Tracks view |
| `2` | Switch to By Status view |
| `3` | Switch to By Priority view |
| `4` | Switch to By Contributor view |
| `5` | Switch to Gantt view |
| `6` | Switch to Backlog view |
| `7` | Switch to Sprints view |
| `8` | Switch to Releases view |
| `/` | Focus search bar |
| `Esc` | Close modal |

---

## Tags Quick Reference

When adding tags, here are the recommended standard tags used by the team:

`feature` · `bug` · `tech-debt` · `security` · `performance` · `design` · `refactor` · `testing` · `SEO` · `infra` · `AI` · `data` · `API` · `mobile` · `web`

Custom tags are fully supported — type any name in the Tags field and press **Enter**, **,** or **Tab** to add.

---

© 2026 Khyaal Inc. | Built with ❤️ for the Khyaal Engineering Team