import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

const mockSuggestions = [
  { name: "Test Scout", role: "Compliance Lead", detail: "Detail" },
];

const loadServer = async () => {
  vi.resetModules();
  const server = await import("../index");
  return server.app;
};

describe("/api/serp", () => {
  beforeEach(() => {
    delete process.env.SERP_API_URL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns fallback suggestions when no SERP API configured", async () => {
    const app = await loadServer();
    const res = await request(app)
      .post("/api/serp")
      .send({ query: "compliance", company: "TestCo", context: "metrics" })
      .expect(200);

    expect(res.body.suggestions).toBeInstanceOf(Array);
    expect(res.body.fallback).toBe(true);
    expect(res.body.timestamp).toBeDefined();
  });

  it("calls the SERP provider when configured", async () => {
    process.env.SERP_API_URL = "https://serp.local/search";
    process.env.SERP_API_KEY = "serp-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        suggestions: mockSuggestions,
        source: "serp-provider",
      }),
    } as unknown as Response);

    const app = await loadServer();
    const res = await request(app)
      .post("/api/serp")
      .send({ query: "budget", company: "TestCo", context: "compliance" })
      .expect(200);

    expect(fetchMock).toHaveBeenCalled();
    expect(res.body.suggestions).toEqual(mockSuggestions);
    expect(res.body.fallback).toBe(false);
    expect(res.body.source).toBe("serp-provider");
  });
});
