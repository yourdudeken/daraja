import { describe, it, expect, vi } from "vitest";
import { IoTSIMService } from "../../src/services/iot.js";
import { MpesaApiClient } from "../../src/client/client.js";
import type { IoTAllMessagesRequest } from "../../src/types/index.js";

function createFakeClient() {
  const post = vi.fn().mockResolvedValue({
    header: {
      requestRefId: "228f-45a2-9987-5780c2ff600f369",
      responseCode: 200,
      responseMessage: "Details fetched successfully.",
      customerMessage: "Details fetched successfully.",
      timestamp: "2025-03-21T10:03:14.025032625",
    },
    body: {
      content: [],
      pageable: {},
      totalPages: 2,
      totalElements: 16,
      last: false,
      size: 10,
      number: 0,
      first: true,
      empty: false,
    },
  });
  const client = {
    post,
    getEndpoint: (name: string) => {
      switch (name) {
        case "IOT_ALL_MESSAGES":
          return "/simportal/v1/getallmessages";
        default:
          return "";
      }
    },
  } as unknown as MpesaApiClient;
  return { client, post };
}

describe("IoTSIMService", () => {
  describe("getAllMessages", () => {
    it("posts the documented paginated payload including pageNo and pageSize", async () => {
      const { client, post } = createFakeClient();
      const service = new IoTSIMService(client);
      const request: IoTAllMessagesRequest = {
        vpnGroup: "1-24856327146_VPN",
        pageNo: 1,
        pageSize: 10,
      };

      await service.getAllMessages(request);

      expect(post).toHaveBeenCalledWith("/simportal/v1/getallmessages", {
        vpnGroup: "1-24856327146_VPN",
        pageNo: 1,
        pageSize: 10,
      });
    });
  });
});