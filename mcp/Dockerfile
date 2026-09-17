# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# npm 10.x (shipped with node:22) hits an arborist bug resolving this
# dependency tree ("Cannot read properties of null (reading 'edgesOut')").
# Pin npm 11, which fixes it.
RUN npm install -g npm@11.19.1

# The published daraja-sdk-ts package is installed from the npm registry —
# no local SDK symlink or workspace is required.
COPY package.json package-lock.json ./

# Install dependencies from the lockfile (daraja-sdk-ts resolves from the npm
# registry; npm 11 auto-installs its required axios peer)
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
