const https = require('https')
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'khyaal-internal-secret'
const REPO_OWNER = 'Khyaal-Inc'
const REPO_NAME = 'khyaal-engineering-updates'

exports.handler = async (event) => {
    const resHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
        'Content-Type': 'application/json'
    }

    const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'UNKNOWN'
    if (method === 'OPTIONS') return { statusCode: 204, headers: resHeaders, body: '' }

    const qs = event.queryStringParameters || {}
    const action = qs.action || null
    const body = JSON.parse(event.body || '{}')
    const token = process.env.GITHUB_TOKEN

    try {
        // ── Action: auth ─────────────────────────────────────────────────
        if (action === 'auth') {
            const { username, passwordHash } = body
            if (!username || !passwordHash) {
                return {
                    statusCode: 200, headers: resHeaders,
                    body: JSON.stringify({ authenticated: false, error: 'Username and password required' })
                }
            }
            const usersData = await fetchFromGitHub(token, 'users.json')
            const user = usersData.users.find(u => u.id === username && u.passwordHash === passwordHash)
            if (!user) {
                return {
                    statusCode: 200, headers: resHeaders,
                    body: JSON.stringify({ authenticated: false, error: 'Invalid credentials' })
                }
            }
            const jwt = signJWT({ userId: user.id, name: user.name, grants: user.grants })
            return {
                statusCode: 200, headers: resHeaders,
                body: JSON.stringify({ authenticated: true, token: jwt, name: user.name, grants: user.grants })
            }
        }

        // ── Action: read ──────────────────────────────────────────────────
        if (action === 'read') {
            const claims = verifyJWT(getBearer(event))
            const projectId = qs.projectId || 'default'
            assertGrant(claims, projectId)
            // Optional filePath for raw directory listings (e.g. archive/)
            if (qs.filePath) {
                const listing = await fetchRawFromGitHub(token, qs.filePath)
                return {
                    statusCode: 200, headers: resHeaders,
                    body: JSON.stringify({ ok: true, data: listing })
                }
            }
            const dataFile = projectId !== 'default' ? `data-${projectId}.json` : 'data.json'
            const data = await fetchFromGitHub(token, dataFile)
            return {
                statusCode: 200, headers: resHeaders,
                body: JSON.stringify({ authenticated: true, data })
            }
        }

        // ── Action: write ────────────────────────────────────────────────
        if (action === 'write') {
            const claims = verifyJWT(getBearer(event))
            const projectId = body.projectId || 'default'
            const grant = assertGrant(claims, projectId)
            if (grant.mode === 'exec') {
                return {
                    statusCode: 403, headers: resHeaders,
                    body: JSON.stringify({ error: 'Exec mode cannot write' })
                }
            }
            const { content, sha, message, filePath: bodyFilePath } = body
            if (!content || !message) {
                return {
                    statusCode: 400, headers: resHeaders,
                    body: JSON.stringify({ error: 'content and message are required' })
                }
            }
            // filePath override allows archive writes; default to project data file
            const writePath = bodyFilePath || (projectId !== 'default' ? `data-${projectId}.json` : 'data.json')
            const newSha = await writeToGitHub(token, writePath, content, message, sha || null)
            return {
                statusCode: 200, headers: resHeaders,
                body: JSON.stringify({ ok: true, sha: newSha })
            }
        }

        // Unknown action
        return {
            statusCode: 400, headers: resHeaders,
            body: JSON.stringify({ error: `Unknown action: ${action || '(none)'}. Use ?action=auth or ?action=read` })
        }

    } catch (err) {
        console.error('Error in auth_gatekeeper:', err)
        const status = err.statusCode || 500
        return {
            statusCode: status, headers: resHeaders,
            body: JSON.stringify({ error: err.message || 'Internal server error' })
        }
    }
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

function signJWT(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 86400  // 24h
    const claims = Buffer.from(JSON.stringify({ ...payload, iat, exp })).toString('base64url')
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${claims}`).digest('base64url')
    return `${header}.${claims}.${sig}`
}

function verifyJWT(token) {
    if (!token) {
        const e = new Error('No token provided')
        e.statusCode = 401
        throw e
    }
    const parts = token.split('.')
    if (parts.length !== 3) {
        const e = new Error('Malformed token')
        e.statusCode = 401
        throw e
    }
    const [header, claims, sig] = parts
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${claims}`).digest('base64url')
    if (sig !== expected) {
        const e = new Error('Invalid token signature')
        e.statusCode = 401
        throw e
    }
    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString())
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        const e = new Error('Token expired')
        e.statusCode = 401
        throw e
    }
    return payload
}

function assertGrant(claims, projectId) {
    const grant = (claims.grants || []).find(g => g.projectId === projectId)
    if (!grant) {
        const e = new Error(`No access to project: ${projectId}`)
        e.statusCode = 403
        throw e
    }
    return grant
}

function getBearer(event) {
    const headers = event.headers || {}
    const auth = headers['authorization'] || headers['Authorization'] || ''
    return auth.replace(/^Bearer\s+/i, '').trim() || null
}

// ── GitHub API helper ─────────────────────────────────────────────────────────

function fetchFromGitHub(token, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Khyaal-Auth-Proxy-Lambda',
                'Accept': 'application/vnd.github.v3+json'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    if (res.statusCode !== 200) {
                        return reject(new Error(json.message || 'GitHub API returned ' + res.statusCode))
                    }
                    const content = Buffer.from(json.content, 'base64').toString('utf-8')
                    resolve(JSON.parse(content))
                } catch (e) {
                    reject(new Error('Failed to parse GitHub response or content: ' + e.message))
                }
            })
        })

        req.on('error', (e) => reject(e))
        req.end()
    })
}

function fetchRawFromGitHub(token, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Khyaal-Auth-Proxy-Lambda',
                'Accept': 'application/vnd.github.v3+json'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    if (res.statusCode !== 200) {
                        return reject(new Error(json.message || 'GitHub API returned ' + res.statusCode))
                    }
                    resolve(json)  // raw parsed JSON — directory listing is an array
                } catch (e) {
                    reject(new Error('Failed to parse GitHub response: ' + e.message))
                }
            })
        })

        req.on('error', (e) => reject(e))
        req.end()
    })
}

function writeToGitHub(token, path, content, message, sha) {
    return new Promise((resolve, reject) => {
        const bodyObj = { message, content }
        if (sha) bodyObj.sha = sha
        const bodyStr = JSON.stringify(bodyObj)

        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Khyaal-Auth-Proxy-Lambda',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    if (res.statusCode !== 200 && res.statusCode !== 201) {
                        return reject(new Error(json.message || 'GitHub write returned ' + res.statusCode))
                    }
                    resolve(json.content && json.content.sha)
                } catch (e) {
                    reject(new Error('Failed to parse GitHub write response: ' + e.message))
                }
            })
        })

        req.on('error', (e) => reject(e))
        req.write(bodyStr)
        req.end()
    })
}
