import { MpesaApiClient } from "../client/client.js";
import type {
  C2BRegisterURLRequest,
  C2BSimulateRequest,
  C2BResponse,
  C2BValidationRequest,
  C2BValidationResponse,
} from "../types/index.js";

export class C2BService {
  constructor(private readonly client: MpesaApiClient) {}

  async registerURL(request: C2BRegisterURLRequest): Promise<C2BResponse> {
    return this.client.post<C2BResponse>(
      this.client.getEndpoint("C2B_REGISTER_URL"),
      request,
    );
  }

  async simulate(request: C2BSimulateRequest): Promise<C2BResponse> {
    return this.client.post<C2BResponse>(
      this.client.getEndpoint("C2B_SIMULATE"),
      request,
    );
  }

  static validateTransaction(
    _request: C2BValidationRequest,
    accept = true,
  ): C2BValidationResponse {
    if (accept) {
      return { ResultCode: "0", ResultDesc: "Accepted" };
    }
    return { ResultCode: "C2B00011", ResultDesc: "Rejected" };
  }
}
