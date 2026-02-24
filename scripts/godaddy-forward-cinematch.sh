#!/bin/bash
# Forward cinematch.com -> trycinematch.com via GoDaddy API
#
# 1. Get API keys: https://developer.godaddy.com/keys (Create Production key)
# 2. Get customer ID: Your shopper ID in GoDaddy profile (top-left corner) or
#    customer UUID from account settings
# 3. Run:
#    export GODADDY_API_KEY="your_key"
#    export GODADDY_API_SECRET="your_secret"
#    export GODADDY_CUSTOMER_ID="your_shopper_or_customer_id"
#    ./scripts/godaddy-forward-cinematch.sh

set -e

API_KEY="${GODADDY_API_KEY:?Set GODADDY_API_KEY}"
API_SECRET="${GODADDY_API_SECRET:?Set GODADDY_API_SECRET}"
CUSTOMER_ID="${GODADDY_CUSTOMER_ID:?Set GODADDY_CUSTOMER_ID}"

FQDN="cinematch.com"
FORWARD_TO="https://trycinematch.com"

echo "Setting up forwarding: $FQDN -> $FORWARD_TO"

# Try POST first (create), if 409 use PUT (update)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"REDIRECT_PERMANENT\",\"url\":\"$FORWARD_TO\"}" \
  "https://api.godaddy.com/v2/customers/$CUSTOMER_ID/domains/forwards/$FQDN")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "409" ]; then
  echo "Forwarding exists, updating..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Authorization: sso-key $API_KEY:$API_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"REDIRECT_PERMANENT\",\"url\":\"$FORWARD_TO\"}" \
    "https://api.godaddy.com/v2/customers/$CUSTOMER_ID/domains/forwards/$FQDN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
fi

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "Done! cinematch.com will redirect to trycinematch.com (may take a few minutes)"
else
  echo "Error: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
