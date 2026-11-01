# BDEX Liquidity Sentinel — Milestone 1 Technical Validation

**Scope:** live technical proof of concept only. This is not a completed analytics product. No metrics are fabricated or represented as USD values.

**Validation window:** 2026-10-31 UTC. RPC head and chain state advance; rerun `npm run validate` for current observations.

## Summary

| Check | Result |
|---|---|
| BOT Chain mainnet RPC / chain ID | Pass; `eth_chainId` returned `0x2a5` (677). `eth_blockNumber` returned 28,668,725 during the final script run. |
| Documented V2 / V3 factories, position manager and locker bytecode | Pass; every configured address returned non-empty `eth_getCode`. |
| V2 pool discovery and state | Pass; factory reports 83 pairs. WBOT/USDT pair resolved and returned reserves and LP supply. |
| V3 pool discovery and state | Pass; WBOT/USDT pools found at documented fee tiers; `slot0` and active liquidity read on chain. |
| NFT collection existence | Pass; explorer identifies NPM as verified `B DEX Positions NFT-V1`, ERC-721, supply 1,774. |
| Decode/read an identified live position NFT | Not yet demonstrated. No actual token ID was obtained and exercised through `ownerOf`/`positions`; collection supply is not proof that a chosen ID exists. |
| Historical event provider | Partial pass; BOTScan Blockscout v2 returns historical decoded V2 factory logs. Pagination parameters/API schema need follow-up; response returned 50 items with no next-page object in the sample. |
| Official BDEX API actual data query | Not established. Official API docs page and Apifox workspace are documented/accessed, but workspace content/API requests timed out. No candidate path was treated as verified. |
| Pool volume/chart/liquidity history | Not established from a live API response. The RPC pair state is current state, not historical chart data. |
| Locker operational state | Partial pass; both contracts have code and explorer marks them verified. No lock record/state was decoded in this run. |

## Actual requests and results

### BOT Chain RPC

Requests sent as JSON-RPC POST to `https://rpc.botchain.ai`:

- `eth_chainId` → `0x2a5` (677).
- `eth_blockNumber` → `0x1b4...` (script run captured decimal `28668725`; value changes over time).
- `eth_getCode(address, "latest")` for each configured factory, NPM, V2 locker, V3 locker → non-empty code in each case.
- `eth_call` selector `0x574f2ba3` against V2 factory (`allPairsLength()`) → `0x...0053` = 83.
- `eth_call` selector `0xe6a43905` against V2 factory for sorted WBOT/USDT → pair `0xdc7547f3cea82c6af7fd420656ce532c6da9b98d`.
- Pair `token0()` / `token1()` calls → USDT then WBOT.
- Pair `getReserves()` → raw reserves `3,053,114,054` USDT base units and `247,215,879,140,495,848,360` WBOT base units at validation time; `totalSupply()` → `733,152,902,444,502` raw LP units. These are raw on-chain values, not USD estimates.
- V3 factory `getPool(token0, token1, fee)` calls for fee 500/3000/10000 returned three live pools. Pool `slot0()` and `liquidity()` calls succeeded. Fee-10000 pool returned zero active liquidity at the sampled instant/state; this is not interpreted as missing or invalid pool.
- NPM `totalSupply()` selector `0x18160ddd` returned 1,774.
- A probe using an unconfirmed V3 factory selector reverted; it was not used as evidence. The runnable script uses the supported `getPool(address,address,uint24)` selector.
- A range query to `eth_getLogs` at latest block returned `[]` (empty range); this does **not** prove historical `eth_getLogs` works. Historical ingestion should use BOTScan until capability and range behavior are explicitly benchmarked.

### BOTScan / Blockscout

Requests made:

- `GET https://scan.botchain.ai/api/v2/addresses/{V2_FACTORY}` → `is_contract: true`, `is_verified: true`, name `UniswapV2Factory`, creation transaction and creator returned.
- `GET https://scan.botchain.ai/api/v2/smart-contracts/{V2_FACTORY}` → verified source and deployed bytecode returned; source identifies UniswapV2Factory-compatible implementation and `PairCreated` event.
- `GET https://scan.botchain.ai/api/v2/addresses/{V2_FACTORY}/logs` → 50 log items; decoded `PairCreated` event included pair address, tokens, block number and transaction hash. Sample: block 27,541,309, tx `0x741299b9e0caa829a594d29110083aadd438523bc921f1915ce7004c1efd2f45`, pair `0xC47BF4f4F34EE9cB19e0bD3C39Ad981e4b745221`.
- `GET https://scan.botchain.ai/api/v2/blocks/28661083` → timestamp `2026-10-31T20:57:31Z`.
- `GET /api/v2/addresses/{factory}/logs?items_count=1` → HTTP 422; that query parameter is not accepted in the attempted form. Use explorer-provided paging parameters after inspecting the full schema.
- Legacy `GET /api?module=block&action=getblocknobytime&timestamp=1700000000&closest=before` returned block number 0 with status OK; treat this legacy query as unreliable for this chain/time mapping, not a validated backfill method.
- V3 position manager address API returned verified contract/token metadata: ERC-721, name `B DEX Positions NFT-V1`, symbol `BOT-POS`, total supply 1,774, holders 109.
- Explorer smart-contract calls for V3 factory/NPM/lockers were not all consistently retrievable via the tested route; confirmed verified status is established for NPM and both lockers through address metadata, and V2 factory via source endpoint.

### Official BDEX API

Official docs page `https://dev-docs.botchain.ai/docs/DEX/api-reference/` names the mainnet Apifox workspace `https://s.apifox.cn/139b78fd-a57f-470a-ac74-b7246d32f2e6`. The workspace HTML was reachable once (HTTP 200, ~150 KB), but direct fetches/spec discovery timed out; candidate `swagger-json` paths returned 404 or timed out. Authentication requirements, API host, request parameters, response schemas and live endpoint results therefore remain **unverified**. Candidate routes in the project prompt are not treated as validated. No API key was available/proven necessary.

## Address registry checked against documentation and chain

All addresses below are official documentation seeds. On-chain bytecode was checked for the five primary contracts listed; address format and chain context were checked against documentation. A code check alone does not independently prove business identity.

| Contract | Mainnet address | Evidence/status |
|---|---|---|
| BOT Chain | chain ID 677, RPC `https://rpc.botchain.ai` | Live `eth_chainId` pass |
| BDEX V2 Factory | `0x117115f3B72C8d1989178089A67D0C26f8EE0AA3` | Code present; verified explorer source; 83 pairs |
| BDEX V3 Factory | `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419` | Code present; fee-tier lookups yielded pools |
| NonfungiblePositionManager | `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090` | Code present; explorer verified ERC-721; supply 1,774 |
| V2 Liquidity Locker | `0x82Cb7Cd6Ad9cE3a1f1Fc1821AD7dCAb87C3d7663` | Code present; explorer verified |
| V3 Liquidity Locker | `0x32685b8Db1559D6651fcdB8a22D11cC44d3B952b` | Code present; explorer verified |
| WBOT | `0xD5452816194a3784dBa983426cCe7c122F4abd30` | Official docs; token ordering confirmed in live pair |
| USDT | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` | Official docs; token ordering confirmed in live pair |

Official documentation references: BOT Chain DEX API Reference, Contract Addresses, BDEX V2, BDEX V3, Core Concepts and Liquidity Locker contract address/reference pages. The documentation lists V2 0.30% swap fee and V3 fee values 500/3000/10000 with spacings 10/60/200; these deployed values still need an explicit contract read/verification before production configuration.

## Liquidity Locker findings

Documentation describes V2 lock read surface (`LOCKS`, `TOKEN_LOCKS`, token/user enumeration) and V3 (`getLock`/`LOCKS`, `getLocksLength`/`NONCE`, user enumeration, plus `nftPositionManagerIsAllowed`). V2 permanent lock sentinel is `uint256.max`; expired timed locks can be withdrawn, and permanent lock amounts can still be increased/split/transferred per docs. V3 permanently locked NFTs cannot be withdrawn or have liquidity removed, but may be transferred, have fees collected, and receive liquidity increases. Therefore “locked” is not a blanket safety guarantee.

The proof script confirms bytecode and explorer verification but does not decode any specific locker record. No lock ID or ABI was guessed. Next step is to ingest verified explorer ABI and use locker enumeration/read methods to enumerate actual records, then cross-check corresponding ERC20/ERC721 custody and expiry state.

## Historical data and limitations

BOTScan Blockscout v2 is the strongest observed historical source: address log endpoint returned real decoded factory logs and block/transaction references. For robust indexing, implement cursor pagination as the API specifies; persist `(chainId, transactionHash, logIndex)`; verify reorgs against block hashes and checkpoint from finalized heights. The returned first page and legacy block timestamp endpoint do not establish unlimited retention, complete V3 event coverage, stable rate limits, or archival guarantees. Test per-address event coverage and page traversal before production.

No historical pool price, liquidity or volume chart was validated here. Current reserves/`slot0` are live state only. Need either a documented and live BDEX history endpoint or reconstruct time series from historical swaps/mints/burns/collects plus timestamped blocks, with complete indexing and token prices.

## Recommended production architecture

1. Keep RPC reads, explorer historical events, BDEX API and price providers as independent adapters with health/staleness metadata.
2. Use BOTScan v2 as candidate backfill source; prove cursor pagination, historical completeness and limits; use BOT RPC for current reads and new-head polling until a supported WebSocket source is demonstrated.
3. Separate historical backfill from live block ingestion; checkpoints, idempotent event keys and reorg rollback are mandatory.
4. Decode against explorer-verified ABIs and compare runtime code/address identity. Store raw amounts as integers/decimal strings and timestamps/block hashes as provenance.
5. Do not enable volume/TVL chart claims until historical events and a validated price source support the full window. Display unavailable/stale rather than zero.
6. For V3 positions, obtain real minted token IDs from NPM mint/Transfer logs, then test `ownerOf(tokenId)` and `positions(tokenId)` read/decode, fees and pool tick math. For lock records, enumerate from verified locker ABI and confirm custody.

## Running the proof script

Requirements: Node.js with global `fetch` (Node 18+), network access to BOT RPC and BOTScan. From repository root run:

```sh
npm run validate
```

Optional RPC override: set `BOT_RPC_URL`. The script performs read-only JSON-RPC/explorer requests and prints raw values and timestamp; it does not sign or submit transactions. It is a limited validation harness, not an ingestion service or full ABI decoder.

## Remaining Milestone 1 blockers

- Retrieve and decode an actual V3 NFT `tokenId` using verified NPM ABI and confirm owner and position tuple.
- Determine validated Apifox OpenAPI spec/API host/auth and send actual pool/history requests; currently unavailable due access timeouts.
- Confirm BOTScan paging, filtering, retention and coverage for V3 and locker event histories.
- Enumerate real V2/V3 locker records and confirm lock expiry/permanent states on chain.
- Validate official fee tiers/tick spacing against deployed factory state.
- Obtain actual historical liquidity/volume charts; none claimed yet.