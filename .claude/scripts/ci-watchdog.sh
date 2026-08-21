#!/usr/bin/env bash
# Poll GitHub Actions on main until all runs complete, then report.
# Exits 1 if any run failed so Claude knows to investigate.
REPO="hansogj/discogs-nextjs-viewer"
BRANCH="main"
TIMEOUT=300   # 5 minutes
POLL=15
START=$(date +%s)

echo ""
echo "=== CI Watchdog: $REPO @ $BRANCH ==="
echo "Waiting 20s for GitHub to register the push..."
sleep 20

while true; do
  ELAPSED=$(( $(date +%s) - START ))

  if [ "$ELAPSED" -gt "$TIMEOUT" ]; then
    echo "⏰ Timed out after ${TIMEOUT}s — CI still running. Check manually."
    exit 1
  fi

  IN_PROGRESS=$(gh run list --repo "$REPO" --branch "$BRANCH" --limit 8 \
    --json status \
    --jq '[.[] | select(.status == "in_progress" or .status == "queued")] | length' 2>/dev/null || echo "1")

  if [ "$IN_PROGRESS" = "0" ]; then
    echo ""
    echo "--- Results ---"
    gh run list --repo "$REPO" --branch "$BRANCH" --limit 8 \
      --json name,conclusion \
      --jq '.[] | "\(.conclusion | ascii_upcase) \(.name)"' 2>/dev/null

    FAILURES=$(gh run list --repo "$REPO" --branch "$BRANCH" --limit 8 \
      --json conclusion \
      --jq '[.[] | select(.conclusion == "failure")] | length' 2>/dev/null || echo "0")

    echo ""
    if [ "$FAILURES" -gt "0" ]; then
      echo "❌ $FAILURES workflow(s) failed — investigate and fix before proceeding."
      exit 1
    else
      echo "✅ All CI checks passed."
      exit 0
    fi
  fi

  echo "  ⏳ ${ELAPSED}s elapsed — ${IN_PROGRESS} run(s) still in progress..."
  sleep "$POLL"
done
