import { describe, it, expect } from "vitest";
import { getDocResource, listDocResources } from "../src/resources/docs.js";
import { getImageResource, listImageResources } from "../src/resources/images.js";

describe("doc resources", () => {
  it("lists all docs", () => {
    const list = listDocResources();
    expect(list.length).toBeGreaterThanOrEqual(17);
    expect(list[0].uri).toMatch(/^daraja:\/\/docs\//);
  });

  it("fetches a doc resource by uri", () => {
    const res = getDocResource("daraja://docs/stk-push");
    expect(res.mimeType).toBe("text/markdown");
    expect(res.text).toMatch(/stk/i);
  });

  it("throws on unknown doc uri", () => {
    expect(() => getDocResource("daraja://docs/does-not-exist")).toThrow();
  });
});

describe("image resources", () => {
  it("lists images (may be empty)", () => {
    const list = listImageResources();
    expect(Array.isArray(list)).toBe(true);
  });

  it("throws on traversal in uri", () => {
    expect(() => getImageResource("daraja://assets/images/../../etc/passwd")).toThrow();
  });
});
