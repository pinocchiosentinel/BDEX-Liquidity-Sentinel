import { config } from '../config.mjs';

export async function addressInfo(address) {
  const response = await fetch(`${config.explorerUrl}/api/v2/addresses/${encodeURIComponent(address)}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`BOTScan HTTP ${response.status}`);
  return response.json();
}
export async function addressLogs(address) {
  const response = await fetch(`${config.explorerUrl}/api/v2/addresses/${encodeURIComponent(address)}/logs`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`BOTScan logs HTTP ${response.status}`);
  return response.json();
}