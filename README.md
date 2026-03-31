# Khyaal Engineering Pulse

> A comprehensive engineering status and product management dashboard for the Khyaal team — secure, real-time, and designed for PMs, Developers, and Executives.

---

## 📋 Table of Contents

1. [Feature Overview](#feature-overview)
2. [Three Persona Modes](#three-persona-modes)
3. [Architecture](#architecture)
4. [Authentication & Setup](#authentication--setup)
5. [PM How-To Guide](#pm-how-to-guide)
6. [Developer How-To Guide](#developer-how-to-guide)
7. [Executive How-To Guide](#executive-how-to-guide)
8. [View Reference](#view-reference)
9. [Data Model Reference](#data-model-reference)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Feature Overview

### 🎭 Three Persona Modes

Khyaal Engineering Pulse now features **three distinct persona modes** tailored to different roles:

- **👨‍💼 PM Mode** (Blue) - Full product management toolkit
- **👩‍💻 Developer Mode** (Green) - Focused task execution view
- **👔 Executive Mode** (Purple) - High-level strategic overview

**Switch modes using:** `Alt + 1` (PM), `Alt + 2` (Dev), `Alt + 3` (Exec)

---

### 🗺️ Views Available

#### PM Mode Views
| View | Shortcut | Description |
|---|---|---|
| **🚀 Epics** | 1 | Strategic goals with health tracking and OKR linkage |
| **🗺️ Roadmap** | 2 | Planning horizons (Now / Next / Later) with timeline view |
| **📚 Backlog** | 3 | Grooming hub with inline prioritization and estimation |
| **🏃 Sprints** | 4 | 2-week execution cycles with velocity tracking |
| **📊 Kanban** | - | Drag-and-drop workflow board with swimlanes |
| **🕸️ Dependencies** | 0 | Mermaid.js dependency graph with blocker highlighting |
| **🎯 OKRs** | - | Objectives & Key Results with auto-progress tracking |
| **👥 Capacity** | - | Team workload distribution and sprint planning |
| **📈 Analytics** | - | Velocity charts, burndown, and KPI dashboard |
| **🏗️ Tracks** | 5 | Engineering execution grouped by product area |
| **📦 Releases** | 6 | Version milestones with completion tracking |
| **🧩 By Status** | 7 | Tasks grouped by delivery status |
| **🔥 By Priority** | 8 | High/Medium/Low impact sorting |
| **👩‍💻 By Contributor** | 9 | Per-person task breakdown |
| **📅 Gantt** | - | Timeline view with date-based visualization |
| **🛠️ Playbook** | - | Step-by-step PM and Dev workflow guide |

#### Developer Mode Views
| View | Description |
|---|---|
| **📋 My Tasks** | Personalized task list (Today / This Week / Upcoming / Blocked) |
| **📊 Kanban** | Quick drag-and-drop status updates |
| **🏗️ Tracks** | Your team's work across all subtracks |
| **🕸️ Dependencies** | What's blocking you or what you're blocking |
| **🏃 Sprint** | Current sprint goals and progress |
| **🛠️ Playbook** | Developer workflow best practices |

#### Executive Mode Views
| View | Description |
|---|---|
| **📊 Dashboard** | Executive summary with OKR progress, epic health, and risks |
| **🚀 Epics** | Strategic initiative health and timeline |
| **🎯 OKRs** | Quarter objectives with key result tracking |
| **📈 Analytics** | Team velocity, burndown charts, and sprint metrics |
| **🗺️ Roadmap** | Strategic planning horizons |
| **📦 Releases** | Milestone delivery tracking |

---

### 🎯 Item Statuses

| Status | Meaning | Kanban Column |
|---|---|---|
| 🟢 **Done** | Shipped & live | Done |
| 🔵 **Now** | Actively in development | Now |
| 🟡 **On-Going** | Continuous/operational work | Ongoing |
| 🟠 **Next** | Ready for pickup | Next |
| ⚪ **Later** | Future backlog | Later/Backlog |

---

## Three Persona Modes

### 👨‍💼 PM Mode (Product Manager)
**Default View:** Epics
**Color Theme:** Blue
**Key Features:**
- Complete access to all 15+ views
- OKR tracking with auto-calculated progress
- Capacity planning and resource allocation
- Sprint velocity analytics and forecasting
- Backlog grooming mode with inline editing
- Dependency visualization with Mermaid.js
- Drag-and-drop Kanban workflow

**Typical Workflow:**
1. Define strategic Epics with business goals
2. Break down into OKRs and Key Results
3. Groom Backlog with story points and priorities
4. Plan Sprint capacity and assign tasks
5. Monitor progress via Kanban and Analytics
6. Identify and resolve blockers via Dependencies

---

### 👩‍💻 Developer Mode
**Default View:** My Tasks
**Color Theme:** Green
**Key Features:**
- Personalized task list with smart categorization
- Today / This Week / Upcoming / Blocked sections
- Quick Kanban access for status updates
- Dependency view to see what's blocking you
- Sprint goals and current commitments
- Developer-focused workflow playbook

**Typical Workflow:**
1. Check "My Tasks" for today's priorities
2. Flag blockers immediately when stuck
3. Update status via Kanban drag-and-drop
4. Mark tasks Done with PR links in notes
5. Review Dependencies to unblock others

---

### 👔 Executive Mode
**Default View:** Dashboard
**Color Theme:** Purple
**Key Features:**
- High-level OKR progress summary (% complete)
- Epic health indicators (On-Track / At-Risk / Delayed)
- Top risks and active blockers
- Team velocity trends
- Sprint completion rates
- Strategic roadmap view

**Typical Workflow:**
1. View Dashboard for overall health snapshot
2. Drill into at-risk Epics for details
3. Review OKR progress by quarter
4. Check Analytics for velocity trends
5. Monitor Roadmap for strategic alignment

---

## Architecture

```
index.html              → Dashboard structure and navigation
core.js                 → State management, filtering, keyboard shortcuts
views.js                → Core view renderers (Track, Status, Priority, etc.)
cms.js                  → Full Management UI (Add/Edit/Delete/Groom)
app.js                  → Normalization, GitHub integration, archiving
data.json               → Single Source of Truth on GitHub
styles.css              → Custom CSS with mode-specific theming

NEW MODULES:
modes.js                → Persona mode system with view filtering
dependency-view.js      → Mermaid.js dependency graph visualization
kanban-view.js          → Drag-and-drop Kanban board
okr-module.js           → OKR tracking with auto-progress
analytics.js            → Sprint velocity and metrics dashboard
capacity-planning.js    → Team workload and resource management
dev-focus.js            → Developer "My Tasks" view
executive-dashboard.js  → Executive summary dashboard
```

**Pulse Data Flow:**
```
GitHub (data.json)
    ↓ securely fetched via AWS Lambda
Browser Memory (UPDATE_DATA)
    ↓ groomed & edited via CMS
    ↓ persisted via "Save to GitHub"
GitHub (data.json updated)
```

---

## Authentication & Setup

### One-Time Setup
1. Deploy the Lambda gatekeeper: `sh deploy_auth.sh`
2. Set your `GITHUB_TOKEN` on Lambda
3. Replace the `LAMBDA_URL` in `index.html`

### Managing the Pulse
- Append `?cms=true` to the URL
- Authenticate with your GitHub Personal Access Token
- Your session is cached — you only need to log in once per machine

---

## PM How-To Guide

> This section explains how to use **Khyaal Engineering Pulse** to lead with vision and manage the engineering pipeline.

---

### Step 1: Strategic Epic Vision & OKRs
**Start here.** Define the "Why" in the **🚀 Epics** view and link to **🎯 OKRs**.

**How to create an Epic:**
1. Navigate to Epics view
2. Click "Add Strategic Epic"
3. Set Name, Description, Health, and Track
4. Link to OKR by using the same ID

**How to create OKRs:**
1. Access Settings (CMS Dashboard)
2. Add OKR with Objective and 3-5 Key Results
3. Link Key Results to Epic IDs
4. Progress auto-calculates from linked tasks

---

### Step 2: Strategic Roadmap Alignment
Align your epics and tasks into strategic timeframes in the **🗺️ Roadmap** view:
- **Now (1M)**: Current commitments
- **Next (3M)**: Validated near-term focus
- **Later (6M+)**: Future vision parking lot

**Pro Tip:** Use the Roadmap Edit feature to add custom planning horizons.

---

### Step 3: Backlog Grooming with Story Points
Refine requirements in the **📚 Backlog** view using **Grooming Mode**.

**In Grooming Mode you can:**
- Assign story points (Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- Set priority (High / Medium / Low)
- Link to Epics, Sprints, Releases
- Set planning horizons
- Add acceptance criteria

**Story Point Guide:**
- 1-2: Trivial change (< 1 hour)
- 3-5: Small feature (1-2 days)
- 8: Medium feature (3-5 days)
- 13: Large feature (1 week)
- 21: Epic-level work (needs breakdown)

---

### Step 4: Capacity Planning & Sprint Commitment
Before committing to a Sprint, check **👥 Capacity Planning**.

**Capacity View shows:**
- Total team capacity (story points per sprint)
- Current utilization % per team member
- Over-allocation warnings
- Recommended sprint load (80-90%)

**Sprint Planning Best Practices:**
1. Calculate total capacity (team size × points/person)
2. Aim for 80-90% utilization (leave buffer for unplanned work)
3. Balance workload across team members
4. Flag over-allocated team members in red

---

### Step 5: Track Execution via Kanban & Analytics
Monitor progress in real-time with the **📊 Kanban** board and **📈 Analytics** dashboard.

**Kanban Features:**
- Drag-and-drop status updates
- Swimlanes by contributor
- WIP limits per column
- Quick-edit cards

**Analytics Dashboard:**
- Average velocity (story points/sprint)
- Sprint completion % (actual vs. planned)
- Burndown/burnup charts
- Velocity trend forecasting

---

### Step 6: Monitor Dependencies & Unblock
Use the **🕸️ Dependencies** view to visualize task relationships.

**Dependency Features:**
- Mermaid.js graph visualization
- Blocker highlighting (red edges)
- Critical path detection
- PNG export for stakeholder reports

---

## Developer How-To Guide

### Step 1: Find Your Tasks
**Switch to Developer Mode** (Alt + 2) to access your personalized **📋 My Tasks** view.

**Tasks are categorized as:**
- **🚨 Blocked**: Tasks waiting on dependencies
- **📅 Due Today**: Tasks due today
- **📆 This Week**: Tasks for current sprint
- **🔮 Upcoming**: Future work

---

### Step 2: Signal Activity via Kanban
When starting work, drag your task to the **Now** column in **📊 Kanban**.

This signals to the PM and team that work is in progress.

---

### Step 3: Flag Blockers Immediately
If you hit an impediment:
1. Click "Flag Blocker" on the task
2. Add blocker reason/note
3. This triggers the Global Blocker Strip (red alert banner)
4. PM gets notified to escalate and unblock

---

### Step 4: Mark Done & Close Loop
Once shipped:
1. Update status to "Done"
2. Add PR link in Note field
3. Save to GitHub
4. This auto-updates Epic and OKR progress

---

## Executive How-To Guide

### Executive Dashboard Overview
The **📊 Dashboard** provides a 30-second health snapshot:

**Key Metrics Shown:**
- **OKR Progress**: Average % across all objectives
- **Epic Health**: Count of On-Track / At-Risk / Delayed
- **Completion Rate**: % of tasks done (overall)
- **Critical Blockers**: Count requiring immediate attention

---

### Reading Epic Health
**Health Indicators:**
- 🟢 **On-Track**: Progressing as planned
- 🟡 **At-Risk**: Needs attention, may slip
- 🔴 **Delayed**: Behind schedule, requires escalation

---

### OKR Tracking
**OKR Progress Formula:**
- Auto-calculated from linked tasks
- Green: ≥ 90% complete
- Blue: 70-89% complete
- Amber: 50-69% complete
- Red: < 50% complete

---

### Velocity Trends
The **Team Velocity Trend** shows:
- Last 3 sprints' completion rates
- Average velocity (story points/sprint)
- Trend indicator (📈 improving / 📉 declining)

**Healthy Velocity:**
- 80-90%: Sustainable pace
- > 90%: Risk of burnout
- < 70%: Under-planning or blockers

---

## View Reference

### 🚀 Epics View
**Purpose:** Strategic business outcome tracking
**Features:**
- Health status (On-Track / At-Risk / Delayed)
- Progress bar (% of linked tasks complete)
- Timeline and owner tracking
- Linked OKR display
- Groom Tasks button (filters Backlog to epic)

---

### 🎯 OKRs View
**Purpose:** Quarterly objectives and key results
**Features:**
- Objective with owner and quarter
- 3-5 Key Results per objective
- Auto-progress calculation from linked tasks
- Status indicators (Achieved / On-Track / At-Risk)
- Linked epic and task display

**Data Model:**
```json
{
  "okrs": [
    {
      "id": "okr-q1-2026-platform",
      "quarter": "Q1 2026",
      "objective": "Modernize platform infrastructure",
      "owner": "Platform Team",
      "keyResults": [
        {
          "id": "kr-platform-1",
          "description": "Migrate 100% of legacy pages",
          "target": 29,
          "current": 29,
          "unit": "pages",
          "progress": 100,
          "status": "achieved",
          "linkedEpic": "platform-modernization"
        }
      ],
      "overallProgress": 99
    }
  ]
}
```

---

### 📊 Kanban View
**Purpose:** Visual workflow management
**Features:**
- 5 columns: Backlog → Next → Now → Ongoing → Done
- Drag-and-drop status updates
- Swimlanes by contributor (optional)
- WIP limits per column
- Quick-edit card modal
- Blocker highlighting

---

### 📈 Analytics View
**Purpose:** Sprint metrics and velocity tracking
**Features:**
- KPI Cards: Avg Velocity, Sprint Completion, Active Items, Done Count
- Velocity Trend Chart (Google Charts)
- Sprint Burndown Chart
- Sprint History Table
- Forecasting based on historical velocity

---

### 👥 Capacity Planning View
**Purpose:** Resource management and sprint planning
**Features:**
- Total team capacity (story points)
- Current utilization % (planned vs. capacity)
- Per-person workload breakdown
- Over-allocation warnings (red)
- Sprint planning recommendations

**Capacity Data Model:**
```json
{
  "capacity": {
    "teamMembers": [
      {
        "name": "Subhrajit",
        "capacity": 13,
        "track": "Khyaal Platform",
        "role": "Full Stack Engineer"
      }
    ],
    "totalCapacity": 86
  }
}
```

---

### 📋 My Tasks View (Developer Mode)
**Purpose:** Personalized developer task list
**Features:**
- Smart categorization (Blocked / Today / Week / Upcoming)
- Due date highlighting
- Blocker alerts with reasons
- Quick links to Kanban, Dependencies, Sprint
- Story point display

---

### 🕸️ Dependencies View
**Purpose:** Blocker and dependency visualization
**Features:**
- Mermaid.js directed graph
- Red edges for active blockers
- Critical path highlighting
- PNG export for reports
- Item linking via task IDs

**How to add dependencies:**
1. Edit any task
2. In Dependencies field, enter task IDs
3. Graph auto-generates on Dependencies view

---

### 🗺️ Roadmap View
**Purpose:** Strategic planning horizons
**Features:**
- Custom horizon categories (editable)
- Now / Next / Later default grouping
- Color-coded by timeframe
- Add/Edit/Delete horizon categories
- Quick-add tasks to horizons

---

### 🏃 Sprints View
**Purpose:** 2-week execution cycles
**Features:**
- Sprint goals and dates
- Planned vs. completed story points
- Progress bars
- Task lists grouped by track
- Sprint velocity calculation

---

### 📚 Backlog View
**Purpose:** Task refinement and grooming hub
**Features:**
- Grooming Mode toggle
- Inline priority/epic/sprint assignment
- Story point estimation
- Acceptance criteria editing
- Move to Sprint button

---

## Data Model Reference

### Item Structure
Every task item includes:

```json
{
  "id": "task-unique-id",
  "text": "Task description",
  "status": "now",
  "priority": "high",
  "storyPoints": 5,
  "effort": "medium",
  "impact": "high",
  "acceptanceCriteria": [
    "Criterion 1",
    "Criterion 2"
  ],
  "contributors": ["Subhrajit", "Vivek"],
  "tags": ["feature", "frontend"],
  "dependencies": ["other-task-id"],
  "blocker": false,
  "blockerNote": "",
  "startDate": "2026-02-01",
  "due": "2026-02-15",
  "sprintId": "sprint-1",
  "epicId": "epic-platform",
  "releasedIn": "v2.1",
  "planningHorizon": "1M",
  "usecase": "User impact description",
  "note": "Technical notes",
  "comments": []
}
```

### Metadata Structure

```json
{
  "metadata": {
    "title": "Khyaal Engineering Pulse",
    "dateRange": "Feb 1 – Mar 18, 2026",
    "modes": {
      "default": "pm"
    },
    "epics": [...],
    "okrs": [...],
    "sprints": [...],
    "releases": [...],
    "roadmap": [...],
    "capacity": {
      "teamMembers": [...],
      "totalCapacity": 86
    },
    "velocityHistory": [...]
  }
}
```

---

## Keyboard Shortcuts

### View Navigation
| Key | View |
|---|---|
| **1** | 🚀 Epics |
| **2** | 🗺️ Roadmap |
| **3** | 📚 Backlog |
| **4** | 🏃 Sprints |
| **5** | 🏗️ Tracks |
| **6** | 📦 Releases |
| **7** | 🧩 By Status |
| **8** | 🎯 By Priority |
| **9** | 👩‍💻 By Contributor |
| **0** | 🔗 Dependencies |
| **/** | Focus Search |

### Mode Switching
| Key | Mode |
|---|---|
| **Alt + 1** | 👨‍💼 PM Mode |
| **Alt + 2** | 👩‍💻 Developer Mode |
| **Alt + 3** | 👔 Executive Mode |

---

## Advanced Features

### Story Point Estimation
**Fibonacci Scale:** 1, 2, 3, 5, 8, 13, 21

**Estimation Guide:**
- **1-2**: Trivial (< 1 hour)
- **3**: Small (1-2 hours)
- **5**: Medium (1 day)
- **8**: Large (2-3 days)
- **13**: Very Large (1 week)
- **21**: Epic (needs breakdown)

### Effort vs. Impact Matrix
**Effort Levels:** Low / Medium / High
**Impact Levels:** Low / Medium / High

**Prioritization:**
- High Impact + Low Effort = Quick Wins (do first)
- High Impact + High Effort = Strategic Bets (plan carefully)
- Low Impact + Low Effort = Fill-ins (do if time permits)
- Low Impact + High Effort = Avoid (unless strategic)

### Acceptance Criteria
Each task can have an array of acceptance criteria:
```json
{
  "acceptanceCriteria": [
    "User can log in with email",
    "Password reset flow works",
    "Session persists for 7 days"
  ]
}
```

### Velocity Tracking
**Formula:** (Completed Story Points / Planned Story Points) × 100

**Healthy Velocity:**
- 80-90%: Sustainable
- 90-100%: Optimal
- < 80%: Under-delivery (investigate blockers)
- > 100%: Over-planning or scope creep

---

## Best Practices

### For Product Managers
1. **Start with OKRs** - Define quarterly objectives first
2. **Link everything** - Connect tasks → Epics → OKRs
3. **Groom weekly** - Keep backlog refined and estimated
4. **Plan at 80%** - Leave 20% buffer for unplanned work
5. **Monitor blockers** - Check Global Blocker Strip daily
6. **Track velocity** - Use historical data for forecasting

### For Developers
1. **Check My Tasks daily** - Start your day with focus
2. **Flag blockers early** - Don't wait until standup
3. **Update status actively** - Keep Kanban current
4. **Add PR links** - Document completed work
5. **Estimate honestly** - Use story points realistically

### For Executives
1. **Review Dashboard weekly** - 5-minute health check
2. **Focus on trends** - Velocity over time matters more than single sprints
3. **Escalate at-risk epics** - Intervene when health is yellow/red
4. **Celebrate wins** - Acknowledge achieved OKRs and Key Results

---

## Troubleshooting

### Issue: Dependency graph not rendering
**Solution:** Ensure Mermaid.js is loaded. Check browser console for errors.

### Issue: OKR progress not updating
**Solution:** Verify tasks are linked to correct `epicId` which maps to OKR's `linkedEpic`.

### Issue: Kanban drag-and-drop not working
**Solution:** Check that CMS mode is enabled (`?cms=true`). Drag-drop requires edit permissions.

### Issue: Capacity planning shows wrong utilization
**Solution:** Ensure all tasks in sprint have `storyPoints` assigned and `sprintId` matches.

---

## Contributing

### Data Structure Changes
When modifying `data.json` structure:
1. Update this README
2. Update CMS forms in `cms.js`
3. Test with both local and GitHub-hosted data
4. Archive old data format before migrating

### Adding New Views
1. Create new `.js` file (e.g., `my-new-view.js`)
2. Add `<script src="my-new-view.js"></script>` to `index.html`
3. Add view container: `<div id="my-new-view" class="view-section"></div>`
4. Add routing in `core.js` switchView function
5. Update this README with view documentation

---

## Credits

**Built for:** Khyaal Engineering Team
**Architecture:** Zero-deployment, GitHub-backed, client-side rendering
**Security:** AWS Lambda authentication gatekeeper
**Visualization:** Mermaid.js (Dependencies), Google Charts (Analytics)
**Styling:** Tailwind CSS via CDN

---

© 2026 Khyaal Inc. | Engineering Pulse Dashboard
