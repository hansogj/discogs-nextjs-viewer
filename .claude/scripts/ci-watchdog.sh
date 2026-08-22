#!/usr/bin/env bash
# Poll GitHub Actions for the current HEAD commit until all runs complete.
# Exits 1 if any run failed so Claude knows to investigate.
REPO="hansogj/discogs-nextjs-viewer"
TIMEOUT=300   # 5 minutes
POLL=15
START=$(date +%s)

# Capture the SHA we just pushed so we only watch runs for that commit
SHA=$(git rev-parse HEAD 2>/dev/null || echo "")

echo ""
echo "=== CI Watchdog: $REPO ==="
if [ -n "$SHA" ]; then
  echo "Watching SHA: ${SHA:0:8}"
fi
echo "Waiting 20s for GitHub to register the push..."
sleep 20

while true; do
  ELAPSED=$(( $(date +%s) - START ))

  if [ "$ELAPSED" -gt "$TIMEOUT" ]; then
    echo "⏰ Timed out after ${TIMEOUT}s — CI still running. Check manually."
    exit 1
  fi

  if [ -n "$SHA" ]; then
    JQ_FILTER="[.[] | select(.headSha == \"$SHA\")]"
  else
    JQ_FILTER="."
  fi

  IN_PROGRESS=$(gh run list --repo "$REPO" --limit 10 \
    --json status,headSha \
    --jq "$JQ_FILTER | [.[] | select(.status == \"in_progress\" or .status == \"queued\")] | length" \
    2>/dev/null || echo "1")

  # If no runs found yet for this SHA, keep waiting
  TOTAL=$(gh run list --repo "$REPO" --limit 10 \
    --json headSha \
    --jq "$JQ_FILTER | length" 2>/dev/null || echo "0")

  if [ "$TOTAL" = "0" ]; then
    echo "  ⏳ ${ELAPSED}s elapsed — waiting for GitHub to queue runs..."
    sleep "$POLL"
    continue
  fi

  if [ "$IN_PROGRESS" = "0" ]; then
    echo ""
    echo "--- Results for ${SHA:0:8} ---"
    gh run list --repo "$REPO" --limit 10 \
      --json name,conclusion,headSha \
      --jq ".[] | select(.headSha == \"$SHA\") | \"\(.conclusion | ascii_upcase) \(.name)\"" 2>/dev/null

    FAILURES=$(gh run list --repo "$REPO" --limit 10 \
      --json conclusion,headSha \
      --jq "[.[] | select(.headSha == \"$SHA\" and .conclusion == \"failure\")] | length" \
      2>/dev/null || echo "0")

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
