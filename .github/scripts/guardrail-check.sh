
#!/usr/bin/env bash
set -euo pipefail

# Architecture guardrail: prevent accidental HTTP server exposure in router-service and worker-email
# Exclude common generated and dependency folders (node_modules, dist, .next, coverage)
FAIL=0
EXCLUDE_DIRS=(node_modules dist .next coverage)

for d in services/router-service services/worker-email; do
  if [ -d "$d" ]; then
    echo "Scanning $d (excluding ${EXCLUDE_DIRS[*]})"
    matches=$(grep -R --line-number -E \
      --exclude-dir=${EXCLUDE_DIRS[0]} \
      --exclude-dir=${EXCLUDE_DIRS[1]} \
      --exclude-dir=${EXCLUDE_DIRS[2]} \
      --exclude-dir=${EXCLUDE_DIRS[3]} \
      "listen\(|createServer\(|http\.createServer" "$d" || true)

    if [ -n "$matches" ]; then
      echo "ERROR: HTTP server pattern detected in $d. These services must not expose HTTP servers."
      echo "$matches"
      FAIL=1
    fi
  fi
done

if [ $FAIL -eq 1 ]; then
  echo "Architecture guardrail failed. Remove server listen patterns from router-service and worker-email."
  exit 2
fi

echo "Architecture guardrail passed."
