# Dockerfile for producer-service (public HTTP API)
# Uses Node.js LTS, installs dependencies, builds TypeScript, and runs production build.
# Keep small and secure for Render or other container hosts.

FROM node:18-alpine AS base
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests and install dependencies (cacheable)
COPY package*.json ./
RUN npm ci --production --silent

# Copy source and build
COPY . .
RUN npm run build

# Runtime image: copy built app and minimal runtime deps
FROM node:18-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=base /usr/src/app/package*.json ./
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Notes:
# - Render will run `npm ci && npm run build` via render.yaml by default, but the Dockerfile
#   is provided for cases where you prefer to build a container image yourself.