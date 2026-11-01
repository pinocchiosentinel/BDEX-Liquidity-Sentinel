const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.SMOKE_URL ?? 'http://localhost:3000');
const checks = ['/', '/pool.html?address=0xa70362de14f8140c3e58118f8bc2ccaefb116a30', '/api/health', '/api/pools?type=all', '/api/pool/0xa70362de14f8140c3e58118f8bc2ccaefb116a30'];
let failed = false;
for (const path of checks) {
  try {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(25000) });
    const text = await response.text();
    console.log(`${response.status} ${path} (${text.length} bytes)`);
    if (!response.ok) failed = true;
    if (path === '/api/health' && response.ok && JSON.parse(text).network?.chainId !== 968) failed = true;
  } catch (error) { console.error(`FAIL ${path}: ${error.message}`); failed = true; }
}
if (failed) process.exit(1);