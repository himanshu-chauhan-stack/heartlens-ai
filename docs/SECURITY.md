# Security and privacy review

Reviewed on 19 October 2026. This is a source/dependency/configuration review with regression and HTTP checks, not a penetration-test certification or a promise of zero vulnerabilities.

## Data boundaries

- Neon is the production PostgreSQL store for account email, bcrypt-based password hashes, and explicitly saved assessment inputs/results/notes. Plaintext passwords are not stored. Guest predictions are processed by the Python model without saving an account report.
- Browser drafts use sessionStorage. Device history and the optional bearer token use localStorage and persist until cleared. Anyone with access to the same browser profile can access that local data; JavaScript-readable tokens remain exposed if a future XSS occurs. The Privacy page includes a clear-local-data control.
- General report extraction sends report text to Groq only through the disclosed optional upload flow, when configured. Marked sample files are fictional. General Groq extraction remains unconfigured/unverified on this release.
- Detailed share links contain encoded health inputs, not encrypted data. They require explicit choice and may remain in browser/server histories. Category-only sharing is the default. The no-referrer response policy reduces accidental disclosure to external destinations; it does not erase existing histories.
- The owner credit and intentionally public repository/deployment links remain public. No personal Windows paths, private-key blocks, GitHub tokens or Groq tokens were found by the tracked-text pattern scan. This scan is not proof that every possible secret format is absent.

## Changes from this review

- Replaced python-jose with pinned PyJWT 2.15.1, removing its ECDSA dependency from the runtime graph. JWT validation restricts HS256 and requires both subject and expiry. Existing standard HS256 tokens remain format-compatible.
- New passwords use Passlib bcrypt_sha256, avoiding bcrypt's silent 72-byte truncation. Existing short bcrypt passwords remain verifiable; long aliases of legacy hashes are rejected. Login requests have a bounded password length.
- Added no-referrer, nosniff, DENY framing, disabled camera/microphone/geolocation permissions, and a limited CSP protecting frame ancestors, plugins and base URLs. This CSP is not a complete script nonce policy.
- Removed absolute model paths from model-info responses. Prediction and database failures log exception types instead of raw exception messages/SQL details. Corrupt-document errors no longer echo parser internals.
- Existing controls include React text escaping, parameterized ORM queries, report ownership checks, private service credentials, fail-closed missing production JWT configuration, upload size limits, restricted public gateway endpoints and no-store API responses.

## Evidence and limitations

- Application source review found no eval/exec, shell-based request execution, hidden analytics collector or unknown external exfiltration endpoint in the examined application paths. The bundled trusted model is loaded via joblib; arbitrary uploaded pickle models are not supported. Artifact SHA256 remains b532dbf82fe525b7093ca68be1f587c15ae735d8724142f811457dbb91ec8ce6.
- npm production-only audit: zero reported advisories. Full npm audit: five affected development package nodes from one braces advisory, GHSA-vfj7-8cjw-p6xm. The registry's latest braces release is 3.0.3 and is still affected; no compatible patched release was available. These lint/glob tools are not the application runtime. Do not run them on untrusted attacker-supplied glob patterns.
- Python audit: zero reported advisories in the 55-package installed runtime dependency graph after replacing JWT dependencies. This used installed versions, not a complete frozen Linux deployment SBOM; remote runtime smoke checks are separate.
- Focused backend security/auth/report/sample tests: 33 passed. Frontend suite: 120 passed; lint and TypeScript passed. These counts overlap broader regression suites.
- In-memory rate limits are per process and are not a globally distributed abuse-control service. Browser-token storage, account recovery/deletion workflows, legal/privacy obligations for real patient data, dependency monitoring and external security testing remain operational considerations.
- No AI-authorship detector was used. Source authorship cannot be established from style; generated tool metadata and mandatory upstream license notices should not be falsified or removed to disguise provenance.

References: [PyJWT API examples](https://pyjwt.readthedocs.io/en/stable/usage.html), [python-jose advisory](https://github.com/advisories/GHSA-3qf3-8w2g-rqmx), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Full backend regression suite after hardening: 138 passed, 1 skipped. Public unauthenticated probes confirmed reports=401, metrics/reload=403, and environment/Git configuration paths=404 without detected secret content. These probes are read-only and do not establish exhaustive path coverage.
