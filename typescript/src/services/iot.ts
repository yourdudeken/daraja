import { MpesaApiClient } from "../client/client.js";
import {
  IoTAllSIMsRequest, IoTAllSIMsResponse,
  IoTQueryLifeCycleRequest, IoTQueryLifeCycleResponse,
  IoTQueryCustomerInfoRequest, IoTQueryCustomerInfoResponse,
  IoTSIMActivationRequest, IoTSIMActivationResponse,
  IoTActivationTrendsRequest, IoTActivationTrendsResponse,
  IoTRenameAssetRequest, IoTRenameAssetResponse,
  IoTSuspendUnsuspendRequest, IoTSuspendUnsuspendResponse,
  IoTSearchMessagesRequest, IoTSearchMessagesResponse,
  IoTFilterMessagesRequest, IoTFilterMessagesResponse,
  IoTDeleteThreadRequest, IoTDeleteResponse,
  IoTAllMessagesRequest, IoTAllMessagesResponse,
  IoTSendSingleMessageRequest, IoTSendSingleMessageResponse,
  IoTDeleteMessageRequest,
} from "../types/index.js";

export class IoTSIMService {
  constructor(private readonly client: MpesaApiClient) {}

  async getAllSIMs(request: IoTAllSIMsRequest): Promise<IoTAllSIMsResponse> {
    return this.client.post<IoTAllSIMsResponse>(this.client.getEndpoint("IOT_ALL_SIMS"), request);
  }

  async queryLifeCycleStatus(request: IoTQueryLifeCycleRequest): Promise<IoTQueryLifeCycleResponse> {
    return this.client.post<IoTQueryLifeCycleResponse>(this.client.getEndpoint("IOT_QUERY_LIFECYCLE"), request);
  }

  async queryCustomerInfo(request: IoTQueryCustomerInfoRequest): Promise<IoTQueryCustomerInfoResponse> {
    return this.client.post<IoTQueryCustomerInfoResponse>(this.client.getEndpoint("IOT_QUERY_CUSTOMER_INFO"), request);
  }

  async activateSIM(request: IoTSIMActivationRequest): Promise<IoTSIMActivationResponse> {
    return this.client.post<IoTSIMActivationResponse>(this.client.getEndpoint("IOT_SIM_ACTIVATION"), request);
  }

  async getActivationTrends(request: IoTActivationTrendsRequest): Promise<IoTActivationTrendsResponse> {
    return this.client.post<IoTActivationTrendsResponse>(this.client.getEndpoint("IOT_ACTIVATION_TRENDS"), request);
  }

  async renameAsset(request: IoTRenameAssetRequest): Promise<IoTRenameAssetResponse> {
    return this.client.post<IoTRenameAssetResponse>(this.client.getEndpoint("IOT_RENAME_ASSET"), request);
  }

  async suspendUnsuspend(request: IoTSuspendUnsuspendRequest): Promise<IoTSuspendUnsuspendResponse> {
    return this.client.post<IoTSuspendUnsuspendResponse>(this.client.getEndpoint("IOT_SUSPEND_UNSUSPEND"), request);
  }

  async searchMessages(request: IoTSearchMessagesRequest): Promise<IoTSearchMessagesResponse> {
    return this.client.post<IoTSearchMessagesResponse>(this.client.getEndpoint("IOT_SEARCH_MESSAGES"), request);
  }

  async filterMessages(request: IoTFilterMessagesRequest): Promise<IoTFilterMessagesResponse> {
    return this.client.post<IoTFilterMessagesResponse>(this.client.getEndpoint("IOT_FILTER_MESSAGES"), request);
  }

  async deleteMessageThread(request: IoTDeleteThreadRequest): Promise<IoTDeleteResponse> {
    return this.client.post<IoTDeleteResponse>(this.client.getEndpoint("IOT_DELETE_THREAD"), request);
  }

  async getAllMessages(request: IoTAllMessagesRequest): Promise<IoTAllMessagesResponse> {
    return this.client.post<IoTAllMessagesResponse>(this.client.getEndpoint("IOT_ALL_MESSAGES"), request);
  }

  async sendSingleMessage(request: IoTSendSingleMessageRequest): Promise<IoTSendSingleMessageResponse> {
    return this.client.post<IoTSendSingleMessageResponse>(this.client.getEndpoint("IOT_SEND_SINGLE_MESSAGE"), request);
  }

  async deleteMessage(request: IoTDeleteMessageRequest): Promise<IoTDeleteResponse> {
    return this.client.post<IoTDeleteResponse>(this.client.getEndpoint("IOT_DELETE_MESSAGE"), request);
  }
}
