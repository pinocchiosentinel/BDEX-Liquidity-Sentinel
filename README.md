# BDEX Liquidity Sentinel — Testnet Alpha

A read-only proof-of-concept for BOT Chain testnet (chain ID 968). This alpha includes a live pool directory, provider-sourced pool summaries/charts, direct V2/V3 state reads, explorer contract evidence, and a small JSON API. It does not submit transactions, connect wallets, value assets independently, or claim production-grade history completeness.

## Requirements and run

- Node.js 20+ (native `fetch`)
- Network access to `https://rpc.bohr.life`, `https://scan.bohr.life`, and `https://dex-wallet.bohr.life`

```sh
cp .env.example .env # optional; environment variables are read by Node/runtime
npm run dev
```

Open `http://localhost:3000`. No dependencies/database are required for this early alpha. The server only accepts GET requests and performs read-only provider calls.

## Deploy to Vercel (GitHub import)

Vercel configuration is included. The public assets are served statically and `api/[...path].mjs` handles read-only API requests as a Vercel Node Function. The app remains locked to BOT Chain testnet (968); no deployer key, wallet key, or contract signing secret is needed by Vercel.

1. Push this project directory as the root of a GitHub repository. Do not commit `.env`, `.local-secrets/`, or private keys; these are gitignored.
2. In Vercel choose **Add New → Project**, import that GitHub repository, and leave the Framework Preset as **Other**. Root Directory should be the repository root; no build command or output directory override is required.
3. In Project Settings → Environment Variables set:
   - `APP_ENV` = `testnet-deployment`
   - `BOT_RPC_URL` = `https://rpc.bohr.life`
   - `BDEX_API_BASE_URL` = `https://dex-wallet.bohr.life`
   Use Preview and Production scopes as desired, but keep both on testnet. Do **not** add `BOT_TESTNET_PRIVATE_KEY` or `BOT_TESTNET_KEY_FILE`.
4. Deploy. After the deployment completes, check `/api/health`, `/api/pools?type=all`, and a pool route such as `/api/pool/0xa70362de14f8140c3e58118f8bc2ccaefb116a30` on the assigned Vercel domain.
5. Optional local/deployment smoke check: `npm run vercel:check` (set `SMOKE_URL=https://your-project.vercel.app` to check the hosted deployment).

The server's `npm run dev` command remains for local use and is not the Vercel entry point. Vercel functions are stateless, so do not rely on in-memory history or background polling. Function duration/rate limits can affect upstream calls; failures are surfaced as provider errors, not zero metrics. This configuration does not itself push code or create a Vercel project.

## Testnet deployment

This is a **long-running Node HTTP server**, not a static Next.js/Vercel app. A Dockerfile and Render Blueprint are included for a managed Node/Docker web service. Keep deployment on BOT Chain **testnet only**; `APP_ENV=testnet-deployment` makes startup fail if the RPC is changed away from the official testnet endpoint.

### Preflight locally

```sh
npm test
npm run predeploy
```

### Deploy using Render

1. Push this repository to a Git provider.
2. In Render, create a Blueprint from the repository root. Review `render.yaml` before confirming.
3. The service builds using `Dockerfile`; ensure environment variables remain `APP_ENV=testnet-deployment`, `BOT_RPC_URL=https://rpc.bohr.life`, and `BDEX_API_BASE_URL=https://dex-wallet.bohr.life`.
4. Deploy. Render should use `/healthz` for its process liveness check. After deployment, open the generated service URL and verify `/api/health` reports chain ID 968 and `correctChain: true`.
5. Monitor provider health/errors and redeploy only while testnet is intended. No production/mainnet configuration is supplied by this deployment manifest.

`PORT` is read from the hosting environment. Do not add secrets to the repo; this alpha needs no API credentials. Configure TLS at the hosting provider/reverse proxy. The app binds to `0.0.0.0` and handles SIGTERM for graceful shutdown.

### Deployment boundary

The preflight checks testnet chain ID and configured deployed bytecode. The `/healthz` endpoint is process liveness only; `/api/health` performs upstream RPC health checks. Render/Docker deployment has not been executed from this environment because it requires a repository/hosting account and provider authorization. This prep does not assert that a public hosted deployment exists.

## Optional on-chain registry

`contracts/AnalyticsRegistry.sol` is an optional testnet content-hash timestamp registry; it is not required to run the analytics app and stores no financial metrics. Solidity compiler version is pinned at 0.8.24. `npm run test:contract` compiles it and runs local EVM behavior tests. A dedicated testnet deployer generated for this task deployed it to chain 968; the public record is in `deployments/testnet-968.json`. The contract does not custody assets or assert submitted content is truthful.

## API

- `GET /api/health` — live chain ID/head, configured contract bytecode presence, V2 pair count.
- `GET /api/pools?type=all|v2|v3` — official API pool directory and pair response.
- `GET /api/testnet/pools` — API-discovered WBOT pairs enriched with direct chain reads (currently limited to 100 results).
- `GET /api/pool/:address` — API detail, chart, liquidity distribution and on-chain V2/V3 state.
- `GET /api/explorer/:address` and `GET /api/explorer/:address/logs` — BOTScan testnet adapter.

The provider API can return HTTP 200 error envelopes; adapters inspect these. Missing upstreams are exposed as errors/unavailable, not coerced to zero.

## Testnet address registry

Configured in `src/config.mjs`: V2 Factory `0x65b8e98ceA190d8c28B3e4716402027f634d15a3`, V3 Factory `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419`, NPM `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090`, V2 Locker `0x17b6BBD34266Ed4d6770D9Ed643Fc24eE1a1197B`, V3 Locker `0x0930Ae6F6dC8430b6662A40D41Ab54cBf041316B`. Testnet RPC `https://rpc.bohr.life`; explorer `https://scan.bohr.life`; official API base URL `https://dex-wallet.bohr.life`.

## Validation and tests

```sh
npm run validate
npm test
```

`npm run validate` checks chain ID, factories, deployed code, API listing and a sample pool. Tests are deterministic unit tests and do not present fixtures as live data.

## Limitations / not production-ready

- The official testnet `/api/v1/pairs?pool_type=` endpoint is documented and live. Actual `/api/v1/pools`, `/api/v1/pools/:address`, `/api/v1/pool-charts?pool=`, and `/api/v1/pool-liquidity-distribution?pool=` requests were also validated against the testnet server, but their schemas are not all in the fetched OpenAPI excerpt. Validate response fields defensively.
- API-reported TVL/volume/chart fields are displayed as source-provided estimates without independent price verification; testnet chart data may contain zeroes or incomplete values.
- Direct on-chain reads enrich only pairs returned by the API. Fee tiers and tick spacing are not assumed to prove deployed support beyond discovered pools.
- Full V3 NFT positions, locker record enumeration, event backfill/pagination, reorg handling, database persistence, historical data, alerts, authentication, and mainnet support are not implemented.
- No USD valuation, IL, execution simulation, risk score, or LP safety claim is produced.

See `docs/TESTNET-ALPHA.md` for live validation evidence and next steps.