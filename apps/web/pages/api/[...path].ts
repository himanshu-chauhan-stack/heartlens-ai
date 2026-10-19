import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: false, responseLimit: "10mb" } };

/** Function-only gateway: private Vercel bindings never reach browser code. */
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  response.setHeader("Cache-Control", "no-store");
  const segments = request.query.path;
  const path = "/" + (Array.isArray(segments) ? segments.join("/") : segments || "");
  const allowed = /^\/(predict|health|extract|model\/info|auth\/(login|register|me)|reports(?:\/[^/]+(?:\/pdf)?)?)\/?$/;
  if (!allowed.test(path) || !["GET", "POST", "DELETE"].includes(request.method || "")) {
    return response.status(403).json({ detail: "Endpoint is not exposed" });
  }
  const base = process.env.HEARTLENS_API_URL || process.env.API_URL;
  if (!base || !process.env.API_KEY) {
    return response.status(503).json({
      code: base ? "api_authentication_unconfigured" : "gateway_unconfigured",
      detail: "The online service is not connected yet",
    });
  }
  if (/^\/(auth|reports)(\/|$)/.test(path) && process.env.VERCEL && !process.env.DATABASE_URL) {
    return response.status(503).json({ detail: "Saved accounts await a persistent database connection. Guest predictions remain available." });
  }
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/$/, "") + path;
  url.search = new URL(request.url || "/", "http://localhost").search;
  const headers = new Headers({ "x-api-key": process.env.API_KEY });
  for (const name of ["content-type", "authorization"]) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  try {
    let body: Buffer | undefined;
    if (request.method !== "GET") {
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 10 * 1024 * 1024) return response.status(413).json({ detail: "File too large" });
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    // Platform startup errors can be HTML/text, never a valid model response.
    if (upstream.status >= 500 && !upstream.headers.get("content-type")?.includes("application/json")) {
      return response.status(503).json({ code: "backend_unavailable", detail: "The online service is temporarily unavailable" });
    }
    for (const name of ["content-type", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    return response.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return response.status(503).json({
      code: timedOut ? "backend_timeout" : "backend_unavailable",
      detail: timedOut ? "The online service timed out" : "The online service is temporarily unavailable",
    });
  }
}
