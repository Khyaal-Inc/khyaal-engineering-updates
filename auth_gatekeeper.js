// SHA-256 hash of 'khyaal-updates'
const EXPECTED_PASSWORD_HASH = 'a3377e9d5cf5fef520cdcd102f4107afc1bb7fb281b63ab92dabb1d5b9e80004';

exports.handler = async (event) => {
    // Standard CORS headers (Using '*' for maximum compatibility with file:// origins)
    const resHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-max-age': '3600',
        'content-type': 'application/json'
    };

    // Determine HTTP Method
    const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'UNKNOWN';

    // Handle Preflight (OPTIONS) request
    if (method === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: resHeaders,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { passwordHash } = body;

        if (!passwordHash) {
            return {
                statusCode: 400,
                headers: resHeaders,
                body: JSON.stringify({ error: 'Password hash is required' }),
            };
        }

        const isAuthenticated = (passwordHash === EXPECTED_PASSWORD_HASH);

        return {
            statusCode: 200,
            headers: resHeaders,
            body: JSON.stringify({ authenticated: isAuthenticated }),
        };
    } catch (error) {
        console.error('Error in auth Lambda:', error);
        return {
            statusCode: 500,
            headers: resHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
