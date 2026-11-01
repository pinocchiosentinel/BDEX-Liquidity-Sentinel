import { config } from '../src/config.mjs';
import { apiPoolDirectory, discoverTestPools, factoryStats, getPoolReport, networkStatus, verifyContracts } from '../src/analytics.mjs';
import { addressInfo, addressLogs } from '../src/providers/explorer.mjs';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers });
const isAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value ?? '');

export default async function handler(request, context) {
  const url = new URL(request.url ?? `https://${request.headers?.host ?? 'localhost'}/`);
  const routeParam = context?.params?.path;
  const routeSegments = Array.isArray(routeParam) ? routeParam : typeof routeParam === 'string' ? routeParam.split('/') : [];
  const routePath = `/${routeSegments.map(encodeURIComponent).join('/')}`;
  if (request.method !== 'GET') return json(405, { error: 'Read-only API. GET only.' });
  try {
    if (routePath === '/health') {
      const network = await networkStatus();
      return json(network.correctChain ? 200 : 503, { network, contracts: await verifyContracts(), factories: await factoryStats() });
    }
    if (routePath === '/pools') return json(200, await apiPoolDirectory(url.searchParams.get('type') ?? 'all'));
    if (routePath === '/testnet/pools') return json(200, await discoverTestPools());
    const segments = routePath.split('/').filter(Boolean);
    if (segments[0] === 'pool' && segments.length === 2) {
      if (!isAddress(segments[1])) return json(400, { error: 'Invalid pool address.' });
      return json(200, await getPoolReport(segments[1]));
    }
    if (segments[0] === 'explorer' && (segments.length === 2 || (segments.length === 3 && segments[2] === 'logs'))) {
      const address = segments[1];
      if (!isAddress(address)) return json(400, { error: 'Invalid address.' });
      return json(200, segments.length === 3 ? await addressLogs(address) : await addressInfo(address));
    }
    return json(404, { error: 'API route not found.' });
  } catch (error) {
    console.error('Vercel API request failed:', error instanceof Error ? error.message : error);
    return json(502, { error: error instanceof Error ? error.message : 'Upstream provider failure', observedAt: new Date().toISOString() });
  }
}