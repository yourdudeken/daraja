import { randomBytes, timingSafeEqual } from "node:crypto";
import type {
  C2BHakikishaRequest,
  C2BHakikishaResponse,
  C2BTokenEndpointResult,
  C2BValidationEndpointResult,
} from "../types/index.js";

export interface C2BHakikishaHandlerOptions {
  /** Username Safaricom uses with Basic auth against the token endpoint. */
  username: string;
  /** Password Safaricom uses with Basic auth against the token endpoint. */
  password: string;
  /**
   * Resolves the account name for an account number + shortcode.
   * Return `null` when the account is unknown (validation answers HTTP 400).
   * Defaults to returning `null` (override to integrate a real registry).
   */
  resolveAccountName?: (accountNumber: string, shortcode: string) => string | null;
  /** Lifetime of issued access tokens in seconds. Defaults to 3599. */
  tokenTtl?: number;
}

/**
 * Framework-agnostic receiver-side handler for the C2B Hakikisha API.
 *
 * Safaricom generates an access token using Basic Authentication against the
 * partner's token endpoint, then calls the partner's validation endpoint with
 * a Bearer token and `{requestId, timestamp, accountNumber, shortcode}` to
 * resolve the registered account name before a C2B payment completes.
 *
 * `tokenEndpoint` and `validationEndpoint` return `[payload, status]` tuples
 * that callers can adapt to their own routing layer (Express, Fastify,
 * serverless, etc.). Tokens are issued with `randomBytes` and compared with
 * `timingSafeEqual` to avoid timing side channels.
 */
export class C2BHakikishaHandler {
  private readonly username: string;
  private readonly password: string;
  private readonly resolveAccountNameFn: (
    accountNumber: string,
    shortcode: string,
  ) => string | null;
  private readonly tokenTtl: number;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: C2BHakikishaHandlerOptions) {
    this.username = options.username;
    this.password = options.password;
    this.resolveAccountNameFn = options.resolveAccountName ?? (() => null);
    this.tokenTtl = options.tokenTtl ?? 3599;
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }

  private issueToken(): string {
    this.token = randomBytes(32).toString("base64url");
    this.tokenExpiresAt = Date.now() + this.tokenTtl * 1000;
    return this.token;
  }

  /** Handles `POST /auth/v1/generate?grant_type=client_credentials`. */
  tokenEndpoint(
    authorization: string | null,
    grantType?: string | null,
  ): C2BTokenEndpointResult {
    if (grantType != null && grantType !== "client_credentials") {
      return [
        { error: "unsupported_grant_type", errorMessage: "Unsupported grant type." },
        400,
      ];
    }
    if (!authorization || !authorization.startsWith("Basic ")) {
      return [
        {
          error: "unauthorized",
          errorMessage:
            "Missing or malformed Authorization header. Expected Basic authentication.",
        },
        401,
      ];
    }

    let decoded: string;
    try {
      decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
    } catch {
      return [{ error: "unauthorized", errorMessage: "Invalid Basic credentials." }, 401];
    }

    const separator = decoded.indexOf(":");
    if (separator < 0) {
      return [{ error: "unauthorized", errorMessage: "Invalid Basic credentials." }, 401];
    }
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    if (!this.safeEqual(username, this.username) || !this.safeEqual(password, this.password)) {
      return [{ error: "unauthorized", errorMessage: "Invalid credentials." }, 401];
    }

    return [{ access_token: this.issueToken(), expires_in: this.tokenTtl }, 200];
  }

  /** Constant-time check that `token` is the currently issued, unexpired token. */
  isTokenValid(token: string): boolean {
    if (!token || !this.token || Date.now() >= this.tokenExpiresAt) return false;
    return this.safeEqual(this.token, token);
  }

  /**
   * Resolve the account name for an account number.
   * Override via the `resolveAccountName` constructor option. Returning `null`
   * makes `validationEndpoint` answer `400 Invalid account number`.
   */
  resolveAccountName(accountNumber: string, shortcode: string): string | null {
    return this.resolveAccountNameFn(accountNumber, shortcode);
  }

  /** Handles the partner's C2B Hakikisha validation endpoint. */
  validationEndpoint(
    authorization: string | null,
    body: Record<string, unknown>,
  ): C2BValidationEndpointResult {
    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      return [
        {
          requestId: "",
          errorMessage: "Missing or malformed required fields in the request.",
        },
        422,
      ];
    }
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return [
        { requestId: String(body.requestId ?? ""), errorMessage: "Missing or invalid access token." },
        401,
      ];
    }
    if (!this.isTokenValid(authorization.slice("Bearer ".length))) {
      return [
        { requestId: String(body.requestId ?? ""), errorMessage: "Invalid access token." },
        401,
      ];
    }

    const request = parseRequest(body);
    if (!request) {
      return [
        {
          requestId: String(body.requestId ?? ""),
          errorMessage: "Missing or malformed required fields in the request.",
        },
        422,
      ];
    }

    const accountName = this.resolveAccountName(request.accountNumber, request.shortcode);
    if (!accountName) {
      return [{ requestId: request.requestId, errorMessage: "Invalid account number" }, 400];
    }

    return [
      {
        requestId: request.requestId,
        timestamp: request.timestamp,
        accountName,
        accountNumber: request.accountNumber,
        shortcode: request.shortcode,
      },
      200,
    ];
  }

  /** Builds a success payload for the validation endpoint. */
  static buildResponse(
    requestId: string,
    accountName: string,
    accountNumber: string,
    shortcode: string,
    timestamp?: string | number,
  ): C2BHakikishaResponse {
    return {
      requestId,
      timestamp: timestamp ?? Math.floor(Date.now() / 1000),
      accountName,
      accountNumber,
      shortcode,
    };
  }
}

function parseRequest(body: Record<string, unknown>): C2BHakikishaRequest | null {
  const { requestId, timestamp, accountNumber, shortcode } = body;
  if (
    typeof requestId !== "string" ||
    typeof timestamp !== "string" ||
    typeof accountNumber !== "string" ||
    typeof shortcode !== "string"
  ) {
    return null;
  }
  return { requestId, timestamp, accountNumber, shortcode };
}