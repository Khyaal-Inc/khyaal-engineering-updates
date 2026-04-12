# Design: data.json Enrichment + Khyaal Mobile Workspace
> Date: 2026-04-13  
> Source data: `docs/community_requirements_extracted.md`, `docs/product_roadmap_extracted.md`  
> Approach: Full reconciliation (Approach 2) — enrich existing items + add all missing items + create mobile workspace

---

## Scope

Two parallel deliverables:

1. **Enrich `data.json`** (Core Platform Engineering workspace) — add Q2 2026 OKRs, epics, sprints, releases, ~45 new items across subtracks, and enrich ~15 existing items with correct epic/sprint links.
2. **Create `data-mobile.json`** (Khyaal Mobile workspace) — scaffold for the mobile team with its own OKR, epic, sprint, and ~15 items.
3. **Update `users.json`** — add the mobile project entry and grant all users access.

Mobile items (app-specific) live in `data-mobile.json`. Server-side work for mobile features (Offline Events API, 50A50 upload server) lives in `data.json` under the API subtrack.

---

## Section 1: Q2 2026 OKRs

Three new OKRs to be added to `data.json → metadata.okrs[]`:

### `okr-q2-2026-community-quality`
- **Objective:** Eliminate critical community-reported bugs across Khyaal Core and 50 Above 50
- **Owner:** Platform Team
- **Quarter:** Q2 2026
- **Key Results:**
  - KR1: All P0/P1 critical bugs resolved — target: 100%
  - KR2: 7 critical 50A50 issues closed (category change, pricing, dashboard, redirect) — target: 7
  - KR3: Zero P0 bugs in production at sprint end — target: 0

### `okr-q2-2026-product-growth`
- **Objective:** Ship features driving app downloads, membership revenue, and user engagement
- **Owner:** Platform Team
- **Quarter:** Q2 2026
- **Key Results:**
  - KR1: ₹99 plan live on homepage — target: 1 launch (Apr 8)
  - KR2: Offline Events server-side shipped — target: 1 launch (Apr 24)
  - KR3: 50A50 app-only upload live (drives app downloads) — target: 1 launch (May 8)

### `okr-q2-2026-platform-completeness`
- **Objective:** Complete CMS, roles, insurance, and campaign infrastructure
- **Owner:** Platform Team
- **Quarter:** Q2 2026
- **Key Results:**
  - KR1: CMS membership details page live (reduces 4-click workflow to 1) — target: 1
  - KR2: Individual roles (Event Manager, Support) launched — target: 2 roles
  - KR3: Insurance landing page + Parents Day campaign ready — target: May 8

---

## Section 2: New Epics

Four new epics to be added to `data.json → metadata.epics[]`:

| ID | Name | Track | Linked OKR | Timeline |
|----|------|-------|------------|----------|
| `community-bug-resolution` | Community Bug Resolution | Khyaal Platform | `okr-q2-2026-community-quality` | Apr 12–25, 2026 |
| `fifty-above-fifty-platform` | 50 Above 50 Platform Maturity | Khyaal Platform | `okr-q2-2026-community-quality` | Apr 12–25, 2026 |
| `product-growth-features` | Product Growth Features | Khyaal Platform | `okr-q2-2026-product-growth` | Apr 26–May 9, 2026 |
| `cms-platform-capabilities` | CMS & Platform Capabilities | Khyaal Platform | `okr-q2-2026-platform-completeness` | Apr 26–May 23, 2026 |

---

## Section 3: Sprints + Releases

### New Sprints (append to `metadata.sprints[]`)

| ID | Name | Dates | Goal | Status | Planned Points |
|----|------|-------|------|--------|----------------|
| `sprint-6` | Community Bug Fix Sprint | Apr 12–25 | Resolve all critical bugs, fix 50A50, ship ₹99 plan, Badminton landing | **active** | 55 |
| `sprint-7` | Feature Delivery Sprint | Apr 26–May 9 | Offline Events server, Voice of Kalinga, 50A50 app upload server, CMS membership page | planned | 55 |
| `sprint-8` | Growth & Campaign Sprint | May 10–23 | Parents Day campaign, Insurance landing, Pulse Membership Dashboard, cached categories | planned | 50 |

### New Releases (append to `metadata.releases[]`)

| ID | Name | Target | Contents | Linked Epic |
|----|------|--------|----------|-------------|
| `v3.2-community-fix` | v3.2 Community Fix | 2026-04-25 | Critical bugs (Digi-gold, KCMC copy, 50A50 category/pricing), ₹99 plan, CMS improvements (cache clear, tambola, events CMS) | `community-bug-resolution` |
| `v4.0-feature-release` | v4.0 Feature Release | 2026-05-09 | Offline Events server, Voice of Kalinga, 50A50 app upload, CMS membership details page, Individual roles | `product-growth-features` |

### Roadmap Horizon Updates (update `linkedObjective` on existing entries)

| ID | Label | New linkedObjective |
|----|-------|---------------------|
| `1M` | Now (Immediate / 1 Month) | `okr-q2-2026-community-quality` |
| `3M` | Next (Strategic / 3 Months) | `okr-q2-2026-product-growth` |
| `6M` | Later (Future / 6 Months) | `okr-q2-2026-platform-completeness` |

---

## Section 4: New Items — Core Platform Engineering (`data.json`)

All new items follow the existing item schema. Fields: `id`, `text`, `status`, `priority`, `storyPoints`, `contributors`, `note`, `usecase`, `acceptanceCriteria`, `effortLevel`, `impactLevel`, `tags`, `mediaUrl`, `startDate`, `due`, `planningHorizon`, `epicId`, `sprintId`, `releasedIn` (where applicable).

### Platform Track → Website subtrack (8 new items)

| ID | Text | Status | Priority | Sprint | Due | Owner |
|----|------|--------|----------|--------|-----|-------|
| `platform-website-badminton` | Khyaal Badminton Championship (Kannur) landing page | now | high | sprint-6 | 2026-04-03 | Vivek, Subhrajit |
| `platform-website-99plan` | ₹99 Monthly Membership on homepage | review | high | sprint-6 | 2026-04-09 | Vivek |
| `platform-website-buy-membership-ux` | Buy membership popup — mobile number entry UX broken | now | high | sprint-6 | 2026-04-25 | Subhrajit |
| `platform-website-buy-membership-otp` | Buy membership popup — multiple OTPs on multiple taps | review | high | sprint-6 | 2026-04-25 | Subhrajit |
| `platform-website-pending-migration` | Pending migration from old website | now | high | sprint-6 | 2026-04-06 | Subhrajit |
| `platform-website-recaptcha-50a50` | ReCAPTCHA on 50Above50 website | next | high | sprint-6 | 2026-04-08 | Subhrajit |
| `platform-website-voice-of-kalinga` | Voice of Kalinga landing page + comms | next | medium | sprint-7 | 2026-04-17 | — |
| `platform-website-online-events` | Online Events on Web | later | medium | — | — | — |

### Platform Track → 50Above50 Website subtrack (6 new items)

| ID | Text | Status | Priority | Sprint |
|----|------|--------|----------|--------|
| `platform-50a50-web-registration-cache` | Registration issues: ₹500 shown instead of ₹999 (cache) | next | high | sprint-6 |
| `platform-50a50-web-dashboard-disappears` | Dashboard button disappears intermittently (token/cookie TTL) | now | high | sprint-6 |
| `platform-50a50-web-submit-redirect` | Submit entry redirects to home page (token/cookie TTL) | now | high | sprint-6 |
| `platform-50a50-web-dashboard-persistent` | Dashboard button not persistent in top bar | next | medium | sprint-6 |
| `platform-50a50-web-upload-flow` | Upload entry flow: show submission format before uploading | next | medium | sprint-7 |
| `platform-50a50-web-app-upload-server` | App-only Entry Upload — server-side API | next | high | sprint-7 |

### Platform Track → 50Above50 CRM subtrack (5 new items)

| ID | Text | Status | Priority | Sprint |
|----|------|--------|----------|--------|
| `platform-50a50-crm-category-500` | Category change asks ₹500 (category edit button missing) | next | high | sprint-6 |
| `platform-50a50-crm-extra-categories` | Extra unchecked categories re-appear after manual entry | review | high | sprint-6 |
| `platform-50a50-crm-fresh-pricing` | Fresh user entry pricing ₹500/₹999 random | review | high | sprint-6 |
| `platform-50a50-crm-partially-completed` | Partially completed status stuck on pending delete | review | high | sprint-6 |
| `platform-50a50-crm-export-filter` | Export Submission filter | later | low | — |

### Platform Track → Manage Admin subtrack (7 new items)

| ID | Text | Status | Priority | Sprint | Due |
|----|------|--------|----------|--------|-----|
| `platform-admin-tambola-ticket` | Tambola ticket retention 7 days + event-only filter | next | high | sprint-6 | 2026-04-03 |
| `platform-admin-events-cms` | Events CMS: start time column, link mandatory, image upload | next | medium | sprint-6 | 2026-04-25 |
| `platform-admin-cache-clear` | Manual cache clear capability in CMS | next | medium | sprint-6 | 2026-04-25 |
| `platform-admin-bulk-coins` | Bulk custom coin assignment via CMS | review | medium | — | — |
| `platform-admin-bulk-users` | Bulk User creation & Membership assignment | review | medium | — | — |
| `platform-admin-membership-details` | CMS membership details page (4-click → 1 workflow) | next | high | sprint-7 | 2026-05-09 |
| `platform-admin-individual-roles` | Individual Roles: Event Manager + Support logins | next | medium | sprint-7 | 2026-05-09 |

### Platform Track → API subtrack (11 new items)

| ID | Text | Status | Priority | Sprint | Due |
|----|------|--------|----------|--------|-----|
| `platform-api-renewal-fix` | Renewal issue: post-autopay cancel + renewal (CRON frequency fix) | done | critical | — | Released Apr 2 |
| `platform-api-full-kyc` | Full KYC not working since Oct 2025 | done | critical | — | Released Apr 2 |
| `platform-api-kcmc-card-copy` | KCMC card delivery copy: "15 business days" + 30min/day marketing | next | medium | sprint-6 | 2026-04-25 |
| `platform-api-khyaal-card-track` | Remove Khyaal card track delivery from app | next | medium | sprint-6 | 2026-04-25 |
| `platform-api-digi-gold-sip` | Digi-gold SIP: random monthly payment skip (setup Caratlane call) | next | high | sprint-6 | 2026-04-25 |
| `platform-api-digi-gold-one-time` | Digi-gold one-time: payment fails but amount deducted | next | high | sprint-6 | 2026-04-25 |
| `platform-api-login-error` | Login/Join OTP error message improvement (network issue UX) | later | low | — | — |
| `platform-api-cached-categories` | Cached Old Categories Re-Migration | next | medium | sprint-7 | 2026-05-09 |
| `platform-api-assistant-bot` | Assistant Bot v2.0.1 — server-side upgrade | next | medium | sprint-7 | — |
| `platform-api-offline-events` | Offline Events — server API (register, view tickets, info) | next | high | sprint-7 | 2026-04-24 |
| `platform-api-zoho-crm-travel` | Zoho CRM for Travel setup (driven by Pulse Journey) | later | medium | — | — |

### Platform Track → NEW subtrack: "Campaigns & Events" (4 items)

| ID | Text | Status | Priority | Sprint | Due |
|----|------|--------|----------|--------|-----|
| `platform-campaign-insurance-landing` | Khyaal Insurance landing page | next | medium | sprint-8 | 2026-05-09 |
| `platform-campaign-parents-day` | Parents Day Campaign (Jun 1 release, dev start May 10) | next | high | sprint-8 | 2026-05-08 |
| `platform-campaign-pulse-membership-dashboard` | Pulse Membership Dashboard | next | medium | sprint-8 | — |
| `platform-campaign-senior-spotlight` | Khyaal Senior Spotlight (Trivandrum) | done | — | — | Released Apr 2 |

### Existing items to enrich (update `epicId`, `sprintId`, `planningHorizon`)

All `status: now` or `status: next` items in Website, 50Above50, API subtracks that currently lack `epicId` or `sprintId` will be updated:
- `epicId` → nearest matching new epic
- `sprintId` → `sprint-6` (if due Apr 2026) or `sprint-7` (if due May 2026)
- `planningHorizon` → `"1M"` for sprint-6 items, `"3M"` for sprint-7/8 items

---

## Section 5: `data-mobile.json` — Khyaal Mobile Workspace

New file at repo root: `data-mobile.json`

### Metadata

```
title: "Khyaal Mobile"
workspace: "Khyaal Mobile"
dateRange: "12th April 2026 – Active"
```

**OKR:** `okr-q2-2026-mobile`
- Objective: Ship app features that grow downloads, engagement, and user retention
- KR1: App Bugs Batch released (Apr 11) — done
- KR2: Offline Events mobile shipped (Apr 24)
- KR3: 50A50 app-only upload live (May 8, drives app downloads)
- KR4: Guided Tours launched for new users

**Epic:** `app-experience`
- Name: App Experience & Feature Expansion
- Linked OKR: `okr-q2-2026-mobile`

**Sprints:**
- `sprint-6`: Apr 12–25, "App Bug Fix + Stability", active, 30 planned points
- `sprint-7`: Apr 26–May 9, "App Feature Sprint", planned, 35 planned points
- `sprint-8`: May 10–23, "App Growth Sprint", planned, 30 planned points

**Releases:**
- `v1.0-app-bugs`: Apr 11, completed — App Bugs Batch
- `v2.0-app-features`: May 9, planned — Offline Events, 50A50 upload, Assistant Bot

### Track: `mobile` (Khyaal App, theme: emerald)

**Subtrack: Core App** (6 items)

| ID | Text | Status | Sprint |
|----|------|--------|--------|
| `mobile-core-app-bugs-batch` | App Bugs Batch release (Apr 11) | done | — |
| `mobile-core-event-listing-refresh` | Event listing auto-refresh on visit (not pull-to-refresh only) | done | — |
| `mobile-core-modify-event-link` | Modify event shows old link for some users 2–3 days early | todo | sprint-6 |
| `mobile-core-login-otp-ux` | Login/Join OTP "Oops something went wrong" — better error message | todo | sprint-6 |
| `mobile-core-subscription-cancelled-sheet` | Subscription Cancelled Sheet (export cancelled UPI users) | done | — |
| `mobile-core-kcmc-card-copy` | KCMC card delivery copy change — app-side display | todo | sprint-6 |

**Subtrack: Features** (9 items)

| ID | Text | Status | Sprint | Due |
|----|------|--------|--------|-----|
| `mobile-feat-assistant-bot` | Assistant Bot v2.0.1 | todo | sprint-7 | — |
| `mobile-feat-offline-events` | Offline Events — mobile UI (view, register, tickets, info) | todo | sprint-7 | 2026-04-24 |
| `mobile-feat-50a50-app-upload` | App-only 50A50 Entry Upload — mobile UI | todo | sprint-7 | 2026-05-08 |
| `mobile-feat-guided-tours` | Guided Tours for new users on first launch | planned | sprint-8 | — |
| `mobile-feat-center-stage` | Center Stage | todo | sprint-8 | — |
| `mobile-feat-parents-day` | Parents Day Campaign — mobile side | todo | sprint-8 | 2026-05-08 |
| `mobile-feat-earn-coins-shop` | Earn Coins on Khyaal Shop | backlog | — | — |
| `mobile-feat-streak` | User Streak feature | backlog | — | — |
| `mobile-feat-gamification` | Spin the Wheel & Scratch Card | backlog | — | — |

**Subtrack: Backlog** (empty, reserved for future items)

---

## Section 6: `users.json` Update

Add to `projects[]`:
```json
{
  "id": "mobile",
  "name": "Khyaal Mobile",
  "filePath": "data-mobile.json"
}
```

Grant all 9 existing users access to `projectId: "mobile"` with their existing mode.

---

## Status + Priority Reference

Valid item statuses (from `core.js → priorityConfig` and views usage):

| Use | Status value |
|-----|-------------|
| Completed | `done` |
| Actively in progress | `now` |
| Planned for sprint | `next` |
| Future / backlog | `later` |
| Dev done, pending release | `review` |
| In QA | `qa` |
| Blocked | `blocked` |
| On hold | `onhold` |

Valid priorities: `high`, `medium`, `low` (no `critical` — use `high`).

Valid sprint statuses: `active`, `completed`, `planned`.

---

## Constraints

- All new items must pass `node -e "JSON.parse(require('fs').readFileSync('data.json','utf8'))"` after changes
- `data-mobile.json` must follow identical schema to `data.json` (same field names, same nesting)
- No item IDs may collide between `data.json` and `data-mobile.json`
- `normalizeData()` in `app.js` must not need changes — all new fields use existing schema
- Existing `ceremonyAudit` records must not be touched

---

## Verification

| Check | Expected |
|-------|----------|
| `data.json` total items after enrichment | ~171 (126 existing + 45 new) |
| `data-mobile.json` total items | 15 (6 core + 9 features) |
| Q2 OKRs in `data.json` | 3 |
| New epics in `data.json` | 4 |
| New sprints in `data.json` | 3 (sprint-6, 7, 8) |
| New releases in `data.json` | 2 (v3.2, v4.0) |
| Projects in `users.json` | 2 (default + mobile) |
| Users with mobile grant | 9 |
