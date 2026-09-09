import { Command } from "commander";
import { MpesaApiClient } from "../../client/client.js";

export const transactionStatusCommand = new Command("transaction-status")
  .description("Query transaction status")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .requiredOption("--shortcode <code>", "Organization shortcode", parseInt)
  .requiredOption("--transaction-id <id>", "M-Pesa transaction ID to query")
  .requiredOption("--initiator <name>", "API initiator name")
  .requiredOption("--credential <cred>", "Security credential")
  .option("--env <environment>", "sandbox or production", "sandbox")
  .option("--identifier-type <type>", "Identifier type (1=MSISDN, 2=Till, 4=Shortcode)", "4")
  .option("--timeout <url>", "Queue timeout URL", "https://example.com/timeout")
  .option("--result <url>", "Result URL", "https://example.com/result")
  .action(async (opts: {
    consumerKey: string; consumerSecret: string; shortcode: number;
    transactionId: string; initiator: string; credential: string;
    env: string; identifierType: string; timeout: string; result: string;
  }) => {
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
      initiatorName: opts.initiator,
      securityCredential: opts.credential,
    });
    try {
      const result = await client.post("/mpesa/transactionstatus/v1/query", {
        Initiator: opts.initiator,
        SecurityCredential: opts.credential,
        CommandID: "TransactionStatusQuery",
        TransactionID: opts.transactionId,
        PartyA: opts.shortcode,
        IdentifierType: parseInt(opts.identifierType, 10),
        Remarks: "CLI query",
        QueueTimeOutURL: opts.timeout,
        ResultURL: opts.result,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Transaction status query failed:", msg);
      process.exit(1);
    }
  });
