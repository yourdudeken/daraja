import { MpesaApiClient } from "./client/client.js";
import {
  STKPushService,
  C2BService,
  B2CService,
  B2BService,
  ReversalService,
  TransactionStatusService,
  AccountBalanceService,
  DynamicQRService,
  BusinessGoodsService,
  QueryOrgInfoService,
  IMSIService,
  IoTSIMService,
  B2PochiService,
  LipaNaBongaService,
  PullTransactionsService,
  SwapService,
  BillManagerService,
  B2BExpressService,
  RatibaService,
  TaxRemittanceService,
  MobileCenterService,
  AgeOnNetworkService,
  MobileNumberValidationService,
  B2CHakikishaService,
} from "./services/index.js";
import { WebhookManager } from "./webhooks/index.js";
import type { MpesaConfig } from "./types/index.js";

export class Mpesa {
  public readonly stkPush: STKPushService;
  public readonly c2b: C2BService;
  public readonly b2c: B2CService;
  public readonly b2b: B2BService;
  public readonly reversal: ReversalService;
  public readonly transactionStatus: TransactionStatusService;
  public readonly accountBalance: AccountBalanceService;
  public readonly dynamicQR: DynamicQRService;
  public readonly businessGoods: BusinessGoodsService;
  public readonly queryOrgInfo: QueryOrgInfoService;
  public readonly imsi: IMSIService;
  public readonly iot: IoTSIMService;
  public readonly b2Pochi: B2PochiService;
  public readonly lipaNaBonga: LipaNaBongaService;
  public readonly pullTransactions: PullTransactionsService;
  public readonly swap: SwapService;
  public readonly billManager: BillManagerService;
  public readonly b2bExpress: B2BExpressService;
  public readonly ratiba: RatibaService;
  public readonly taxRemittance: TaxRemittanceService;
  public readonly mobileCenter: MobileCenterService;
  public readonly ageOnNetwork: AgeOnNetworkService;
  public readonly mobileNumberValidation: MobileNumberValidationService;
  public readonly b2cHakikisha: B2CHakikishaService;
  public readonly webhooks: WebhookManager;
  public readonly client: MpesaApiClient;

  constructor(config: MpesaConfig) {
    this.client = new MpesaApiClient(config);
    this.stkPush = new STKPushService(this.client);
    this.c2b = new C2BService(this.client);
    this.b2c = new B2CService(this.client);
    this.b2b = new B2BService(this.client);
    this.reversal = new ReversalService(this.client);
    this.transactionStatus = new TransactionStatusService(this.client);
    this.accountBalance = new AccountBalanceService(this.client);
    this.dynamicQR = new DynamicQRService(this.client);
    this.businessGoods = new BusinessGoodsService(this.client);
    this.queryOrgInfo = new QueryOrgInfoService(this.client);
    this.imsi = new IMSIService(this.client);
    this.iot = new IoTSIMService(this.client);
    this.b2Pochi = new B2PochiService(this.client);
    this.lipaNaBonga = new LipaNaBongaService(this.client);
    this.pullTransactions = new PullTransactionsService(this.client);
    this.swap = new SwapService(this.client);
    this.billManager = new BillManagerService(this.client);
    this.b2bExpress = new B2BExpressService(this.client);
    this.ratiba = new RatibaService(this.client);
    this.taxRemittance = new TaxRemittanceService(this.client);
    this.mobileCenter = new MobileCenterService(this.client);
    this.ageOnNetwork = new AgeOnNetworkService(this.client);
    this.mobileNumberValidation = new MobileNumberValidationService(this.client);
    this.b2cHakikisha = new B2CHakikishaService(this.client);
    this.webhooks = new WebhookManager({
      passkey: config.passkey,
    });
  }
}

export { MpesaApiClient } from "./client/client.js";
export * from "./services/index.js";
export * from "./types/index.js";
export * from "./errors/index.js";
export * from "./webhooks/index.js";
export * from "./middleware/index.js";
export * from "./utils/index.js";
