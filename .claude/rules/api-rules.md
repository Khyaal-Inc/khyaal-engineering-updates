---
description: Lambda call patterns, auth flow, write safety, error handling, and multi-project extension rules for the Khyaal SPA
---

# API Rules

## Lambda Is the Only API Surface

Never call the GitHub API directly from the browser. All reads and writes go through the Lambda proxy at `LAMBDA_URL` (hardcoded constant in `index.html`).

```javascript
// Correct — goes through Lambda
const response = await fetch(`${LAMBDA_URL}?action=read`, {
    headers: { Authorization: `Bearer ${jwt}` }
})

// Wrong — never do this
const response = await fetch('https://api.github.com/repos/...', {
    headers: { Authorization: `token ${pat}` }
})
```

## Auth Flow

| Storage key | Value | Used for |
|-------------|-------|----------|
| `localStorage['khyaal_site_auth']` | JWT string | All Lambda API calls |
| `localStorage['gh_pat']` | GitHub PAT | CMS write commits (passed to Lambda) |

Every Lambda call must include the JWT:

```javascript
const jwt = localStorage.getItem('khyaal_site_auth')
const response = await fetch(`${LAMBDA_URL}?action=read`, {
    headers: { Authorization: `Bearer ${jwt}` }
})
```

If the JWT is missing or expired, Lambda returns 401. Redirect to the login screen — do not retry silently.

## Read Pattern

```javascript
async function loadData() {
    const jwt = localStorage.getItem('khyaal_site_auth')
    const response = await fetch(`${LAMBDA_URL}?action=read`, {
        headers: { Authorization: `Bearer ${jwt}` }
    })
    if (!response.ok) throw new Error(`Read failed: ${response.status}`)
    const { content, sha } = await response.json()
    window.UPDATE_DATA = JSON.parse(atob(content))
    window._lastDataSha = sha   // store SHA for optimistic lock check on write
}
```

Always store the `sha` returned from the read response. It is required for the write.

## Write Pattern

```javascript
async function saveToGithub(updatedData) {
    window.isActionLockActive = true
    try {
        const jwt = localStorage.getItem('khyaal_site_auth')
        const content = btoa(JSON.stringify(updatedData, null, 2))
        const response = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                sha: window._lastDataSha,   // last known SHA
                message: 'chore: update data via CMS'
            })
        })
        if (!response.ok) throw new Error(`Write failed: ${response.status}`)
        const { sha } = await response.json()
        window._lastDataSha = sha           // update SHA after successful write
    } catch (err) {
        console.error('❌ saveToGithub:', err)
        showToast('Save failed — check your connection and try again', 'error')
        throw err   // re-throw so the caller can reset UI state
    } finally {
        window.isActionLockActive = false
    }
}
```

## Write Safety Rules

1. **Set `window.isActionLockActive = true` before any write** — this prevents concurrent UI re-renders during save
2. **Always release in `finally`** — never leave the lock set on error
3. **Never mutate `UPDATE_DATA` before the write resolves** — mutate only after `await saveToGithub()` succeeds
4. **Include the last-known SHA** — prevents silent overwrites when another user has saved since your last read (optimistic lock)
5. **Re-throw on error** — callers need to know the save failed so they can reset UI state

## Error Handling

```javascript
// Standard pattern for all Lambda calls
try {
    const result = await someApiCall()
    // success path
} catch (err) {
    console.error('❌ [operation context]:', err)
    showToast('Friendly message for user', 'error')
}
```

- Log format: `console.error('❌ <context>:', error)` — the `❌` prefix makes errors scannable in browser DevTools
- Always show a toast for user-visible failures (save, load, auth)
- Never swallow errors on write operations silently

## Multi-Project Extension

> **Hierarchy reminder:** Workspace = `users.json → projects[]` entry. Project = a `projectId` key that maps to a data file. Every Lambda call is scoped to one `projectId`.

All Lambda calls include `?projectId=` (implemented in Phase 2):

```javascript
const projectId = window.ACTIVE_PROJECT_ID || 'default'
const response = await fetch(`${LAMBDA_URL}?action=read&projectId=${projectId}`, {
    headers: { Authorization: `Bearer ${jwt}` }
})
```

For writes, `projectId` goes in the POST body:

```javascript
body: JSON.stringify({ projectId, content, message })
```

## Lambda Environment Variables

Set automatically by `deploy_auth.sh`. Never hardcode these in source:

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope — used for all data reads and writes |
| `JWT_SECRET` | HMAC-SHA256 signing secret — auto-generated on first deploy, preserved on re-deploys |

`LAMBDA_URL` is auto-patched in `index.html` by `deploy_auth.sh` after each deploy.
