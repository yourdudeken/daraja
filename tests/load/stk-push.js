import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";

const stkFailureRate = new Rate("stk_failures");
const stkDuration = new Trend("stk_duration");

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    stk_failures: ["rate<0.1"],
  },
};

export default function () {
  const payload = JSON.stringify({
    BusinessShortCode: 174379,
    Password: __ENV.MPESA_PASSKEY || "test",
    Timestamp: new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14),
    TransactionType: "CustomerPayBillOnline",
    Amount: 1,
    PartyA: 254708374149,
    PartyB: 174379,
    PhoneNumber: 254708374149,
    CallBackURL: "https://example.com/callback",
    AccountReference: "test",
    TransactionDesc: "load test",
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${__ENV.MPESA_TOKEN || "test"}`,
  };

  const res = http.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers,
    timeout: "30s",
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has body": (r) => r.body.length > 0,
  });

  stkFailureRate.add(res.status !== 200);
  stkDuration.add(res.timings.duration);

  sleep(1);
}
