const https = require('https');

// SHA-256 hash of 'khyaal-updates'
const EXPECTED_PASSWORD_HASH = 'a3377e9d5cf5fef520cdcd102f4107afc1bb7fb281b63ab92dabb1d5b9e80004';

// GitHub Repository details
const REPO_OWNER = 'Khyaal-Inc';
const REPO_NAME = 'khyaal-engineering-updates';

exports.handler = async (event) => {
    const resHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
        'Content-Type': 'application/json'
    };

    const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'UNKNOWN';

    if (method === 'OPTIONS') {
        return { statusCode: 204, headers: resHeaders, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { passwordHash, githubToken, filePath = 'data.json' } = body;

        // 1. Authenticate user
        if (passwordHash !== EXPECTED_PASSWORD_HASH) {
            return {
                statusCode: 200,
                headers: resHeaders,
                body: JSON.stringify({ authenticated: false, error: 'Invalid password' })
            };
        }

        // 2. Determine which token to use (Provided in request or environment)
        const token = githubToken || process.env.GITHUB_TOKEN;
        if (!token) {
            return {
                statusCode: 200,
                headers: resHeaders,
                body: JSON.stringify({ 
                    authenticated: true, 
                    error: 'GitHub Token required to fetch secure data.' 
                })
            };
        }

        // 3. Fetch from GitHub
        const githubData = await fetchFromGitHub(token, filePath);

        return {
            statusCode: 200,
            headers: resHeaders,
            body: JSON.stringify({ 
                authenticated: true,
                data: githubData
            })
        };

    } catch (error) {
        console.error('Error in Zero-Deploy Proxy:', error);
        return {
            statusCode: 500,
            headers: resHeaders,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};

/**
 * Fetches and decodes a file from GitHub API
 */
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
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        return reject(new Error(json.message || 'GitHub API returned ' + res.statusCode));
                    }
                    // GitHub returns content encoded in base64
                    const content = Buffer.from(json.content, 'base64').toString('utf-8');
                    resolve(JSON.parse(content));
                } catch (e) {
                    reject(new Error('Failed to parse GitHub response or content: ' + e.message));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}
