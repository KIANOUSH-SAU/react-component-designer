import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}));

const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import { getSession } from "@/lib/auth";

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("auth-token");
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  test("returns session payload when token is valid", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date("2026-04-01"),
    };

    mockGet.mockReturnValue({ value: "valid-token" });
    mockJwtVerify.mockResolvedValue({ payload });

    const session = await getSession();

    expect(session).toEqual(payload);
    expect(mockJwtVerify).toHaveBeenCalledOnce();
    const [token, secret] = mockJwtVerify.mock.calls[0];
    expect(token).toBe("valid-token");
    expect(secret.constructor.name).toBe("Uint8Array");
  });

  test("returns null when token verification fails", async () => {
    mockGet.mockReturnValue({ value: "invalid-token" });
    mockJwtVerify.mockRejectedValue(new Error("JWT expired"));

    const session = await getSession();

    expect(session).toBeNull();
  });
});
