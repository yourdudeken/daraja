import { MpesaApiClient } from "../client/client.js";

export interface BatchRequest {
  method: "POST" | "GET";
  url: string;
  data?: unknown;
}

export async function executeBatch(
  client: MpesaApiClient,
  requests: BatchRequest[],
  concurrency = 3,
): Promise<unknown[]> {
  const results: unknown[] = [];
  for (let i = 0; i < requests.length; i += concurrency) {
    const chunk = requests.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((req) => {
        if (req.method === "POST") {
          return client.post(req.url, req.data);
        }
        return client.get(req.url);
      }),
    );
    results.push(...chunkResults);
  }
  return results;
}
