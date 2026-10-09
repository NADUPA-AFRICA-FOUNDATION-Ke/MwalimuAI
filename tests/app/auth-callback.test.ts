// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

const go = async (next: string) => {
  const res = await GET(new NextRequest(`http://localhost/auth/callback?next=${next}&code=dummy`));
  return new URL(res.headers.get("location")!);
};

describe("auth callback redirect", () => {
  it("keeps same-site destinations and the callback parameters", async () => {
    const url = await go("%2Fdashboard%2Flearning");
    expect(url.origin).toBe("http://localhost");
    expect(url.pathname).toBe("/dashboard/learning");
    expect(url.searchParams.get("code")).toBe("dummy");
  });

  it("never sends the browser to another site", async () => {
    for (const next of ["/%5Cevil.example", "/%5C%5Cevil.example", "/%09/evil.example", "//evil.example", "https://evil.example", "%2F%5Cevil.example"]) {
      const url = await go(next);
      expect(url.origin, next).toBe("http://localhost");
    }
  });
});
