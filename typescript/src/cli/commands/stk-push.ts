import { Command } from "commander";
import { MpesaApiClient } from "../../client/client.js";
import { generateTimestamp, generatePassword } from "../../utils/index.js";

export const stkPushCommand = new Command("stk-push")
  .description("Send STK Push payment request")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .requiredOption("--shortcode <code>", "Business shortcode", parseInt)
  .requiredOption("--passkey <key>", "M-Pesa passkey")
  .requiredOption("--phone <number>", "Customer phone number (2547XXXXXXXX)", parseInt)
  .requiredOption("--amount <amount>", "Transaction amount", parseInt)
  .option("--env <environment>", "sandbox or production", "sandbox")
  .option("--callback <url>", "Callback URL", "https://example.com/callback")
  .option("--reference <ref>", "Account reference", "cli-test")
  .option("--description <desc>", "Transaction description", "CLI payment")
  .action(async (opts: {
    consumerKey: string; consumerSecret: string; shortcode: number; passkey: string;
    phone: number; amount: number; env: string; callback: string;
    reference: string; description: string;
  }) => {
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
      passkey: opts.passkey,
    });
    try {
      const timestamp = generateTimestamp();
      const password = generatePassword(opts.shortcode, opts.passkey, timestamp);
      const result = await client.post("/mpesa/stkpush/v1/processrequest", {
        BusinessShortCode: opts.shortcode,
        TransactionType: "CustomerPayBillOnline",
        Amount: opts.amount,
        PartyA: opts.phone,
        PartyB: opts.shortcode,
        PhoneNumber: opts.phone,
        CallBackURL: opts.callback,
        AccountReference: opts.reference,
        TransactionDesc: opts.description,
        Password: password,
        Timestamp: timestamp,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("STK Push failed:", msg);
      process.exit(1);
    }
  });

export const stkQueryCommand = new Command("stk-query")
  .description("Query STK Push status")
  .requiredOption("--consumer-key <key>", "M-Pesa consumer key")
  .requiredOption("--consumer-secret <secret>", "M-Pesa consumer secret")
  .requiredOption("--shortcode <code>", "Business shortcode", parseInt)
  .requiredOption("--passkey <key>", "M-Pesa passkey")
  .requiredOption("--checkout-id <id>", "CheckoutRequestID from STK push")
  .option("--env <environment>", "sandbox or production", "sandbox")
  .action(async (opts: {
    consumerKey: string; consumerSecret: string; shortcode: number;
    passkey: string; checkoutId: string; env: string;
  }) => {
    const client = new MpesaApiClient({
      consumerKey: opts.consumerKey,
      consumerSecret: opts.consumerSecret,
      environment: opts.env as "sandbox" | "production",
      passkey: opts.passkey,
    });
    try {
      const timestamp = generateTimestamp();
      const password = generatePassword(opts.shortcode, opts.passkey, timestamp);
      const result = await client.post("/mpesa/stkpushquery/v1/query", {
        BusinessShortCode: opts.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: opts.checkoutId,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("STK Query failed:", msg);
      process.exit(1);
    }
  });
