# Build stage
FROM node:22-alpine AS builder
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

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production
ENV DARAJA_MCP_MODE=http
ENV MCP_PORT=3999
ENV MCP_HOST=0.0.0.0

EXPOSE 3999

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]