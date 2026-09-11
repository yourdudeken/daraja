# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY mcp/package.json mcp/package-lock.json* ./
COPY sdks/typescript/package.json ../sdks/typescript/package.json
COPY sdks/typescript/package-lock.json* ../sdks/typescript/
COPY sdks/typescript/src/ ../sdks/typescript/src/
COPY sdks/typescript/tsconfig.json ../sdks/typescript/tsconfig.json
COPY sdks/typescript/tsup.config.ts ../sdks/typescript/tsup.config.ts

RUN npm install
RUN cd ../sdks/typescript && npm install && npm run build

COPY mcp/tsconfig.json ./
COPY mcp/src/ ./src/
RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /sdks/typescript/dist/ ../sdks/typescript/dist/
COPY --from=builder /sdks/typescript/package.json ../sdks/typescript/package.json
COPY --from=builder /sdks/typescript/node_modules/ ../sdks/typescript/node_modules/

ENV NODE_ENV=production
ENV DARAJA_MCP_MODE=http
ENV MCP_PORT=3000
ENV MCP_HOST=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
