import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "mcp", "src", "data");

interface Doc {
  id: string;
  title: string;
  category: string;
  path: string;
  text: string;
}

interface Api {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  description: string;
}

interface Example {
  language: string;
  title: string;
  code: string;
}

function load<T>(file: string): T {
  const raw = readFileSync(path.join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

function validateDocs(docs: Doc[]): string[] {
  const errors: string[] = [];
  const required: (keyof Doc)[] = ["id", "title", "category", "path", "text"];
  for (const doc of docs) {
    for (const key of required) {
      if (typeof doc[key] !== "string" || doc[key] === "") {
        errors.push(`doc missing non-empty '${key}': ${JSON.stringify(doc)}`);
      }
    }
  }
  return errors;
}

function validateApis(apis: Api[]): string[] {
  const errors: string[] = [];
  const required: (keyof Api)[] = ["id", "name", "endpoint", "method", "description"];
  for (const api of apis) {
    for (const key of required) {
      if (typeof api[key] !== "string" || api[key] === "") {
        errors.push(`api missing non-empty '${key}': ${JSON.stringify(api)}`);
      }
    }
  }
  return errors;
}

function validateExamples(examples: Record<string, Example[]>): string[] {
  const errors: string[] = [];
  if (typeof examples !== "object" || Array.isArray(examples)) {
    return ["examples.json must be an object keyed by api id"];
  }
  for (const [apiId, list] of Object.entries(examples)) {
    if (!Array.isArray(list)) {
      errors.push(`examples.${apiId} must be an array`);
      continue;
    }
    for (const ex of list) {
      if (typeof ex.language !== "string" || ex.language === "") {
        errors.push(`examples.${apiId} entry missing non-empty 'language'`);
      }
      if (typeof ex.title !== "string") {
        errors.push(`examples.${apiId} entry missing 'title'`);
      }
      if (typeof ex.code !== "string") {
        errors.push(`examples.${apiId} entry missing 'code'`);
      }
    }
  }
  return errors;
}

function main(): void {
  const errors: string[] = [];

  const docs = load<Doc[]>("documents.json");
  const apis = load<Api[]>("apis.json");
  const examples = load<Record<string, Example[]>>("examples.json");

  errors.push(...validateDocs(docs));
  errors.push(...validateApis(apis));
  errors.push(...validateExamples(examples));

  console.log(`documents.json: ${docs.length} docs`);
  console.log(`apis.json: ${apis.length} apis`);
  console.log(`examples.json: ${Object.keys(examples).length} apis with examples`);

  if (errors.length > 0) {
    for (const err of errors) console.error(`FAIL: ${err}`);
    process.exit(1);
  }
  console.log("build:index OK");
}

main();
