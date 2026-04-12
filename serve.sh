#!/bin/bash
# Local dev server — opens the app in browser then starts HTTP server
# Usage: sh serve.sh

PORT=8080
URL="http://localhost:${PORT}/?cms=true&mode=pm"

echo "Starting local server at ${URL}"
open "${URL}"
python3 -m http.server ${PORT}
