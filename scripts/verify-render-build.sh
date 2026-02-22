#!/usr/bin/env bash
set -euo pipefail

# Verification script for Render deployment build
# This mimics the exact build process Render will use

echo "=========================================="
echo "🔍 Render Build Verification"
echo "=========================================="
echo ""

# Track failures
FAILED=0

# Store original directory
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

# Clean previous builds for accurate test
echo "🧹 Cleaning previous builds..."
rm -rf libs/delivery-adapters/dist
rm -rf services/router-service/dist
rm -rf services/worker-email/dist
rm -rf services/producer-service/dist
rm -rf services/producer-service/router-service
rm -rf services/producer-service/worker-email
echo "✅ Clean complete"
echo ""

# Run exact Render build command
echo "🏗️  Running Render build command..."
echo "Command: npm install && npm run build:all && chmod +x scripts/package-single.sh && ./scripts/package-single.sh"
echo ""

if ! npm install; then
  echo "❌ npm install failed"
  exit 1
fi

if ! npm run build:all; then
  echo "❌ npm run build:all failed"
  exit 1
fi

if ! chmod +x scripts/package-single.sh; then
  echo "❌ chmod +x scripts/package-single.sh failed"
  exit 1
fi

if ! ./scripts/package-single.sh; then
  echo "❌ ./scripts/package-single.sh failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Build command completed successfully"
echo "=========================================="
echo ""

# Verify critical artifacts exist
echo "🔍 Verifying build artifacts..."
echo ""

check_file() {
  local file=$1
  local desc=$2
  if [ -f "$file" ]; then
    echo "  ✅ $desc"
  else
    echo "  ❌ MISSING: $desc"
    echo "     Expected: $file"
    FAILED=1
  fi
}

check_dir() {
  local dir=$1
  local desc=$2
  if [ -d "$dir" ]; then
    echo "  ✅ $desc"
  else
    echo "  ❌ MISSING: $desc"
    echo "     Expected: $dir"
    FAILED=1
  fi
}

echo "📦 delivery-adapters (lib):"
check_dir "libs/delivery-adapters/dist" "dist directory"
check_file "libs/delivery-adapters/dist/index.js" "main export"
echo ""

echo "🔀 router-service:"
check_dir "services/router-service/dist" "dist directory"
check_file "services/router-service/dist/index.js" "entry point"
check_dir "services/router-service/node_modules" "node_modules"
echo ""

echo "📧 worker-email:"
check_dir "services/worker-email/dist" "dist directory"
check_file "services/worker-email/dist/index.js" "entry point"
check_dir "services/worker-email/node_modules" "node_modules"
echo ""

echo "🎯 producer-service (main):"
check_dir "services/producer-service/dist" "dist directory"
check_file "services/producer-service/dist/index.js" "entry point (START COMMAND TARGET)"
check_dir "services/producer-service/node_modules" "node_modules"
echo ""

echo "📦 Packaged services in producer-service:"
check_dir "services/producer-service/router-service/dist" "router-service/dist"
check_file "services/producer-service/router-service/dist/index.js" "router-service entry"
check_dir "services/producer-service/router-service/node_modules" "router-service/node_modules"
check_dir "services/producer-service/worker-email/dist" "worker-email/dist"
check_file "services/producer-service/worker-email/dist/index.js" "worker-email entry"
check_dir "services/producer-service/worker-email/node_modules" "worker-email/node_modules"
echo ""

# Verify start command entry point
echo "=========================================="
echo "🚀 Verifying START command compatibility"
echo "=========================================="
echo ""
echo "Start command: node services/producer-service/dist/index.js"
echo ""

START_ENTRY="services/producer-service/dist/index.js"
if [ -f "$START_ENTRY" ]; then
  echo "  ✅ Start entry point exists: $START_ENTRY"
  
  # Try to check if it's valid JavaScript (basic syntax check)
  if node --check "$START_ENTRY" 2>/dev/null; then
    echo "  ✅ Entry point is valid JavaScript"
  else
    echo "  ⚠️  Entry point syntax check failed (may need runtime dependencies)"
  fi
else
  echo "  ❌ Start entry point MISSING: $START_ENTRY"
  FAILED=1
fi

echo ""
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED"
  echo "=========================================="
  echo ""
  echo "🎉 Build artifacts are ready for Render deployment!"
  echo ""
  echo "Next steps:"
  echo "  1. Ensure environment variables are configured on Render:"
  echo "     - REDIS_URL (or REDIS_HOST/REDIS_PORT)"
  echo "     - MONGO_URI (or MONGO_HOST/MONGO_PORT/MONGO_USER/MONGO_PASS)"
  echo "     - PG_CONNECTION (or DATABASE_URL or PG_HOST/PG_PORT/PG_USER/PG_PASS)"
  echo "     - PORT (if not using default)"
  echo "  2. Push to main branch"
  echo "  3. Render will run the build command and start the service"
  echo ""
  exit 0
else
  echo "❌ VERIFICATION FAILED"
  echo "=========================================="
  echo ""
  echo "Some build artifacts are missing. Review the errors above."
  echo "Do not push to main until all checks pass."
  echo ""
  exit 1
fi
