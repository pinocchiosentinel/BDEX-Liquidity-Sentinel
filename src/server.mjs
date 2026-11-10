import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { apiPoolDirectory, discoverTestPools, factoryStats, getPoolReport, networkStatus, verifyContracts } from './analytics.mjs';
import { addressInfo, addressLogs } from './providers/explorer.mjs';

const root = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'");
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Read-only alpha: GET only.' });
    if (url.pathname === '/healthz') return json(res, 200, { status: 'ok', app: 'bdex-liquidity-sentinel', chainId: config.chainId, observedAt: new Date().toISOString() });
    if (url.pathname === '/api/health') {
      const network = await networkStatus();
      return json(res, network.correctChain ? 200 : 503, { network, contracts: await verifyContracts(), factories: await factoryStats() });
    }
    if (url.pathname === '/api/pools') return json(res, 200, await apiPoolDirectory(url.searchParams.get('type') ?? 'all'));
    if (url.pathname === '/api/testnet/pools') return json(res, 200, await discoverTestPools());
    const poolMatch = url.pathname.match(/^\/api\/pool\/([^/]+)$/);
    if (poolMatch) {
      const pool = decodeURIComponent(poolMatch[1]);
      if (!/^0x[a-fA-F0-9]{40}$/.test(pool)) return json(res, 400, { error: 'Invalid pool address.' });
      return json(res, 200, await getPoolReport(pool));
    }
    const logsMatch = url.pathname.match(/^\/api\/explorer\/([^/]+)\/logs$/);
    if (logsMatch) {
      const address = decodeURIComponent(logsMatch[1]);
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return json(res, 400, { error: 'Invalid address.' });
      return json(res, 200, await addressLogs(address));
    }
    const addressMatch = url.pathname.match(/^\/api\/explorer\/([^/]+)$/);
    if (addressMatch) {
      const address = decodeURIComponent(addressMatch[1]);
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return json(res, 400, { error: 'Invalid address.' });
      return json(res, 200, await addressInfo(address));
    }
    const file = resolve(root, `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (file !== root && !file.startsWith(root + sep)) return json(res, 403, { error: 'Forbidden.' });
    const contents = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': extname(file) === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300' });
    return res.end(contents);
  } catch (error) {
    return json(res, 502, { error: error instanceof Error ? error.message : 'Upstream provider failure', observedAt: new Date().toISOString() });
  }
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, '0.0.0.0', () => console.log(`BDEX Liquidity Sentinel listening on ${port} (${config.chainName}, chain ${config.chainId})`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}