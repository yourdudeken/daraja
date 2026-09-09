import { MpesaApiClient } from "../client/client.js";
import type {
  MobileCenterFetchOffersResponse,
  MobileCenterPurchaseRequest,
  MobileCenterPurchaseResponse,
  MobileCenterStatusResponse,
} from "../types/index.js";

export class MobileCenterService {
  constructor(private readonly client: MpesaApiClient) {}

  async fetchOffers(msisdn: string): Promise<MobileCenterFetchOffersResponse> {
    return this.client.get<MobileCenterFetchOffersResponse>(
      this.client.getEndpoint("MOBILE_CENTER_FETCH"),
      { msisdn },
    );
  }

  async purchase(request: MobileCenterPurchaseRequest): Promise<MobileCenterPurchaseResponse> {
    return this.client.post<MobileCenterPurchaseResponse>(
      this.client.getEndpoint("MOBILE_CENTER_PURCHASE"),
      request,
    );
  }

  async getStatus(id: string, serviceAccountId: string): Promise<MobileCenterStatusResponse> {
    return this.client.get<MobileCenterStatusResponse>(
      this.client.getEndpoint("MOBILE_CENTER_STATUS"),
      { id, serviceAccountId },
    );
  }
}
