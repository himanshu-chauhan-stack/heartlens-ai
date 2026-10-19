import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../../pages/api/[...path]";

function request(path: string[], method = "GET", body = "") {
  return {
    query: { path }, method, url: `/api/${path.join("/")}`,
    headers: { "content-type": "application/json", "x-api-key": "untrusted-client-key" },
    async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(body); },
  } as unknown as NextApiRequest;
}
function response() {
  const result = { statusCode: 0, body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    send(body: unknown) { this.body = body; return this; },
  };
  return result as typeof result & NextApiResponse;
}
beforeEach(() => {
  vi.stubEnv("HEARTLENS_API_URL", "https://private-binding.example");
  vi.stubEnv("API_KEY", "server-only-key");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("DATABASE_URL", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("server-only deployment gateway", () => {
  it.each([["metrics"], ["model", "reload"], ["unknown"]])("blocks operational/unrecognized endpoint %j", async (...path) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const res = response(); await handler(request(path), res);
    expect(res.statusCode).toBe(403); expect(fetch).not.toHaveBeenCalled();
  });
  it("does not send account credentials without a persistent database", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const res = response(); await handler(request(["auth", "register"], "POST", "{}"), res);
    expect(res.statusCode).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it("injects its own service credential and preserves a genuine response", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"source":"model","probability":0.84}', { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const res = response(); await handler(request(["predict"], "POST", '{"age":58}'), res);
    expect(res.statusCode).toBe(200);
    const [url, options] = fetch.mock.calls[0];
    expect(url.toString()).toBe("https://private-binding.example/predict");
    expect(options.headers.get("x-api-key")).toBe("server-only-key");
    expect(Buffer.from(options.body).toString()).toBe('{"age":58}');
    expect(String(res.body)).toContain('"source":"model"');
  });
  it("returns a recoverable error when its backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    const res = response(); await handler(request(["health"]), res);
    expect(res.statusCode).toBe(503);
  });
  it("does not forward input when its private binding is missing", async () => {
    vi.stubEnv("HEARTLENS_API_URL", ""); vi.stubEnv("API_URL", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const res = response(); await handler(request(["predict"], "POST", "{}"), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ code: "gateway_unconfigured", detail: "The online service is not connected yet" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("replaces platform startup HTML with a safe recovery response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>FUNCTION_INVOCATION_FAILED</html>", { status: 500, headers: { "content-type": "text/html" } })));
    const res = response(); await handler(request(["health"]), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ code: "backend_unavailable", detail: "The online service is temporarily unavailable" });
  });
  it("distinguishes a timeout from a missing model", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    const res = response(); await handler(request(["predict"], "POST", "{}"), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ code: "backend_timeout", detail: "The online service timed out" });
  });
});
