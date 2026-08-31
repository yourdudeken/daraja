import documents from "../data/documents.json" with { type: "json" };
import { buildIndex, Doc } from "../search/index.js";
import { rank, SearchResult } from "../search/ranking.js";

interface SearchDocsInput {
  query: string;
  limit?: number;
}

const docIndex = buildIndex(documents as unknown as Doc[]);
const docs = documents as unknown as { id: string; text: string }[];

const handler = async (
  input: SearchDocsInput,
  _ctx?: unknown
): Promise<{ results: SearchResult[] }> => {
  const hits = docIndex.search(input.query);
  const results = rank(hits, docs, input.limit ?? 10);
  return { results };
};

export const searchDocsTool = {
  name: "search_docs",
  description: "Search the Daraja documentation corpus and return ranked results.",
  schema: {
    query: { type: "string" },
    limit: { type: "number" },
  },
  handler,
};
