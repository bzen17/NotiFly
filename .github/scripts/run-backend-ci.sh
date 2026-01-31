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
  # Run Prettier from the package (use package-local deps when available)
  npx --prefix "$pkg" prettier --check "$pkg/**/*.{ts,tsx,js,jsx,json,md}" || { echo "Prettier check failed for $pkg"; exit 1; }

  # ESLint
  # Prefer running the package's lint script so package-local ESLint and config are used
  npm run lint --prefix "$pkg" --if-present || { echo "ESLint failed for $pkg"; exit 1; }

  # TypeScript typecheck (if tsconfig exists)
  if [ -f "$pkg/tsconfig.json" ]; then
    # Run the package-local tsc when available to ensure consistent TS version
    npx --prefix "$pkg" tsc --noEmit -p "$pkg/tsconfig.json"
  fi

  # Tests (if present)
  npm test --prefix "$pkg" --if-present

  # Build (if present)
  npm run build --prefix "$pkg" --if-present
done

echo "Backend CI completed successfully for: $PACKAGES"
