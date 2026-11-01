const q = new URLSearchParams(location.search); const address = q.get('address');
const $ = (id) => document.getElementById(id);
const fmt = (v) => v === undefined || v === null || v === '' ? '—' : String(v);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
try {
  if (!/^0x[a-f\d]{40}$/i.test(address ?? '')) throw new Error('Missing or invalid pool address.');
  const response = await fetch(`/api/pool/${encodeURIComponent(address)}`); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Request failed');
  const d = result.detail?.data; const cs = result.chainState; $('name').textContent = d?.name ?? address; $('address').textContent = address;
  const tvl = d?.tvlUsd ?? d?.tvlUSD ?? d?.tvlUSD24;
  const volume = d?.volumeUsd24 ?? d?.volumeUSD24 ?? d?.volume24Usd;
  $('protocol').textContent = (d?.poolType ?? 'unknown').toUpperCase(); $('tvl').textContent = tvl != null ? `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(tvl))}` : (d?.fdvUsd != null ? `TVL unavailable · FDV $${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(d.fdvUsd))}` : 'TVL unavailable'); $('volume').textContent = volume != null ? `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(volume))}` : 'Not reported';
  $('state').textContent = cs?.activeLiquidityRaw !== undefined ? 'V3 read OK' : cs?.reserve0Raw !== undefined ? 'V2 read OK' : 'Unavailable';
  $('state-extra').textContent = cs?.activeLiquidityRaw !== undefined ? `Tick ${cs.tick} · liquidity ${cs.activeLiquidityRaw}` : cs?.reserve0Raw !== undefined ? `Reserves raw: ${cs.reserve0Raw} / ${cs.reserve1Raw}` : (cs?.error ?? 'Chain state could not be read');
  const points = result.chart?.data;
  $('chart').innerHTML = Array.isArray(points) && points.length ? points.map((p) => `<tr><td>${esc(p.periodStartUnix)}</td><td>${esc(p.open)}</td><td>${esc(p.high)}</td><td>${esc(p.low)}</td><td>${esc(p.close)}</td><td>${esc(p.volumeUSD)}</td><td>${esc(p.tvlUSD)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Historical chart unavailable from provider.</td></tr>';
  $('distribution').textContent = JSON.stringify(result.distribution?.data ?? result.distribution, null, 2);
  if (result.detail?.success === false || result.detail?.unavailable) throw new Error(result.detail.error ?? 'Pool detail provider unavailable');
  $('state-extra').textContent += ` · ${result.chainId} RPC · ${new Date(result.observedAt).toLocaleTimeString()}`;
} catch (e) { $('name').textContent = 'Pool data unavailable'; $('address').textContent = e.message; $('chart').innerHTML = '<tr><td colspan="7" class="empty">No data displayed when request fails.</td></tr>'; }