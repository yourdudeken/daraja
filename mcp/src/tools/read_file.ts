import { readFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "..");

interface ReadFileInput {
  path: string;
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
  input: ReadFileInput,
  _ctx?: unknown
): Promise<{ content: string } | { error: string }> => {
  const safePath = sanitize(input.path);
  const fullPath = path.join(REPO_ROOT, safePath);
  try {
    const content = await readFile(fullPath, "utf-8");
    return { content };
  } catch (err) {
    return { error: `Failed to read file: ${(err as Error).message}` };
  }
};

export const readFileTool = {
  name: "read_file",
  description: "Read a source file from the repository.",
  schema: {
    path: { type: "string" },
  },
  handler,
};
