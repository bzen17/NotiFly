#!/usr/bin/env bash
set -euo pipefail

echo "Running prettier --write across the repo..."
npx prettier --write "**/*.{js,ts,tsx,jsx,json,md,css,scss,html,yml,yaml,sql,mdx}" && echo "Formatting complete."
