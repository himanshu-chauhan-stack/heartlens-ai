"use client";
import Link from "next/link";
import { BRAND } from "../lib/brand";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ArrowUpRight, Github, Heart, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { isLoggedIn } from "../lib/authApi";
import { backendConfigured } from "../lib/apiUrl";
export function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M16 25C10 21 5 17 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-5 9-11 13Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="16" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}
export function SiteHeader() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    const sync = () => setLogged(isLoggedIn());
    sync();
    window.addEventListener("heartlens-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("heartlens-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header
        className="header-wrap"
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpen(false);
            menuRef.current?.focus();
          }
        }}
      >
        <nav className="container nav" aria-label="Main navigation">
          <Link href="/" className="brand">
            <Logo />
            <span>
              HeartLens <em>AI</em>
            </span>
          </Link>
          <div className="nav-links">
            <Link
              href="/assess"
              aria-current={pathname === "/assess" ? "page" : undefined}
            >
              Assessment
            </Link>
            <Link href="/results">Your profile</Link>
            <Link href="/about">The science</Link>
          </div>
          <div className="nav-actions">
            <a
              className="icon-button"
              href="https://github.com/himanshu-chauhan-stack/heartlens-ai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="HeartLens AI GitHub repository (opens in a new tab)"
              title="GitHub repository"
            >
              <Github size={20} />
            </a>
            <ThemeToggle />
            <Link className="nav-login" href={logged ? "/dashboard" : "/login"}>
              {logged ? "My reports" : "Sign in"}
            </Link>
            <button
              ref={menuRef}
              className="icon-button menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="mobile-nav container" id="mobile-nav">
            <Link href="/assess" onClick={() => setOpen(false)}>
              Start assessment <ArrowUpRight size={18} />
            </Link>
            <Link href="/results" onClick={() => setOpen(false)}>
              Your profile
            </Link>
            <Link href="/about" onClick={() => setOpen(false)}>
              The science
            </Link>
            <Link href="/privacy" onClick={() => setOpen(false)}>
              Privacy
            </Link>
            <Link
              href={logged ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
            >
              {logged ? "My reports" : "Sign in"}
            </Link>
          </div>
        )}
      </header>
      {!backendConfigured && (
        <div className="portal-status" role="status">
          <div className="container">
            Explore HeartLens AI. Predictions, report uploads and accounts will
            become available when the online service is connected.
          </div>
        </div>
      )}
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand" href="/">
            <Logo />
            {BRAND.name}
          </Link>
          <p>{BRAND.tagline}</p>
        </div>
        <div>
          <Link href="/about">Methodology</Link>
          <Link href="/privacy">Privacy & data</Link>
          <p className="love-credit" aria-label={BRAND.credit}>
            Made with <span className="love-mark" aria-hidden="true"><Heart size={16} fill="currentColor" /></span>
            <span className="sr-only">Love</span> Himanshu Chauhan
          </p>
        </div>
      </div>
      <div className="container footer-note">
        For education and informed conversations. This model does not diagnose
        disease or predict a future event.
      </div>
    </footer>
  );
}
