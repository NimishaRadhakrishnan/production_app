#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backend_url>"
  echo "Example: $0 https://backend-xyz.onrender.com"
  exit 1
fi

BACKEND_URL="${1%/}"

echo "1. Checking live probe..."
curl -f -s -S "${BACKEND_URL}/api/v1/health/live"
echo -e "\n[PASS] Live probe ok."

echo "2. Checking ready probe (DB + Redis)..."
# We expect 200. If 503, curl -f will fail and exit the script.
curl -f -s -S "${BACKEND_URL}/api/v1/health/ready"
echo -e "\n[PASS] Ready probe ok."

echo "3. Logging in with seeded admin credentials..."
LOGIN_RES=$(curl -s -S -X POST "${BACKEND_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vishakan.com", "password": "Password123!"}')

# Safely extract token using Python (since Python is standard on macOS/Linux)
TOKEN=$(echo "$LOGIN_RES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "[FAIL] Could not extract access_token from login response."
  echo "Response was: $LOGIN_RES"
  exit 1
fi
echo "[PASS] Login successful, got access token."

echo "4. Checking GET /api/v1/location/active..."
curl -f -s -S "${BACKEND_URL}/api/v1/location/active" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n[PASS] GET /location/active ok."

echo "---------------------------------------------------"
echo "✅ All smoke tests passed! The deployment is healthy."
