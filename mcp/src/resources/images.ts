import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const IMAGES_DIR = path.join(REPO_ROOT, "assets", "images");

export interface ImageResource {
  uri: string;
  mimeType: string;
  data: string;
  metadata: {
    name: string;
  };
}

export interface ImageResourceListing {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function mimeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
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

function fileFor(uri: string): string {
  const prefix = "daraja://assets/images/";
  if (!uri.startsWith(prefix)) {
    throw new Error(`Invalid image resource uri: ${uri}`);
  }
  const file = uri.slice(prefix.length);
  if (file.length === 0) {
    throw new Error(`Invalid image resource uri: ${uri}`);
  }
  return sanitize(file);
}

export function getImageResource(uri: string): ImageResource {
  const file = fileFor(uri);
  const fullPath = path.join(IMAGES_DIR, file);
  const buf = readFileSync(fullPath);
  return {
    uri,
    mimeType: mimeFor(file),
    data: buf.toString("base64"),
    metadata: { name: file },
  };
}

export function listImageResources(): ImageResourceListing[] {
  const files = readdirSync(IMAGES_DIR);
  const images = files.filter((f) => f !== ".gitkeep");
  return images.map((f) => ({
    uri: `daraja://assets/images/${f}`,
    name: f,
    mimeType: mimeFor(f),
    description: `Image asset ${f}`,
  }));
}
