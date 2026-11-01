# Testnet deployment checklist

This document prepares the current read-only alpha for a **testnet-only** hosted deployment. It does not create a hosted service or claim production readiness.

## Vercel deployment (recommended for this request)

Vercel serves `public/` as static output and deploys `api/[...path].mjs` as a Node function. In Vercel import the GitHub repo, use Framework Preset `Other`, root directory `/`, and leave build/output overrides blank. Set `APP_ENV=testnet-deployment`, `BOT_RPC_URL=https://rpc.bohr.life`, and `BDEX_API_BASE_URL=https://dex-wallet.bohr.life`. Never configure the testnet deployer private key in Vercel; UI/API is read-only. After deploy, smoke-test `/api/healthz`, `/api/health`, `/api/pools?type=all`, and a pool detail API route.

`vercel.json` applies the read-only API function duration, API rewrite and security headers. `npm run vercel:check` checks local or hosted endpoints (`SMOKE_URL` selects host). No Vercel authentication token is available in this workspace; GitHub import and deployment must be completed from your Vercel account.

## Included deployment files

- `Dockerfile`: Node 22 Alpine image, non-root runtime user, long-running Node server.
- `render.yaml`: Render Blueprint using Docker and `/healthz` liveness path.
- `.dockerignore`, `.gitignore`: avoid copying environment files, local dependencies and logs.
- `scripts/predeploy-check.mjs`: fail-closed checks for expected BOT testnet RPC/API, chain ID 968, and code at configured contracts.

## Required checks

```sh
npm test
npm run predeploy
```

Preflight requires outbound HTTPS to BOT RPC. Failure should block deployment; do not bypass a chain ID mismatch. `APP_ENV=testnet-deployment` additionally refuses a non-official RPC URL.

## Hosting steps (Render)

1. Push the repository root to a Git remote controlled by the project owner.
2. Create a Render Blueprint and select this repository; inspect `render.yaml` and Docker build context.
3. Confirm the service environment uses:
   - `APP_ENV=testnet-deployment`
   - `NODE_ENV=production`
   - `BOT_RPC_URL=https://rpc.bohr.life`
   - `BDEX_API_BASE_URL=https://dex-wallet.bohr.life`
   - Host-provided `PORT`
4. Deploy and wait for `/healthz` to pass.
5. From the public service origin, check `/api/health`, `/api/pools?type=all`, and a pool detail route. Confirm chain 968 and inspect API source timestamps/state.
6. Review logs for RPC/API failures. If upstreams are unavailable, the UI should show unavailable rather than imply zero metrics.

## Operational/security notes

- Keep TLS enabled at the hosting layer. No write endpoints, wallet keys, database credentials or API secrets are required.
- The service accepts GET only and sends CSP, frame denial, nosniff and referrer policy headers.
- `/healthz` is liveness only. `/api/health` is dependency-aware; an RPC outage should be visible there.
- Configure provider timeouts, rate limits and an uptime alert in hosting. Do not treat public testnet data as production analytics.
- Start with one instance. The service is stateless, but provider-side rate limits are unknown and current page requests call providers directly.
- A full deployment requires an owner-controlled Git remote and host account; neither is available in this workspace, so no external deployment was initiated.

## Known blockers to wider release

No database, durable event ingestion/checkpoints, rate-limit queue, full V3 NFT position reads, lock enumeration, independent pricing, authentication, alert delivery, comprehensive integration/E2E tests, or provider SLA validation. Do not advertise this alpha as production-ready or enable mainnet.