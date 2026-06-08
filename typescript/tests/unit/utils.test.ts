import { describe, it, expect } from "vitest";
import {
  generateTimestamp,
  generatePassword,
  maskSensitiveData,
  isPhoneNumberValid,
  formatPhoneNumber,
  calculateBackoff,
} from "../../src/utils/index.js";

describe("Utils", () => {
  describe("generateTimestamp", () => {
    it("should generate a 14-digit timestamp", () => {
      const ts = generateTimestamp();
      expect(ts).toMatch(/^\d{14}$/);
    });
  });

  describe("generatePassword", () => {
    it("should base64 encode shortcode+passkey+timestamp", () => {
      const password = generatePassword(174379, "passkey123", "20210628092408");
      const decoded = Buffer.from(password, "base64").toString();
      expect(decoded).toBe("174379passkey12320210628092408");
    });
  });

  describe("maskSensitiveData", () => {
    it("should mask sensitive fields", () => {
      const data = {
        consumerKey: "abc12345",
        Password: "secretpassword",
        otherField: "visible",
      };
      const masked = maskSensitiveData(data);
      expect(masked.consumerKey).toMatch(/^abc1/);
      expect(masked.consumerKey).toContain("****");
      expect(masked.otherField).toBe("visible");
    });
  });

  describe("isPhoneNumberValid", () => {
    it("should validate correct phone numbers", () => {
      expect(isPhoneNumberValid(254722000000)).toBe(true);
      expect(isPhoneNumberValid("254722111111")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(isPhoneNumberValid("0712345678")).toBe(false);
      expect(isPhoneNumberValid("123")).toBe(false);
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format phone numbers correctly", () => {
      expect(formatPhoneNumber("0712345678")).toBe("254712345678");
      expect(formatPhoneNumber("254712345678")).toBe("254712345678");
      expect(formatPhoneNumber("712345678")).toBe("254712345678");
    });
  });

  describe("calculateBackoff", () => {
    it("should calculate exponential backoff", () => {
      const backoff = calculateBackoff(1, 1000, 30000);
      expect(backoff).toBeGreaterThanOrEqual(1000 * 2);
      expect(backoff).toBeLessThanOrEqual(30000);
    });
  });
});
