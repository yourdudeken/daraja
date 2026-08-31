import { describe, it, expect } from "vitest";
import { searchDocsTool } from "../src/tools/search_docs.js";
import { getDocTool } from "../src/tools/get_doc.js";
import { listApisTool } from "../src/tools/list_apis.js";
import { getApiTool } from "../src/tools/get_api.js";
import { getExampleTool } from "../src/tools/get_example.js";
import { listFilesTool } from "../src/tools/list_files.js";
import { readFileTool } from "../src/tools/read_file.js";

describe("search_docs", () => {
  it("returns ranked results for a query", async () => {
    const res = await searchDocsTool.handler({ query: "stk push" }, {} as any);
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].id).toMatch(/stk/i);
  });
});

describe("get_doc", () => {
  it("fetches a doc by id", async () => {
    const res = await getDocTool.handler({ id: "stk-push" }, {} as any);
    expect(res.doc.title).toMatch(/stk/i);
  });
});

describe("list_apis", () => {
  it("returns all daraja apis", async () => {
    const res = await listApisTool.handler({}, {} as any);
    expect(res.apis.length).toBeGreaterThanOrEqual(9);
  });
});

describe("get_api", () => {
  it("fetches an api by id", async () => {
    const res = await getApiTool.handler({ id: "stk-push" }, {} as any);
    expect(res.api.method).toBe("POST");
  });
});

describe("get_example", () => {
  it("fetches a python example for stk-push", async () => {
    const res = await getExampleTool.handler({ apiId: "stk-push", language: "python" }, {} as any);
    expect(res.example.language).toBe("python");
  });
});

describe("file tools", () => {
  it("lists root files", async () => {
    const res = await listFilesTool.handler({}, {} as any);
    expect(res.files).toContain("package.json");
  });

  it("reads a real file", async () => {
    const res = await readFileTool.handler({ path: "package.json" }, {} as any);
    expect(res.content).toContain("daraja");
  });

  it("rejects path traversal", async () => {
    await expect(readFileTool.handler({ path: "../../etc/passwd" }, {} as any)).rejects.toThrow();
  });
});
