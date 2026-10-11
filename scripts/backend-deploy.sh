#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID_FILE="$ROOT/.amplify-app-id"
REGION="${AWS_REGION:-ap-south-1}"
BRANCH="${AMPLIFY_BRANCH:-main}"
OUT_DIR="$ROOT/outputs/$BRANCH"
MODE="${1:-deploy}"

if [[ ! -f "$APP_ID_FILE" ]]; then
  echo "Missing .amplify-app-id. Run: npm run backend:bootstrap"
  exit 1
fi
APP_ID="$(tr -d '[:space:]' < "$APP_ID_FILE")"

export AWS_REGION="$REGION"
cd "$ROOT"

if [[ "$MODE" == "outputs" ]]; then
  mkdir -p "$OUT_DIR"
  npx ampx generate outputs --branch "$BRANCH" --app-id "$APP_ID" --out-dir "$OUT_DIR"
  echo "Outputs: outputs/$BRANCH/amplify_outputs.json"
  exit 0
fi

echo "Backend deploy"
echo "  Branch:  $BRANCH"
echo "  App id:  $APP_ID"
echo "  Region:  $REGION"
echo "  AWS:     ${AWS_PROFILE:-default credentials}"
echo "Creates or updates Cognito, AppSync + DynamoDB, S3 storage, the"
echo "generate-content Lambda and its HTTP API in this account."

if [[ "${YES:-}" != "1" ]]; then
  read -r -p "Continue? (y/N) " answer
  [[ "$answer" == "y" || "$answer" == "yes" ]] || { echo "Cancelled."; exit 0; }
fi

export CI="${CI:-true}"
npx ampx pipeline-deploy --branch "$BRANCH" --app-id "$APP_ID"

mkdir -p "$OUT_DIR"
npx ampx generate outputs --branch "$BRANCH" --app-id "$APP_ID" --out-dir "$OUT_DIR"

echo ""
echo "Backend deployed. Outputs: outputs/$BRANCH/amplify_outputs.json"
echo "Next: npm run deploy:web"
