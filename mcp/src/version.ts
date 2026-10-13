import { createRequire } from "node:module";

/**
 * MCP server version.
 *
 * `mcp/package.json` is the single source of truth. This resolves it at runtime
 * from both `src/` (tests) and `dist/` (compiled output), since both sit one
 * directory below the package root.
 */
const require = createRequire(import.meta.url);
export const VERSION: string = (require("../package.json") as { version: string }).version;
