# Khyaal Engineering Updates

> A zero-deployment engineering status dashboard for the Khyaal team. Secure, real-time, and operated entirely through your browser.

---

## ✨ Feature Overview

### 📊 Five Viewing Modes

| View | Description |
|---|---|
| **By Track** | Items grouped by product track (Platform, Pulse, DevOps…) and subtrack |
| **By Status** | Items grouped by status level across all tracks |
| **By Priority** | Items grouped by High / Medium / Low priority |
| **By Contributor** | Items grouped by team member |
| **Gantt Chart** | Timeline view of all dated items (exportable as PNG) |
| **📚 Backlog** | Dedicated PM backlog view — all parked items, grouped by track |

### 🎯 Item Statuses
- 🟢 **Done** — Shipped & Live  
- 🔵 **Now** — Active Development  
- 🟡 **On-Going** — Continuous Operations  
- 🟠 **Next** — Immediate Pipeline  
- ⚪ **Later** — Future Roadmap  

### 🏷️ Item Fields
Each item supports: title, status, priority, contributors, note, impact/usecase, image/media URL, start date, due date, dependencies, **tags**, **blocker flag**, and **blocker note**.

---

## 📚 Backlog Management (PM Feature)

The **Backlog** tab aggregates all items from every track's Backlog subtrack into a single PM-facing view.

### Actions Available
- **→ Backlog** button on any item (in CMS mode) — parks the item in the track's Backlog  
- **⬆ Promote to Next** — moves a backlog item to `Next` status in the first active subtrack  
- **Move to subtrack** — select a destination subtrack and click Move  
- **Backlog count badge** — a red badge on the tab shows total backlog items across all tracks  

---

## 🔀 Moving Items Across Subtracks

Two ways to move items between subtracks:

### 1. Drag and Drop (Track View)
In CMS mode, every item row is **draggable**. Drag it and drop onto any other subtrack section. The item moves instantly and the view re-renders.

### 2. Edit Modal — Move To Track / Subtrack
Open an item's Edit modal:
1. Change the **Move to Track** dropdown  
2. Change the **Move to Subtrack** dropdown  
3. Click **Apply Changes** — the item is removed from its current location and added to the target  

---

## 🚦 PM Tools & Signals

### Blocker / Risk Flag
- In CMS mode, click **🔒 Flag Blocker** on any item to mark it as a blocker  
- Optionally describe the blocker in a note (via the Edit modal's Blocker Note field)  
- Blocked items show a red **🔒 Blocker** strip above the item row  
- Subtrack headers show a blocker count badge (e.g., `🔒 2 blockers`)  

### Due Date Warnings
- **⚠ Overdue (red)** — item due date has passed  
- **🕐 Due Soon (orange)** — item due within 2 days  
- Normal due dates shown in orange text  

### Item Tags / Labels
Items support comma-separated tags in the Edit modal. Display-only pills appear on each item row.

| Tag | Color |
|---|---|
| `bug` | Red |
| `tech-debt` | Purple |
| `feature` | Blue |
| `compliance` | Orange |
| `customer` | Green |

### Search Highlighting
The global search bar highlights matching text in yellow across all item titles in the current view.

---

## 🔎 Filtering & Search

| Filter | Description |
|---|---|
| **Global Search** | Matches across title, note, impact, contributor, track, subtrack |
| **Due Date Presets** | Today / This Week / This Month / Custom Range |
| **Archive Filter** | Filter by publish month (e.g. Feb 2026, Mar 2026) |
| **Historical Snapshots** | Load past archived data from the `archive/` folder |

---

## 📤 Export

| Export | How |
|---|---|
| **CSV** | Click the `↓ CSV` button — exports all visible items |
| **Gantt PNG** | Switch to Gantt view, then click `↓ Image` |

---

## 🔐 Authentication & Security

This project uses a **Zero-Deploy** architecture. A password-gated AWS Lambda proxy fetches `data.json` from GitHub at runtime — no token is ever exposed to the browser.

### Initial Setup (One-time)

1. **Deploy the Gateway**:
   ```bash
   sh deploy_auth.sh
   ```
2. **Add your GitHub Token** to Lambda:
   ```bash
   aws lambda update-function-configuration \
     --function-name khyaal-auth-gatekeeper \
     --environment "Variables={GITHUB_TOKEN=your_token_here}" \
     --region ap-south-1
   ```
3. **Update `index.html`**: Set `LAMBDA_URL` to the output of `deploy_auth.sh`.

### Session Persistence
- Password hash is stored in `localStorage` indefinitely (survives restarts)
- Auto-login on page load if cached hash is present
- Click **Logout** to clear session

---

## ✍️ CMS — Content Management

Access the CMS by adding `?cms=true` to the URL and authenticating with a GitHub PAT.

### Item Operations
| Action | How |
|---|---|
| **Add Item** | Click `Add Item` button in a subtrack header |
| **Edit Item** | CMS mode: `Edit` link on the item row |
| **Delete Item** | CMS mode: `Delete` link on the item row |
| **→ Backlog** | CMS mode: sends item to track's Backlog subtrack |
| **🔒 Flag Blocker** | CMS mode: marks item as a blocker (with optional note) |
| **Move Item** | Edit modal → Move to Track + Move to Subtrack dropdowns |
| **Drag & Drop** | Drag item row to any other subtrack drop zone |

### Track & Subtrack Operations
- **Add Track** — button in CMS header  
- **Edit / Delete Track** — buttons in track header (CMS mode)  
- **Add / Edit / Delete Subtrack** — buttons in subtrack header (CMS mode)  

### Saving Changes
Click **Save to GitHub** in the CMS dashboard to commit the in-memory data to `data.json` on GitHub. Changes are live immediately (no deployment needed).

---

## 📂 Archiving & Snapshots

### Archive & Clear
Click **Archive & Clear** to:
1. Save a JSON snapshot of the current data to `archive/<date-range>.json`
2. Clear all `done` items from the live data
3. Reset the date range label

### Viewing Historical Snapshots
Historical archive buttons appear in the Archive filter bar. Click any snapshot to load that data.

---

## 🏗️ Architecture

```
index.html          ← Single-file app: UI + JS rendering + CMS controls
data.json           ← Source of truth (served via Lambda)
archive/            ← Historical snapshot JSON files
deploy_auth.sh      ← One-time Lambda deployment script
```

### Data Structure
```json
{
  "metadata": { "title": "...", "dateRange": "...", "description": "..." },
  "tracks": [
    {
      "id": "platform",
      "name": "Platform",
      "theme": "blue",
      "subtracks": [
        {
          "name": "Core",
          "items": [
            {
              "id": "task-123",
              "text": "Item title",
              "status": "now",
              "priority": "high",
              "contributors": ["Alice"],
              "tags": ["feature"],
              "blocker": true,
              "blockerNote": "Waiting on infra",
              "note": "...",
              "usecase": "...",
              "startDate": "2026-03-01",
              "due": "2026-03-30",
              "dependencies": "task-100",
              "publishedDate": "2026-03-01"
            }
          ]
        },
        { "name": "Backlog", "items": [] }
      ]
    }
  ]
}
```

### How Loading Works
1. Cached password hash sent to Lambda (one HTTP hop)
2. Lambda verifies hash, fetches latest `data.json` from GitHub
3. Data returned to browser and rendered client-side

---

## 🎨 Status Legend

| Status | Color | Meaning |
|---|---|---|
| Done | 🟢 Emerald | Shipped & live |
| Now | 🔵 Blue | Active development |
| On-Going | 🟡 Amber | Continuous ops |
| Next | 🟠 Orange | Immediate pipeline |
| Later | ⚪ Gray | Future roadmap / Backlog |

---

© 2026 Khyaal Inc.