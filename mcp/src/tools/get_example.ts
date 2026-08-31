import examples from "../data/examples.json" with { type: "json" };

interface GetExampleInput {
  apiId: string;
  language: string;
}

const handler = async (
  input: GetExampleInput,
  _ctx?: unknown
): Promise<{ example: unknown } | { error: string }> => {
  const list = (examples as Record<string, { language: string }[]>)[input.apiId];
  if (!list) {
    return { error: `No examples found for API: ${input.apiId}` };
  }
  const example = list.find((e) => e.language === input.language);
  if (!example) {
    return { error: `No ${input.language} example found for API: ${input.apiId}` };
  }
  return { example };
};

export const getExampleTool = {
  name: "get_example",
  description: "Fetch a code example for an API in a specific language.",
  schema: {
    apiId: { type: "string" },
    language: { type: "string" },
  },
  handler,
};
