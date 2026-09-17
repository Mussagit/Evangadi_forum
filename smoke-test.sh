#!/usr/bin/env bash
#
# Smoke test for the My Questions feature (register -> login -> seed a
# question directly in MySQL -> hit GET /api/questions and /api/questions?mine=true).
#
# Usage:
#   1. Start the backend: cd backend && npm run dev
#   2. In another terminal: cd backend/db && mysql -u root -p < schema.sql   (loads the fixed schema)
#   3. Run this script:    bash smoke-test.sh
#
# Requires: curl, jq (optional but recommended — falls back to raw JSON if missing), mysql client.
# Adjust DB_* and API_BASE below to match your backend/.env.

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3777}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-evangadi_forum}"

TIMESTAMP=$(date +%s)
EMAIL="smoketest_${TIMESTAMP}@example.com"
PASSWORD="Password123"

have_jq() { command -v jq >/dev/null 2>&1; }
pp() { if have_jq; then jq .; else cat; fi }
extract() { # extract <json> <jq_filter>
  if have_jq; then echo "$1" | jq -r "$2"; else echo "(install jq to auto-parse; raw response above)"; fi
}

echo "== 1. Health check =="
curl -sf "${API_BASE}/health" | pp
echo

echo "== 2. Register a fresh user (${EMAIL}) =="
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
echo "$REGISTER_RESPONSE" | pp
echo

echo "== 3. Log in =="
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
echo "$LOGIN_RESPONSE" | pp
TOKEN=$(extract "$LOGIN_RESPONSE" '.token')
USER_ID=$(extract "$LOGIN_RESPONSE" '.user.id')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "!! Login failed — no token returned. Stopping." >&2
  exit 1
fi
echo "Got token for user_id=${USER_ID}"
echo

echo "== 4. GET /api/questions with no questions yet (expect empty array) =="
curl -s "${API_BASE}/api/questions?mine=true" -H "Authorization: Bearer ${TOKEN}" | pp
echo

echo "== 5. Seed one question directly via MySQL for user_id=${USER_ID} =="
QHASH=$(echo -n "${TIMESTAMP}${EMAIL}" | md5sum | cut -c1-16)
MYSQL_ARGS=(-u "$DB_USER" "$DB_NAME")
if [ -n "$DB_PASS" ]; then MYSQL_ARGS=(-u "$DB_USER" -p"$DB_PASS" "$DB_NAME"); fi
mysql "${MYSQL_ARGS[@]}" -e "
  INSERT INTO questions (question_hash, user_id, title, content)
  VALUES ('${QHASH}', ${USER_ID}, 'Smoke test question title', 'This is smoke-test content, at least ten characters long.');
"
echo "Seeded question with hash ${QHASH}"
echo

echo "== 6. GET /api/questions?mine=true (expect the seeded question) =="
MINE_RESPONSE=$(curl -s "${API_BASE}/api/questions?mine=true" -H "Authorization: Bearer ${TOKEN}")
echo "$MINE_RESPONSE" | pp
COUNT=$(extract "$MINE_RESPONSE" '.data | length')
echo "Returned ${COUNT} question(s) for mine=true"
echo

echo "== 7. GET /api/questions?search=Smoke (expect a match) =="
curl -s "${API_BASE}/api/questions?search=Smoke" -H "Authorization: Bearer ${TOKEN}" | pp
echo

echo "== 8. GET /api/questions without a token (expect 401) =="
curl -s -o /tmp/smoketest_401_body.json -w "HTTP status: %{http_code}\n" "${API_BASE}/api/questions"
cat /tmp/smoketest_401_body.json | pp
echo

echo "== 9. Cleanup: remove the seeded question and test user =="
mysql "${MYSQL_ARGS[@]}" -e "DELETE FROM questions WHERE question_hash = '${QHASH}';"
mysql "${MYSQL_ARGS[@]}" -e "DELETE FROM users WHERE user_id = ${USER_ID};"

echo
echo "Smoke test complete."
