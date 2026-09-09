import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  isPhoneNumberValid,
  formatPhoneNumber,
  maskSensitiveData,
} from "../../src/utils/index.js";
import { normalizeEndpointKey } from "../../src/utils/rate-limiter.js";
import { generateIdempotencyKey } from "../../src/utils/idempotency.js";

describe("Property-based: Phone Number Validation", () => {
  it("should reject all non-2547XXXXXXXX numbers", () => {
    fc.assert(
      fc.property(fc.string(), (phone) => {
        fc.pre(phone.length > 0);
        const valid = isPhoneNumberValid(phone);
        const startsWith2547 = phone.startsWith("2547");
        const has8Digits = /^2547\d{8}$/.test(phone);
        return !valid || (startsWith2547 && has8Digits);
      }),
      { numRuns: 1000 },
    );
  });

  it("formatPhoneNumber should always produce a valid number", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 700000000, max: 799999999 }).map(String),
          fc.stringMatching(/^0?7\d{8}$/),
          fc.stringMatching(/^2547\d{8}$/),
        ),
        (phone) => {
          fc.pre(phone.length > 0);
          const formatted = formatPhoneNumber(phone);
          return /^2547\d{8}$/.test(formatted);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("Property-based: Masking", () => {
  it("should never expose full sensitive values", () => {
    fc.assert(
      fc.property(
        fc.record({
          consumerKey: fc.string({ minLength: 1, maxLength: 30 }),
          Password: fc.string({ minLength: 1, maxLength: 30 }),
          otherField: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        (data) => {
          const masked = maskSensitiveData(data);
          if ("consumerKey" in masked) {
            expect(String(masked.consumerKey)).toContain("****");
          }
          if ("Password" in masked) {
            expect(String(masked.Password)).toContain("****");
          }
          expect(masked.otherField).toBe(data.otherField);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("Property-based: Endpoint Key Normalization", () => {
  it("should always produce lowercase strings without protocol", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.stringMatching(/^https:\/\/[a-z]+\.[a-z]+\/[a-z]+\/[a-z]+$/),
          fc.stringMatching(/^[A-Z]+\/[A-Z]+\/[A-Z]+$/),
        ),
        (key) => {
          const normalized = normalizeEndpointKey(key);
          expect(normalized).not.toContain("https://");
          expect(normalized).not.toContain("http://");
          expect(normalized).toEqual(normalized.toLowerCase());
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("Property-based: Idempotency Key", () => {
  it("should be deterministic for same inputs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 10 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.record({ a: fc.integer(), b: fc.string() }),
        (method, url, body) => {
          const key1 = generateIdempotencyKey(method, url, body);
          const key2 = generateIdempotencyKey(method, url, body);
          expect(key1).toBe(key2);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should produce different keys for different inputs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 10 }),
        fc.string({ minLength: 3, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 10 }),
        (m1, u1, m2, u2) => {
          fc.pre(m1 !== m2 || u1 !== u2);
          const key1 = generateIdempotencyKey(m1, u1, {});
          const key2 = generateIdempotencyKey(m2, u2, {});
          expect(key1).not.toBe(key2);
        },
      ),
      { numRuns: 500 },
    );
  });
});
