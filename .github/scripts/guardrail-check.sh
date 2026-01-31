#!/usr/bin/env bash
set -euo pipefail

# Architecture guardrail: prevent accidental HTTP server exposure in router-service and worker-email
FAIL=0
for d in services/router-service services/worker-email; do
  if [ -d "$d" ]; then
    if grep -R --line-number -E "listen\(|createServer\(|http.createServer" "$d" >/dev/null 2>&1; then
      echo "ERROR: HTTP server pattern detected in $d. These services must not expose HTTP servers."
      grep -R --line-number -E "listen\(|createServer\(|http.createServer" "$d" || true
      FAIL=1
    fi
  fi
done

if [ $FAIL -eq 1 ]; then
  echo "Architecture guardrail failed. Remove server listen patterns from router-service and worker-email."
  exit 2
fi

echo "Architecture guardrail passed."
