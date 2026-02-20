#!/usr/bin/env bash
set -euo pipefail

# Run all frontend and backend dev instances and stream logs.
# Usage: ./run-all.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

PIDS=()
start_service() {
  name="$1"
  dir="$2"
  cmd="$3"
  logfile="$LOG_DIR/${name}.log"
  echo "Starting $name (dir=$dir) -> $logfile"
  (cd "$dir" && eval "$cmd") > "$logfile" 2>&1 &
  pid=$!
  PIDS+=("$pid")
  echo "$name pid=$pid"
}

cleanup() {
  echo "Stopping ${#PIDS[@]} processes..."
  for p in "${PIDS[@]}"; do
    if kill -0 "$p" 2>/dev/null; then
      kill "$p" || true
    fi
  done
  exit 0
}

trap cleanup INT TERM

# Start services
start_service web "$ROOT_DIR/web" "npm run local"
start_service router-service "$ROOT_DIR/services/router-service" "npm run dev"
start_service producer-service "$ROOT_DIR/services/producer-service" "npm run dev"
start_service worker-email "$ROOT_DIR/services/worker-email" "npm run dev"

echo "All services started. Logs are in $LOG_DIR"
echo "Press Ctrl-C to stop all. Streaming logs..."

# stream logs (will follow new content)
exec tail -F "$LOG_DIR"/*.log
