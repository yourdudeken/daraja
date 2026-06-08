import { Command } from "commander";
import { MpesaApiClient } from "../../client/client.js";

export const accountBalanceCommand = new Command("account-balance")
  .description("Query account balance")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .requiredOption("--shortcode <code>", "Organization shortcode", parseInt)
  .requiredOption("--initiator <name>", "API initiator name")
  .requiredOption("--credential <cred>", "Security credential")
  .option("--env <environment>", "sandbox or production", "sandbox")
  .option("--identifier-type <type>", "Identifier type", "4")
  .option("--timeout <url>", "Queue timeout URL", "https://example.com/timeout")
  .option("--result <url>", "Result URL", "https://example.com/result")
  .action(async (opts: {
    consumerKey: string; consumerSecret: string; shortcode: number;
    initiator: string; credential: string; env: string;
    identifierType: string; timeout: string; result: string;
  }) => {
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
      initiatorName: opts.initiator,
      securityCredential: opts.credential,
    });
    try {
      const result = await client.post("/mpesa/accountbalance/v1/query", {
        Initiator: opts.initiator,
        SecurityCredential: opts.credential,
        CommandID: "AccountBalance",
        PartyA: opts.shortcode,
        IdentifierType: parseInt(opts.identifierType, 10),
        Remarks: "CLI balance query",
        QueueTimeOutURL: opts.timeout,
        ResultURL: opts.result,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Account balance query failed:", msg);
      process.exit(1);
    }
  });
