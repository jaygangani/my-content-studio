#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID_FILE="$ROOT/.amplify-app-id"
REGION="${AWS_REGION:-ap-south-1}"
APP_NAME="${AMPLIFY_APP_NAME:-mycontentstudio-backend}"
BRANCH="production"

echo "Region:  $REGION"
echo "AWS:     ${AWS_PROFILE:-default credentials}"
echo "This creates an Amplify app (no hosting, no repo) and a '$BRANCH' branch record."
if [[ "${YES:-}" != "1" ]]; then
  read -r -p "Continue? (y/N) " answer
  [[ "$answer" == "y" || "$answer" == "yes" ]] || { echo "Cancelled."; exit 0; }
fi

if [[ -f "$APP_ID_FILE" ]]; then
  APP_ID="$(tr -d '[:space:]' < "$APP_ID_FILE")"
  if aws amplify get-app --app-id "$APP_ID" --region "$REGION" >/dev/null 2>&1; then
    echo "Using existing Amplify app: $APP_ID"
  else
    echo "Stored app id $APP_ID not found in $REGION, creating a new app"
    APP_ID=""
  fi
else
  APP_ID=""
fi

if [[ -z "$APP_ID" ]]; then
  APP_ID="$(aws amplify create-app \
    --name "$APP_NAME" \
    --platform WEB \
    --region "$REGION" \
    --query 'app.appId' \
    --output text)"
  echo "$APP_ID" > "$APP_ID_FILE"
  echo "Created app $APP_ID (saved to .amplify-app-id)"
fi

if aws amplify get-branch --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" >/dev/null 2>&1; then
  echo "Branch already exists: $BRANCH"
else
  aws amplify create-branch \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --no-enable-auto-build \
    --region "$REGION" \
    --output text >/dev/null
  echo "Created branch: $BRANCH"
fi

echo ""
echo "Bootstrap complete. App id: $APP_ID"
echo "Next: npm run backend:deploy:prod"
