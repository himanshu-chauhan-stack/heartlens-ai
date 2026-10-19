"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { SiteFooter, SiteHeader } from "../components/SiteShell";
import { login, AuthApiError } from "../lib/authApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <SiteHeader />
      <section className="section" id="content">
        <div className="container" style={{ maxWidth: 420 }}>
          <motion.div
            className="card-panel stack"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="eyebrow">YOUR ACCOUNT, YOUR CONTEXT</span>
            <h1 className="type-h2">Welcome back.</h1>
            <p className="lead">
              Sign in to keep model reports in your account. Guest assessments
              remain available; drafts use this tab and device history stays in
              your browser.
            </p>
            <form onSubmit={onSubmit} className="stack">
              <div className="field">
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <div className="floating">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="floating-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="floating">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    className="floating-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              {error && (
                <div className="error-box" aria-live="assertive">
                  <p>{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <LogIn size={16} /> {loading ? "Logging in..." : "Log in"}
              </button>
            </form>
            <p className="lead">
              No account? <Link href="/register">Register</Link>
            </p>
            <Link className="btn btn-subtle" href="/assess">
              Continue without an account ↗
            </Link>
          </motion.div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
