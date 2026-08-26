import { MpesaApiClient } from "../client/client.js";
import { VERSION } from "../environment.js";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  tokenOk: boolean;
  uptime?: string;
  nodeVersion?: string;
}

export async function createHealthCheck(client: MpesaApiClient): Promise<HealthResponse> {
  let tokenOk = false;
  try {
    await client.getAccessToken();
    tokenOk = true;
  } catch {
    tokenOk = false;
  }

  const status = tokenOk ? "healthy" : "degraded";

  return {
    status,
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    nodeVersion: process.version,
    tokenOk,
  };
}
