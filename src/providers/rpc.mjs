import { config } from '../config.mjs';

let requestId = 0;
export async function rpc(method, params = []) {
  const response = await fetch(config.rpcUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method}: ${body.error?.message ?? response.statusText}`);
  return body.result;
}
export const ethCall = (to, data) => rpc('eth_call', [{ to, data }, 'latest']);
export const asBigInt = (hex) => BigInt(hex || '0x0');
export const abiWord = (value) => BigInt(value).toString(16).padStart(64, '0');
export const addressWord = (address) => address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
export function addressFromWord(hex) { return `0x${hex.slice(-40)}`; }