// Where the browser sends API calls.
//
// Normal builds call "/api/..." on the same host. The Next.js server proxy
// forwards those calls with a server-only service credential (proxy.ts).
//
// The GitHub Pages build is a static site with no server, so it cannot rewrite.
// It sets NEXT_PUBLIC_DIRECT_API=true and calls the backend directly. The
// backend must explicitly allow the static site's origin (CORS). A static
// frontend cannot conceal a private service key.
const DIRECT = process.env.NEXT_PUBLIC_DIRECT_API === "true";
const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const backendConfigured = !DIRECT || /^https:\/\//.test(BACKEND);

export function apiUrl(path: string): string {
  if (!DIRECT) return path;
  if (!backendConfigured) {
    throw new Error("The online service is not connected yet. Please try again later.");
  }
  return BACKEND + path.replace(/^\/api/, "");
}
