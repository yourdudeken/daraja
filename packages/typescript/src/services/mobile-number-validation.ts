import { MpesaApiClient } from "../client/client.js";
import type {
  MobileNumberValidationRequest,
  MobileNumberValidationResponse,
} from "../types/index.js";

export class MobileNumberValidationService {
  constructor(private readonly client: MpesaApiClient) {}

  async validate(request: MobileNumberValidationRequest): Promise<MobileNumberValidationResponse> {
    return this.client.post<MobileNumberValidationResponse>(
      this.client.getEndpoint("MOBILE_NUMBER_VALIDATION"),
      request,
    );
  }
}
