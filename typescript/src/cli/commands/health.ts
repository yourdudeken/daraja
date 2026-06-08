import { Command } from "commander";
import { MpesaApiClient } from "../../client/client.js";

export const healthCommand = new Command("health")
  .description("Check API health by acquiring a test token")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .option("--env <environment>", "sandbox or production", "sandbox")
  .action(async (opts: { consumerKey: string; consumerSecret: string; env: string }) => {
    const start = Date.now();
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
    });
    try {
      await client.getAccessToken();
      const latency = Date.now() - start;
      console.log(JSON.stringify({
        status: "healthy",
        environment: opts.env,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      }, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(JSON.stringify({
        status: "unhealthy",
        environment: opts.env,
        error: msg,
        timestamp: new Date().toISOString(),
      }, null, 2));
      process.exit(1);
    }
  });
