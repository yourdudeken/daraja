import documents from "../data/documents.json" with { type: "json" };

interface GetDocInput {
  id: string;
}

const handler = async (
  input: GetDocInput,
  _ctx?: unknown
): Promise<{ doc: unknown } | { error: string }> => {
  const doc = documents.find((d: { id: string }) => d.id === input.id);
  if (!doc) {
    return { error: `Document not found: ${input.id}` };
  }
  return { doc };
};

export const getDocTool = {
  name: "get_doc",
  description: "Fetch a single documentation entry by id.",
  schema: {
    id: { type: "string" },
  },
  handler,
};
