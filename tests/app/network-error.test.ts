// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isNetworkFailure, retryOnNetworkFailure } from "@/lib/network-error";

describe("network failure handling", () => {
  it("recognises each browser's wording for a request that got no response", () => {
    for (const m of ["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource.", "Network request failed", "fetch failed", "The Internet connection appears to be offline."])
      expect(isNetworkFailure(new TypeError(m))).toBe(true);
    expect(isNetworkFailure("Failed to fetch")).toBe(true);
  });

  it("does not mistake a server's answer for a lost connection", () => {
    for (const m of ["InvalidSecret", "Invalid credentials", "Uncaught ConvexError: FORBIDDEN", ""]) expect(isNetworkFailure(new Error(m))).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
  });

  it("retries only dropped connections, then gives the server's real answer", async () => {
    const drop = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce(new TypeError("Load failed")).mockResolvedValue("ok");
    await expect(retryOnNetworkFailure(drop, [1, 1])).resolves.toBe("ok");
    expect(drop).toHaveBeenCalledTimes(3);

    const wrongPassword = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
    await expect(retryOnNetworkFailure(wrongPassword, [1, 1])).rejects.toThrow("Invalid credentials");
    expect(wrongPassword).toHaveBeenCalledTimes(1);

    const offline = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(retryOnNetworkFailure(offline, [1, 1])).rejects.toThrow("Failed to fetch");
    expect(offline).toHaveBeenCalledTimes(3);
  });
});
