#!/bin/bash
# Local dev server — opens the app in browser then starts HTTP server
# Usage: sh serve.sh

PORT=8080
URL="http://localhost:${PORT}/?cms=true&mode=pm"

echo "Starting local server at ${URL}"
open "${URL}"

python3 - <<'EOF'
import http.server, socketserver

PORT = 8080

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
EOF
