# Data Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich `data.json` with Q2 2026 OKRs/epics/sprints/releases and ~45 new items from community requirements + product roadmap, and create `data-mobile.json` as a new Khyaal Mobile workspace scaffold.

**Architecture:** Pure data engineering — no code changes. All work is JSON editing on `data.json`, creating `data-mobile.json`, and updating `users.json`. Both JSON files share identical schema. The mobile workspace separates app-specific items from the server/web platform.

**Tech Stack:** Vanilla JSON. Verification via `node -e "JSON.parse(require('fs').readFileSync(...))"`. No build step.

---

## Reference: Valid Field Values

**Item status:** `done` | `now` | `next` | `later` | `review` | `qa` | `blocked` | `onhold`
**Item priority:** `high` | `medium` | `low`
**planningHorizon:** `"1M"` | `"3M"` | `"6M"`
**Sprint status:** `active` | `completed` | `planned`

> `now` = in progress · `next` = planned for sprint · `later` = backlog · `review` = dev done, pending release

## Reference: Existing IDs (do not reuse)

**OKRs:** `okr-q1-2026-platform`, `okr-q1-2026-analytics`, `okr-q1-2026-infrastructure`
**Epics:** `platform-modernization`, `analytics-intelligence`, `infrastructure-optimization`
**Sprints:** `sprint-1` through `sprint-5` (all `completed`)
**Releases:** `v2.1-platform-foundation`, `v2.2-security-hardening`, `v3.0-analytics-intelligence`, `v3.1-personalization-engine`

---

## Files Modified

| File | Action | What changes |
|------|--------|-------------|
| `data.json` | Modify | Append to `metadata.okrs[]`, `metadata.epics[]`, `metadata.sprints[]`, `metadata.releases[]`; update `metadata.roadmap[]`; append items to 5 existing subtracks; add 1 new subtrack; update ~10 existing items |
| `data-mobile.json` | Create | New file — full workspace scaffold for Khyaal Mobile |
| `users.json` | Modify | Add mobile project to `projects[]`; add mobile grant to all 9 users |

---

## Task 1: Add Q2 2026 OKRs to data.json

**Files:**
- Modify: `data.json` — append to `metadata.okrs[]`

- [ ] **Step 1: Locate the okrs array end in data.json**

  Find the line `"overallProgress": 91` followed by `}` (end of `okr-q1-2026-infrastructure`) and then `]` (end of okrs array). The closing `]` of okrs is around line 174. You need to insert a comma after the last OKR object and add 3 new objects before the `]`.

- [ ] **Step 2: Append 3 new OKR objects to metadata.okrs[]**

  After the closing `}` of `okr-q1-2026-infrastructure` (and before the `]`), add a comma and these 3 objects:

  ```json
  ,
  {
    "id": "okr-q2-2026-community-quality",
    "quarter": "Q2 2026",
    "objective": "Eliminate critical community-reported bugs across Khyaal Core and 50 Above 50",
    "owner": "Platform Team",
    "keyResults": [
      {
        "id": "kr-cq-1",
        "description": "All P0/P1 critical bugs resolved (Digi-gold, KCMC, buy membership flow)",
        "target": 100,
        "current": 0,
        "unit": "%",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "community-bug-resolution"
      },
      {
        "id": "kr-cq-2",
        "description": "7 critical 50A50 issues closed (category change, pricing, dashboard, redirect)",
        "target": 7,
        "current": 4,
        "unit": "issues",
        "progress": 57,
        "status": "on-track",
        "linkedEpic": "fifty-above-fifty-platform"
      },
      {
        "id": "kr-cq-3",
        "description": "Zero P0 bugs in production at sprint end",
        "target": 0,
        "current": 4,
        "unit": "bugs",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "community-bug-resolution"
      }
    ],
    "overallProgress": 19
  },
  {
    "id": "okr-q2-2026-product-growth",
    "quarter": "Q2 2026",
    "objective": "Ship features driving app downloads, membership revenue, and user engagement",
    "owner": "Platform Team",
    "keyResults": [
      {
        "id": "kr-pg-1",
        "description": "₹99 plan live on homepage (Apr 8)",
        "target": 1,
        "current": 0,
        "unit": "launch",
        "progress": 80,
        "status": "on-track",
        "linkedEpic": "product-growth-features"
      },
      {
        "id": "kr-pg-2",
        "description": "Offline Events server-side shipped (Apr 24)",
        "target": 1,
        "current": 0,
        "unit": "launch",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "product-growth-features"
      },
      {
        "id": "kr-pg-3",
        "description": "50A50 app-only upload live to drive app downloads (May 8)",
        "target": 1,
        "current": 0,
        "unit": "launch",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "product-growth-features"
      }
    ],
    "overallProgress": 27
  },
  {
    "id": "okr-q2-2026-platform-completeness",
    "quarter": "Q2 2026",
    "objective": "Complete CMS, roles, insurance, and campaign infrastructure",
    "owner": "Platform Team",
    "keyResults": [
      {
        "id": "kr-pc-1",
        "description": "CMS membership details page live (reduces 4-click workflow to 1)",
        "target": 1,
        "current": 0,
        "unit": "launch",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "cms-platform-capabilities"
      },
      {
        "id": "kr-pc-2",
        "description": "Individual roles (Event Manager, Support) launched",
        "target": 2,
        "current": 0,
        "unit": "roles",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "cms-platform-capabilities"
      },
      {
        "id": "kr-pc-3",
        "description": "Insurance landing page + Parents Day campaign ready by May 8",
        "target": 2,
        "current": 0,
        "unit": "launches",
        "progress": 0,
        "status": "on-track",
        "linkedEpic": "cms-platform-capabilities"
      }
    ],
    "overallProgress": 0
  }
  ```

- [ ] **Step 3: Verify JSON validity**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); console.log('OKRs:', d.metadata.okrs.length)"
  ```
  Expected: `OKRs: 6`

- [ ] **Step 4: Commit**

  ```bash
  git add data.json
  git commit -m "data: add Q2 2026 OKRs (community-quality, product-growth, platform-completeness)"
  ```

---

## Task 2: Add New Epics to data.json

**Files:**
- Modify: `data.json` — append to `metadata.epics[]`

- [ ] **Step 1: Append 4 new epics to metadata.epics[]**

  After the closing `}` of `infrastructure-optimization` epic (and before the `]`), add a comma and:

  ```json
  ,
  {
    "id": "community-bug-resolution",
    "name": "Community Bug Resolution",
    "track": "Khyaal Platform",
    "objective": "Resolve all critical and high-priority bugs reported by the community across Khyaal Core and 50A50",
    "scope": "Digi-gold payment bugs, KCMC card copy, buy membership UX/OTP, renewal fix, Full KYC, 50A50 category/pricing bugs",
    "keyDeliverables": "Zero P0 bugs, all community-reported critical issues resolved",
    "successMetrics": "P0 bug count = 0, support ticket volume -40%, user satisfaction",
    "timeline": "Apr 12 - Apr 25, 2026",
    "health": "on-track",
    "status": "in_progress",
    "linkedOKR": "okr-q2-2026-community-quality",
    "planningHorizon": "1M"
  },
  {
    "id": "fifty-above-fifty-platform",
    "name": "50 Above 50 Platform Maturity",
    "track": "Khyaal Platform",
    "objective": "Stabilize the 50A50 CRM and website, fix all open issues, and ship app-only entry upload",
    "scope": "50A50 CRM category/pricing bugs, website dashboard/redirect bugs, upload flow improvement, app-only entry upload",
    "keyDeliverables": "All 7 critical 50A50 issues resolved, app-only upload live",
    "successMetrics": "50A50 issue count = 0, upload flow completion rate >80%",
    "timeline": "Apr 12 - May 9, 2026",
    "health": "on-track",
    "status": "in_progress",
    "linkedOKR": "okr-q2-2026-community-quality",
    "planningHorizon": "1M"
  },
  {
    "id": "product-growth-features",
    "name": "Product Growth Features",
    "track": "Khyaal Platform",
    "objective": "Ship engagement and growth features across web and server to increase app downloads and membership revenue",
    "scope": "₹99 plan homepage, Offline Events server API, 50A50 app-only upload server, Voice of Kalinga, Assistant Bot v2.0.1",
    "keyDeliverables": "₹99 on homepage, Offline Events API, app-only upload API, 3 event landing pages",
    "successMetrics": "App downloads +20%, membership revenue +15%, 3 events launched on time",
    "timeline": "Apr 12 - May 9, 2026",
    "health": "on-track",
    "status": "in_progress",
    "linkedOKR": "okr-q2-2026-product-growth",
    "planningHorizon": "3M"
  },
  {
    "id": "cms-platform-capabilities",
    "name": "CMS & Platform Capabilities",
    "track": "Khyaal Platform",
    "objective": "Complete CMS admin improvements, roles, insurance landing, and campaign infrastructure",
    "scope": "CMS membership details page, individual roles, cache clear, events CMS improvements, insurance landing, Parents Day campaign, Pulse Membership Dashboard",
    "keyDeliverables": "Membership details page, 2 new roles, cache clear button, insurance landing, Parents Day campaign",
    "successMetrics": "4-click workflow reduced to 1, 2 roles operational, campaigns launched on time",
    "timeline": "Apr 12 - May 23, 2026",
    "health": "on-track",
    "status": "in_progress",
    "linkedOKR": "okr-q2-2026-platform-completeness",
    "planningHorizon": "3M"
  }
  ```

- [ ] **Step 2: Verify**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); console.log('Epics:', d.metadata.epics.map(e=>e.id))"
  ```
  Expected: 7 epic IDs including the 4 new ones.

- [ ] **Step 3: Commit**

  ```bash
  git add data.json
  git commit -m "data: add 4 Q2 epics (community-bug-resolution, fifty-above-fifty-platform, product-growth-features, cms-platform-capabilities)"
  ```

---

## Task 3: Add Sprints 6–8, Releases v3.2/v4.0, Update Roadmap Horizons

**Files:**
- Modify: `data.json` — append to `metadata.sprints[]`, append to `metadata.releases[]`, update `metadata.roadmap[]`

- [ ] **Step 1: Append 3 new sprints to metadata.sprints[]**

  After closing `}` of `sprint-5` (and before `]`):

  ```json
  ,
  {
    "id": "sprint-6",
    "name": "Community Bug Fix Sprint",
    "startDate": "2026-04-12",
    "endDate": "2026-04-25",
    "goal": "Resolve all critical community bugs, fix 50A50 issues, ship ₹99 plan on homepage, complete Badminton landing page",
    "tracks": ["Khyaal Platform", "Pulse", "DevOps"],
    "plannedPoints": 55,
    "completedPoints": 0,
    "status": "active",
    "linkedOKR": "okr-q2-2026-community-quality"
  },
  {
    "id": "sprint-7",
    "name": "Feature Delivery Sprint",
    "startDate": "2026-04-26",
    "endDate": "2026-05-09",
    "goal": "Ship Offline Events server API, Voice of Kalinga landing page, 50A50 app upload server side, CMS membership details page",
    "tracks": ["Khyaal Platform", "Pulse", "DevOps"],
    "plannedPoints": 55,
    "completedPoints": 0,
    "status": "planned",
    "linkedOKR": "okr-q2-2026-product-growth"
  },
  {
    "id": "sprint-8",
    "name": "Growth & Campaign Sprint",
    "startDate": "2026-05-10",
    "endDate": "2026-05-23",
    "goal": "Parents Day campaign, Insurance landing page, Pulse Membership Dashboard, Cached Categories Re-Migration",
    "tracks": ["Khyaal Platform", "Pulse", "DevOps"],
    "plannedPoints": 50,
    "completedPoints": 0,
    "status": "planned",
    "linkedOKR": "okr-q2-2026-platform-completeness"
  }
  ```

- [ ] **Step 2: Append 2 new releases to metadata.releases[]**

  After closing `}` of `v3.1-personalization-engine` (and before `]`):

  ```json
  ,
  {
    "id": "v3.2-community-fix",
    "name": "v3.2 Community Fix",
    "targetDate": "2026-04-25",
    "tracks": ["Khyaal Platform"],
    "features": "Critical bugs (Digi-gold SIP/one-time, KCMC card copy, buy membership UX/OTP), ₹99 plan on homepage, 50A50 category/pricing/dashboard fixes, CMS improvements (cache clear, tambola ticket, events CMS)",
    "successCriteria": "Zero P0 bugs in production, all community-reported critical issues resolved",
    "impact": "Restored user trust, unblocked revenue flows, stabilized 50A50 platform",
    "status": "in_progress",
    "linkedEpic": "community-bug-resolution"
  },
  {
    "id": "v4.0-feature-release",
    "name": "v4.0 Feature Release",
    "targetDate": "2026-05-09",
    "tracks": ["Khyaal Platform", "Pulse"],
    "features": "Offline Events server API, Voice of Kalinga landing page, 50A50 app-only upload server, CMS membership details page, Individual roles (Event Manager, Support)",
    "successCriteria": "Offline Events API live, 50A50 app upload functional, CMS membership page reduces workflow to 1 click",
    "impact": "Increased app downloads, expanded platform capabilities, reduced ops friction",
    "status": "planned",
    "linkedEpic": "product-growth-features"
  }
  ```

- [ ] **Step 3: Update roadmap linkedObjective values**

  In `metadata.roadmap[]`, update the 3 existing entries:
  - `"1M"` entry: change `"linkedObjective": "okr-q1-2026-platform"` → `"linkedObjective": "okr-q2-2026-community-quality"`
  - `"3M"` entry: change `"linkedObjective": "okr-q1-2026-analytics"` → `"linkedObjective": "okr-q2-2026-product-growth"`
  - `"6M"` entry: change `"linkedObjective": "okr-q1-2026-infrastructure"` → `"linkedObjective": "okr-q2-2026-platform-completeness"`

- [ ] **Step 4: Verify**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  console.log('Sprints:', d.metadata.sprints.length, d.metadata.sprints.map(s=>s.id+':'+s.status))
  console.log('Releases:', d.metadata.releases.length, d.metadata.releases.map(r=>r.id))
  console.log('Roadmap:', d.metadata.roadmap.map(r=>r.id+'=>'+r.linkedObjective))
  "
  ```
  Expected: 8 sprints (5 completed + 3 new), 6 releases, roadmap pointing to Q2 OKRs.

- [ ] **Step 5: Commit**

  ```bash
  git add data.json
  git commit -m "data: add sprints 6-8, releases v3.2/v4.0, update roadmap to Q2 OKRs"
  ```

---

## Task 4: Add 8 New Items to Platform → Website Subtrack

**Files:**
- Modify: `data.json` — append to `tracks[0].subtracks[0].items[]` (platform track, Website subtrack)

- [ ] **Step 1: Confirm target subtrack**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[0]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `Website items: 18`

- [ ] **Step 2: Append 8 new items to platform → Website subtrack**

  Append after the last item in `tracks[0].subtracks[0].items[]`:

  ```json
  ,
  {
    "id": "platform-website-badminton",
    "text": "Khyaal Badminton Championship (Kannur) landing page + comms",
    "status": "now",
    "priority": "high",
    "storyPoints": 5,
    "contributors": ["Vivek", "Subhrajit"],
    "note": "Landing page and communications setup for Khyaal Badminton Championship in Kannur.",
    "usecase": "Drives registrations and app downloads for the event; surfaces Khyaal brand.",
    "acceptanceCriteria": ["Landing page live with event details", "Registration form functional", "Communication emails/notifications configured"],
    "effortLevel": "medium",
    "impactLevel": "high",
    "tags": ["event", "landing-page"],
    "mediaUrl": "",
    "startDate": "2026-04-03",
    "due": "2026-04-03",
    "planningHorizon": "1M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-99plan",
    "text": "₹99 Monthly Membership — surface on homepage",
    "status": "review",
    "priority": "high",
    "storyPoints": 3,
    "contributors": ["Vivek"],
    "note": "Surface ₹99/month plan prominently on the Khyaal homepage to drive new membership signups.",
    "usecase": "Increases conversion from homepage visitors to paid members by reducing barrier to entry.",
    "acceptanceCriteria": ["₹99 plan card visible on homepage above the fold", "Clicking CTA leads to correct checkout flow", "Plan details accurate (price, features, billing cycle)"],
    "effortLevel": "low",
    "impactLevel": "high",
    "tags": ["membership", "revenue"],
    "mediaUrl": "",
    "startDate": "2026-04-08",
    "due": "2026-04-09",
    "planningHorizon": "1M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-buy-membership-ux",
    "text": "Buy membership popup — mobile number entry UX broken",
    "status": "now",
    "priority": "high",
    "storyPoints": 3,
    "contributors": ["Subhrajit"],
    "note": "Mobile number entry UX in the buy membership popup is broken. Users cannot complete the purchase flow.",
    "usecase": "Unblocks membership purchase flow on website; critical for revenue.",
    "acceptanceCriteria": ["Mobile number entry field works correctly", "Input validation shows appropriate errors", "User can proceed to OTP step successfully"],
    "effortLevel": "low",
    "impactLevel": "high",
    "tags": ["bug", "membership", "ux"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-buy-membership-otp",
    "text": "Buy membership popup — multiple OTPs triggered on multiple taps",
    "status": "review",
    "priority": "high",
    "storyPoints": 2,
    "contributors": ["Subhrajit"],
    "note": "Tapping the OTP send button multiple times triggers multiple OTP requests, causing confusion.",
    "usecase": "Prevents user confusion and OTP flooding; improves purchase conversion.",
    "acceptanceCriteria": ["OTP button disabled after first tap", "Cooldown timer shown before allowing resend", "Only one OTP request sent per tap"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["bug", "membership", "otp"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-pending-migration",
    "text": "Pending migration from old website — complete remaining pages",
    "status": "now",
    "priority": "high",
    "storyPoints": 8,
    "contributors": ["Subhrajit"],
    "note": "Remaining pages from the old website still need to be migrated to the new platform. Dev work through Apr 6.",
    "usecase": "Completes platform modernization; removes legacy hosting dependency.",
    "acceptanceCriteria": ["All remaining pages migrated", "No broken links", "Performance parity with existing migrated pages"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["migration", "website"],
    "mediaUrl": "",
    "startDate": "2026-04-06",
    "due": "2026-04-06",
    "planningHorizon": "1M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-recaptcha-50a50",
    "text": "ReCAPTCHA on 50Above50 website forms",
    "status": "next",
    "priority": "high",
    "storyPoints": 3,
    "contributors": ["Subhrajit"],
    "note": "Add ReCAPTCHA to 50Above50 website to prevent bot submissions (same implementation as Khyaal website).",
    "usecase": "Protects 50A50 registration and entry forms from automated attacks.",
    "acceptanceCriteria": ["reCAPTCHA v3 added to 50A50 registration form", "reCAPTCHA v3 added to 50A50 entry submission form", "Score threshold configured", "No false positive blocking for legitimate users"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["security", "50above50"],
    "mediaUrl": "",
    "startDate": "2026-04-07",
    "due": "2026-04-08",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-website-voice-of-kalinga",
    "text": "Voice of Kalinga — landing page + communications setup",
    "status": "next",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Landing page and communications setup for Voice of Kalinga event. Target: Apr 17.",
    "usecase": "Drives registrations for the event; promotes Khyaal brand in Kalinga region.",
    "acceptanceCriteria": ["Landing page live by Apr 17", "Event details, dates, registration information complete", "Communication flow configured"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["event", "landing-page"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-17",
    "planningHorizon": "3M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-website-online-events",
    "text": "Online Events on Web — web-based online event support",
    "status": "later",
    "priority": "medium",
    "storyPoints": 8,
    "contributors": [],
    "note": "Build web-based online events support so users can join live events from the browser.",
    "usecase": "Expands event access beyond app users; increases engagement.",
    "acceptanceCriteria": ["Online events visible and joinable on web", "Registration flow works", "Live event link accessible post-registration"],
    "effortLevel": "high",
    "impactLevel": "medium",
    "tags": ["events", "web"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "6M",
    "epicId": "product-growth-features",
    "sprintId": null
  }
  ```

- [ ] **Step 3: Verify**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[0]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `Website items: 26`

- [ ] **Step 4: Commit**

  ```bash
  git add data.json
  git commit -m "data: add 8 new Website subtrack items (badminton, 99plan, buy-membership, migration, recaptcha, kalinga, online-events)"
  ```

---

## Task 5: Add Items to 50Above50 Website and 50Above50 CRM Subtracks

**Files:**
- Modify: `data.json` — append to `tracks[0].subtracks[1].items[]` (50Above50 Website) and `tracks[0].subtracks[2].items[]` (50Above50 CRM)

- [ ] **Step 1: Confirm target subtracks**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  console.log(d.tracks[0].subtracks[1].name, 'items:', d.tracks[0].subtracks[1].items.length)
  console.log(d.tracks[0].subtracks[2].name, 'items:', d.tracks[0].subtracks[2].items.length)
  "
  ```
  Expected: `50Above50 Website items: 12` and `50Above50 CRM items: 3`

- [ ] **Step 2: Append 6 items to platform → 50Above50 Website subtrack**

  Append after the last item in `tracks[0].subtracks[1].items[]`:

  ```json
  ,
  {
    "id": "platform-50a50-web-registration-cache",
    "text": "50A50 registration shows ₹500 instead of ₹999 (cache issue)",
    "status": "next",
    "priority": "high",
    "storyPoints": 3,
    "contributors": [],
    "note": "New registration page shows ₹500 instead of ₹999 due to a cache issue.",
    "usecase": "Fixes incorrect pricing display that confuses new registrants.",
    "acceptanceCriteria": ["New registration always shows ₹999", "Cache cleared for affected pages", "No price mismatch between display and checkout"],
    "effortLevel": "low",
    "impactLevel": "high",
    "tags": ["bug", "pricing", "50above50"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-web-dashboard-disappears",
    "text": "50A50 dashboard button disappears intermittently (token/cookie TTL)",
    "status": "now",
    "priority": "high",
    "storyPoints": 3,
    "contributors": [],
    "note": "Dashboard button vanishes after token/cookie expiry. Check Token/Cookie TTL and contest caching.",
    "usecase": "Ensures users can always access their dashboard without hard-refreshing.",
    "acceptanceCriteria": ["Dashboard button remains visible throughout session", "Token refresh handled gracefully", "No UI disappearance on TTL expiry"],
    "effortLevel": "low",
    "impactLevel": "high",
    "tags": ["bug", "auth", "50above50"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-web-submit-redirect",
    "text": "50A50 submit entry redirects to home page instead of confirmation",
    "status": "now",
    "priority": "high",
    "storyPoints": 3,
    "contributors": [],
    "note": "Clicking Submit Entry redirects user back to home page. Likely token/cookie TTL or contest caching issue.",
    "usecase": "Users lose submission progress; fixing this prevents data loss and user frustration.",
    "acceptanceCriteria": ["Submit Entry leads to confirmation screen", "Entry saved correctly before redirect", "No unexpected redirect to home page"],
    "effortLevel": "low",
    "impactLevel": "high",
    "tags": ["bug", "50above50", "submission"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-web-dashboard-persistent",
    "text": "50A50 dashboard button not persistent in website top bar",
    "status": "next",
    "priority": "medium",
    "storyPoints": 2,
    "contributors": [],
    "note": "Dashboard button should be visible throughout the website top bar for all logged-in users.",
    "usecase": "Improves navigation and reduces friction for returning contestants.",
    "acceptanceCriteria": ["Dashboard button visible in top bar on all pages for logged-in users", "Button persists through page navigation"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["ux", "50above50"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-web-upload-flow",
    "text": "50A50 upload entry flow — show submission format before uploading",
    "status": "next",
    "priority": "medium",
    "storyPoints": 3,
    "contributors": [],
    "note": "Change upload flow so user sees required submission format/template before uploading their entry.",
    "usecase": "Reduces invalid submissions; improves first-time submission success rate.",
    "acceptanceCriteria": ["Submission format/guidelines shown before upload prompt", "User acknowledges format before proceeding", "Upload step comes after format review"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["ux", "50above50", "upload"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-05-09",
    "planningHorizon": "3M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-50a50-web-app-upload-server",
    "text": "50A50 app-only entry upload — server-side API",
    "status": "next",
    "priority": "high",
    "storyPoints": 8,
    "contributors": [],
    "note": "Server-side API to support app-only entry submission for 50A50. Mobile UI handled in Khyaal Mobile workspace.",
    "usecase": "Enforces app-only upload policy to drive app downloads.",
    "acceptanceCriteria": ["API endpoint accepts entry uploads from authenticated app users", "Web upload disabled after feature ships", "App upload validated correctly (file type, size, category)"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["50above50", "api", "app"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-05-08",
    "planningHorizon": "3M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-7"
  }
  ```

- [ ] **Step 3: Append 5 items to platform → 50Above50 CRM subtrack**

  Append after the last item in `tracks[0].subtracks[2].items[]`:

  ```json
  ,
  {
    "id": "platform-50a50-crm-category-500",
    "text": "50A50 category change asks ₹500 — category edit button missing",
    "status": "next",
    "priority": "high",
    "storyPoints": 5,
    "contributors": [],
    "note": "Changing category in the dashboard triggers a ₹500 charge. Category edit button needs to be added separately from the payment flow.",
    "usecase": "Allows contestants to correct category errors without being incorrectly charged.",
    "acceptanceCriteria": ["Category edit button added to dashboard", "Category change does not trigger payment", "Category change saved correctly in CRM"],
    "effortLevel": "medium",
    "impactLevel": "high",
    "tags": ["bug", "50above50", "crm", "pricing"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-crm-extra-categories",
    "text": "50A50 extra unchecked categories re-appear after manual dashboard entry",
    "status": "review",
    "priority": "high",
    "storyPoints": 3,
    "contributors": [],
    "note": "Unchecked categories re-appear after manual entry. Fix involves data script to remove impacted users and fixing pre-selected category display logic.",
    "usecase": "Ensures category list is clean and accurate; prevents duplicate/ghost category entries.",
    "acceptanceCriteria": ["Impacted users cleaned up via data script", "Pre-selected categories not duplicated on manual entry", "Category display accurate after save"],
    "effortLevel": "medium",
    "impactLevel": "high",
    "tags": ["bug", "50above50", "crm"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-crm-fresh-pricing",
    "text": "50A50 fresh user back-to-back entries showing ₹500 and ₹999 randomly",
    "status": "review",
    "priority": "high",
    "storyPoints": 3,
    "contributors": [],
    "note": "Fresh users making back-to-back contest entries randomly see ₹500 and ₹999. Pricing logic must be consistent.",
    "usecase": "Ensures consistent and correct pricing for all users.",
    "acceptanceCriteria": ["First entry always ₹999", "Subsequent entries follow correct pricing rules", "No random price flip between ₹500 and ₹999"],
    "effortLevel": "medium",
    "impactLevel": "high",
    "tags": ["bug", "50above50", "pricing"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-crm-partially-completed",
    "text": "50A50 partially completed status stuck when deleting pending entry",
    "status": "review",
    "priority": "high",
    "storyPoints": 2,
    "contributors": [],
    "note": "Deleting a pending entry from the partially-completed list doesn't update the user's status correctly.",
    "usecase": "Accurate status tracking ensures users can re-enter without being stuck in a limbo state.",
    "acceptanceCriteria": ["Deleting pending entry updates status from partially-completed to open/eligible", "Status update reflected immediately in dashboard", "No orphaned entries in CRM"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["bug", "50above50", "crm"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-50a50-crm-export-filter",
    "text": "50A50 export submission filter",
    "status": "later",
    "priority": "low",
    "storyPoints": 3,
    "contributors": [],
    "note": "Add filter capability to the submission export feature — filter by category, status, or date range.",
    "usecase": "Reduces manual data filtering work for operations team.",
    "acceptanceCriteria": ["Export filtered by category", "Export filtered by submission status", "Export filtered by date range"],
    "effortLevel": "low",
    "impactLevel": "low",
    "tags": ["feature", "50above50", "crm", "export"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "6M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": null
  }
  ```

- [ ] **Step 4: Verify**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  console.log(d.tracks[0].subtracks[1].name, 'items:', d.tracks[0].subtracks[1].items.length)
  console.log(d.tracks[0].subtracks[2].name, 'items:', d.tracks[0].subtracks[2].items.length)
  "
  ```
  Expected: `50Above50 Website items: 18` and `50Above50 CRM items: 8`

- [ ] **Step 5: Commit**

  ```bash
  git add data.json
  git commit -m "data: add 50A50 website (6 items) and CRM (5 items) subtrack items"
  ```

---

## Task 6: Add 7 New Items to Manage Admin Subtrack

**Files:**
- Modify: `data.json` — append to `tracks[0].subtracks[3].items[]` (Manage Admin subtrack)

- [ ] **Step 1: Confirm target subtrack**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[3]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `Manage Admin items: 5`

- [ ] **Step 2: Append 7 items to Manage Admin subtrack**

  Append after the last item in `tracks[0].subtracks[3].items[]`:

  ```json
  ,
  {
    "id": "platform-admin-tambola-ticket",
    "text": "Tambola ticket retention 7 days + event-only search filter",
    "status": "next",
    "priority": "high",
    "storyPoints": 3,
    "contributors": ["Vivek"],
    "note": "Discard Tambola tickets after 7 days. Search box in CMS should filter by that event's tickets only.",
    "usecase": "Prevents clutter in the CMS ticket list; reduces confusion when managing multiple game sessions.",
    "acceptanceCriteria": ["Tickets older than 7 days auto-discarded", "Search box filters to event-specific tickets only", "Retention policy documented"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["cms", "tambola"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-03",
    "planningHorizon": "1M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-admin-events-cms",
    "text": "Events CMS: start time in column, link mandatory, upload image from CMS",
    "status": "next",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Three CMS event improvements: (1) show start time in event list column; (2) make link field mandatory; (3) image upload from CMS instead of URL-only.",
    "usecase": "Reduces ops friction in event management; prevents events going live without links.",
    "acceptanceCriteria": ["Events list column shows start time (not image URL)", "Link field validation prevents save without value", "Image upload from CMS functional"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["cms", "events"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-admin-cache-clear",
    "text": "Manual cache clear capability in CMS",
    "status": "next",
    "priority": "medium",
    "storyPoints": 3,
    "contributors": [],
    "note": "Add a manual cache clear button in CMS so ops team can clear cache without developer intervention.",
    "usecase": "Reduces ops dependency on engineering for routine cache busting after content updates.",
    "acceptanceCriteria": ["Cache clear button visible in CMS admin", "Clicking clears relevant caches (API, CDN, page cache)", "Success/failure feedback shown"],
    "effortLevel": "low",
    "impactLevel": "medium",
    "tags": ["cms", "cache", "devops"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-admin-bulk-coins",
    "text": "Bulk custom coin assignment via CMS",
    "status": "review",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Allow bulk coin assignment to multiple users via CSV upload in CMS.",
    "usecase": "Reduces manual effort for campaign coin rewards; enables bulk operations team workflows.",
    "acceptanceCriteria": ["CSV upload accepted with user_id and coin_amount columns", "Bulk operation processed with success/failure count", "Audit log created"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["cms", "coins", "bulk"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "1M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-admin-bulk-users",
    "text": "Bulk User creation and Membership assignment",
    "status": "review",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Allow batch creation of users and assignment of memberships via CSV upload in CMS.",
    "usecase": "Enables onboarding of corporate or community group members in bulk.",
    "acceptanceCriteria": ["CSV upload accepted for batch user creation", "Membership auto-assigned per CSV spec", "Error rows reported with reason"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["cms", "users", "bulk", "membership"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "1M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-admin-membership-details",
    "text": "CMS membership details page — single profile view (4-click → 1)",
    "status": "next",
    "priority": "high",
    "storyPoints": 8,
    "contributors": [],
    "note": "Currently viewing membership details requires 4 clicks + manual time conversion. New page consolidates all User Membership details (per Raissa Pinto spec) with assign membership flow.",
    "usecase": "Reduces ops time per member inquiry from ~2 min to <30 sec.",
    "acceptanceCriteria": ["Single profile page shows all membership details", "Fields per Raissa Pinto spec (dates, status, plan, payment history)", "Assign membership flow on same page", "Time conversion automatic"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["cms", "membership", "ux"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-05-09",
    "planningHorizon": "3M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-admin-individual-roles",
    "text": "Individual Roles: Event Manager + Support user types with separate logins",
    "status": "next",
    "priority": "medium",
    "storyPoints": 8,
    "contributors": [],
    "note": "Create Event Manager and Support role types with separate CMS login. User list from Raissa Pinto.",
    "usecase": "Enables ops team members to manage events and support tickets without full admin access.",
    "acceptanceCriteria": ["Event Manager role: can create/edit events, cannot access billing", "Support role: can view user profiles and memberships, cannot edit", "Separate login credentials per role", "User list provisioned per Raissa Pinto spec"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["cms", "roles", "auth"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-05-09",
    "planningHorizon": "3M",
    "epicId": "cms-platform-capabilities",
    "sprintId": "sprint-7"
  }
  ```

- [ ] **Step 3: Verify**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[3]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `Manage Admin items: 12`

- [ ] **Step 4: Commit**

  ```bash
  git add data.json
  git commit -m "data: add 7 new Manage Admin items (tambola, events-cms, cache-clear, bulk-coins, bulk-users, membership-details, individual-roles)"
  ```

---

## Task 7: Add 11 New Items to API Subtrack

**Files:**
- Modify: `data.json` — append to `tracks[0].subtracks[4].items[]` (API subtrack)

- [ ] **Step 1: Confirm target subtrack**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[4]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `API items: 17`

- [ ] **Step 2: Append 11 items to API subtrack**

  Append after the last item in `tracks[0].subtracks[4].items[]`:

  ```json
  ,
  {
    "id": "platform-api-renewal-fix",
    "text": "Renewal issue fix — post-autopay cancel + renewal (CRON frequency)",
    "status": "done",
    "priority": "high",
    "storyPoints": 5,
    "contributors": [],
    "note": "Post autopay cancel + renewal flow was broken; required manual backend activation. Fixed by increasing CRON job frequency. Released Apr 2.",
    "usecase": "Ensures autopay renewal works end-to-end without manual intervention.",
    "acceptanceCriteria": ["Renewal works automatically post autopay cancel", "CRON frequency increased to handle timely processing", "Akshay confirmed fix in testing"],
    "effortLevel": "medium",
    "impactLevel": "high",
    "tags": ["bug", "payment", "renewal"],
    "mediaUrl": "",
    "startDate": "2026-03-28",
    "due": "2026-04-02",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-5",
    "releasedIn": "v3.1-personalization-engine"
  },
  {
    "id": "platform-api-full-kyc",
    "text": "Full KYC fix — not working since Oct 2025",
    "status": "done",
    "priority": "high",
    "storyPoints": 8,
    "contributors": [],
    "note": "Full KYC was broken since Oct 2025. New flow released Apr 2. Users to be informed to retry KYC.",
    "usecase": "KYC compliance and user onboarding require this to work correctly.",
    "acceptanceCriteria": ["Full KYC flow functional end-to-end", "New flow released and users notified to retry", "No regression in partial KYC flow"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["bug", "kyc", "compliance"],
    "mediaUrl": "",
    "startDate": "2026-03-28",
    "due": "2026-04-02",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-5",
    "releasedIn": "v3.1-personalization-engine"
  },
  {
    "id": "platform-api-kcmc-card-copy",
    "text": "KCMC card delivery copy: '15 business days' + 30 min/day for printing",
    "status": "next",
    "priority": "medium",
    "storyPoints": 1,
    "contributors": [],
    "note": "App currently shows 5–7 days. Change to '15 business days'. Add '30 min daily for card printing' (marketing).",
    "usecase": "Sets accurate delivery expectations; prevents support tickets.",
    "acceptanceCriteria": ["App shows '15 business days' for KCMC card delivery", "Marketing note '30 min daily for printing' included where appropriate"],
    "effortLevel": "low",
    "impactLevel": "low",
    "tags": ["copy", "kcmc", "card"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-api-khyaal-card-track",
    "text": "Remove Khyaal card track delivery from app",
    "status": "next",
    "priority": "medium",
    "storyPoints": 2,
    "contributors": [],
    "note": "The Khyaal card track delivery feature needs to be removed from the app.",
    "usecase": "Removes deprecated feature to reduce confusion.",
    "acceptanceCriteria": ["Khyaal card track delivery section removed from app UI", "No broken references or crashes after removal"],
    "effortLevel": "low",
    "impactLevel": "low",
    "tags": ["cleanup", "app", "card"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-api-digi-gold-sip",
    "text": "Digi-gold SIP: random monthly payment skip — setup Caratlane call + fix",
    "status": "next",
    "priority": "high",
    "storyPoints": 8,
    "contributors": [],
    "note": "Digi-gold SIP randomly skips monthly payments. Requires call with Caratlane team + log of recent failures.",
    "usecase": "Protects user investments; prevents SIP irregularities causing financial harm.",
    "acceptanceCriteria": ["Caratlane call scheduled and root cause identified", "All recent SIP failure cases logged", "Fix deployed and verified with test SIP cycle", "No payment skips in subsequent monitoring period"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["bug", "digi-gold", "payment"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-api-digi-gold-one-time",
    "text": "Digi-gold one-time payment: payment fails but amount gets deducted",
    "status": "next",
    "priority": "high",
    "storyPoints": 8,
    "contributors": [],
    "note": "One-time digi-gold payment fails on platform but user's bank account is debited. Jayram & Alfa cases documented.",
    "usecase": "Prevents financial harm to users; critical compliance issue.",
    "acceptanceCriteria": ["Payment gateway reconciliation working correctly", "Deducted amount either refunded or gold credited", "Jayram & Alfa cases resolved", "Monitoring in place to detect future mismatches"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["bug", "digi-gold", "payment"],
    "mediaUrl": "",
    "startDate": "2026-04-12",
    "due": "2026-04-25",
    "planningHorizon": "1M",
    "epicId": "community-bug-resolution",
    "sprintId": "sprint-6"
  },
  {
    "id": "platform-api-login-error",
    "text": "Login/Join OTP: 'Oops something went wrong' — better error message",
    "status": "later",
    "priority": "low",
    "storyPoints": 2,
    "contributors": [],
    "note": "After OTP entry some users see 'Oops something went wrong' due to network issues. Better error message with retry guidance needed.",
    "usecase": "Reduces user confusion and support tickets for temporary network errors.",
    "acceptanceCriteria": ["Network error shows specific message (e.g., 'Check your connection and try again')", "Retry button offered", "Generic 'Oops' message replaced"],
    "effortLevel": "low",
    "impactLevel": "low",
    "tags": ["ux", "auth", "error"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "6M",
    "epicId": "community-bug-resolution",
    "sprintId": null
  },
  {
    "id": "platform-api-cached-categories",
    "text": "Cached Old Categories Re-Migration — platform API cleanup",
    "status": "next",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Old category data cached in the platform API needs to be cleaned up and re-migrated to prevent stale data issues.",
    "usecase": "Prevents stale category data from surfacing to users; required for 50A50 category fix completeness.",
    "acceptanceCriteria": ["Old category cache cleared", "Category data re-migrated from source of truth", "No stale categories visible in any platform surface"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["cleanup", "cache", "categories"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-05-09",
    "planningHorizon": "3M",
    "epicId": "fifty-above-fifty-platform",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-api-assistant-bot",
    "text": "Assistant Bot v2.0.1 — server-side upgrade",
    "status": "next",
    "priority": "medium",
    "storyPoints": 8,
    "contributors": [],
    "note": "Server-side upgrade for the Khyaal App Assistant Bot to v2.0.1. Mobile UI upgrade in Khyaal Mobile workspace.",
    "usecase": "Improves assistant response quality and adds new capabilities.",
    "acceptanceCriteria": ["Server API updated to v2.0.1 spec", "Mobile app assistant works with new server API", "No regression in existing assistant functionality"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["api", "assistant", "bot"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "",
    "planningHorizon": "3M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-api-offline-events",
    "text": "Offline Events — server-side API (register, view booked events, tickets, info)",
    "status": "next",
    "priority": "high",
    "storyPoints": 13,
    "contributors": [],
    "note": "Build server-side API for Offline Events. Includes: event listing, registration, booked events view, ticket generation, event info. Mobile UI in Khyaal Mobile workspace.",
    "usecase": "Enables users to discover, register for, and manage offline events from the app.",
    "acceptanceCriteria": ["GET /events returns offline events list with pagination", "POST /events/:id/register creates registration", "GET /user/events returns booked events", "GET /events/:id/ticket returns ticket details", "Event info endpoint returns full event details"],
    "effortLevel": "high",
    "impactLevel": "high",
    "tags": ["api", "events", "offline"],
    "mediaUrl": "",
    "startDate": "2026-04-26",
    "due": "2026-04-24",
    "planningHorizon": "3M",
    "epicId": "product-growth-features",
    "sprintId": "sprint-7"
  },
  {
    "id": "platform-api-zoho-crm-travel",
    "text": "Zoho CRM for Travel setup — driven by Pulse Journey",
    "status": "later",
    "priority": "medium",
    "storyPoints": 5,
    "contributors": [],
    "note": "Set up Zoho CRM for the Travel team, integrating with existing Pulse Journey tracking.",
    "usecase": "Enables Travel team to manage leads and customer journeys in a CRM.",
    "acceptanceCriteria": ["Zoho CRM instance configured for Travel team", "Pulse Journey data flow integrated", "Travel team trained on CRM usage"],
    "effortLevel": "medium",
    "impactLevel": "medium",
    "tags": ["crm", "zoho", "travel"],
    "mediaUrl": "",
    "startDate": "",
    "due": "",
    "planningHorizon": "6M",
    "epicId": "cms-platform-capabilities",
    "sprintId": null
  }
  ```

- [ ] **Step 3: Verify**

  ```bash
  node -e "const d=JSON.parse(require('fs').readFileSync('data.json','utf8')); const s=d.tracks[0].subtracks[4]; console.log(s.name, 'items:', s.items.length)"
  ```
  Expected: `API items: 28`

- [ ] **Step 4: Commit**

  ```bash
  git add data.json
  git commit -m "data: add 11 new API subtrack items (renewal-fix, full-kyc, kcmc-copy, digi-gold, offline-events, etc.)"
  ```

---

## Task 8: Add "Campaigns & Events" Subtrack to Platform Track

**Files:**
- Modify: `data.json` — append new subtrack object to `tracks[0].subtracks[]`

- [ ] **Step 1: Append new subtrack to platform track subtracks[]**

  In `tracks[0].subtracks[]`, after the last subtrack object (`Adhoc ...`), add a comma and:

  ```json
  ,
  {
    "name": "Campaigns & Events",
    "items": [
      {
        "id": "platform-campaign-senior-spotlight",
        "text": "Khyaal Senior Spotlight (Trivandrum) — landing page + comms",
        "status": "done",
        "priority": "high",
        "storyPoints": 5,
        "contributors": [],
        "note": "Landing page and communications for Khyaal Senior Spotlight event in Trivandrum. Released Apr 2.",
        "usecase": "Brought paid users and drove app usage in Trivandrum.",
        "acceptanceCriteria": ["Landing page live with event details", "Communications sent to target audience", "Registration flow functional"],
        "effortLevel": "medium",
        "impactLevel": "high",
        "tags": ["event", "landing-page"],
        "mediaUrl": "",
        "startDate": "2026-03-28",
        "due": "2026-04-02",
        "planningHorizon": "1M",
        "epicId": "product-growth-features",
        "sprintId": "sprint-5",
        "releasedIn": "v3.1-personalization-engine"
      },
      {
        "id": "platform-campaign-insurance-landing",
        "text": "Khyaal Insurance landing page",
        "status": "next",
        "priority": "medium",
        "storyPoints": 5,
        "contributors": [],
        "note": "Build the Khyaal Insurance product landing page.",
        "usecase": "Gives insurance product a dedicated page for marketing and conversion.",
        "acceptanceCriteria": ["Landing page live with insurance product details", "CTA links to correct purchase/inquiry flow", "SEO optimized"],
        "effortLevel": "medium",
        "impactLevel": "medium",
        "tags": ["insurance", "landing-page"],
        "mediaUrl": "",
        "startDate": "2026-05-10",
        "due": "2026-05-09",
        "planningHorizon": "3M",
        "epicId": "cms-platform-capabilities",
        "sprintId": "sprint-8"
      },
      {
        "id": "platform-campaign-parents-day",
        "text": "Parents Day Campaign (Jun 1 release) — dev start May 10",
        "status": "next",
        "priority": "high",
        "storyPoints": 8,
        "contributors": [],
        "note": "Campaign targeting Jun 1 (Parents Day). Dev must start by May 10 for May 8 release.",
        "usecase": "Seasonal campaign to drive membership and engagement around Parents Day.",
        "acceptanceCriteria": ["Campaign landing page live by May 8", "Email/notification communications configured", "Campaign analytics tracking set up", "Dev started by May 10"],
        "effortLevel": "high",
        "impactLevel": "high",
        "tags": ["campaign", "parents-day"],
        "mediaUrl": "",
        "startDate": "2026-05-10",
        "due": "2026-05-08",
        "planningHorizon": "3M",
        "epicId": "cms-platform-capabilities",
        "sprintId": "sprint-8"
      },
      {
        "id": "platform-campaign-pulse-membership-dashboard",
        "text": "Pulse Membership Dashboard",
        "status": "next",
        "priority": "medium",
        "storyPoints": 8,
        "contributors": [],
        "note": "Build a Pulse dashboard view for membership metrics — new vs renewing members, churn rate, plan distribution.",
        "usecase": "Gives leadership data-driven visibility into membership health.",
        "acceptanceCriteria": ["Dashboard shows new and renewing member counts", "Churn rate visible with trend", "Plan distribution shown", "Date range filter functional"],
        "effortLevel": "high",
        "impactLevel": "high",
        "tags": ["pulse", "dashboard", "membership", "analytics"],
        "mediaUrl": "",
        "startDate": "2026-05-10",
        "due": "",
        "planningHorizon": "3M",
        "epicId": "cms-platform-capabilities",
        "sprintId": "sprint-8"
      }
    ]
  }
  ```

- [ ] **Step 2: Verify**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  const t=d.tracks[0]
  console.log('Platform subtracks:', t.subtracks.length)
  const s=t.subtracks.find(s=>s.name==='Campaigns & Events')
  console.log('Campaigns & Events items:', s ? s.items.length : 'NOT FOUND')
  "
  ```
  Expected: `Platform subtracks: 7`, `Campaigns & Events items: 4`

- [ ] **Step 3: Commit**

  ```bash
  git add data.json
  git commit -m "data: add Campaigns & Events subtrack with 4 items (senior-spotlight, insurance, parents-day, pulse-dashboard)"
  ```

---

## Task 9: Enrich Existing Items (Sprint Reassignment + epicId Fixes)

**Files:**
- Modify: `data.json` — update `sprintId` and `epicId` on specific existing items

- [ ] **Step 1: Reassign sprint-5 items that are still `next` to sprint-6**

  Sprint 5 ended Apr 11 and is now `completed`. These items are still `next` with `sprintId: "sprint-5"` — move to sprint-6:
  - `platform-website-3` (Legacy migration alerts)
  - `platform-website-4` (SEO improvements)
  - `platform-website-7` (Performance monitoring dashboard)
  - `pulse-cdp-6`
  - `pulse-cdp-7`

  For each item, find the `"sprintId": "sprint-5"` line and change it to `"sprintId": "sprint-6"`.

  Pre-check — verify these items are still `next` before editing (skip any that are already `done`):
  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  const ids=['platform-website-3','platform-website-4','platform-website-7','pulse-cdp-6','pulse-cdp-7']
  d.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>{
    if(ids.includes(i.id)) console.log(i.id, 'status:'+i.status, 'sprint:'+i.sprintId)
  })))
  "
  ```

- [ ] **Step 2: Assign sprint-6 to items currently missing sprintId**

  These items are `next` but lack `sprintId`:
  - `platform-api-17` (VAPT fixes implementation) — add `"sprintId": "sprint-6"`
  - `pulse-ai-agents-7` (Sales Agent pilot testing) — add `"sprintId": "sprint-6"`
  - `pulse-ai-agents-8` (AI Assistant 2.0) — add `"sprintId": "sprint-6"`

  This item is `next` but better fits sprint-7:
  - `platform-api-18` (Centerstage chat backend) — add `"sprintId": "sprint-7"`

- [ ] **Step 3: Fix epicId on Adhoc item missing it**

  Find item `task-1774424448124` in the Adhoc subtrack. It has `sprintId: "sprint-4"` but is missing `epicId`. Add `"epicId": "platform-modernization"`.

- [ ] **Step 4: Verify all enrichments**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  let missing=0
  d.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>{
    if(!i.epicId) { console.log('MISSING epicId:', i.id); missing++ }
  })))
  const nextNoSprint = []
  d.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>{
    if(i.status==='next' && !i.sprintId) nextNoSprint.push(i.id)
  })))
  console.log('Items missing epicId:', missing)
  console.log('next items without sprintId:', nextNoSprint)
  "
  ```
  Expected: `Items missing epicId: 0`, `next items without sprintId: []`

- [ ] **Step 5: Commit**

  ```bash
  git add data.json
  git commit -m "data: enrich existing items — reassign sprint-5 next items to sprint-6, fix missing sprintIds and epicIds"
  ```

---

## Task 10: Create data-mobile.json

**Files:**
- Create: `data-mobile.json`

- [ ] **Step 1: Create data-mobile.json with the following content**

  ```json
  {
    "metadata": {
      "title": "Khyaal Mobile",
      "workspace": "Khyaal Mobile",
      "dateRange": "12th April 2026 – Active",
      "description": "Engineering pulse for Khyaal Mobile app development — tracking OKRs, sprints, and app feature delivery.",
      "vision": "Build the best mobile experience for active seniors in India, with seamless onboarding, engaging features, and reliable performance.",
      "modes": {
        "default": "pm",
        "devDefaultView": "my-tasks",
        "execDefaultView": "dashboard"
      },
      "epics": [
        {
          "id": "app-experience",
          "name": "App Experience & Feature Expansion",
          "track": "Khyaal App",
          "objective": "Ship app features that grow downloads, engagement, and user retention",
          "scope": "App bugs batch, Offline Events mobile, 50A50 app upload, Guided Tours, Center Stage, Streak, Gamification",
          "keyDeliverables": "App bugs released, Offline Events mobile UI, 50A50 app-only upload, Guided Tours for new users",
          "successMetrics": "App downloads +20%, retention D7 +15%, Guided Tour completion >60%",
          "timeline": "Apr 12 - May 23, 2026",
          "health": "on-track",
          "status": "in_progress",
          "linkedOKR": "okr-q2-2026-mobile",
          "planningHorizon": "3M"
        }
      ],
      "okrs": [
        {
          "id": "okr-q2-2026-mobile",
          "quarter": "Q2 2026",
          "objective": "Ship app features that grow downloads, engagement, and user retention",
          "owner": "Mobile Team",
          "keyResults": [
            {
              "id": "kr-mob-1",
              "description": "App Bugs Batch released (Apr 11)",
              "target": 1,
              "current": 1,
              "unit": "release",
              "progress": 100,
              "status": "achieved",
              "linkedEpic": "app-experience"
            },
            {
              "id": "kr-mob-2",
              "description": "Offline Events mobile UI shipped (Apr 24)",
              "target": 1,
              "current": 0,
              "unit": "launch",
              "progress": 0,
              "status": "on-track",
              "linkedEpic": "app-experience"
            },
            {
              "id": "kr-mob-3",
              "description": "50A50 app-only entry upload live to drive app downloads (May 8)",
              "target": 1,
              "current": 0,
              "unit": "launch",
              "progress": 0,
              "status": "on-track",
              "linkedEpic": "app-experience"
            },
            {
              "id": "kr-mob-4",
              "description": "Guided Tours launched for new users on first launch",
              "target": 1,
              "current": 0,
              "unit": "launch",
              "progress": 0,
              "status": "on-track",
              "linkedEpic": "app-experience"
            }
          ],
          "overallProgress": 25
        }
      ],
      "sprints": [
        {
          "id": "sprint-6",
          "name": "App Bug Fix + Stability",
          "startDate": "2026-04-12",
          "endDate": "2026-04-25",
          "goal": "Fix remaining app bugs (modify event link, login OTP UX, KCMC card copy), prepare for Offline Events mobile work",
          "tracks": ["Khyaal App"],
          "plannedPoints": 30,
          "completedPoints": 0,
          "status": "active",
          "linkedOKR": "okr-q2-2026-mobile"
        },
        {
          "id": "sprint-7",
          "name": "App Feature Sprint",
          "startDate": "2026-04-26",
          "endDate": "2026-05-09",
          "goal": "Offline Events mobile UI, 50A50 app-only entry upload mobile UI, Assistant Bot v2.0.1 mobile update",
          "tracks": ["Khyaal App"],
          "plannedPoints": 35,
          "completedPoints": 0,
          "status": "planned",
          "linkedOKR": "okr-q2-2026-mobile"
        },
        {
          "id": "sprint-8",
          "name": "App Growth Sprint",
          "startDate": "2026-05-10",
          "endDate": "2026-05-23",
          "goal": "Guided Tours for new users, Center Stage, Parents Day campaign mobile side",
          "tracks": ["Khyaal App"],
          "plannedPoints": 30,
          "completedPoints": 0,
          "status": "planned",
          "linkedOKR": "okr-q2-2026-mobile"
        }
      ],
      "releases": [
        {
          "id": "v1.0-app-bugs",
          "name": "v1.0 App Bugs Release",
          "targetDate": "2026-04-11",
          "tracks": ["Khyaal App"],
          "features": "App Bugs Batch, event listing auto-refresh fix, subscription cancelled sheet",
          "successCriteria": "All batch bugs resolved, no regression",
          "impact": "Improved app stability and user experience",
          "status": "completed",
          "linkedEpic": "app-experience"
        },
        {
          "id": "v2.0-app-features",
          "name": "v2.0 App Features",
          "targetDate": "2026-05-09",
          "tracks": ["Khyaal App"],
          "features": "Offline Events mobile, 50A50 app-only upload, Assistant Bot v2.0.1",
          "successCriteria": "Offline Events usable, 50A50 upload functional on app, Bot upgraded",
          "impact": "Increased app downloads, expanded feature set",
          "status": "planned",
          "linkedEpic": "app-experience"
        }
      ],
      "roadmap": [
        {
          "id": "1M",
          "label": "Now (Immediate / 1 Month)",
          "color": "blue",
          "linkedObjective": "okr-q2-2026-mobile"
        },
        {
          "id": "3M",
          "label": "Next (Strategic / 3 Months)",
          "color": "indigo",
          "linkedObjective": "okr-q2-2026-mobile"
        },
        {
          "id": "6M",
          "label": "Later (Future / 6 Months)",
          "color": "slate",
          "linkedObjective": "okr-q2-2026-mobile"
        }
      ],
      "capacity": {
        "teamMembers": [
          {
            "name": "Mobile Team",
            "capacity": 40,
            "track": "Khyaal App",
            "role": "Mobile Engineer"
          }
        ],
        "totalCapacity": 40
      },
      "velocityHistory": [
        {
          "sprintId": "sprint-6",
          "planned": 30,
          "completed": 0,
          "velocity": 0,
          "dates": "Apr 12-25, 2026"
        }
      ]
    },
    "tracks": [
      {
        "id": "mobile",
        "name": "Khyaal App",
        "theme": "emerald",
        "subtracks": [
          {
            "name": "Core App",
            "items": [
              {
                "id": "mobile-core-app-bugs-batch",
                "text": "App Bugs Batch release (Apr 11)",
                "status": "done",
                "priority": "high",
                "storyPoints": 13,
                "contributors": [],
                "note": "Batch of current app bug fixes. Released Apr 11.",
                "usecase": "Improves app stability and fixes user-reported issues.",
                "acceptanceCriteria": ["All batch bugs resolved", "No new regressions introduced", "Release notes prepared"],
                "effortLevel": "high",
                "impactLevel": "high",
                "tags": ["bug", "batch"],
                "mediaUrl": "",
                "startDate": "2026-04-01",
                "due": "2026-04-11",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6",
                "releasedIn": "v1.0-app-bugs"
              },
              {
                "id": "mobile-core-event-listing-refresh",
                "text": "Event listing auto-refresh on visit (not pull-to-refresh only)",
                "status": "done",
                "priority": "medium",
                "storyPoints": 3,
                "contributors": [],
                "note": "Event listing only refreshed on pull-to-refresh. Seniors expect auto-refresh when visiting the screen. Fixed in 3.1.5.",
                "usecase": "Ensures seniors always see up-to-date events without knowing the pull-to-refresh gesture.",
                "acceptanceCriteria": ["Events auto-refresh on screen visit", "Pull-to-refresh still works as secondary option", "Update popup shown to users on new version"],
                "effortLevel": "low",
                "impactLevel": "medium",
                "tags": ["ux", "events"],
                "mediaUrl": "",
                "startDate": "2026-04-01",
                "due": "2026-04-11",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6",
                "releasedIn": "v1.0-app-bugs"
              },
              {
                "id": "mobile-core-subscription-cancelled-sheet",
                "text": "Subscription Cancelled Sheet — dashboard to view + export cancelled UPI users",
                "status": "done",
                "priority": "medium",
                "storyPoints": 5,
                "contributors": [],
                "note": "Dashboard to view and export list of users with cancelled UPI subscriptions. Released Apr 2.",
                "usecase": "Enables ops team to identify and follow up with lapsed subscribers.",
                "acceptanceCriteria": ["Dashboard shows cancelled UPI subscription users", "Export to CSV functional", "Filters by date range"],
                "effortLevel": "medium",
                "impactLevel": "medium",
                "tags": ["dashboard", "subscription"],
                "mediaUrl": "",
                "startDate": "2026-03-28",
                "due": "2026-04-02",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6",
                "releasedIn": "v1.0-app-bugs"
              },
              {
                "id": "mobile-core-modify-event-link",
                "text": "Modify event: old link shown for some users 2-3 days after modification",
                "status": "next",
                "priority": "medium",
                "storyPoints": 3,
                "contributors": [],
                "note": "Modifying an event 2-3 days early still shows the old link for some users due to caching.",
                "usecase": "Ensures all users see the correct event link immediately after modification.",
                "acceptanceCriteria": ["Modified event link propagated to all users within 30 minutes", "No stale link shown after modification", "Cache invalidation triggered on event update"],
                "effortLevel": "low",
                "impactLevel": "medium",
                "tags": ["bug", "events", "cache"],
                "mediaUrl": "",
                "startDate": "2026-04-12",
                "due": "2026-04-25",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6"
              },
              {
                "id": "mobile-core-login-otp-ux",
                "text": "Login/Join OTP: 'Oops something went wrong' — better error message",
                "status": "next",
                "priority": "low",
                "storyPoints": 2,
                "contributors": [],
                "note": "After OTP entry some users see 'Oops something went wrong' due to network issues. Needs better error message.",
                "usecase": "Reduces user confusion and support tickets for temporary network errors.",
                "acceptanceCriteria": ["Specific error message shown for network issues", "Retry button offered to user", "Generic 'Oops' message replaced"],
                "effortLevel": "low",
                "impactLevel": "low",
                "tags": ["ux", "auth", "error"],
                "mediaUrl": "",
                "startDate": "2026-04-12",
                "due": "2026-04-25",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6"
              },
              {
                "id": "mobile-core-kcmc-card-copy",
                "text": "KCMC card delivery copy — app-side: '15 business days'",
                "status": "next",
                "priority": "medium",
                "storyPoints": 1,
                "contributors": [],
                "note": "App shows 5-7 days for KCMC card delivery. Update to '15 business days' on app-side display.",
                "usecase": "Sets accurate delivery expectations; prevents support tickets.",
                "acceptanceCriteria": ["App shows '15 business days' for KCMC card delivery"],
                "effortLevel": "low",
                "impactLevel": "low",
                "tags": ["copy", "kcmc", "card"],
                "mediaUrl": "",
                "startDate": "2026-04-12",
                "due": "2026-04-25",
                "planningHorizon": "1M",
                "epicId": "app-experience",
                "sprintId": "sprint-6"
              }
            ]
          },
          {
            "name": "Features",
            "items": [
              {
                "id": "mobile-feat-assistant-bot",
                "text": "Assistant Bot v2.0.1 — mobile UI upgrade",
                "status": "next",
                "priority": "medium",
                "storyPoints": 5,
                "contributors": [],
                "note": "Mobile UI upgrade for Khyaal App Assistant Bot to v2.0.1. Server-side API upgrade in Core Platform Engineering workspace.",
                "usecase": "Improves assistant experience with better UI and new capabilities.",
                "acceptanceCriteria": ["Mobile UI updated to v2.0.1 design", "Works with updated server API", "No regression in existing assistant functionality"],
                "effortLevel": "medium",
                "impactLevel": "medium",
                "tags": ["assistant", "bot", "ui"],
                "mediaUrl": "",
                "startDate": "2026-04-26",
                "due": "",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-7"
              },
              {
                "id": "mobile-feat-offline-events",
                "text": "Offline Events — mobile UI (view, register, tickets, info)",
                "status": "next",
                "priority": "high",
                "storyPoints": 13,
                "contributors": [],
                "note": "Mobile UI for Offline Events feature. Server-side API in Core Platform Engineering workspace.",
                "usecase": "Enables users to discover, register for, and manage offline events from the app.",
                "acceptanceCriteria": ["Offline events list view with filters", "Event registration flow functional", "Booked events visible in My Events", "Ticket view with QR code", "Event info screen complete"],
                "effortLevel": "high",
                "impactLevel": "high",
                "tags": ["events", "offline", "mobile"],
                "mediaUrl": "",
                "startDate": "2026-04-26",
                "due": "2026-04-24",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-7"
              },
              {
                "id": "mobile-feat-50a50-app-upload",
                "text": "50A50 app-only entry upload — mobile UI",
                "status": "next",
                "priority": "high",
                "storyPoints": 8,
                "contributors": [],
                "note": "Mobile UI for 50A50 app-only entry upload. Server-side API in Core Platform Engineering workspace.",
                "usecase": "Drives app downloads by making app the only upload channel.",
                "acceptanceCriteria": ["Upload flow works end-to-end on mobile", "File picker with format validation", "Upload progress shown", "Success/error feedback"],
                "effortLevel": "high",
                "impactLevel": "high",
                "tags": ["50above50", "upload", "mobile"],
                "mediaUrl": "",
                "startDate": "2026-04-26",
                "due": "2026-05-08",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-7"
              },
              {
                "id": "mobile-feat-guided-tours",
                "text": "Guided Tours — onboarding flow for new users on first launch",
                "status": "later",
                "priority": "medium",
                "storyPoints": 13,
                "contributors": [],
                "note": "Guided tour for new users on first app launch. Increases app usage by reducing onboarding friction.",
                "usecase": "Increases D7 retention by showing users key app features on first launch.",
                "acceptanceCriteria": ["Tour shown on first launch only", "Covers: events, membership, digi-gold, community", "Skip option available", "Tour completion tracked"],
                "effortLevel": "high",
                "impactLevel": "high",
                "tags": ["onboarding", "ux", "mobile"],
                "mediaUrl": "",
                "startDate": "2026-05-10",
                "due": "",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-8"
              },
              {
                "id": "mobile-feat-center-stage",
                "text": "Center Stage",
                "status": "next",
                "priority": "medium",
                "storyPoints": 8,
                "contributors": [],
                "note": "Center Stage feature for the Khyaal App. Details to be spec'd with server team.",
                "usecase": "New engagement feature for app users.",
                "acceptanceCriteria": ["Feature spec defined and approved", "Mobile UI implemented", "Server API integration complete"],
                "effortLevel": "high",
                "impactLevel": "medium",
                "tags": ["feature", "mobile"],
                "mediaUrl": "",
                "startDate": "2026-05-10",
                "due": "",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-8"
              },
              {
                "id": "mobile-feat-parents-day",
                "text": "Parents Day Campaign — mobile side (Jun 1 release)",
                "status": "next",
                "priority": "high",
                "storyPoints": 5,
                "contributors": [],
                "note": "Mobile-side campaign for Parents Day. Dev must start by May 10 for May 8 release.",
                "usecase": "Seasonal campaign to drive engagement around Parents Day.",
                "acceptanceCriteria": ["Campaign banner/notification in app by May 8", "Deep link to campaign landing page works", "Push notification configured for Jun 1"],
                "effortLevel": "medium",
                "impactLevel": "high",
                "tags": ["campaign", "parents-day", "mobile"],
                "mediaUrl": "",
                "startDate": "2026-05-10",
                "due": "2026-05-08",
                "planningHorizon": "3M",
                "epicId": "app-experience",
                "sprintId": "sprint-8"
              },
              {
                "id": "mobile-feat-earn-coins-shop",
                "text": "Earn Coins on Khyaal Shop",
                "status": "later",
                "priority": "medium",
                "storyPoints": 8,
                "contributors": [],
                "note": "Users earn Khyaal coins on Khyaal Shop purchases.",
                "usecase": "Increases shop engagement and incentivizes purchases with coin rewards.",
                "acceptanceCriteria": ["Coins awarded post-purchase", "Coin balance updated in app", "Transaction history shows shop coins"],
                "effortLevel": "high",
                "impactLevel": "medium",
                "tags": ["coins", "shop", "rewards"],
                "mediaUrl": "",
                "startDate": "",
                "due": "",
                "planningHorizon": "6M",
                "epicId": "app-experience",
                "sprintId": null
              },
              {
                "id": "mobile-feat-streak",
                "text": "User Streak feature",
                "status": "later",
                "priority": "medium",
                "storyPoints": 8,
                "contributors": [],
                "note": "User streak feature to gamify daily app usage.",
                "usecase": "Increases daily active users through streak-based engagement.",
                "acceptanceCriteria": ["Streak counter visible on home screen", "Streak increments on daily login", "Streak broken if no login for 24h", "Recovery mechanic available"],
                "effortLevel": "high",
                "impactLevel": "medium",
                "tags": ["gamification", "streak", "engagement"],
                "mediaUrl": "",
                "startDate": "",
                "due": "",
                "planningHorizon": "6M",
                "epicId": "app-experience",
                "sprintId": null
              },
              {
                "id": "mobile-feat-gamification",
                "text": "Spin the Wheel & Scratch Card — gamification engagement feature",
                "status": "later",
                "priority": "medium",
                "storyPoints": 13,
                "contributors": [],
                "note": "Gamification feature combining spin-the-wheel and scratch card mechanics for user engagement.",
                "usecase": "Increases DAU and session time through game mechanics.",
                "acceptanceCriteria": ["Spin the wheel functional with prize logic", "Scratch card mechanic functional", "Rewards distributed via coins or vouchers", "Daily play limits enforced"],
                "effortLevel": "high",
                "impactLevel": "medium",
                "tags": ["gamification", "engagement"],
                "mediaUrl": "",
                "startDate": "",
                "due": "",
                "planningHorizon": "6M",
                "epicId": "app-experience",
                "sprintId": null
              }
            ]
          },
          {
            "name": "Backlog",
            "items": []
          }
        ]
      }
    ]
  }
  ```

- [ ] **Step 2: Verify data-mobile.json is valid JSON**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data-mobile.json','utf8'))
  const track=d.tracks[0]
  const coreItems=track.subtracks[0].items.length
  const featItems=track.subtracks[1].items.length
  console.log('Workspace:', d.metadata.workspace)
  console.log('OKRs:', d.metadata.okrs.length)
  console.log('Epics:', d.metadata.epics.length)
  console.log('Sprints:', d.metadata.sprints.length)
  console.log('Releases:', d.metadata.releases.length)
  console.log('Track:', track.name, '| subtracks:', track.subtracks.length)
  console.log('Core App items:', coreItems)
  console.log('Features items:', featItems)
  console.log('Total items:', coreItems + featItems)
  "
  ```
  Expected: workspace: Khyaal Mobile, 1 OKR, 1 epic, 3 sprints, 2 releases, 1 track, 3 subtracks, Core App: 6, Features: 9, Total: 15

- [ ] **Step 3: Verify no ID collision between data.json and data-mobile.json**

  ```bash
  node -e "
  const d1=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  const d2=JSON.parse(require('fs').readFileSync('data-mobile.json','utf8'))
  const ids1=new Set()
  d1.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>ids1.add(i.id))))
  const collisions=[]
  d2.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>{
    if(ids1.has(i.id)) collisions.push(i.id)
  })))
  console.log('ID collisions:', collisions.length, collisions)
  "
  ```
  Expected: `ID collisions: 0 []`

- [ ] **Step 4: Commit**

  ```bash
  git add data-mobile.json
  git commit -m "data: create data-mobile.json — Khyaal Mobile workspace scaffold (1 OKR, 1 epic, 3 sprints, 15 items)"
  ```

---

## Task 11: Update users.json — Add Mobile Project + Grant Access

**Files:**
- Modify: `users.json` — add to `projects[]`, add mobile grant to all 9 users

- [ ] **Step 1: Add mobile project to projects[]**

  In `users.json`, the `projects` array currently has 1 entry. Append a second entry:

  ```json
  ,
  {
    "id": "mobile",
    "name": "Khyaal Mobile",
    "filePath": "data-mobile.json"
  }
  ```

- [ ] **Step 2: Add mobile grant to all 9 users**

  For each user in `users[]`, append to their `grants[]` array. The mobile grant uses the same `mode` as their existing default grant:

  | userId | mode |
  |--------|------|
  | gautam | pm |
  | vivek | dev |
  | subhrajit | dev |
  | manish | dev |
  | nikhil | dev |
  | rushikesh | dev |
  | susmit | pm |
  | pritish | exec |
  | raj | dev |

  For each user, append to their `grants[]` array:
  ```json
  ,
  {
    "projectId": "mobile",
    "name": "Khyaal Mobile",
    "mode": "<their-mode>"
  }
  ```

- [ ] **Step 3: Verify**

  ```bash
  node -e "
  const u=JSON.parse(require('fs').readFileSync('users.json','utf8'))
  console.log('Projects:', u.projects.length, u.projects.map(p=>p.id))
  const noMobile=u.users.filter(u=>!u.grants.find(g=>g.projectId==='mobile'))
  console.log('Users without mobile grant:', noMobile.map(u=>u.id))
  "
  ```
  Expected: `Projects: 2 ['default', 'mobile']`, `Users without mobile grant: []`

- [ ] **Step 4: Commit**

  ```bash
  git add users.json
  git commit -m "data: add Khyaal Mobile project to users.json + grant all 9 users access"
  ```

---

## Task 12: Final Verification

**Files:** Read-only verification

- [ ] **Step 1: Verify total item counts**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  let total=0
  d.tracks.forEach(t=>t.subtracks.forEach(s=>{
    console.log(t.name+' › '+s.name+': '+s.items.length)
    total+=s.items.length
  }))
  console.log('TOTAL data.json items:', total)
  const dm=JSON.parse(require('fs').readFileSync('data-mobile.json','utf8'))
  let mtotal=0
  dm.tracks.forEach(t=>t.subtracks.forEach(s=>mtotal+=s.items.length))
  console.log('TOTAL data-mobile.json items:', mtotal)
  "
  ```
  Expected: data.json ~171 items, data-mobile.json 15 items

- [ ] **Step 2: Verify metadata completeness**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  console.log('OKRs:', d.metadata.okrs.length, '(expected 6)')
  console.log('Epics:', d.metadata.epics.length, '(expected 7)')
  console.log('Sprints:', d.metadata.sprints.length, '(expected 8)')
  console.log('Releases:', d.metadata.releases.length, '(expected 6)')
  console.log('Roadmap horizons:', d.metadata.roadmap.map(r=>r.id+'=>'+r.linkedObjective.replace('okr-','').substring(0,20)))
  "
  ```

- [ ] **Step 3: Verify no items missing epicId**

  ```bash
  node -e "
  const d=JSON.parse(require('fs').readFileSync('data.json','utf8'))
  let missing=0
  d.tracks.forEach(t=>t.subtracks.forEach(s=>s.items.forEach(i=>{
    if(!i.epicId) { console.log('MISSING epicId:', i.id, i.text); missing++ }
  })))
  if(missing===0) console.log('OK: all items have epicId')
  "
  ```
  Expected: `OK: all items have epicId`

- [ ] **Step 4: Verify both JSON files parse cleanly**

  ```bash
  node -e "
  try { JSON.parse(require('fs').readFileSync('data.json','utf8')); console.log('data.json: OK') } catch(e) { console.error('data.json INVALID:', e.message) }
  try { JSON.parse(require('fs').readFileSync('data-mobile.json','utf8')); console.log('data-mobile.json: OK') } catch(e) { console.error('data-mobile.json INVALID:', e.message) }
  try { JSON.parse(require('fs').readFileSync('users.json','utf8')); console.log('users.json: OK') } catch(e) { console.error('users.json INVALID:', e.message) }
  "
  ```
  Expected: all 3 lines show `OK`

- [ ] **Step 5: Final commit**

  ```bash
  git add data.json data-mobile.json users.json
  git commit -m "data: final verification pass — all JSON valid, item counts correct"
  ```

  > Only commit if there were any last-minute fixes. If all verification passed without changes, skip this step.
