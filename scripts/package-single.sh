#!/usr/bin/env bash
set -euo pipefail

# This script copies built artifacts for router-service and worker-email
# into the producer-service subtree so a single-service deploy can run them.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "Packaging router-service into producer-service..."
rm -rf services/producer-service/router-service
mkdir -p services/producer-service/router-service
cp -R services/router-service/dist services/producer-service/router-service/dist || true
cp -R services/router-service/node_modules services/producer-service/router-service/node_modules || true

echo "Packaging worker-email into producer-service..."
rm -rf services/producer-service/worker-email
mkdir -p services/producer-service/worker-email
cp -R services/worker-email/dist services/producer-service/worker-email/dist || true
cp -R services/worker-email/node_modules services/producer-service/worker-email/node_modules || true

echo "Package complete"
