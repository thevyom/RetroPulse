#!/bin/sh
# =============================================================================
# Docker Entrypoint - Runtime Environment Variable Injection
# =============================================================================
# This script injects environment variables into the frontend at runtime,
# allowing the same Docker image to be used across different environments
# (dev, staging, production) with different API URLs.
# =============================================================================

set -e

# Default values
API_URL=${API_URL:-http://localhost:3001}
WS_URL=${WS_URL:-$API_URL}

# Create env.js with runtime configuration
cat > /usr/share/nginx/html/env.js << EOF
// Runtime environment configuration - injected at container startup
window.__ENV__ = {
  API_URL: "${API_URL}",
  WS_URL: "${WS_URL}",
};
EOF

echo "Environment configuration injected:"
echo "  API_URL: ${API_URL}"
echo "  WS_URL: ${WS_URL}"

# Execute the main command (nginx)
exec "$@"
