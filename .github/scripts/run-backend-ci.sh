#!/usr/bin/env bash
set -euo pipefail

# This script detects changed backend packages (services/ and libs/) vs origin/main
# and runs Prettier, ESLint, TypeScript typecheck, tests and build for each changed package.

git fetch origin main || true
CHANGED_FILES=$(git diff --name-only origin/main...HEAD || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected relative to origin/main. Skipping backend CI."
  exit 0
fi

PACKAGES=$(echo "$CHANGED_FILES" | grep -E '^(services|libs)/' || true | awk -F/ '{print $1"/"$2}' | sort -u | tr '\n' ' ')

if [ -z "$PACKAGES" ]; then
  echo "No services or libs changed. Skipping backend CI."
  exit 0
fi

for pkg in $PACKAGES; do
  if [ ! -d "$pkg" ]; then
    echo "Skipping $pkg (not a directory)"
    continue
  fi
  echo "--- Processing $pkg ---"
  npm ci --prefix "$pkg"

  # Prettier
  npx prettier --check "$pkg/**/*.{ts,tsx,js,jsx,json,md}" || { echo "Prettier check failed for $pkg"; exit 1; }

  # ESLint
  npx eslint "$pkg" --ext .ts,.tsx,.js --max-warnings=0 || { echo "ESLint failed for $pkg"; exit 1; }

  # TypeScript typecheck (if tsconfig exists)
  if [ -f "$pkg/tsconfig.json" ]; then
    npx tsc --noEmit -p "$pkg/tsconfig.json"
  fi

  # Tests (if present)
  npm test --prefix "$pkg" --if-present

  # Build (if present)
  npm run build --prefix "$pkg" --if-present
done

echo "Backend CI completed successfully for: $PACKAGES"
