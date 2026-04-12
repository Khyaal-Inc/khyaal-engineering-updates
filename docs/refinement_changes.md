# Refinement Changes Report
> Generated: 2026-04-12  
> Session: Data engineering mission — merge, PDF extraction, hierarchy enforcement

---

## data.json Changes

| # | Field | Old Value | New Value | Reason |
|---|-------|-----------|-----------|--------|
| 1 | `metadata.workspace` | *(field did not exist)* | `"Core Platform Engineering"` | Enforce canonical workspace name; required for Workspace→Project hierarchy |
| 2 | `tracks[].items` (platform track) | 43 total items across all tracks | 126 total items | Appended 83 historical items from `archive/feb-1---mar-18--2026.json` (see merge detail below) |

### Merge Detail (data.json ← archive)

| Track | Subtrack | Items added |
|-------|----------|-------------|
| platform | Website | +10 |
| platform | 50Above50 Website | +10 |
| platform | 50Above50 CRM | +2 |
| platform | Manage Admin | +5 |
| platform | API | +14 |
| pulse | Others | +3 |
| pulse | Analytics – Users | +4 |
| pulse | Analytics – Events | +3 |
| pulse | Analytics – Segment / Cohort | +5 |
| pulse | Journey | +9 |
| pulse | Campaign | +4 |
| pulse | AI Agents | +5 |
| pulse | CDP | +2 |
| pulse | Pages – Headless CMS | +1 |
| pulse | Flow | +1 |
| devops | Infrastructure & Security | +5 |
| **Total** | | **+83** |

**Merge rules applied:**
- All `metadata` fields (epics, OKRs, sprints, releases, capacity, velocityHistory, roadmap): kept data.json versions (data.json = live Mar–Apr 2026; archive = historical Feb–Mar 2026)
- Items deduplicated by `id` field within matching track + subtrack
- No tracks or subtracks were added (archive structure matches data.json structure)
- Archive-only empty subtrack ("Adhoc / Integrations") skipped — no items

**Backup:** `data.json.backup` created before merge.

---

## users.json Changes

| # | Field | Old Value | New Value | Reason |
|---|-------|-----------|-----------|--------|
| 1 | `projects[0].name` | `"Khyaal Engineering"` | `"Core Platform Engineering"` | Align workspace registry name with canonical workspace name |
| 2 | `users[1].role` | *(field did not exist)* | `"Full Stack Engineer"` | Added role field to existing Vivek account (corrected from capacity data which listed Frontend Engineer) |
| 3 | `users[0].role` | *(field did not exist)* | `"Technical Architect"` | Added role field to existing Gautam account |
| 4–10 | New users created (7 accounts) | *(users did not exist)* | See table below | Create login accounts for all capacity team members |

### New User Accounts

| User ID | Name | Role | Mode | Password |
|---------|------|------|------|----------|
| `subhrajit` | Subhrajit | Full Stack Engineer | `dev` | `khyaal@999` |
| `manish` | Manish | Backend Engineer | `dev` | `khyaal@999` |
| `nikhil` | Nikhil | Data Engineer | `dev` | `khyaal@999` |
| `rushikesh` | Rushikesh | ML Engineer | `dev` | `khyaal@999` |
| `susmit` | Susmit | Product Manager | `pm` | `khyaal@999` |
| `pritish` | Pritish | COO | `exec` | `khyaal@999` |
| `raj` | Raj | DevOps Engineer | `dev` | `khyaal@999` |

**Password hash (SHA-256 of `khyaal@999`):** `34509aab70bfa670349f3ef872d45f187ac9a99af4479819bc8a0d9717bad679`

**Existing passwords preserved:** gautam and vivek retain their pre-existing password hashes unchanged.

**Grant scope:** All users granted access to `projectId: "default"` (Core Platform Engineering / data.json).

---

## Documentation Changes (Part A)

| File | Change |
|------|--------|
| `CLAUDE.md` | Added `## Data Hierarchy` section with ASCII diagram + 5-tier mapping table |
| `README.md` | Added `### Data Hierarchy` section with table; fixed "project/subtrack" → "track and subtrack" in view list |
| `.claude/rules/ui-rules.md` | Added tier header above View Renderer Contract |
| `.claude/rules/api-rules.md` | Added hierarchy reminder at top of Multi-Project Extension section |
| `docs/PRODUCT_FLOW.md` | Rebuilt §5.1 Mermaid to add Workspace + Subtrack tiers; removed "(filters only)" from Tracks |
| `docs/ARCHITECTURE_DECISION_RECORD.md` | Updated hierarchy definition line + target state diagram (added Workspace tier, Subtrack tier) |
| `GUIDE.md` | Replaced "Tracks are your projects" with correct 3-tier language |
| `docs/PRD.md` | Updated F11 hierarchy definition + bullet |

---

## Hierarchy Enforced

Final canonical hierarchy across all files:

```
Workspace  →  Core Platform Engineering  (users.json → projects[0])
  └─ Project  →  Khyaal Engineering  (data.json)
      └─ Track  →  platform / pulse / devops  (data.json → tracks[])
          └─ Subtrack  →  Website / API / etc.  (track.subtracks[])
              └─ Item  →  individual tasks  (subtrack.items[])
```

---

## Validation

| Check | Result |
|-------|--------|
| `data.json` parses as valid JSON | ✅ |
| `users.json` parses as valid JSON | ✅ |
| `data.json.backup` exists | ✅ |
| `metadata.workspace` present in data.json | ✅ `"Core Platform Engineering"` |
| `projects[0].name` in users.json updated | ✅ `"Core Platform Engineering"` |
| Total users in users.json | ✅ 9 (was 2) |
| Total items in data.json after merge | ✅ 126 (was 43) |
| Stale "view filters" / "Tracks are your projects" language | ✅ 0 matches found |
