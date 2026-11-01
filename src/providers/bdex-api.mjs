import { config } from '../config.mjs';

async function request(path) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, { signal: AbortSignal.timeout(12000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`BDEX API HTTP ${response.status}`);
  if (body.success === false || (body.code && body.code !== 0)) throw new Error(body.error ?? body.code ?? 'BDEX API error');
  return body;
}
export const listPairs = (poolType = 'all') => request(`/api/v1/pairs?pool_type=${encodeURIComponent(poolType)}`);
export const listPools = (poolType = 'all') => request(`/api/v1/pools?pool_type=${encodeURIComponent(poolType)}`);
export const getPool = (address) => request(`/api/v1/pools/${encodeURIComponent(address)}`);
export const poolCharts = (address) => request(`/api/v1/pool-charts?pool=${encodeURIComponent(address)}`);
export const liquidityDistribution = (address) => request(`/api/v1/pool-liquidity-distribution?pool=${encodeURIComponent(address)}`);