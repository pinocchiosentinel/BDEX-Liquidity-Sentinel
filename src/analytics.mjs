import { config } from './config.mjs';
import { abiWord, addressFromWord, addressWord, asBigInt, ethCall, rpc } from './providers/rpc.mjs';
import { getPool as getSafePool, listPairs } from './providers/bdex-api.mjs';

function decodeWords(hex) { return (hex.slice(2).match(/.{64}/g) ?? []).map((x) => BigInt(`0x${x}`)); }
function friendlyError(error) { return { available: false, error: error instanceof Error ? error.message : String(error) }; }

export async function networkStatus() {
  const [chainHex, blockHex] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
  const chainId = Number(asBigInt(chainHex));
  return { chainId, expectedChainId: config.chainId, correctChain: chainId === config.chainId, blockNumber: asBigInt(blockHex).toString(), observedAt: new Date().toISOString() };
}
export async function verifyContracts() {
  const results = {};
  for (const [name, address] of Object.entries(config.contracts).filter(([name]) => !['wbot', 'usdt'].includes(name))) {
    try { const code = await rpc('eth_getCode', [address, 'latest']); results[name] = { address, hasCode: code !== '0x', bytecodeBytes: Math.max(0, (code.length - 2) / 2) }; }
    catch (error) { results[name] = { address, ...friendlyError(error) }; }
  }
  return results;
}
export async function v2State(pairAddress) {
  const [token0, token1, reserves, supply] = await Promise.all([
    ethCall(pairAddress, '0x0dfe1681'), ethCall(pairAddress, '0xd21220a7'),
    ethCall(pairAddress, '0x0902f1ac'), ethCall(pairAddress, '0x18160ddd'),
  ]);
  const r = decodeWords(reserves);
  return { pair: pairAddress, token0: addressFromWord(token0), token1: addressFromWord(token1), reserve0Raw: r[0].toString(), reserve1Raw: r[1].toString(), totalSupplyRaw: asBigInt(supply).toString() };
}
export async function v3State(poolAddress) {
  const [slot0, liquidity] = await Promise.all([ethCall(poolAddress, '0x3850c7bd'), ethCall(poolAddress, '0x1a686502')]);
  const s = decodeWords(slot0);
  return { pool: poolAddress, sqrtPriceX96: s[0].toString(), tick: BigInt.asIntN(24, s[1]).toString(), observationIndex: s[2].toString(), activeLiquidityRaw: asBigInt(liquidity).toString() };
}
export async function discoverTestPools() {
  const [pairResponse, v3Pairs] = await Promise.all([listSafePairs(), listSafePairs('v3')]);
  const pairRows = Array.isArray(pairResponse?.data) ? pairResponse.data : [];
  const tokens = config.contracts;
  const targetPairs = pairRows.filter((p) => [p.token0, p.token1].some((x) => x?.toLowerCase() === tokens.wbot.toLowerCase()));
  const enriched = await Promise.all(targetPairs.slice(0, 100).map(async (p) => {
    try {
      const pool = await getSafePool(p.pair);
      const state = p.poolType === 'v3' ? await v3State(p.pair) : await v2State(p.pair);
      return { ...p, state, api: pool?.data ?? null };
    } catch (error) { return { ...p, error: error.message }; }
  }));
  const v3Only = (Array.isArray(v3Pairs?.data) ? v3Pairs.data : []).filter((p) => [p.token0, p.token1].some((x) => x?.toLowerCase() === tokens.wbot.toLowerCase()));
  return { allPairCount: pairRows.length, wbotPools: enriched, v3PairCount: Array.isArray(v3Pairs?.data) ? v3Pairs.data.length : 0, wbotV3PairCount: v3Only.length };
}
async function listSafePairs(type = 'all') { try { return await listPairs(type); } catch (error) { return { error: error.message, data: [] }; } }

export async function apiPoolDirectory(type = 'all') {
  const [pools, pairs] = await Promise.all([
    import('./providers/bdex-api.mjs').then(({ listPools }) => listPools(type)).catch((e) => ({ unavailable: true, error: e.message })),
    listSafePairs(type),
  ]);
  return { pools, pairs, source: config.apiBaseUrl, observedAt: new Date().toISOString() };
}
export async function getPoolReport(address) {
  const [detail, chart, distribution] = await Promise.all([
    getSafePool(address).catch((e) => ({ unavailable: true, error: e.message })),
    import('./providers/bdex-api.mjs').then(({ poolCharts }) => poolCharts(address)).catch((e) => ({ unavailable: true, error: e.message })),
    import('./providers/bdex-api.mjs').then(({ liquidityDistribution }) => liquidityDistribution(address)).catch((e) => ({ unavailable: true, error: e.message })),
  ]);
  let chainState = null;
  try {
    const d = detail?.data;
    if (d?.poolType === 'v3') chainState = await v3State(address);
    else if (d?.poolType === 'v2') chainState = await v2State(address);
  } catch (error) { chainState = friendlyError(error); }
  return { address, detail, chart, distribution, chainState, source: config.apiBaseUrl, chainId: config.chainId, observedAt: new Date().toISOString() };
}
export async function factoryStats() {
  const [v2Hex, v3Code, npmCode] = await Promise.all([
    ethCall(config.contracts.v2Factory, '0x574f2ba3'),
    rpc('eth_getCode', [config.contracts.v3Factory, 'latest']),
    rpc('eth_getCode', [config.contracts.npm, 'latest']),
  ]);
  return { v2Pairs: asBigInt(v2Hex).toString(), v3FactoryHasCode: v3Code !== '0x', positionManagerHasCode: npmCode !== '0x' };
}