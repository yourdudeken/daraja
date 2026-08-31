import { Hit } from "./index.js";
import { tokenize } from "./tokenizer.js";

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  path: string;
  snippet: string;
  score: number;
}

export function rank(hits: Hit[], docs: { id: string; text: string }[], limit = 10): SearchResult[] {
  const results = hits.map((hit) => {
    let score = 0;
    const titleTokens = new Set(tokenize(docById(docs, hit.doc.id)?.text ?? hit.doc.text));
    for (const term of hit.matchedTerms) {
      if (titleTokens.has(term)) score += 3;
      else score += 1;
    }
    const text = hit.doc.text;
    return {
      id: hit.doc.id,
      title: hit.doc.title,
      category: hit.doc.category,
      path: hit.doc.path,
      snippet: text.slice(0, 160),
      score,
    };
  });
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function docById(docs: { id: string; text: string }[], id: string): { id: string; text: string } | undefined {
  return docs.find((d) => d.id === id);
}
