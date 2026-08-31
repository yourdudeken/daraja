import apis from "../data/apis.json" with { type: "json" };

const handler = async (_input: Record<string, never>, _ctx?: unknown): Promise<{ apis: unknown[] }> => {
  return { apis };
};

export const listApisTool = {
  name: "list_apis",
  description: "List all available Daraja M-Pesa APIs.",
  schema: {},
  handler,
};
