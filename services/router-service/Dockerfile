# Dockerfile for router-service (background worker)
# Important: This worker must NOT expose HTTP ports.

FROM node:18-alpine AS base
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --production --silent

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=base /usr/src/app/package*.json ./
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/dist ./dist

# No EXPOSE
CMD ["node", "dist/index.js"]

# Notes: Render background workers run the startCommand; provide this Dockerfile only
# if you want full container image control.