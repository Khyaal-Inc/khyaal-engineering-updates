# Khyaal Engineering Updates

> A zero-deployment engineering status dashboard for the Khyaal team. Secure, real-time, and operated entirely through your browser.

---

## ✨ Feature Overview

### 📊 Eight Viewing Modes

| View | Description |
|---|---|
| **By Track** | Items grouped by product track (Platform, Pulse, DevOps…) and subtrack |
| **🏃 Sprints** | Sprints / Cycles with progress bars, velocity, and assigned items |
| **By Status** | Items grouped by status level across all tracks |
| **By Priority** | Items grouped by High / Medium / Low priority |
| **By Contributor** | Items grouped by team member |
| **📦 Releases** | Items grouped by their target Release Version |
| **Gantt Chart** | Timeline view of all dated items with a "Today" marker |
| **📚 Backlog** | Dedicated PM backlog view — all parked items, grouped by track |

### 🎯 Item Statuses
- 🟢 **Done** — Shipped & Live  
- 🔵 **Now** — Active Development  
- 🟡 **On-Going** — Continuous Operations  
- 🟠 **Next** — Immediate Pipeline  
- ⚪ **Later** — Future Roadmap  

### 🏷️ Item Fields
Each item supports: title, status, priority, **contributors (autocomplete)**, note, impact/usecase, image/media URL, start date, due date, dependencies, **tags**, **blocker flag**, **blocker note**, **sprint assignment**, **release version**, and **PM comments**.

---

## 🏃 Sprint & Release Management (PM Features)

### Sprints / Cycles
- **Sprint View**: See all active, upcoming, and ended sprints.
- Each sprint shows a progress bar (`done` vs `total`), active date range, and carryover warnings.
- CMS Mode: **Add Sprint**, **Edit Sprint**, and assign items to sprints via the Item Edit modal.
- Active sprint assignments show as a `🏃 Sprint Name` pill on the item row.

### Releases
- Items can be assigned a `Released In` version (e.g., `v2.4.1`) in the CMS modal.
- **Releases View** groups all items by version for release planning.

---

## 📚 Backlog & Bulk Management

### Backlog Management
The **Backlog** tab aggregates all parked items from every track into a single PM-facing view.
- **→ Backlog** button on any item (in CMS mode) parks it instantly.
- **⬆ Promote** moves a backlog item to `Next` status in the first active subtrack.

### Bulk Operations
- In Track View (CMS mode), click the **checkbox** next to any items to reveal the **Bulk Action Bar**.
- Multi-select items and apply:
  - **Bulk Status Update**
  - **Bulk Priority Update**
  - **Bulk Send to Backlog**
  - **Bulk Delete**

---

## 🔀 Moving Items Across Subtracks

1. **Drag and Drop**: In CMS mode, drag any item row and drop it onto another subtrack.
2. **Edit Modal**: Open an item's Edit modal, change the **Move to Track** / **Move to Subtrack** dropdowns, and save.

---

## 🚦 PM Signals & Collaboration

### Contributor Autocomplete
- The CMS modal uses a **tag-input widget** for contributors. Start typing a name, and an autocomplete dropdown will appear populated by all existing team members.

### PM Comments / Notes
- Each item supports a timestamped comment thread. 
- Click the `💬 [count]` button under an item to open the thread. Add notes without editing the item description.

### Blocker / Risk Flag
- Click **🔒 Flag Blocker** to mark an item as blocked.
- Blocked items show a red **🔒 Blocker** strip above the row and bump subtrack header alert badges.

### Due Date Warnings
- **🔴 Overdue** — item due date has passed.
- **🟠 Due Soon** — item due within 2 days.

### Item Tags & Filtering
- Add custom tags via the Edit modal (e.g., `bug`, `tech-debt`, `feature`).
- Use the **Tag Filter Bar** at the top of the page to instantly filter all views by a specific tag.

---

## 🔎 Search & Auditing

| Feature | Description |
|---|---|
| **Global Search** | Matches text and highlights keywords in yellow. Press `/` to focus. |
| **Keyboard Shortcuts** | Press `1`-`8` to switch view tabs. Press `Esc` to close modals. |
| **Audit Log (Session)** | Click the 📜 icon in the bottom right to see a live Changelog of all edits made during your session. |

---

## 🔐 Authentication & Security

This project uses a **Zero-Deploy** architecture. A password-gated AWS Lambda proxy fetches `data.json` from GitHub at runtime.

### Setup (One-time)
1. Run `sh deploy_auth.sh`
2. Run `aws lambda update-function-configuration --function-name khyaal-auth-gatekeeper --environment "Variables={GITHUB_TOKEN=your_token_here}" --region ap-south-1`
3. Set `LAMBDA_URL` in `index.html`.

Password hash is cached in `localStorage` for seamless reloads.

---

## ✍️ CMS — Content Management

Access the CMS by appending `?cms=true` to the URL.

- **Add/Edit/Delete** tracks, subtracks, items, and sprints.
- Modals are **mobile-friendly** and perform strict form validation on required fields before saving.
- Click **Save to GitHub** in the CMS header to commit in-memory data to `data.json` on GitHub.

---

© 2026 Khyaal Inc.