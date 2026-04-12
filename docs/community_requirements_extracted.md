# Community Requirements — Extracted
> Source: `temp/Community Requirements.pdf` · Extracted: 2026-04-12  
> Covers: Khyaal Core bugs, 50 above 50 issues, Prioritised master list, Historical Sheet1

---

## Executive Summary

- **Critical bugs fixed:** Renewal API, Full KYC, Grievance Policy page, Contact Us — all released Apr 2
- **Highest-priority open work:** Tambola ticket retention (due Apr 3), KCMC card copy change, buy-membership UX, 50A50 dashboard session/cookie bugs
- **Biggest feature requests:** CMS membership detail page (reduces 4-click workflow to 1), individual event manager roles, bulk coin + user operations, CMS cache clear
- **50 above 50:** Most critical bugs are Dev Done; remaining open: dashboard button disappears, submit entry redirects, upload flow, partially completed status stuck
- **Platform split:** App, Website, CMS, API, CRM

---

## Section 1: Khyaal Core — Bugs

| Priority | Issue | Description | Platform | Status | Comments | Critical |
|----------|-------|-------------|----------|--------|----------|----------|
| — | Event listing | Only refreshes on pull-to-refresh; seniors expect auto-refresh on visit | App | Fixed in 3.1.5 | Users will see update popup | — |
| — | Modify event | Modifying event 2–3 days early still shows old link for some users | App | — | — | — |
| 6 | Tambola Ticket | Discard tickets after 1 week OR filter to only that game's tickets | CMS | — | Retention: 7 days; search box should filter by event only | To be released Apr 3 EOD — Vivek |
| 1 | Renewal issue | Post autopay cancel + renewal, doesn't work — needs manual backend activation | API | Released Apr 2 | Increase CRON job frequency; Akshay to test again | ✅ Critical |
| — | Pause autopay | Pausing autopay pauses membership | API | Done | Works like Cancelled state | — |
| 2 | Full KYC | Not working since Oct 2025 | — | Released Apr 2 | Need to release new flow; then inform users to retry KYC | ✅ Critical |
| 1 | KCMC card delivery time | App shows 5–7 days; change to "15 business days"; 30 min/day for printing | App | — | Change copy to 15 business days; 30 min daily for card printing (marketing) | — |
| 2 | Khyaal card | Track card delivery needs to be removed | App | — | To be removed | — |
| 0 | Grievance Policy page in KCard | 404 error | Website | Done | Migrate to khyaal.com — Raj | — |
| — | Contact Us Page in KCard | Doesn't submit | Website | Done | — | — |
| — | Login / Join | After OTP entry: "Oops something went wrong" | App | — | Due to network issue; suggest better error message | — |
| — | Digi-gold SIP | Randomly skips monthly payments | — | — | Setup call with Caratlane; list recent failures | ✅ Critical |
| — | Digi-gold one-time | Payment fails, amount gets deducted | — | — | Jayram & Alfa case | ✅ Critical |

---

## Section 2: Khyaal Core — Features

| Priority (Server) | Feature | Description | Platform | Status | Comments |
|-------------------|---------|-------------|----------|--------|----------|
| 9 | Viewing membership details in CMS | Currently 4 clicks + manual time conversion; needs single profile page | CMS | — | New page for User Membership details; fields from Raissa; Add Assign membership flow |
| 7 | Events — CMS improvements | Start time in column (not image URL); link field mandatory; upload image from CMS | CMS | — | — |
| 8 | Individual Roles | Event Manager user type with separate logins; Support role | — | — | User list to be created by Raissa Pinto |
| 10 | Cache clear capability | Manual cache clear in CMS | CMS | — | — |
| 11 | Bulk custom coin assignment | Bulk coin assignment via CMS | CMS | — | — |
| 12 | Bulk User creation & Membership assignment | Batch user + membership setup | — | — | — |
| 3 | 99 Plan Rollout | Roll out ₹99 plan via website | Website | — | ✅ Critical |
| 4 | Buy membership popup (UX) | Mobile number entry UX broken | Website | — | ✅ Critical |
| 5 | Buy membership popup (OTP) | Multiple OTPs triggered on multiple taps | Website | — | ✅ Critical |

---

## Section 3: 50 above 50 — Issues

> **Sprint note:** Start on Monday for all 50A50 issues — Vivek, 6th Apr

| Priority | Issue | Description | Platform | Status | Comments | Critical |
|----------|-------|-------------|----------|--------|----------|----------|
| 2 | Extra categories | Unchecked categories re-appear in list after manual dashboard entry | CRM | Dev Done | Remove impacted users via Slack data script; fix pre-selected category display | ✅ Critical |
| 4 | Registration issues | Membership not assigned in CMS on new entry; shows ₹500 instead of ₹999 | Website | To be fixed | Cache issue | — |
| 7 | Dashboard button disappears | Button vanishes intermittently | Website | — | Check Token/Cookie TTL; Contest Caching | — |
| 8 | Submit entry redirect | Clicking Submit takes user back to home page | Website | — | Check Token/Cookie TTL; Contest Caching | — |
| 5 | Partially completed status stuck | Deleting pending entry from partially-completed list doesn't update status | CRM | — | — | — |
| 1 | Category change asks ₹500 | Changing category in dashboard triggers ₹500 charge | CRM | — | Category Edit button needs to be added | ✅ Critical |
| 6 | Dashboard button not persistent | Dashboard button should be visible throughout website top bar | Website | — | — | — |
| 10 | Upload entry flow | Change flow; user should see submission format before uploading | Website | — | — | — |
| 0 | Category detail button colour | Change button colour | Website | — | — | — |
| 3 | Fresh user entry pricing | Back-to-back entries asking for ₹500 and ₹999 randomly | CRM | Dev Done | — | — |
| 9 | Export Submission filter | Submission filter for exports | — | — | — | — |

### 50A50 Case Reference — OP Havelia 8004909999
- Paid on 27th March; category changed from Storyteller → Golden Pen post-registration
- No issue at time of change; payment status later reverted to **Pending** from Completed
- Requires investigation of category change → payment status cascade

---

## Section 4: Prioritised Master List

| Priority | Issue | Platform | Status |
|----------|-------|----------|--------|
| 0 | Dashboard > Category detail button | Website | Done |
| 0 | Grievance Policy page in KCard | Website | Done |
| 0 | Full KYC | — | Done |
| 0 | Renewal issue | API | Done |
| 1 | 99 Plan Rollout | Website | Dev Done |
| 2 | Category change asks ₹500 | CRM | Dev Done |
| 3 | Extra categories | CRM | Dev Done |
| 4 | Fresh user pricing (₹500/₹999) | CRM | Dev Done |
| 5 | Buy membership popup (UX) | Website | — |
| 6 | Buy membership popup (OTP) | Website | Dev Done |
| 7 | Registration issues (₹500/₹999) | CRM | Dev Done |
| 8 | Partially completed status | CRM | Dev Done |
| 9 | Dashboard button persistent | Website | Done |
| 10 | Tambola Ticket | CMS | — |
| 11 | Dashboard button disappears | Website | In Progress |
| 11 | Submit entry redirect | Website | In Progress |
| 12 | Events CMS improvements | CMS | — |
| 13 | Individual Roles | — | — |
| 14 | Viewing membership details in CMS | CMS | — |
| 15 | Cache clear capability | CMS | — |
| 16 | Export Submission filter | — | — |
| 17 | Bulk custom coin assignment | CMS | Dev Done |
| 18 | Bulk User creation & Membership | CMS | Dev Done |
| 19 | Upload entry flow | Website | — |
| 20 | Cached Old Categories Re-Migration | Platform API | — |
| — | Digi-gold SIP | — | — |
| — | Digi-gold one-time | — | — |

---

## Section 5: Historical Requirements (Sheet1)

| Sr No | Date | Task | Requirement | Status |
|-------|------|------|-------------|--------|
| 1 | Aug 30 2024 | Events page | Sort events by date; after register, return to same scroll position | Done |
| 2 | Aug 30 2024 | Referral Page | Allow existing community members to purchase club membership via referral link; simplify referral; track free-then-buy referrals | — |
| 3 | Aug 30 2024 | Bingo board | In-house Bingo board (currently using letsplaybingo.io free tier) | — |
| 4 | Aug 30 2024 | Digi Gold | Non-UPI payment modes; Nominee for DG | Done (Nominee) |
| 5 | Aug 30 2024 | Contest | Separate contest section in app; register with Khyaal coins | — |
| 6 | Sep 24 2024 | Redeem coins page | Show event ID for which coins were redeemed in CMS loyalty registration | Done |
| 7 | Oct 11 2024 | Web Version | Web view for events (larger screen) | — |
| 8 | Oct 17 2024 | Bulk upload of coins | CSV upload to bulk-assign coins | — |
| 9 | Dec 24 2024 | Membership in CMS under USER tab | Show club membership status (yes/no) directly on user profile in CMS | — |

---

## Dependencies

| Item | Depends On |
|------|-----------|
| Tambola Ticket (CMS) | Release by Apr 3 EOD — owned by Vivek |
| Full KYC new flow | Released Apr 2 → inform users to retry |
| 50A50 Extra categories script | Slack data extraction for impacted users |
| Membership details CMS page | Fields spec from Raissa |
| Individual Roles | User list from Raissa Pinto |
| OP Havelia case | Investigation of category-change → payment status cascade |
| Digi-gold SIP | Call setup with Caratlane team + failure log |
| Parents Day campaign | Dev start by May 10 for May 8 release |
