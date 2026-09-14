# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root + package manifests (npm needs the root package.json
# to resolve the mcp workspace and its file:../sdks/typescript dependency)
COPY package.json package-lock.json ./
COPY mcp/package.json mcp/
COPY sdks/typescript/package.json sdks/typescript/

# Install all workspace dependencies
RUN npm install

# Copy SDK source and build it
COPY sdks/typescript/ sdks/typescript/
RUN npm --prefix sdks/typescript run build

# Copy MCP source and build it
COPY mcp/tsconfig.json mcp/
COPY mcp/src/ mcp/src/
RUN npm --prefix mcp run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini

# MCP application
COPY --from=builder /app/mcp/dist/ ./dist/
COPY --from=builder /app/mcp/package.json ./

# Hoisted dependencies (express, @modelcontextprotocol/sdk, axios, ...)
# plus the daraja-sdk-ts symlink -> ../../sdks/typescript
COPY --from=builder /app/node_modules/ ./node_modules/

# SDK package (resolves the daraja-sdk-ts symlink at runtime)
COPY --from=builder /app/sdks/typescript/dist/ ./sdks/typescript/dist/
COPY --from=builder /app/sdks/typescript/package.json ./sdks/typescript/package.json

ENV NODE_ENV=production
ENV DARAJA_MCP_MODE=http
ENV MCP_PORT=3999
ENV MCP_HOST=0.0.0.0

EXPOSE 3999

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
