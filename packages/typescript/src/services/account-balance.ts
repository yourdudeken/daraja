import { MpesaApiClient } from "../client/client.js";
import { Validation } from "../utils/index.js";
import type {
  AccountBalanceRequest,
  AccountBalanceResponse,
  MpesaResult,
} from "../types/index.js";

export interface AccountBalanceResult {
  workingAccount?: AccountInfo;
  utilityAccount?: AccountInfo;
  chargesPaidAccount?: AccountInfo;
  organizationSettlementAccount?: AccountInfo;
  floatAccount?: AccountInfo;
}

export interface AccountInfo {
  accountName: string;
  currency: string;
  availableBalance: number;
  unclearedFunds: number;
  reservedFunds: number;
}

export class AccountBalanceService {
  constructor(private readonly client: MpesaApiClient) {}

  async query(request: AccountBalanceRequest): Promise<AccountBalanceResponse> {
    Validation.requiredNumber(request.PartyA, "PartyA");
    const config = this.client.getConfig();
    const payload: AccountBalanceRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<AccountBalanceResponse>(
      this.client.getEndpoint("ACCOUNT_BALANCE"),
      payload,
    );
  }

  static parseCallback(payload: MpesaResult): {
    success: boolean;
    resultCode: number;
    resultDescription: string;
    balances?: AccountBalanceResult;
  } {
    const result = payload.Result;
    const details: Record<string, string | number> = {};

    if (result.ResultParameters?.ResultParameter) {
      for (const param of result.ResultParameters.ResultParameter) {
        details[param.Key] = param.Value;
      }
    }

    const balanceStr = details["AccountBalance"] as string | undefined;
    let balances: AccountBalanceResult | undefined;

    if (balanceStr) {
      balances = AccountBalanceService.parseBalanceString(balanceStr);
    }

    return {
      success: result.ResultCode === 0,
      resultCode: result.ResultCode,
      resultDescription: result.ResultDesc,
      balances,
    };
  }

  private static parseBalanceString(balanceStr: string): AccountBalanceResult {
    const accounts = balanceStr.split("&");
    const result: AccountBalanceResult = {};

    for (const account of accounts) {
      const parts = account.split("|");
      if (parts.length >= 6) {
        const info: AccountInfo = {
          accountName: parts[0]!,
          currency: parts[1]!,
          availableBalance: parseFloat(parts[2]!),
          unclearedFunds: parseFloat(parts[3]!),
          reservedFunds: parseFloat(parts[4]!),
        };

        const name = info.accountName.toLowerCase().replace(/\s+/g, "");
        if (name.includes("working")) {
          result.workingAccount = info;
        } else if (name.includes("utility")) {
          result.utilityAccount = info;
        } else if (name.includes("charge")) {
          result.chargesPaidAccount = info;
        } else if (name.includes("settlement")) {
          result.organizationSettlementAccount = info;
        } else if (name.includes("float")) {
          result.floatAccount = info;
        }
      }
    }

    return result;
  }
}
