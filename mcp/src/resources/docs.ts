import { readFileSync } from "node:fs";
import path from "node:path";
import documents from "../data/documents.json" with { type: "json" };

const REPO_ROOT = path.resolve(process.cwd(), "..");

interface DocRecord {
  id: string;
  title: string;
  category: string;
  path: string;
  text: string;
}

export interface DocResource {
  uri: string;
  mimeType: string;
  text: string;
  metadata: {
    id: string;
    title: string;
    category: string;
    path: string;
  };
}

export interface DocResourceListing {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

function uriFor(id: string): string {
  return `daraja://docs/${id}`;
}

export function getDocResource(uri: string): DocResource {
  const prefix = "daraja://docs/";
  if (!uri.startsWith(prefix)) {
    throw new Error(`Invalid doc resource uri: ${uri}`);
  }
  const id = uri.slice(prefix.length);
  const doc = (documents as DocRecord[]).find((d) => d.id === id);
  if (!doc) {
    throw new Error(`Document not found: ${id}`);
  }
  const text = readFileSync(path.join(REPO_ROOT, doc.path), "utf-8");
  return {
    uri: uriFor(doc.id),
    mimeType: "text/markdown",
    text,
    metadata: {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      path: doc.path,
    },
  };
}

export function listDocResources(): DocResourceListing[] {
  return (documents as DocRecord[]).map((doc) => ({
    uri: uriFor(doc.id),
    name: doc.title,
    mimeType: "text/markdown",
    description: doc.text,
  }));
}

export function registerDocResources(_server: unknown): DocResourceListing[] {
  return listDocResources();
}
