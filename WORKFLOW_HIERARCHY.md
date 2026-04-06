# Khyaal Engineering Pulse — Product Workflow Hierarchy

## Overview

This document describes the complete product management hierarchy and 5-stage lifecycle implemented in the Khyaal Engineering Pulse system. The lifecycle follows industry best practices for agile product delivery.

---

## The 5-Stage Lifecycle

```
Discovery → Vision → Definition → Delivery → Review/Ship → (loops back)
```

| Stage | Icon | Who | When | Views |
|-------|------|-----|------|-------|
| **Discovery** | 🔍 | PM | Pre-quarter / ongoing | Ideation, Spikes |
| **Vision** | 🌟 | PM + Exec | Quarter start | OKR, Epics |
| **Definition** | 📐 | PM (+ Dev review) | Sprint start | Roadmap, Backlog, Sprint |
| **Delivery** | 🚀 | Dev + PM | During sprint (daily) | My Tasks, Track, Kanban, Dependencies |
| **Review/Ship** | 🏁 | PM + Exec | Sprint end / release day | Releases, Analytics, Dashboard |

---

## Stage Details

### Stage 1 — Discovery 🔍
**Who:** PM  
**When:** Pre-quarter or ongoing between cycles  
**Goal:** Capture and validate ideas before committing to OKRs

**Steps:**
1. Capture raw ideas and opportunities in **Ideation** view
2. Run technical spikes to validate feasibility in **Spikes** view
3. Tag items with `#idea` or `#spike`
4. Shortlist validated ideas as input for the Vision stage

**Output:** Validated idea list → feeds Vision  
**Views:** Ideation, Spikes

---

### Stage 2 — Vision 🌟
**Who:** PM + Exec  
**When:** Quarter start (once per quarter)  
**Goal:** Set measurable quarterly objectives and break them into strategic Epics

**Steps:**
1. Set quarterly Objectives & Key Results in **OKR** view
2. Create Strategic **Epics** aligned to each OKR
3. Link Key Results to Epics via the "Linked Epic" field
4. Get Exec sign-off on OKR targets via the Dashboard

**Output:** OKRs with linked Epics and measurable Key Results → feeds Definition  
**Views:** OKR, Epics

---

### Stage 3 — Definition 📐
**Who:** PM (Dev reviews)  
**When:** Sprint start (every 1–2 weeks)  
**Goal:** Plan the sprint — groom backlog, assign tasks, create release milestone

**Steps:**
1. Map Epics to planning horizons in **Roadmap** view (1M / 3M / 6M)
2. Break Epics into tasks in **Backlog** — set story points, AC, priority, epic link
3. Assign tasks to sprint via inline "Assign to Sprint ▾" on backlog items
4. Create a **Release** milestone with a target date (release is a *placeholder* at this point)
5. Dev: Review sprint tasks and clarify acceptance criteria before starting

**Output:** Sprint with committed items, Release milestone placeholder created → feeds Delivery  
**Views:** Roadmap, Backlog, Sprint

> **Note on Releases:** A release record is *created* here as a named milestone (e.g. "v2.1 Security Hardening") with a target date. It is *completed/published* in Stage 5 when done items are promoted and shipped.

---

### Stage 4 — Delivery 🚀
**Who:** Dev + PM  
**When:** During sprint (daily)  
**Goal:** Execute committed work, unblock issues, move items to Done

**Steps:**
1. Dev: Open **My Tasks** — see assigned items with Epic + OKR context
2. Move cards on **Kanban**: Later → Next → Now → QA → Review → Done
3. Flag a blocker via the item edit modal if stuck
4. PM: Resolve blockers using the "✅ Resolve" button on the blocker strip
5. Mark items **Done** once code is merged and verified
6. PM: Use **Track** view to see team-wide delivery status

**Output:** Done items in Kanban ready to be shipped → feeds Review/Ship  
**Views:** My Tasks, Kanban, Track, Dependencies

---

### Stage 5 — Review / Ship 🏁
**Who:** PM + Exec  
**When:** Sprint end / release day  
**Goal:** Ship done work to a release, review metrics, update OKR progress, plan next cycle

**Steps:**
1. Click **"📦 Promote Done Items →"** on the sprint card to assign done items to the release
2. Open **Releases** view — verify items, set publish/release date
3. PM: Update OKR Key Result progress (`current` field) based on what shipped
4. Exec: Review **Dashboard** for blocker status, OKR health, and at-risk signals
5. Review **Analytics** — velocity, burndown, team performance trends
6. Decide what goes into next quarter → feeds back to **Discovery**

**Output:** Published release + updated OKR progress → loops back to Discovery  
**Views:** Releases, Analytics, Dashboard

---

## Data Hierarchy & Linkages

The 7-layer data hierarchy maps to the lifecycle stages:

```
Vision (metadata.vision)                     ← Stage 2 (Vision)
  └─ OKRs (metadata.okrs[])                 ← Stage 2 (Vision)
       └─ Epics (metadata.epics[])           ← Stage 2 (Vision)
            └─ Roadmap Horizons              ← Stage 3 (Definition)
                 └─ Backlog Items            ← Stage 3 (Definition)
                      └─ Sprints            ← Stage 3 (Definition)
                           └─ Releases      ← Stage 3 (created) + Stage 5 (published)
```

### Key Linkage Fields

| Relationship | Field |
|---|---|
| Epic → OKR | `epic.linkedOKR` = `okr.id` |
| KR → Epic | `keyResult.linkedEpic` = `epic.id` |
| Release → OKR | `release.linkedOKR` = `okr.id` |
| Item → Epic | `item.epicId` = `epic.id` |
| Item → Horizon | `item.planningHorizon` = `roadmap.id` |
| Item → Release | `item.releasedIn` = `release.id` |
| Item → Sprint | `item.sprintId` = `sprint.id` |

---

## Persona Access by Stage

| Stage | PM | Dev | Exec |
|-------|-----|-----|------|
| Discovery | ✅ Full access | ⚠️ Can view | ✅ Can view |
| Vision | ✅ Full access | 🔒 Read-only fields | ✅ Can review + approve |
| Definition | ✅ Full access | ✅ Review + clarify AC | 🔒 No task-level detail |
| Delivery | ✅ Oversight | ✅ Primary stage | 🔒 Blocker view only |
| Review/Ship | ✅ Full access | ✅ Verify attribution | ✅ Dashboard + Analytics |

---

## Navigation Flow (Next Actions)

Each view has a "Next →" button in the ribbon that follows the correct lifecycle direction:

```
Ideation → Spikes → OKR → Epics → Roadmap → Backlog → Sprint → Track → Kanban → Releases → Analytics → OKR (next quarter)
```

| From View | Next Action | Target |
|-----------|-------------|--------|
| Ideation | Explore Spikes 🧪 | Spikes |
| Spikes | Set Vision 🎯 | OKR |
| OKR | Build Epics 🚀 | Epics |
| Epics | Plan Roadmap 🗺️ | Roadmap |
| Roadmap | Groom Backlog 📚 | Backlog |
| Backlog | Scope Sprints 🏃 | Sprint |
| Sprint | Execute Tasks ⚡ | Track |
| Track | Plan Next Sprint 🏃 | Sprint |
| Kanban | **Ship to Release 📦** | **Releases** |
| **Releases** | **Review Analytics 📊** | **Analytics** |
| Analytics | Plan Next Quarter 🎯 | OKR |
| Dashboard | Plan Next Quarter 🎯 | OKR |

---

## View Lifecycle Stage Reference

| View | Stage | Who |
|------|-------|-----|
| Ideation | Discovery | PM |
| Spikes | Discovery | PM |
| OKR | Vision | PM + Exec |
| Epics | Vision | PM + Exec |
| Roadmap | Definition | PM |
| Backlog | Definition | PM |
| Sprint | Definition | PM + Dev |
| Track | Delivery | Dev + PM |
| Kanban | Delivery | Dev + PM |
| Dependencies | Delivery | Dev + PM |
| Gantt | Delivery | PM |
| **Releases** | **Review/Ship** | **PM + Exec** |
| Analytics | Review | PM + Exec |
| Dashboard | Review | Exec + PM |
| Status | Delivery | PM |
| Priority | Delivery | PM |
| Contributor | Delivery | PM |
| Capacity | Planning | PM |

---

## Management Functions Reference

| Level | Add | Edit | Delete | View |
|-------|-----|------|--------|------|
| Vision | `editVision()` | `editVision()` | N/A | OKR View |
| OKR | `openOKREdit()` | `openOKREdit(idx)` | `deleteOKR(idx)` | OKR View |
| Epic | `openEpicEdit()` | `openEpicEdit(idx)` | `deleteEpic(idx)` | Epics View |
| Roadmap Horizon | `openRoadmapEdit()` | `openRoadmapEdit(id)` | `deleteRoadmap(id)` | Roadmap View |
| Backlog Item | `addItem(ti,si)` | `openItemEdit(ti,si,ii)` | `deleteItem(ti,si,ii)` | Any View |
| Sprint | `openSprintEdit()` | `openSprintEdit(id)` | `deleteSprint(id)` | Sprint View |
| Release | `openReleaseEdit()` | `openReleaseEdit(id)` | `deleteRelease(id)` | Releases View |

### Quick Actions
- **Assign item to sprint:** Inline "Assign to Sprint ▾" dropdown on backlog item cards
- **Promote sprint done items → release:** "📦 Promote Done Items →" button on sprint card (PM + CMS mode)
- **Resolve a blocker:** "✅ Resolve" button on the global blocker strip
- **Filter kanban to my items:** "👤 My Items" toggle in Kanban ribbon (Dev mode only)

---

## Best Practices

1. **Vision first:** Always define OKRs before planning Epics or sprints
2. **Link everything:** Maintain Epic → OKR → KR linkages for full traceability
3. **Create release early, ship late:** Create the release milestone during sprint planning; populate it at sprint end
4. **Resolve blockers fast:** Use the blocker strip "✅ Resolve" button to unblock team members
5. **Regular cadence:** Discovery (ongoing) → Vision (quarterly) → Definition (per sprint) → Delivery (daily) → Review (per sprint)
6. **Update OKR progress after each release:** Manually update Key Result `current` values after shipping

---

**Last Updated:** April 2026  
**Version:** 2.0 — Updated to 5-stage lifecycle model  
**Maintained By:** Khyaal Engineering Team
