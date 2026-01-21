import {
  addDays,
  generateSessionToken,
  hashIp,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./auth.utils";

describe("auth.utils", () => {
  it("hashes and verifies password", () => {
    const hash = hashPassword("Test1234!");
    expect(hash).toContain(":");
    expect(verifyPassword("Test1234!", hash)).toBe(true);
    expect(verifyPassword("WrongPass1!", hash)).toBe(false);
  });

  it("returns false on invalid stored hash format", () => {
    expect(verifyPassword("Test1234!", "badformat")).toBe(false);
  });

  it("generates a session token", () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64);
  });

  it("hashes tokens deterministically", () => {
    const hash1 = hashToken("token");
    const hash2 = hashToken("token");
    expect(hash1).toBe(hash2);
  });

  it("hashes IP deterministically", () => {
    const hash1 = hashIp("127.0.0.1");
    const hash2 = hashIp("127.0.0.1");
    expect(hash1).toBe(hash2);
  });

  it("adds days to a date", () => {
    const base = new Date("2025-01-01T00:00:00.000Z");
    const next = addDays(base, 2);
    expect(next.toISOString()).toBe("2025-01-03T00:00:00.000Z");
  });
});
