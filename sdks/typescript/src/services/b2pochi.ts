import { MpesaApiClient } from "../client/client.js";
import { Validation } from "../utils/index.js";
import type { B2PochiRequest, B2PochiResponse } from "../types/index.js";

export class B2PochiService {
  constructor(private readonly client: MpesaApiClient) {}

  async send(request: B2PochiRequest): Promise<B2PochiResponse> {
    // FR-003 / AC-007: require the Daraja idempotency key explicitly, and say why
    // in the error rather than sending a synthesised placeholder.
    Validation.originatorConversationId(request.OriginatorConversationID);
    const config = this.client.getConfig();
    const payload: B2PochiRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      InitiatorName: request.InitiatorName || config.initiatorName,
    };
    return this.client.post<B2PochiResponse>(
      this.client.getEndpoint("B2POCHI"),
      payload,
    );
  }
}
