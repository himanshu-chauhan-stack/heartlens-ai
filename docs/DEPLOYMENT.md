# Deployment modes

Live portal: [HeartLens AI](https://heartlens-ai.vercel.app). Canonical source: [GitHub](https://github.com/himanshu-chauhan-stack/heartlens-ai). The deployed Vercel team is `drmonsares-projects`.

Production deployment `dpl_4mkqcuXwvFx14fFYkaaiVD29HqQ8` is ready on the main alias. Live `/api/health` reports healthy, `model_loaded=true`, and model version `b532dbf82fe5`. Free Neon `heartlens-ai-db` is provisioned and connected to production; its terms were explicitly approved and accepted. Hosted accounts and saved reports passed the [live HTTP integration checks](live-integration-evidence.json).

## Vercel frontend and private API

The root `vercel.json` uses Vercel Services (beta) to build `apps/web` as Next.js and `backend` as a containerized FastAPI service through `backend/Dockerfile.vercel`. Keep the Vercel project root at the repository root. Only the web service has public ingress. Its server-side API gateway calls the private API through the generated `HEARTLENS_API_URL` binding and injects the service key. Middleware does not use bindings. Operational endpoints and metrics are blocked at the gateway.

Set `APP_ENV=production`, an independently generated `API_KEY`, and a strong `JWT_SECRET_KEY` (at least 32 characters) as private project environment variables for production/preview. Never expose keys as `NEXT_PUBLIC_*`. Add a persistent PostgreSQL `DATABASE_URL` to enable optional accounts and saved reports. Without one, the gateway returns a clear 503 for those routes before forwarding credentials; genuine guest predictions and marked sample imports do not need a database. Do not use ephemeral serverless SQLite for saved reports. Add `GROQ_API_KEY` privately for general document extraction; marked synthetic sample PDFs do not require it.

The hosted gateway also limits uploads to 4.5 MB, while the native backend supports 10 MB. Use smaller PDFs on the hosted portal. Runtime dependencies are in `backend/requirements.txt`; training/development dependencies remain in `requirements.train.txt` and the editable package. The known trained development model and metadata are included. Raw training datasets and SHAP background records are excluded from the public publication snapshot; use the hash-checked `scripts/fetch_upstream_data.py` after reviewing dataset terms to reproduce training. No clinical validation is implied.

The API container installs GNU OpenMP (`libgomp1`) for LightGBM and the runtime requirements include PyYAML. A build-time artifact-load preflight fails if the trusted model cannot load in the image; startup then loads the artifact and publishes its identity through health. `INFERENCE_THREADS=1` and `OMP_NUM_THREADS=1` bound online inference. Startup also traverses the fitted model graph, including calibrated fold estimators, to set supported thread parameters once before requests. This does not rewrite the stored artifact or change training parallelism.

### Hosted database and live verification

The approved free Neon database is connected through the private production `DATABASE_URL`. Live HTTP integration passed loaded-model health, genuine prediction, registration/login/current user, server-recomputed save/list/detail, report PDF text/provenance, UTC timestamps and assumptions retention. Cross-user detail/PDF requests returned 404; public operational endpoints returned 403; invalid blood pressure returned 422. These are hosted checks, separate from local SQLite verification.

All four actual synthetic PDFs passed extraction of the exact eleven expected fields followed by genuine prediction using the same artifact; see [live sample evidence](live-sample-import-verification.json). General Groq extraction is still unconfigured and unverified; synthetic local parsing does not require that provider. Never commit database or provider credentials.

## Local native

Run FastAPI on 127.0.0.1:8000 and Next.js on 127.0.0.1:3000 using the README commands. SQLite supports optional local accounts and reports. The model artifact must first be trained using the checked-out source and dataset.

## Local Compose

```sh
docker compose config
docker compose up -d --build
```

The development configuration trains a quick development model during the API image build. Artifacts are baked into the image; an empty host model directory is not mounted over them. Only loopback ports are published, and monitoring requires `--profile monitoring`. PostgreSQL is internal to Compose. Native execution was tested on this host; Docker is unavailable here, so Compose image builds/runtime are unverified.

## Complete server application

Use **only** `docker compose -f docker-compose.prod.yml ...` for production. This is a standalone configuration, not a merge overlay: database, API and web have no published ports; Caddy exposes 80/443 and forwards to Next.js. Set independent strong `POSTGRES_PASSWORD`, `API_KEY`, `JWT_SECRET_KEY` and `SITE_ADDRESS` in a private `.env`. Restrict database credential characters or URL-encode them in a custom database URL. Production config requires those variables rather than falling back to development secrets.

```sh
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

The API image uses the full training configuration by default. For predictable releases, record and verify the artifact hash and evaluated metadata before serving traffic; builds are not clinically validated releases. Keep API_KEY server-side in both API and Next.js environments. Next's `API_URL` targets FastAPI internally. Public `/api/model/reload` is blocked; direct reload is authenticated and disabled unless explicitly enabled for an operational environment. Keep metrics/monitoring private. Configure trusted proxy headers only where direct access is prevented; in-memory limits are per process, not globally distributed.

`render.yaml` preserves optional backend provisioning with adaptation naming and automatic deployment disabled. Review hosting availability/pricing independently; no plan or quota is promised. A backend-only host still needs a Next.js server or separately configured static frontend.

## Static frontend

`GITHUB_PAGES=true` enables static export and direct backend calls. `NEXT_PUBLIC_BASE_PATH` configures the repository path (default `/heartlens-ai`); `NEXT_PUBLIC_API_URL` must be an HTTPS public backend with an explicit allowed CORS origin. Static hosting cannot run FastAPI, database saves, a Next proxy, or conceal a shared API key. Do not use a private key in `NEXT_PUBLIC_*`. Use a separately designed public backend/access policy or prefer the server mode.

The Pages workflow runs manually, exports into `apps/web/.next-static`, and derives basePath from the repository name. Enable GitHub Actions as the Pages source. With no `API_URL` Actions variable it still publishes a browsable portal, displays a service-connection notice, and blocks API requests before transmitting inputs to an incorrect host. To enable online inference later, set `API_URL` to a reviewed HTTPS backend, allow CORS origin `https://himanshu-chauhan-stack.github.io`, and rerun the workflow. Never put API keys into repository variables or client bundles.
