import { describe, it, expect } from "vitest";
import { tokenize } from "../src/search/tokenizer.js";
import { buildIndex, SearchIndex } from "../src/search/index.js";
import { rank, SearchResult } from "../src/search/ranking.js";

const docs: SearchResult["doc"][] = [
  { id: "stk-push", title: "STK Push", category: "api", path: "docs/apis/stk-push.md", text: "STK push initiates a USSD prompt on a customer phone to authorize a payment." },
  { id: "authentication", title: "Authentication", category: "getting-started", path: "docs/getting-started/authentication.md", text: "Authentication uses an OAuth2 bearer token from your consumer key and secret." },
];

describe("tokenizer", () => {
  it("splits into lowercase alphanumeric tokens", () => {
    expect(tokenize("STK Push v3.0 / Customer")).toEqual([
      "stk", "push", "v3", "0", "customer",
    ]);
  });
});

describe("search index", () => {
  it("finds documents containing the query term", () => {
    const index = buildIndex(docs);
    const results = index.search("stk");
    expect(results.map((r) => r.doc.id)).toContain("stk-push");
  });

  it("returns empty for unknown terms", () => {
    const index = buildIndex(docs);
    expect(index.search("zzzzz")).toEqual([]);
  });
});

describe("ranking", () => {
  it("ranks title matches above body matches", () => {
    const index = buildIndex(docs);
    const results = rank(index.search("authentication token"), docs, 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("authentication");
  });
});
