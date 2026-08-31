import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const EXCLUDED_DIR = "superpowers";
const OUT_FILE = path.join(REPO_ROOT, "mcp", "src", "data", "documents.json");

interface Doc {
  id: string;
  title: string;
  category: string;
  path: string;
  text: string;
}

function walk(dir: string, base: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (statSync(full).isDirectory()) {
      if (entry === EXCLUDED_DIR) continue;
      walk(full, base, out);
    } else if (entry.endsWith(".md")) {
      out.push(rel);
    }
  }
}

function slugify(filePath: string): string {
  const base = path.basename(filePath).replace(/\.md$/i, "");
  const docName = base === "README" ? "readme" : base;
  let slug = docName.replace(/_/g, "-").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-+|-+$)/g, "");
  if (slug === "readme") {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/");
    const lang = segments[0];
    if (lang === "python" || lang === "typescript" || lang === "go") {
      slug = `${lang}-readme`;
    }
  }
  return slug;
}

function categoryFor(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const top = normalized.split("/")[0];
  switch (top) {
    case "apis":
      return "api";
    case "getting-started":
      return "getting-started";
    case "callbacks":
      return "callbacks";
    case "errors":
      return "errors";
    case "python":
    case "typescript":
    case "go":
      return top;
    default:
      return "getting-started";
  }
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#+\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?![^*])/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();
}

function extractText(filePath: string): string {
  const raw = readFileSync(path.join(REPO_ROOT, filePath), "utf-8");
  const lines = raw.split(/\r?\n/);
  const body: string[] = [];
  let sawFirstContent = false;
  let inCode = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (/^\s*#/.test(line)) {
      if (sawFirstContent) break;
      continue;
    }
    const stripped = stripMarkdown(line);
    if (!stripped) continue;
    sawFirstContent = true;
    body.push(stripped);
    if (body.length >= 2) break;
  }
  if (body.length === 0) {
    const noBackticks = raw.replace(/```[\s\S]*?```/g, " ").replace(/^#.*$/gm, " ").trim();
    if (noBackticks) body.push(noBackticks.split(/\s+/).slice(0, 40).join(" "));
  }
  return body.join(" ");
}

function main(): void {
  const markdownFiles: string[] = [];
  walk(DOCS_DIR, DOCS_DIR, markdownFiles);

  const docs: Doc[] = markdownFiles
    .filter((rel) => rel !== ".gitkeep")
    .map((rel) => {
      const raw = readFileSync(path.join(REPO_ROOT, "docs", rel), "utf-8");
      const titleMatch = raw.match(/^\s*#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : slugify(rel);
      return {
        id: slugify(rel),
        title,
        category: categoryFor(rel),
        path: path.join("docs", rel),
        text: extractText(path.join("docs", rel)),
      };
    });

  docs.sort((a, b) => a.path.localeCompare(b.path));

  writeFileSync(OUT_FILE, JSON.stringify(docs, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${docs.length} docs to ${path.relative(REPO_ROOT, OUT_FILE)}`);
}

main();
