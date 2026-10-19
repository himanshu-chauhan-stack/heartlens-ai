import { NextResponse, type NextRequest } from "next/server";
/** Inject service credentials only on the server. Never bundle them for browsers. */
export function proxy(request: NextRequest) {
  // Vercel service bindings resolve inside functions, not routing middleware.
  if (process.env.VERCEL) return NextResponse.next();
  const path = request.nextUrl.pathname.replace(/^\/api(?=\/|$)/, "");
  if (
    path === "/metrics" ||
    path === "/model/reload" ||
    path.startsWith("/model/reload/")
  ) {
    return NextResponse.json(
      { detail: "Operational endpoint is not exposed" },
      { status: 403 },
    );
  }
  const destination = new URL(
    process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000",
  );
  destination.pathname = destination.pathname.replace(/\/$/, "") + path;
  destination.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.delete("x-api-key");
  const key =
    process.env.API_KEY ||
    (process.env.APP_ENV !== "production" ? "dev-api-key" : "");
  if (key) headers.set("x-api-key", key);
  return NextResponse.rewrite(destination, { request: { headers } });
}
export const config = { matcher: ["/api/:path*", "/predict"] };
