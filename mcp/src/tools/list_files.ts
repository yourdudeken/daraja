import { readdir } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "..");

interface ListFilesInput {
  path?: string;
}

function sanitize(p: string): string {
  if (path.isAbsolute(p)) {
    throw new Error("Absolute paths are not allowed");
  }
  if (p.split(/[\\/]/).includes("..")) {
    throw new Error("Path traversal is not allowed");
  }
  return p;
}

const handler = async (
  input: ListFilesInput,
  _ctx?: unknown
): Promise<{ files: string[] } | { error: string }> => {
  try {
    const dir = input.path ? path.join(REPO_ROOT, sanitize(input.path)) : REPO_ROOT;
    const files = await readdir(dir);
    return { files };
  } catch (err) {
    return { error: `Failed to list directory: ${(err as Error).message}` };
  }
};

export const listFilesTool = {
  name: "list_files",
  description: "List files in a directory within the repository.",
  schema: {
    path: { type: "string" },
  },
  handler,
};
