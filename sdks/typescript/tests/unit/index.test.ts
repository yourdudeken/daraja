import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Mpesa } from "../../src/index.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { STKPushService } from "../../src/services/stk-push.js";
import { C2BService } from "../../src/services/c2b.js";
import { B2CService } from "../../src/services/b2c.js";
import { B2BService } from "../../src/services/b2b.js";
import { ReversalService } from "../../src/services/reversal.js";
import { TransactionStatusService } from "../../src/services/transaction-status.js";
import { AccountBalanceService } from "../../src/services/account-balance.js";
import { DynamicQRService } from "../../src/services/dynamic-qr.js";
import { BusinessGoodsService } from "../../src/services/business-goods.js";
import { QueryOrgInfoService } from "../../src/services/query-org-info.js";
import { IMSIService } from "../../src/services/imsi.js";
import { IoTSIMService } from "../../src/services/iot.js";
import { B2PochiService } from "../../src/services/b2pochi.js";
import { LipaNaBongaService } from "../../src/services/lipa-na-bonga.js";
import { PullTransactionsService } from "../../src/services/pull-transactions.js";
import { SwapService } from "../../src/services/swap.js";
import { BillManagerService } from "../../src/services/bill-manager.js";
import { B2BExpressService } from "../../src/services/b2b-express.js";
import { RatibaService } from "../../src/services/ratiba.js";
import { TaxRemittanceService } from "../../src/services/tax-remittance.js";
import { MobileCenterService } from "../../src/services/mobile-center.js";
import { AgeOnNetworkService } from "../../src/services/age-on-network.js";
import { MobileNumberValidationService } from "../../src/services/mobile-number-validation.js";
import { B2CHakikishaService } from "../../src/services/b2c-hakikisha.js";
import { WebhookManager } from "../../src/webhooks/index.js";

describe("Mpesa facade", () => {
  it("constructs all services", () => {
    const mpesa = new Mpesa({
      consumerKey: "key",
      consumerSecret: "secret",
      environment: "sandbox",
      passkey: "passkey",
    } as never);
    expect(mpesa.client).toBeInstanceOf(MpesaApiClient);
    expect(mpesa.stkPush).toBeInstanceOf(STKPushService);
    expect(mpesa.c2b).toBeInstanceOf(C2BService);
    expect(mpesa.b2c).toBeInstanceOf(B2CService);
    expect(mpesa.b2b).toBeInstanceOf(B2BService);
    expect(mpesa.reversal).toBeInstanceOf(ReversalService);
    expect(mpesa.transactionStatus).toBeInstanceOf(TransactionStatusService);
    expect(mpesa.accountBalance).toBeInstanceOf(AccountBalanceService);
    expect(mpesa.dynamicQR).toBeInstanceOf(DynamicQRService);
    expect(mpesa.businessGoods).toBeInstanceOf(BusinessGoodsService);
    expect(mpesa.queryOrgInfo).toBeInstanceOf(QueryOrgInfoService);
    expect(mpesa.imsi).toBeInstanceOf(IMSIService);
    expect(mpesa.iot).toBeInstanceOf(IoTSIMService);
    expect(mpesa.b2Pochi).toBeInstanceOf(B2PochiService);
    expect(mpesa.lipaNaBonga).toBeInstanceOf(LipaNaBongaService);
    expect(mpesa.pullTransactions).toBeInstanceOf(PullTransactionsService);
    expect(mpesa.swap).toBeInstanceOf(SwapService);
    expect(mpesa.billManager).toBeInstanceOf(BillManagerService);
    expect(mpesa.b2bExpress).toBeInstanceOf(B2BExpressService);
    expect(mpesa.ratiba).toBeInstanceOf(RatibaService);
    expect(mpesa.taxRemittance).toBeInstanceOf(TaxRemittanceService);
    expect(mpesa.mobileCenter).toBeInstanceOf(MobileCenterService);
    expect(mpesa.ageOnNetwork).toBeInstanceOf(AgeOnNetworkService);
    expect(mpesa.mobileNumberValidation).toBeInstanceOf(MobileNumberValidationService);
    expect(mpesa.b2cHakikisha).toBeInstanceOf(B2CHakikishaService);
    expect(mpesa.webhooks).toBeInstanceOf(WebhookManager);
  });
});