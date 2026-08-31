import apis from "../data/apis.json" with { type: "json" };

interface GetApiInput {
  id: string;
}

const handler = async (
  input: GetApiInput,
  _ctx?: unknown
): Promise<{ api: unknown } | { error: string }> => {
  const api = apis.find((a: { id: string }) => a.id === input.id);
  if (!api) {
    return { error: `API not found: ${input.id}` };
  }
  return { api };
};

export const getApiTool = {
  name: "get_api",
  description: "Fetch a single Daraja API detail by id.",
  schema: {
    id: { type: "string" },
  },
  handler,
};
