# syntax = docker/dockerfile:1
#
# Production image for the web app: builds the webpack bundle, then serves it
# from nginx, which also proxies /api and /collab to the other services in
# docker-compose.coolify.yml. Development uses Dockerfile.dev instead.

FROM node:22-slim AS build
WORKDIR /app

# Read by webpack's DefinePlugin at build time (see webpack.config.js), so
# they are baked into the bundle. Public URLs only: never pass a secret here.
ARG API_URL
ARG COLLAB_URL
ENV API_URL=$API_URL \
    COLLAB_URL=$COLLAB_URL \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json package-lock.json ./
# postinstall runs scripts/brand-electron-dev.sh (a no-op off macOS).
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
