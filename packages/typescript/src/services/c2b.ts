import { MpesaApiClient } from "../client/client.js";
import { Validation } from "../utils/index.js";
import type {
  C2BRegisterURLRequest,
  C2BSimulateRequest,
  C2BResponse,
  C2BValidationRequest,
  C2BValidationResponse,
} from "../types/index.js";

function normalizeResponse(raw: C2BResponse): C2BResponse {
  const source = raw as unknown as Record<string, unknown>;
  const originator =
    source["OriginatorConversationID"] ?? source["OriginatorCoversationID"];
  return {
    ...raw,
    OriginatorConversationID: typeof originator === "string" ? originator : "",
  };
}

export class C2BService {
  constructor(private readonly client: MpesaApiClient) {}

  async registerURL(request: C2BRegisterURLRequest): Promise<C2BResponse> {
    const raw = await this.client.post<C2BResponse>(
      this.client.getEndpoint("C2B_REGISTER_URL"),
      request,
    );
    return normalizeResponse(raw);
  }

  async simulate(request: C2BSimulateRequest): Promise<C2BResponse> {
    Validation.requiredNumber(request.ShortCode, "ShortCode");
    Validation.amount(request.Amount, "Amount");
    const raw = await this.client.post<C2BResponse>(
      this.client.getEndpoint("C2B_SIMULATE"),
      request,
    );
    return normalizeResponse(raw);
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
