import { MpesaApiClient } from "../client/client.js";
import {
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerSingleInvoiceRequest,
  BillManagerBulkInvoiceRequest,
  BillManagerReconciliationRequest,
  BillManagerCancelSingleRequest,
  BillManagerCancelBulkRequest,
  BillManagerChangeOptInRequest,
  BillManagerResponse,
} from "../types/index.js";

export class BillManagerService {
  constructor(private readonly client: MpesaApiClient) {}

  async optIn(request: BillManagerOptInRequest): Promise<BillManagerOptInResponse> {
    return this.client.post<BillManagerOptInResponse>(
      this.client.getEndpoint("BILL_MANAGER_OPTIN"), request,
    );
  }

  async sendSingleInvoice(request: BillManagerSingleInvoiceRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_SINGLE_INVOICE"), request,
    );
  }

  async sendBulkInvoice(request: BillManagerBulkInvoiceRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_BULK_INVOICE"), request,
    );
  }

  async reconciliation(request: BillManagerReconciliationRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_RECONCILIATION"), request,
    );
  }

  async cancelSingleInvoice(request: BillManagerCancelSingleRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_CANCEL_SINGLE"), request,
    );
  }

  async cancelBulkInvoices(request: BillManagerCancelBulkRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_CANCEL_BULK"), request,
    );
  }

  async changeOptIn(request: BillManagerChangeOptInRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER_CHANGE_OPTIN"), request,
    );
  }
}
