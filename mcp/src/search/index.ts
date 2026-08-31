import { tokenize } from "./tokenizer.js";

export interface Doc {
  id: string;
  title: string;
  category: string;
  path: string;
  text: string;
}

export interface IndexEntry {
  doc: Doc;
  terms: string[];
}

export interface Hit {
  doc: Doc;
  matchedTerms: Set<string>;
}

export class SearchIndex {
  private inverted: Map<string, Set<string>> = new Map();
  private entries: IndexEntry[] = [];

  static from(docs: Doc[]): SearchIndex {
    const idx = new SearchIndex();
    idx.addAll(docs);
    return idx;
  }

  addAll(docs: Doc[]): void {
    for (const doc of docs) this.add(doc);
  }

  add(doc: Doc): void {
    const tokens = tokenize(`${doc.title} ${doc.text}`);
    this.entries.push({ doc, terms: tokens });
    for (const t of tokens) {
      if (!this.inverted.has(t)) this.inverted.set(t, new Set());
      this.inverted.get(t)!.add(doc.id);
    }
  }

  search(query: string): Hit[] {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const resultIds = new Set<string>();
    for (const t of terms) {
      const ids = this.inverted.get(t);
      if (ids) for (const id of ids) resultIds.add(id);
    }
    const hits: Hit[] = [];
    for (const id of resultIds) {
      const entry = this.entries.find((e) => e.doc.id === id)!;
      const matchedTerms = new Set(terms.filter((t) => entry.terms.includes(t)));
      hits.push({ doc: entry.doc, matchedTerms });
    }
    return hits;
  }
}

export function buildIndex(docs: Doc[]): SearchIndex {
  return SearchIndex.from(docs);
}
