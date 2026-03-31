# Khyaal Engineering Pulse

> A zero-deployment engineering status and PM planning dashboard for the Khyaal team — secure, real-time, and pulse-driven.

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
| **🚀 Epics** | Main Nav [1] | **STRATEGIC START POINT.** High-level goals with health and progress tracking. |
| **🗺️ Roadmap** | Main Nav [2] | Strategic grouping by custom horizons (Now / Next / Later). |
| **📚 Backlog** | Main Nav [3] | **GROOMING HUB.** Detailed tasks requiring refinement and prioritization. |
| **🏃 Sprints** | Main Nav [4] | Execution cycles with real-time delivery tracking and progress bars. |
| **🏗️ Tracks** | Main Nav [5] | Engineering execution grouped by product track (Platform, Pulse, DevOps). |
| **📦 Releases** | Main Nav [6] | Milestone versions with completion tracking of assigned items. |
| **🎯 Priority** | More Views [7] | Items grouped by High / Medium / Low impact. |
| **👩‍💻 Contributor** | More Views [8] | Tasks per team member, grouped by delivery status. |
| **🔗 Dependencies** | More Views | Visual dependency graph showing cross-task blockers. |
| **📊 Timeline** | More Views | Gantt chart view of all dated items. |

### 🎯 Item Statuses

| Status | Meaning |
|---|---|
| 🟢 **Done** | Shipped & live |
| 🔵 **Now** | Actively in development this cycle |
| 🟡 **On-Going** | Operational / recurring work |
| 🟠 **Next** | Validated and prioritized for the near-term |
| ⚪ **Later** | Future consideration / backlog |

---

## Architecture

```
index.html   → Dashboard structure and navigation
core.js      → State management, filtering, and keyboard shortcuts
views.js     → View renderers & Engineering Playbook (Workflow)
cms.js       → Full Management UI (Add/Edit/Delete/Groom)
app.js       → Normalization, GitHub integration, and archiving
data.json    → Single Source of Truth on GitHub
styles.css   → Custom CSS tokens and dashboard styling
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
2. Set your `GITHUB_TOKEN` on Lambda.
3. Replace the `LAMBDA_URL` in `index.html`.

### Managing the Pulse
- Append `?cms=true` to the URL.
- Authenticate with your GitHub Personal Access Token.
- Your session is cached — you only need to log in once per machine.

---

## PM How-To Guide

> This section explains how to use **Khyaal Engineering Pulse** to lead with vision and manage the engineering pipeline.

---

### Step 1: Strategic Epic Vision
**Start here.** Define the "Why" in the **🚀 Epics** view. Every task in the dashboard should eventually map back to one of these high-level capabilities.

### Step 2: Strategic Roadmap Alignment
Align your epics and tasks into strategic timeframes in the **🗺️ Roadmap** view:
- **Now (Immediate / 1 Month)**: Commitments for the current cycle.
- **Next (Strategic / 3 Months)**: Validated focus for the near future.
- **Later (Future / 6 Months+)**: Parking lot for long-term vision.

### Step 3: Backlog Grooming & Detailed Planning
Refine requirements in the **📚 Backlog** view. Use **Grooming Mode** to quickly assign priorities, link items to Epics, and set planning horizons without opening modals.

### Step 4: Sprint Commitment & Execution
In the **🏃 Sprints** view, commit to a set of groomed tasks for the next 2-week window. This creates the "Execution Pulse" for the dev team.

### Step 5: Monitor & Unblock
Proactively resolve impediments using the **Global Blocker Strip** and **Contributor Cards**. Monitor **Epic Health** to report status to executive stakeholders.

---

## Developer How-To Guide

### Step 1: Find Your Focus
Go to it's relevant **By Contributor** view or filter by your **Track**. Identify your `Now` tasks for the current sprint.

### Step 2: Signal Activity
When starting a task, change status to `Now`. This signals the team that work is in progress.

### Step 3: Flag Blockers Immediately
If you hit an impediment, click **Flag Blocker**. This immediately alerts the PM via the dashboard header red strip.

### Step 4: Mark Done & Archive
Once a feature is shipped, set status to `Done`. Add a Note with the PR link for context and save to GitHub.

---

## View Reference

### 🚀 Epics View
The business outcome view. Tracks the health (On-Track / At-Risk / Delayed) of major strategic initiatives.

### 🗺️ Roadmap View
The high-level strategy view. Grouped by custom planning horizons (Now / Next / Later) that you manage directly.

### 📚 Backlog View
The grooming hub. Use **Grooming Mode** for high-velocity refinement of tasks and planning horizons.

### 🏃 Sprints View
The execution pulse. Shows active goals, timelines, and per-track progress bars for the 2-week cycle.

### 🕸️ Dependencies View
The "Red Path" view. Visualizes blockers and cross-task dependencies to identify risks.

---

## Item Fields Reference

| Field | Description |
|---|---|
| **Status** | done, now, ongoing, next, later |
| **Planning Horizon** | Custom categories synced with the Roadmap (Now / Next / Later) |
| **Sprint** | Links a task to a 2-week delivery window |
| **Release** | Links a task to a version milestone (e.g. v2.3) |
| **Epic**| Links a task to a strategic business goal |
| **Blocker Reason** | If filled, triggers Global Blocker alerts |
| **Comments** | Timestamped discussion thread per item |

---

## Keyboard Shortcuts

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

---

© 2026 Khyaal Inc. | Built for the Khyaal Engineering Team