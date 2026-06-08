import { Command } from "commander";
import { MpesaApiClient } from "../../client/client.js";

export const tokenCommand = new Command("token")
  .description("Generate OAuth access token")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .option("--env <environment>", "sandbox or production", "sandbox")
  .action(async (opts: { consumerKey: string; consumerSecret: string; env: string }) => {
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
    });
    try {
      const token = await client.getAccessToken();
      console.log(JSON.stringify({ access_token: token, environment: opts.env }, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to acquire token:", msg);
      process.exit(1);
    }
  });
