#!/usr/bin/env node
import { Command } from "commander";
import { tokenCommand } from "./commands/token.js";
import { healthCommand } from "./commands/health.js";
import { stkPushCommand, stkQueryCommand } from "./commands/stk-push.js";
import { transactionStatusCommand } from "./commands/transaction.js";
import { accountBalanceCommand } from "./commands/account-balance.js";
import pkg from "../../package.json" with { type: "json" };

const program = new Command();

program
  .name("mpesa")
  .description("M-Pesa Daraja API CLI")
  .version(pkg.version);

program.addCommand(tokenCommand);
program.addCommand(healthCommand);
program.addCommand(stkPushCommand);
program.addCommand(stkQueryCommand);
program.addCommand(transactionStatusCommand);
program.addCommand(accountBalanceCommand);

program.parse(process.argv);
