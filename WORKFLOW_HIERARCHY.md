# Product Management Workflow Hierarchy

## Overview

This document describes the complete product management hierarchy implemented in the Khyaal Engineering Pulse system. The hierarchy follows industry best practices for product management and agile development.

---

## The 7-Layer Hierarchy

### 1. **Product Vision & Strategy** 🌟

**Definition:** The ultimate long-term goal and strategic direction for the product.

**Example:** "Become the #1 travel platform for senior citizens in India"

**Data Location:** `metadata.vision` (string)

**Management:** Edit via OKR view → "Edit Vision" button (when authenticated)

**Timeframe:** Multi-year horizon (3-5 years)

**Purpose:** Provides the north star that guides all strategic decisions and aligns the team

---

### 2. **OKRs (Objectives & Key Results)** 🎯

**Definition:** Quarterly measurable outcomes aligned to the product vision.

**Example:**
- **Objective:** "Increase user retention and engagement"
- **Key Results:**
  - 20% increase in weekly active users
  - 95%+ security compliance
  - Launch subscription tier

**Data Location:** `metadata.okrs[]`

**Structure:**
```json
{
  "id": "okr-q1-2026-platform",
  "quarter": "Q1 2026",
  "objective": "Modernize platform and achieve security excellence",
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
```

**Management:**
- Add OKR: OKR view → "Add OKR" button
- Edit OKR: Click "Edit" on any OKR card
- Delete OKR: Click "Delete" on any OKR card

**Timeframe:** Quarterly (3 months)

**Purpose:** Translate vision into measurable quarterly goals with specific metrics

**Links:**
- Key Results link to Epics via `linkedEpic` field
- Epics link back to OKRs via `linkedOKR` field

---

### 3. **Roadmap (Strategic Themes)** 🗺️

**Definition:** Strategic initiatives and planning horizons that help achieve OKRs.

**Example:** "Revamp Onboarding Flow" theme planned for 1M (1 Month) horizon

**Data Location:** `metadata.roadmap[]`

**Structure:**
```json
{
  "id": "1M",
  "label": "Now (Immediate / 1 Month)",
  "color": "blue"
}
```

**Planning Horizons:**
- **1M (1 Month):** Immediate/Now - Currently executing
- **3M (3 Months):** Next/Strategic - Near-term planning
- **6M (6 Months):** Later/Future - Long-term planning

**Management:**
- Add Horizon: Roadmap view → "Add Roadmap Category" button
- Edit Horizon: Click "Edit" on any horizon card
- Delete Horizon: Click "Delete" on any horizon card

**Timeframe:** 1-6 month planning horizons

**Purpose:** Define strategic initiatives mapped to time horizons

**Links:** Tasks link to horizons via `item.planningHorizon` field

---

### 4. **Epics** 📚

**Definition:** Large chunks of work broken down from roadmap themes. Major initiatives spanning multiple sprints.

**Example:** "Platform Modernization Epic" - Modernize legacy systems and enhance platform capabilities

**Data Location:** `metadata.epics[]`

**Structure:**
```json
{
  "id": "platform-modernization",
  "name": "Platform Modernization Epic",
  "track": "Khyaal Platform",
  "objective": "Modernize legacy systems and enhance capabilities",
  "scope": "Website migration, 50Above50, CRM, API enhancements",
  "keyDeliverables": "29 pages migrated, subscription launch, security",
  "successMetrics": "40% speed improvement, revenue growth, 95%+ compliance",
  "timeline": "Feb 1 - Apr 10, 2026",
  "health": "on-track",
  "status": "in_progress",
  "linkedOKR": "okr-q1-2026-platform"
}
```

**Health Status:**
- `on-track`: Progressing as planned
- `at-risk`: Concerns or blockers present
- `delayed`: Behind schedule

**Management:**
- Add Epic: Epics view → "Add Strategic Epic" button
- Edit Epic: Click "Edit" on any epic card
- Delete Epic: Click "Delete" on any epic card

**Timeframe:** 1-3 months typically

**Purpose:** Break down strategic themes into executable work streams

**Links:**
- Epics link to OKRs via `linkedOKR` field
- Tasks link to Epics via `item.epicId` field
- Key Results link to Epics via `linkedEpic` field

---

### 5. **Releases** 🚀

**Definition:** Groups of epics/features ready to launch together as a versioned release.

**Example:** "v2.1 Platform Foundation" - 29 pages migrated, $99 subscription launch, basic security

**Data Location:** `metadata.releases[]`

**Structure:**
```json
{
  "id": "v2.1-platform-foundation",
  "name": "v2.1 Platform Foundation",
  "targetDate": "2026-02-28",
  "tracks": ["Khyaal Platform"],
  "features": "29 legacy pages migrated, $99 subscription launch, basic security",
  "successCriteria": "All pages migrated with 30% performance improvement",
  "impact": "Improved UX, new revenue stream, security baseline",
  "status": "completed",
  "linkedEpic": "platform-modernization"
}
```

**Status:**
- `planned`: Scheduled but not started
- `in_progress`: Currently being worked on
- `completed`: Successfully launched

**Management:**
- Add Release: Releases view → "Add New Release" button
- Edit Release: Click "Edit" on any release card
- Delete Release: Click "Delete" on any release card

**Timeframe:** 2-8 weeks typically

**Purpose:** Package work into shippable increments with clear success criteria

**Links:**
- Releases link to Epics via `linkedEpic` field
- Tasks link to Releases via `item.releasedIn` field

---

### 6. **Backlog** 📝

**Definition:** Granular list of specific tasks and user stories ready for sprint planning.

**Example:** "Add captcha to signup form" - 3 story points, high priority

**Data Location:** `tracks[].subtracks[]` where `subtrack.name === 'Backlog'`

**Structure:**
```json
{
  "id": "platform-website-captcha",
  "text": "Captcha implementation",
  "status": "now",
  "priority": "high",
  "storyPoints": 3,
  "contributors": ["Subhrajit"],
  "note": "Adding bot check on forms",
  "usecase": "Reduces spam and fake submissions",
  "acceptanceCriteria": [
    "Captcha appears on all forms",
    "Bot submissions blocked",
    "Smooth UX maintained"
  ],
  "effortLevel": "low",
  "impactLevel": "medium",
  "startDate": "2026-03-20",
  "due": "2026-03-27",
  "planningHorizon": "1M",
  "epicId": "platform-modernization",
  "sprintId": "sprint-4",
  "releasedIn": "v2.2-security-hardening"
}
```

**Status Values:**
- `done`: Completed
- `now`: Currently being worked on
- `next`: Queued for near-term work
- `later`: Future work

**Priority:**
- `high`: Critical work
- `medium`: Important but not urgent
- `low`: Nice to have

**Management:**
- Add Item: Any view → "+" button on subtrack
- Edit Item: Click "Edit" on any task card
- Delete Item: Click "Delete" on any task card
- Move Item: Edit task and change Track/Subtrack

**Timeframe:** Ongoing queue

**Purpose:** Detailed task inventory ready for sprint planning

**Links:**
- Items link to Epics via `epicId`
- Items link to Planning Horizons via `planningHorizon`
- Items link to Releases via `releasedIn`
- Items link to Sprints via `sprintId`

---

### 7. **Sprints** 🏃

**Definition:** Time-boxed cycles (1-4 weeks) of executing backlog items with a specific goal.

**Example:** "Sprint 4: Enhancement Sprint" - Complete security compliance and launch analytics (55 planned points)

**Data Location:** `metadata.sprints[]`

**Structure:**
```json
{
  "id": "sprint-4",
  "name": "Enhancement Sprint",
  "startDate": "2026-03-15",
  "endDate": "2026-03-28",
  "goal": "Complete security compliance and launch analytics",
  "tracks": ["Khyaal Platform", "Pulse", "DevOps"],
  "plannedPoints": 55,
  "completedPoints": null,
  "status": "active"
}
```

**Status:**
- `planned`: Scheduled for future
- `active`: Currently running
- `completed`: Finished

**Management:**
- Add Sprint: Sprint view → "Add New Sprint" button
- Edit Sprint: Click "Edit" on any sprint card
- Delete Sprint: Click "Delete" on any sprint card

**Timeframe:** 1-4 weeks

**Purpose:** Execute work in focused, time-boxed increments

**Links:**
- Tasks link to Sprints via `item.sprintId` field

**Velocity Tracking:** Stored in `metadata.velocityHistory[]`

---

## Data Flow & Linkages

The hierarchy creates a cascade of linked data:

```
Vision (metadata.vision)
    ↓
OKRs (metadata.okrs[])
    ↓ (linkedOKR)
Roadmap Horizons (metadata.roadmap[])
    ↓ (planningHorizon)
Epics (metadata.epics[])
    ↓ (epicId)
Releases (metadata.releases[])
    ↓ (releasedIn)
Backlog Items (tracks[].subtracks[].items[])
    ↓ (sprintId)
Sprints (metadata.sprints[])
```

### Key Linkage Fields:

1. **OKR → Epic:** `epic.linkedOKR` = `okr.id`
2. **Epic → OKR Key Result:** `keyResult.linkedEpic` = `epic.id`
3. **Release → Epic:** `release.linkedEpic` = `epic.id`
4. **Item → Epic:** `item.epicId` = `epic.id`
5. **Item → Horizon:** `item.planningHorizon` = `roadmap.id`
6. **Item → Release:** `item.releasedIn` = `release.id`
7. **Item → Sprint:** `item.sprintId` = `sprint.id`

---

## Progress Tracking

### Automatic Progress Calculation:

1. **OKR Progress:**
   - Calculated from average of all Key Results' progress
   - Formula: `sum(kr.progress) / keyResults.length`

2. **Key Result Progress:**
   - Calculated from current vs target
   - Formula: `(current / target) * 100`
   - Auto-updated from linked Epic's item completion

3. **Epic Health:**
   - Manually tracked: `on-track`, `at-risk`, `delayed`
   - Based on linked items' status and blockers

4. **Sprint Velocity:**
   - Tracked via completed story points
   - Stored in `metadata.velocityHistory[]`
   - Used for sprint forecasting

---

## Workflow Stages

The system is organized into 4 workflow stages (see workflow-nav.js):

### 1. **Strategic Stage** (Quarterly)
- **Focus:** OKRs and Epics
- **Cadence:** Quarterly planning
- **Purpose:** Define objectives and key results

### 2. **Planning Stage** (Monthly/Weekly)
- **Focus:** Roadmap, Backlog, Sprints, Releases
- **Cadence:** Monthly/Weekly planning
- **Purpose:** Plan work and organize execution

### 3. **Execution Stage** (Daily)
- **Focus:** Tasks, Kanban, Dependencies, Workflow
- **Cadence:** Daily standup
- **Purpose:** Execute tasks and resolve blockers

### 4. **Reporting Stage** (Weekly/Monthly)
- **Focus:** Dashboard, Analytics, Capacity, Status
- **Cadence:** Weekly/Monthly reviews
- **Purpose:** Review progress and make data-driven decisions

---

## Mode-Specific Views

The system supports 3 user modes:

### PM Mode (Product Manager)
- **Access:** All 7 hierarchy levels
- **Default View:** Epics
- **Focus:** Strategic planning and execution oversight

### Dev Mode (Developer)
- **Access:** Execution + Reporting stages only
- **Default View:** My Tasks
- **Focus:** Task execution and blocker resolution
- **Hidden:** Vision, OKRs, Strategic planning

### Exec Mode (Executive)
- **Access:** Strategic + Reporting stages only
- **Default View:** Dashboard
- **Focus:** High-level strategy and metrics
- **Hidden:** Day-to-day execution details

---

## Best Practices

1. **Vision First:** Always start with a clear product vision before defining OKRs
2. **Measurable OKRs:** Every OKR should have 3-5 measurable key results
3. **Link Everything:** Maintain linkages between hierarchy levels for traceability
4. **Regular Reviews:** Review OKRs quarterly, roadmap monthly, sprints weekly
5. **Data-Driven:** Use analytics and velocity history for sprint planning
6. **Keep it Current:** Archive completed work regularly to maintain focus

---

## Management Functions Reference

| Level | Add Function | Edit Function | Delete Function | View |
|-------|--------------|---------------|-----------------|------|
| Vision | `editVision()` | `editVision()` | N/A | OKR View |
| OKR | `openOKREdit()` | `openOKREdit(idx)` | `deleteOKR(idx)` | OKR View |
| Roadmap | `openRoadmapEdit()` | `openRoadmapEdit(id)` | `deleteRoadmap(id)` | Roadmap View |
| Epic | `openEpicEdit()` | `openEpicEdit(idx)` | `deleteEpic(idx)` | Epics View |
| Release | `openReleaseEdit()` | `openReleaseEdit(id)` | `deleteRelease(id)` | Releases View |
| Backlog | `addItem(ti,si)` | `openItemEdit(ti,si,ii)` | `deleteItem(ti,si,ii)` | Any View |
| Sprint | `openSprintEdit()` | `openSprintEdit(id)` | `deleteSprint(id)` | Sprint View |

---

## File References

- **OKR Module:** `okr-module.js` - OKR rendering and vision management
- **CMS Module:** `cms.js` - All CRUD operations for all levels
- **Workflow Navigation:** `workflow-nav.js` - Workflow stage navigation
- **Views:** `views.js` - All view rendering functions
- **Data:** `data.json` - Complete data structure

---

**Last Updated:** April 1, 2026
**Version:** 1.0
**Maintained By:** Khyaal Engineering Team
