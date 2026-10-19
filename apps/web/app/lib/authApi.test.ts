import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authFetch,
  clearToken,
  fetchCurrentUser,
  getToken,
  setToken,
} from "./authApi";

function browserStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    dispatchEvent: vi.fn(),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("optional account session", () => {
  it("does not request an account for a guest", async () => {
    browserStorage();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await fetchCurrentUser()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves caller headers while authenticating report requests", async () => {
    browserStorage();
    setToken("synthetic-test-token");
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetch);
    await authFetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/reports",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer synthetic-test-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("clears expired credentials after a 401", async () => {
    browserStorage();
    setToken("synthetic-expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await authFetch("/api/reports");
    expect(getToken()).toBeNull();
  });

  it("keeps valid credentials on service unavailability and permits explicit logout", async () => {
    browserStorage();
    setToken("synthetic-test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await authFetch("/api/reports");
    expect(getToken()).toBe("synthetic-test-token");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
