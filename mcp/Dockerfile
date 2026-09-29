# Build stage
# NFR-SEC-004 / WBS-017: pinned by digest, not by mutable tag. A tag means the
# non-root claim below is only ever as good as whatever was published most
# recently. Digest resolved from the Docker Hub registry on 2026-09-29; it is an
# OCI *index*, so multi-arch (amd64/arm64/arm) is preserved.
# Renew with:  curl -sI -H "Accept: application/vnd.oci.image.index.v1+json" \
#                 -H "Authorization: Bearer $(curl -s \
#                   "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" \
#                   | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')" \
#                 https://registry-1.docker.io/v2/library/node/manifests/22-alpine \
#               | grep -i docker-content-digest
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /app

# npm 10.x (shipped with node:22) hits an arborist bug resolving this
# dependency tree ("Cannot read properties of null (reading 'edgesOut')").
# Pin npm 11, which fixes it.
RUN npm install -g npm@11.19.1

# The MCP depends on the *published* daraja-sdk-ts package from the npm
# registry — the exact version is pinned in package.json and locked in
# package-lock.json, so no local SDK source is needed to build the image.
COPY package.json package-lock.json ./
RUN npm ci

# Compile the TypeScript sources.
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Drop dev dependencies before the runtime stage
RUN npm prune --omit=dev

# Runtime stage (same digest as the builder stage — WBS-017).
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/

# NFR-SEC-021 / WBS-016: the image declares a non-root USER before ENTRYPOINT.
# The user is created explicitly rather than assumed to exist in the base
# image, so the Dockerfile alone states exactly which uid the artifact runs as
# and a reviewer does not have to trust an upstream /etc/passwd. The app only
# reads its own files, so it owns exactly what it needs and never needs
# privilege escalation. EXPOSE 3999 is above 1024, so binding the port needs
# no root capability either.
RUN addgroup -S daraja && adduser -S -D -H -G daraja -h /app daraja \
    && chown -R daraja:daraja /app
USER daraja

ENV NODE_ENV=production
ENV DARAJA_MCP_MODE=http
ENV MCP_PORT=3999
# NFR-SEC-005 / gate G1: the image must not bake an all-interfaces bind into
# itself. Loopback is the default; an operator that needs the container
# reachable sets MCP_HOST explicitly at run time, and must set MCP_AUTH_TOKEN
# as well (NFR-SEC-004).
ENV MCP_HOST=127.0.0.1

EXPOSE 3999

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]