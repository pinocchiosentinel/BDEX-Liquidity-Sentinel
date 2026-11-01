# Testnet Alpha — Validation and scope

**Checked:** 2026-11-01 (UTC/local environment date). Testnet state is mutable; run `npm run validate` for a fresh result.

## Live validation performed

- JSON-RPC POST `eth_chainId` to `https://rpc.bohr.life` returned `0x3c8` (968); `eth_blockNumber` returned `0x1b7ff04` at inspection time.
- `eth_getCode` returned non-empty code for documented testnet V2 factory, V3 factory, NPM, and V2/V3 lockers.
- Testnet explorer `GET /api/v2/addresses/{V2_FACTORY}` reported a contract, verified source, and name `UniswapV2Factory`. The smart-contract endpoint returned verified source.
- V2 factory `allPairsLength()` returned 450 at inspection time.
- Official testnet Apifox workspace: `https://s.apifox.cn/78c89a55-76be-4d27-9efe-35626bd465f2`. Its fetched OpenAPI excerpt documents `GET /api/v1/pairs`, optional `pool_type=all|v2|v3`, server `https://dex-wallet.bohr.life`, and no authentication (`security: []`). The schema is a success/error envelope with a generic `data` field.
- Real request `GET https://dex-wallet.bohr.life/api/v1/pairs?pool_type=v2` returned testnet chain ID 968 pool records, including pair `0xa70362de14f8140c3e58118f8bc2ccaefb116a30`.
- Real `GET /api/v1/pools` and `/api/v1/pools/{address}` returned pool detail fields. Real `GET /api/v1/pool-charts?pool={address}` returned chart observations. Real `/api/v1/pool-liquidity-distribution?pool={address}` returned a zero-count distribution for one tested V2 pool—shown as provider data, not a claim of no liquidity generally.
- V3 testnet pair `0x7db2c2c81e968d79bf17fcad6413e31cc278ba5a` was returned by the official API; calling the documented V3 factory `getPool` for its token pair/fee 500 returned the same address. Its API detail reported `tUSDT/tUSDC`, fee 500.

## Alpha functionality

- Read-only Node HTTP server and responsive dark dashboard.
- Testnet health and factory/code checks; live API-based pool listing and filtering; pool detail with provider chart/distribution and direct V2/V3 state reads.
- BOTScan address/log adapter and JSON routes.
- No wallet connect, write methods, transaction execution, fake fallback data, database, or user accounts.

## Limitations

- Testnet `/api/v1/pairs` is the only endpoint documented in the retrieved OpenAPI description. Other API routes above were empirically tested, but their full parameter/response schemas and stability are not validated. Authentication was not required by the documented endpoint.
- Provider-reported USD values are not independently price-validated. Testnet price/volume/chart data can be artificial, sparse, or zero; source labels are visible.
- Data ingestion, stable historical indexing/pagination/reorg recovery, V3 NFT position lookup, locker record enumeration, risk analytics, position math, and SQL persistence remain unimplemented.
- The full requested product is not finished; this is the initial testnet alpha through the first runnable dashboard/API milestone.

## Optional registry contract

`AnalyticsRegistry` was deployed to testnet at `0x2c0E9a12aAa4E12f8693D670C2C674bAAad8151b` in block 28,839,540. Transaction: `0xde441b6acba33a4c05548e0f7b2b6dc027fc35b42ac4a723738b739d2788128f`. Runtime bytecode was confirmed through `eth_getCode`; explorer identifies it as a contract created by the generated testnet wallet. It is not yet explorer-source-verified. Its purpose is only to timestamp publisher-provided content hashes; it stores no metrics and is optional to app operation.

## Next priorities

1. Validate official API schemas/fields and add response fixtures plus live integration checks.
2. Retrieve a real testnet V3 token ID and decode `ownerOf`/`positions` with verified ABI.
3. Enumerate testnet locker records from verified ABIs and cross-check custody/unlock conditions.
4. Implement persistent ingestion only after explorer paging/event coverage is characterized.