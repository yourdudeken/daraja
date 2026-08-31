import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DOCS_JSON = path.join(REPO_ROOT, "mcp", "src", "data", "documents.json");

interface Doc {
  id: string;
  title: string;
  category: string;
  path: string;
  text: string;
}

function resolveReposPath(p: string): string {
  const abs = path.resolve(REPO_ROOT, p);
  if (!abs.startsWith(REPO_ROOT)) return "";
  return abs;
}

function main(): void {
  const raw = readFileSync(DOCS_JSON, "utf-8");
  let docs: Doc[];
  try {
    docs = JSON.parse(raw) as Doc[];
  } catch {
    console.error("FAIL: documents.json is not valid JSON");
    process.exit(1);
  }

  if (!Array.isArray(docs)) {
    console.error("FAIL: documents.json root is not an array");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const doc of docs) {
    const relPath = resolveReposPath(doc.path);
    const ok =
      relPath &&
      relPath.endsWith(".md") &&
      existsSync(relPath) &&
      typeof doc.id === "string" &&
      typeof doc.title === "string" &&
      typeof doc.category === "string" &&
      typeof doc.text === "string";
    if (ok && /^\s*#/.test(readFileSync(relPath, "utf-8"))) {
      passed++;
      console.log(`PASS: ${doc.id} (${doc.path})`);
    } else {
      failed++;
      console.error(`FAIL: ${doc.id} (${doc.path})`);
    }
  }

  console.log(`validate-docs: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("validate-docs OK");
}

main();
